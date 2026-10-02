from typing import Any
from fastapi import HTTPException, status
from loguru import logger

from core.storage.interface import IStorageProvider
from modules.meetings.domain.interfaces import IMeetingRepository
from modules.members.domain.enums import MemberRole
from modules.members.domain.interfaces import IMemberRepository
from modules.workspaces.domain.interfaces import IWorkspaceRepository
from modules.transcription.domain.enums import SessionStatus
from modules.transcription.domain.interfaces import (
    ITranscriptionSessionRepository,
    ITranscriptSegmentRepository,
)
from modules.transcription.dtos.session_dtos import (
    MeetingTranscriptsResponse,
    SessionResponse,
    TranscriptSegmentDTO,
)
from modules.transcription.infrastructure.event_broadcaster import event_broadcaster
from modules.transcription.infrastructure.ticket_store import ticket_store


class TranscriptionSessionUseCases:
    """Application use cases for managing transcription sessions and historical transcripts."""

    def __init__(
        self,
        session_repo: ITranscriptionSessionRepository,
        segment_repo: ITranscriptSegmentRepository,
        meeting_repo: IMeetingRepository,
        member_repo: IMemberRepository,
        storage_provider: IStorageProvider,
        workspace_repo: IWorkspaceRepository,
    ) -> None:
        self.session_repo = session_repo
        self.segment_repo = segment_repo
        self.meeting_repo = meeting_repo
        self.member_repo = member_repo
        self.storage_provider = storage_provider
        self.workspace_repo = workspace_repo

    async def _resolve_and_check_access(
        self,
        workspace_id: str,
        meeting_id: str,
        actor_id: str,
    ) -> tuple[str, Any]:
        """
        Validates access and resolves the authoritative workspace_id and meeting.
        Handles mismatched workspace_ids gracefully by verifying the meeting's
        true workspace, meeting creator permissions, workspace ownership, or user memberships.
        """
        meeting = await self.meeting_repo.get_by_id(meeting_id)

        # 1. If meeting exists, check access relative to the meeting
        if meeting:
            # Check 1a: Meeting creator always has permission to transcribe their own meeting
            if str(meeting.created_by) == str(actor_id):
                existing_member = await self.member_repo.get_member(meeting.workspace_id, actor_id)
                if not existing_member:
                    try:
                        await self.member_repo.add_member(
                            workspace_id=meeting.workspace_id,
                            user_id=actor_id,
                            role=MemberRole.ADMIN,
                        )
                        logger.info(
                            f"[Session] Auto-enrolled meeting creator {actor_id} to workspace {meeting.workspace_id}"
                        )
                    except Exception as e:
                        logger.warning(f"[Session] Could not auto-enroll creator: {e}")
                return meeting.workspace_id, meeting

            # Check 1b: User is a member of meeting's actual workspace
            target_ws_member = await self.member_repo.get_member(meeting.workspace_id, actor_id)
            if target_ws_member:
                return meeting.workspace_id, meeting

            # Check 1c: Direct membership in requested workspace_id matching meeting
            if meeting.workspace_id == workspace_id:
                req_ws_member = await self.member_repo.get_member(workspace_id, actor_id)
                if req_ws_member:
                    return workspace_id, meeting

        # 2. Check direct membership in requested workspace_id
        member = await self.member_repo.get_member(workspace_id, actor_id)
        if member:
            if not meeting:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Cuộc họp không tồn tại.",
                )
            if meeting.workspace_id != workspace_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Cuộc họp không thuộc workspace này.",
                )
            return workspace_id, meeting

        # 3. Check workspace ownership
        if self.workspace_repo:
            try:
                ws = await self.workspace_repo.get_by_id(workspace_id)
                if ws and str(ws.owner_id) == str(actor_id):
                    try:
                        await self.member_repo.add_member(
                            workspace_id=workspace_id,
                            user_id=actor_id,
                            role=MemberRole.ADMIN,
                        )
                    except Exception:
                        pass
                    if not meeting:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Cuộc họp không tồn tại.",
                        )
                    return workspace_id, meeting
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"[Session] Failed workspace owner check: {e}")

        # 4. If user is in ANY workspace and meeting exists in one of them
        if meeting:
            user_memberships = await self.member_repo.list_by_user(actor_id)
            for m in user_memberships:
                if m.workspace_id == meeting.workspace_id:
                    return m.workspace_id, meeting

        # 5. Access denied
        logger.warning(
            f"[Session] Access denied: actor_id={actor_id}, workspace_id={workspace_id}, meeting_id={meeting_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Bạn không có quyền truy cập workspace này (User: {actor_id}). Vui lòng kiểm tra lại tài khoản hoặc workspace đã chọn.",
        )

    async def _check_member(self, workspace_id: str, user_id: str) -> None:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if member:
            return
        if self.workspace_repo:
            try:
                ws = await self.workspace_repo.get_by_id(workspace_id)
                if ws and str(ws.owner_id) == str(user_id):
                    return
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Bạn không có quyền truy cập workspace này (User: {user_id}).",
        )

    async def create_session(
        self,
        workspace_id: str,
        meeting_id: str,
        actor_id: str,
        source_type: str = "GOOGLE_MEET",
        sample_rate: int = 16000,
        stt_model: str = "Systran/faster-whisper-large-v3",
    ) -> SessionResponse:
        effective_workspace_id, meeting = await self._resolve_and_check_access(
            workspace_id=workspace_id,
            meeting_id=meeting_id,
            actor_id=actor_id,
        )

        # Check if an active session already exists
        existing_session = await self.session_repo.get_active_session_by_meeting(
            meeting_id
        )
        if existing_session:
            # Generate new tickets for the existing active session
            prod_ticket = ticket_store.create_ticket(
                existing_session.id, actor_id, role="producer"
            )
            sub_ticket = ticket_store.create_ticket(
                existing_session.id, actor_id, role="subscriber"
            )
            return SessionResponse(
                session_id=existing_session.id,
                meeting_id=existing_session.meeting_id,
                workspace_id=existing_session.workspace_id,
                status=existing_session.status,
                source_type=existing_session.source_type,
                sample_rate=existing_session.sample_rate,
                producer_ticket=prod_ticket,
                subscriber_ticket=sub_ticket,
            )

        # Create brand new session
        session = await self.session_repo.create(
            meeting_id=meeting_id,
            workspace_id=effective_workspace_id,
            created_by=actor_id,
            source_type=source_type,
            sample_rate=sample_rate,
            stt_model=stt_model,
        )

        prod_ticket = ticket_store.create_ticket(session.id, actor_id, role="producer")
        sub_ticket = ticket_store.create_ticket(session.id, actor_id, role="subscriber")

        logger.info(
            f"[Session] Created transcription session {session.id} for meeting {meeting_id}"
        )

        return SessionResponse(
            session_id=session.id,
            meeting_id=session.meeting_id,
            workspace_id=session.workspace_id,
            status=session.status,
            source_type=session.source_type,
            sample_rate=session.sample_rate,
            producer_ticket=prod_ticket,
            subscriber_ticket=sub_ticket,
        )

    async def get_current_session(
        self, workspace_id: str, meeting_id: str, actor_id: str
    ) -> SessionResponse | None:
        effective_workspace_id, _ = await self._resolve_and_check_access(
            workspace_id=workspace_id,
            meeting_id=meeting_id,
            actor_id=actor_id,
        )
        session = await self.session_repo.get_active_session_by_meeting(meeting_id)
        if not session:
            return None

        sub_ticket = ticket_store.create_ticket(session.id, actor_id, role="subscriber")
        return SessionResponse(
            session_id=session.id,
            meeting_id=session.meeting_id,
            workspace_id=effective_workspace_id,
            status=session.status,
            source_type=session.source_type,
            sample_rate=session.sample_rate,
            subscriber_ticket=sub_ticket,
        )

    async def stop_session(
        self,
        session_id: str,
        total_samples: int,
        last_seq: int,
        recording_part_count: int,
        actor_id: str,
    ) -> SessionResponse:
        session = await self.session_repo.get_by_id(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session không tồn tại."
            )

        await self._check_member(session.workspace_id, actor_id)

        updated = await self.session_repo.update_status(
            session_id=session_id,
            status=SessionStatus.RECORDED.value,
            duration_samples=total_samples,
        )

        logger.info(
            f"[Session] Stopped transcription session {session_id}: total_samples={total_samples}, parts={recording_part_count}"
        )

        await event_broadcaster.broadcast(
            session_id,
            {
                "type": "session.status_changed",
                "session_id": session_id,
                "status": SessionStatus.RECORDED.value,
                "duration_samples": total_samples,
            },
        )

        return SessionResponse(
            session_id=updated.id,
            meeting_id=updated.meeting_id,
            workspace_id=updated.workspace_id,
            status=updated.status,
            source_type=updated.source_type,
            sample_rate=updated.sample_rate,
        )

    async def get_meeting_transcripts(
        self, workspace_id: str, meeting_id: str, actor_id: str
    ) -> MeetingTranscriptsResponse:
        await self._check_member(workspace_id, actor_id)

        segments = await self.segment_repo.list_by_meeting(meeting_id)
        segment_dtos = [
            TranscriptSegmentDTO(
                id=s.id,
                session_id=s.session_id,
                utterance_id=s.utterance_id,
                revision=s.revision,
                start_ms=s.start_ms,
                end_ms=s.end_ms,
                text=s.text,
                translation=s.translation,
                words=s.words,
                speaker_label=s.speaker_label,
                confidence=s.confidence,
                is_final=s.is_final,
            )
            for s in segments
        ]

        active_session = await self.session_repo.get_active_session_by_meeting(
            meeting_id
        )
        session_dto = None
        if active_session:
            session_dto = SessionResponse(
                session_id=active_session.id,
                meeting_id=active_session.meeting_id,
                workspace_id=active_session.workspace_id,
                status=active_session.status,
                source_type=active_session.source_type,
                sample_rate=active_session.sample_rate,
            )

        return MeetingTranscriptsResponse(
            session=session_dto,
            recording_url=None,  # Will be populated when recording asset is bound
            segments=segment_dtos,
        )
