from fastapi import HTTPException, status
from loguru import logger

from core.storage.interface import IStorageProvider
from modules.meetings.domain.interfaces import IMeetingRepository
from modules.members.domain.interfaces import IMemberRepository
from modules.transcription.domain.enums import SessionStatus
from modules.transcription.domain.interfaces import (
    ITranscriptSegmentRepository,
    ITranscriptionSessionRepository,
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
    ) -> None:
        self.session_repo = session_repo
        self.segment_repo = segment_repo
        self.meeting_repo = meeting_repo
        self.member_repo = member_repo
        self.storage_provider = storage_provider

    async def _check_member(self, workspace_id: str, user_id: str) -> None:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền truy cập workspace này.",
            )

    async def create_session(
        self,
        workspace_id: str,
        meeting_id: str,
        actor_id: str,
        source_type: str = "GOOGLE_MEET",
        sample_rate: int = 16000,
        stt_model: str = "openai/whisper-small",
    ) -> SessionResponse:
        await self._check_member(workspace_id, actor_id)

        meeting = await self.meeting_repo.get_by_id(meeting_id)
        if not meeting or meeting.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cuộc họp không tồn tại.",
            )

        # Check if an active session already exists
        existing_session = await self.session_repo.get_active_session_by_meeting(meeting_id)
        if existing_session:
            # Generate new tickets for the existing active session
            prod_ticket = ticket_store.create_ticket(existing_session.id, actor_id, role="producer")
            sub_ticket = ticket_store.create_ticket(existing_session.id, actor_id, role="subscriber")
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
            workspace_id=workspace_id,
            created_by=actor_id,
            source_type=source_type,
            sample_rate=sample_rate,
            stt_model=stt_model,
        )

        prod_ticket = ticket_store.create_ticket(session.id, actor_id, role="producer")
        sub_ticket = ticket_store.create_ticket(session.id, actor_id, role="subscriber")

        logger.info(f"[Session] Created transcription session {session.id} for meeting {meeting_id}")

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
        await self._check_member(workspace_id, actor_id)
        session = await self.session_repo.get_active_session_by_meeting(meeting_id)
        if not session:
            return None

        sub_ticket = ticket_store.create_ticket(session.id, actor_id, role="subscriber")
        return SessionResponse(
            session_id=session.id,
            meeting_id=session.meeting_id,
            workspace_id=session.workspace_id,
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
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session không tồn tại.")

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

        active_session = await self.session_repo.get_active_session_by_meeting(meeting_id)
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
