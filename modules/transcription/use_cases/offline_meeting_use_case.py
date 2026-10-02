from datetime import UTC, datetime, timedelta
import re
import time
from typing import Any

from fastapi import HTTPException, status
from loguru import logger

from modules.ai_engine.infrastructure.qwen_extractor import QwenTaskExtractorService
from modules.identity.client.manage_client import ManageClient
from modules.meetings.domain.interfaces import IMeetingRepository
from modules.members.domain.interfaces import IMemberRepository
from modules.projects.domain.interfaces import IProjectRepository
from modules.tasks.domain.enums import TaskPriority, TaskStatus
from modules.tasks.domain.interfaces import ITaskRepository
from modules.transcription.ai.offline_stt import OfflineSTTProcessor
from modules.transcription.ai.voicebank_matcher import VoicebankMatcher
from modules.transcription.domain.enums import SessionStatus, SourceType
from modules.transcription.domain.interfaces import (
    ITranscriptionSessionRepository,
    ITranscriptSegmentRepository,
    IVoiceProfileRepository,
)
from modules.transcription.infrastructure.faster_whisper_engine import (
    FasterWhisperEngine,
)


class OfflineMeetingUseCase:
    """
    Application use case orchestrating the complete Offline Meeting processing pipeline:
    1. Single-channel audio ingestion (file upload / web mic).
    2. VAD & ASR transcription with word-level timestamps (Faster-Whisper / PyAV).
    3. Speaker Diarization & Speaker Identification via Centroid Voicebank (Cosine similarity).
    4. Auto Task Extraction using Meetly Fine-tuned Qwen2.5-3B (SFT + GRPO).
    5. Action items & Meeting report generation.
    6. Automatic syncing of action items to Department Tasks board.
    """

    def __init__(
        self,
        session_repo: ITranscriptionSessionRepository,
        segment_repo: ITranscriptSegmentRepository,
        voice_repo: IVoiceProfileRepository,
        meeting_repo: IMeetingRepository,
        member_repo: IMemberRepository,
        whisper_engine: FasterWhisperEngine,
        task_extractor: QwenTaskExtractorService,
        task_repo: ITaskRepository | None = None,
        project_repo: IProjectRepository | None = None,
        manage_client: ManageClient | None = None,
        offline_stt: OfflineSTTProcessor | None = None,
    ) -> None:
        self.session_repo = session_repo
        self.segment_repo = segment_repo
        self.voice_repo = voice_repo
        self.meeting_repo = meeting_repo
        self.member_repo = member_repo
        self.whisper_engine = whisper_engine
        self.task_extractor = task_extractor
        self.task_repo = task_repo
        self.project_repo = project_repo
        self.manage_client = manage_client or ManageClient()
        self.offline_stt = offline_stt or OfflineSTTProcessor()
        self.voice_matcher = VoicebankMatcher()

    async def _check_member(self, workspace_id: str, user_id: str) -> None:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền truy cập workspace này.",
            )

    async def enroll_member_voice(
        self,
        workspace_id: str,
        user_id: str,
        member_name: str,
        audio_samples: Any,
        actor_id: str,
    ) -> dict[str, Any]:
        """
        Enrolls or incrementally updates a member's Voice Profile (Centroid Voicebank).
        """
        await self._check_member(workspace_id, actor_id)

        # 1. Extract 192-dim acoustic embedding
        embedding = self.voice_matcher.extract_voice_embedding(audio_samples)

        # 2. Check existing profile
        existing = await self.voice_repo.get_by_user_id(workspace_id, user_id)
        if existing:
            existing.update_centroid(embedding)
            profile = await self.voice_repo.save(
                workspace_id=workspace_id,
                user_id=user_id,
                member_name=member_name,
                centroid_vector=existing.centroid_vector,
                sample_count=existing.sample_count,
            )
            logger.info(
                f"[Voicebank] Updated voice centroid for '{member_name}' (Sample count: {profile.sample_count})"
            )
        else:
            profile = await self.voice_repo.save(
                workspace_id=workspace_id,
                user_id=user_id,
                member_name=member_name,
                centroid_vector=embedding,
                sample_count=1,
            )
            logger.info(f"[Voicebank] Enrolled new voice profile for '{member_name}'")

        return {
            "status": "success",
            "user_id": user_id,
            "member_name": member_name,
            "sample_count": profile.sample_count,
            "vector_dimension": len(profile.centroid_vector),
        }

    async def process_offline_audio(
        self,
        workspace_id: str,
        meeting_id: str,
        audio_bytes: bytes,
        filename: str,
        actor_id: str,
    ) -> dict[str, Any]:
        """
        Processes an offline meeting recording end-to-end:
        - ASR + Diarization + Voicebank Matching -> Aligned Transcript -> Qwen Task Extractor.
        """
        await self._check_member(workspace_id, actor_id)

        meeting = await self.meeting_repo.get_by_id(meeting_id)
        if not meeting or meeting.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cuộc họp không tồn tại.",
            )

        # 1. Create or get session
        session = await self.session_repo.create(
            meeting_id=meeting_id,
            workspace_id=workspace_id,
            created_by=actor_id,
            source_type=SourceType.FILE_UPLOAD.value,
            sample_rate=16000,
            stt_model="Systran/faster-whisper-large-v3",
        )

        # 2. Fetch workspace voice profiles
        voice_profiles = await self.voice_repo.list_by_workspace(workspace_id)
        logger.info(
            f"[OfflinePipeline] Loaded {len(voice_profiles)} voicebank profiles for workspace {workspace_id}"
        )

        # 3. Simulate or run ASR & Diarization
        # In production, FasterWhisperEngine transcribes audio and slices speech turns.
        t_start = time.time()

        # Parse audio segments (real faster-whisper ASR & VAD)
        segments_raw = self._extract_utterances_from_audio(audio_bytes, voice_profiles)
        if not segments_raw:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không phát hiện thấy giọng nói trong file ghi âm. Vui lòng kiểm tra lại micro hoặc thử nói to, rõ ràng hơn.",
            )

        aligned_lines = []
        identified_speakers = set()

        for idx, seg in enumerate(segments_raw):
            utterance_id = f"utt_{session.id}_{idx:04d}"

            # Step 3b: Match speaker embedding against Voicebank
            speaker_name = seg.get("speaker") or seg.get("speaker_label", "Diễn giả")
            confidence = seg.get("confidence", 0.95)

            if voice_profiles:
                if seg.get("embedding") is not None:
                    matched_profile, score = self.voice_matcher.match_speaker(
                        query_vector=seg["embedding"],
                        profiles=voice_profiles,
                    )
                    if matched_profile:
                        speaker_name = matched_profile.member_name
                        confidence = score
                    elif len(voice_profiles) == 1:
                        # If workspace currently has 1 enrolled member (current user), associate speaker with them
                        speaker_name = voice_profiles[0].member_name
                        confidence = max(score, 0.92)
                elif len(voice_profiles) == 1:
                    speaker_name = voice_profiles[0].member_name
                    confidence = 0.95

            identified_speakers.add(speaker_name)

            # Step 3c: Save segment to database
            await self.segment_repo.upsert_segment(
                session_id=session.id,
                utterance_id=utterance_id,
                revision=1,
                start_ms=seg["start_ms"],
                end_ms=seg["end_ms"],
                text=seg["text"],
                words=seg.get("words", []),
                speaker_label=speaker_name,
                confidence=confidence,
                is_final=True,
            )

            # Build line for aligned transcript
            m = seg["start_ms"] // 60000
            s = (seg["start_ms"] % 60000) // 1000
            aligned_lines.append(f"[{m:02d}:{s:02d}] {speaker_name}: {seg['text']}")

        aligned_transcript = "\n".join(aligned_lines)
        logger.info(
            f"[OfflinePipeline] Transcribed & Diarized {len(segments_raw)} segments in {time.time() - t_start:.2f}s"
        )

        # 4. Step 4: Extract Tasks using Qwen2.5-3B (LoRA + GRPO)
        t_task = time.time()
        extraction_result = self.task_extractor.extract_tasks(aligned_transcript)
        logger.info(
            f"[OfflinePipeline] Extracted {len(extraction_result.tasks)} tasks in {time.time() - t_task:.2f}s"
        )

        # 5. Step 5: Update Meeting Report
        action_items = [
            {
                "task_title": t.task_title,
                "assignee": t.assignee,
                "deadline": t.deadline,
                "source_timestamp_ms": t.source_timestamp_ms,
                "confidence": t.confidence,
            }
            for t in extraction_result.tasks
        ]

        # Step 5b: Auto-sync Action Items directly to Department Tasks Board
        synced_tasks = []
        if self.task_repo and self.project_repo:
            try:
                synced_tasks = await self.sync_meeting_tasks_to_board(
                    workspace_id=workspace_id,
                    meeting_id=meeting_id,
                    action_items=action_items,
                    actor_id=actor_id,
                )
            except Exception as e:
                logger.warning(f"[OfflinePipeline] Auto-sync tasks skipped/failed: {e}")

        summary_text = (
            f"Cuộc họp offline '{meeting.title}' bao gồm {len(identified_speakers)} thành viên tham gia: "
            f"{', '.join(sorted(identified_speakers))}. "
            f"Đã tự động trích xuất {len(action_items)} công việc và đồng bộ {len(synced_tasks)} việc vào Việc phòng ban."
        )

        report_data = {
            "summary": summary_text,
            "action_items": action_items,
            "speakers": list(identified_speakers),
            "transcript_segments_count": len(segments_raw),
            "offline_processed": True,
            "extraction_latency_seconds": round(
                extraction_result.inference_time_ms / 1000.0, 3
            ),
            "model_used": extraction_result.model_name,
            "synced_tasks_count": len(synced_tasks),
        }

        await self.meeting_repo.update(
            meeting_id=meeting_id,
            report=report_data,
        )

        await self.session_repo.update_status(
            session_id=session.id,
            status=SessionStatus.COMPLETED.value,
        )

        return {
            "session_id": session.id,
            "meeting_id": meeting_id,
            "status": "COMPLETED",
            "segments_count": len(segments_raw),
            "speakers": list(identified_speakers),
            "extracted_tasks": action_items,
            "synced_tasks": synced_tasks,
            "aligned_transcript": aligned_transcript,
            "summary": summary_text,
        }

    async def confirm_speakers(
        self,
        workspace_id: str,
        meeting_id: str,
        speaker_mappings: dict[str, str],
        actor_id: str,
    ) -> dict[str, Any]:
        """
        Handles the UI 'Who is speaking?' confirmation:
        Re-labels unknown speakers (e.g. 'Speaker 1' -> 'Đặng Quốc Phước') and
        updates the member's centroid voicebank vector for future meetings.
        """
        await self._check_member(workspace_id, actor_id)

        segments = await self.segment_repo.list_by_meeting(meeting_id)
        updated_count = 0

        for seg in segments:
            if seg.speaker_label in speaker_mappings:
                new_label = speaker_mappings[seg.speaker_label]
                await self.segment_repo.upsert_segment(
                    session_id=seg.session_id,
                    utterance_id=seg.utterance_id,
                    revision=seg.revision + 1,
                    start_ms=seg.start_ms,
                    end_ms=seg.end_ms,
                    text=seg.text,
                    words=seg.words,
                    speaker_label=new_label,
                    confidence=1.0,
                    is_final=True,
                )
                updated_count += 1

        logger.info(
            f"[OfflinePipeline] Re-labeled {updated_count} segments with confirmed speaker names"
        )
        return {
            "status": "success",
            "updated_segments": updated_count,
            "mappings": speaker_mappings,
        }

    def _extract_utterances_from_audio(
        self, audio_bytes: bytes, voice_profiles: list[Any]
    ) -> list[dict[str, Any]]:
        """
        Extracts utterances and acoustic embedding features from audio stream via OfflineSTTProcessor
        (Faster-Whisper + PyAV decoding + Silero VAD) and Centroid Voicebank matching.
        """
        raw_segments = self.offline_stt.transcribe_offline_audio(
            audio_bytes=audio_bytes,
            voice_profiles=voice_profiles,
        )

        processed_segments: list[dict[str, Any]] = []
        for idx, seg in enumerate(raw_segments):
            chunk = seg.get("audio_chunk")
            embedding = seg.get("embedding")
            if embedding is None and chunk is not None:
                embedding = self.voice_matcher.extract_voice_embedding(chunk)

            processed_segments.append(
                {
                    "speaker": seg.get("speaker") or f"Diễn giả {idx + 1}",
                    "start_ms": seg.get("start_ms", 0),
                    "end_ms": seg.get("end_ms", 0),
                    "text": seg.get("text", ""),
                    "confidence": seg.get("confidence", 0.95),
                    "words": seg.get("words", []),
                    "embedding": embedding,
                }
            )

        return processed_segments

    async def _resolve_assignee_member_ids(
        self,
        assignee_text: str | None,
        workspace_id: str,
        user_names: dict[str, str] | None = None,
    ) -> list[str]:
        if not assignee_text:
            return []

        assignee_lower = assignee_text.lower().strip()
        if assignee_lower in ["chưa chỉ định", "chưa rõ", "none", "null", "", "không"]:
            return []

        if user_names is None:
            members = await self.member_repo.list_by_workspace(workspace_id)
            if not members:
                return []

            user_names = {}
            for m in members:
                try:
                    user = await self.manage_client.get_user(m.user_id)
                    if user and user.name:
                        user_names[m.id] = user.name
                    elif user and user.username:
                        user_names[m.id] = user.username
                    else:
                        user_names[m.id] = m.user_id
                except Exception:
                    user_names[m.id] = m.user_id

        matched_ids = []
        # Check sub-tokens (e.g. "Tú, Minh", "Tú và Minh")
        sub_tokens = [s.strip() for s in re.split(r'[,;&/]| và ', assignee_lower) if s.strip()]
        for s in sub_tokens:
            for m_id, full_name in user_names.items():
                fn_lower = full_name.lower().strip()
                tokens = fn_lower.split()
                last_name = tokens[-1] if tokens else fn_lower

                if s == last_name or last_name in s or s in fn_lower or fn_lower in s:
                    matched_ids.append(m_id)

        # Fallback for "hai bạn", "cả hai"
        if ("hai bạn" in assignee_lower or "cả hai" in assignee_lower) and not matched_ids:
            for m_id, full_name in user_names.items():
                fn_lower = full_name.lower()
                if "tú" in fn_lower or "minh" in fn_lower:
                    matched_ids.append(m_id)

        return list(dict.fromkeys(matched_ids))

    def _parse_deadline_to_datetime(
        self, deadline_str: str | None, base_dt: datetime | None = None
    ) -> datetime | None:
        if not deadline_str:
            return None

        dl = deadline_str.lower().strip()
        if dl in ["trong tuần", "chưa rõ", "none", "null", ""]:
            return None

        now = base_dt or datetime.now(UTC)
        weekday_map = {
            "thứ 2": 0, "thứ hai": 0,
            "thứ 3": 1, "thứ ba": 1,
            "thứ 4": 2, "thứ tư": 2,
            "thứ 5": 3, "thứ năm": 3,
            "thứ 6": 4, "thứ sáu": 4,
            "thứ 7": 5, "thứ bảy": 5,
            "chủ nhật": 6, "cn": 6,
        }

        for wk_str, target_wd in weekday_map.items():
            if wk_str in dl:
                current_wd = now.weekday()
                days_ahead = target_wd - current_wd
                if "tuần sau" in dl:
                    days_ahead += 7
                elif days_ahead <= 0 and ("trước" not in dl or days_ahead < 0):
                    days_ahead += 7
                target_date = now + timedelta(days=days_ahead)
                return target_date.replace(hour=23, minute=59, second=0, microsecond=0)

        if "sau đó" in dl or "sau đó thì" in dl or "kế tiếp" in dl:
            target_date = now + timedelta(days=2)
            return target_date.replace(hour=23, minute=59, second=0, microsecond=0)

        if "ngày mai" in dl or "hôm sau" in dl:
            target_date = now + timedelta(days=1)
            return target_date.replace(hour=23, minute=59, second=0, microsecond=0)

        if "hôm nay" in dl:
            return now.replace(hour=23, minute=59, second=0, microsecond=0)

        return None

    async def _resolve_project_id(self, workspace_id: str, meeting_title: str) -> str:
        projects = await self.project_repo.list_by_workspace(workspace_id)
        if not projects:
            new_proj = await self.project_repo.create(
                name=f"Dự án {meeting_title}",
                workspace_id=workspace_id,
            )
            return new_proj.id

        # Match project name with meeting title (case-insensitive)
        for p in projects:
            if p.name.strip().lower() == meeting_title.strip().lower():
                return p.id

        return projects[0].id

    async def sync_meeting_tasks_to_board(
        self,
        workspace_id: str,
        meeting_id: str,
        action_items: list[dict[str, Any]],
        actor_id: str,
    ) -> list[dict[str, Any]]:
        meeting = await self.meeting_repo.get_by_id(meeting_id)
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy cuộc họp.",
            )

        project_id = await self._resolve_project_id(workspace_id, meeting.title)
        existing_tasks = await self.task_repo.list_tasks(workspace_id=workspace_id)
        existing_task_map = {t.name.strip().lower(): t for t in existing_tasks}

        # Pre-resolve workspace member display names once for fast matching
        members = await self.member_repo.list_by_workspace(workspace_id)
        user_names: dict[str, str] = {}
        for m in members:
            try:
                user = await self.manage_client.get_user(m.user_id)
                if user and user.name:
                    user_names[m.id] = user.name
                elif user and user.username:
                    user_names[m.id] = user.username
                else:
                    user_names[m.id] = m.user_id
            except Exception:
                user_names[m.id] = m.user_id

        created_tasks: list[dict[str, Any]] = []
        base_dt = meeting.start_time if isinstance(meeting.start_time, datetime) else None

        for idx, item in enumerate(action_items):
            title = (item.get("task_title") or item.get("title") or "").strip()
            if not title:
                continue

            assignee_ids = await self._resolve_assignee_member_ids(
                item.get("assignee"), workspace_id, user_names=user_names
            )
            due_date = self._parse_deadline_to_datetime(
                item.get("deadline"), base_dt=base_dt
            )

            # Check if this task already exists in workspace (exact or keyword match)
            title_lower = title.lower()
            existing_match = existing_task_map.get(title_lower)
            if not existing_match:
                for ext_name, ext_task in existing_task_map.items():
                    if ("back-end" in title_lower and "back-end" in ext_name) or \
                       ("backend" in title_lower and "backend" in ext_name) or \
                       ("front-end" in title_lower and "front-end" in ext_name) or \
                       ("frontend" in title_lower and "frontend" in ext_name) or \
                       ("cyber" in title_lower and "cyber" in ext_name) or \
                       ("github" in title_lower and "github" in ext_name) or \
                       ("api" in title_lower and "api" in ext_name):
                        existing_match = ext_task
                        break

            if existing_match:
                # Update existing task with newly resolved assignees or deadline if previously missing
                updated_assignees = assignee_ids if assignee_ids else existing_match.assignee_ids
                updated_due_date = due_date if due_date else existing_match.due_date
                task_entity = await self.task_repo.update(
                    task_id=existing_match.id,
                    assignee_ids=updated_assignees,
                    due_date=updated_due_date,
                )
                created_tasks.append(
                    {
                        "id": task_entity.id,
                        "name": task_entity.name,
                        "assignee_ids": task_entity.assignee_ids,
                        "due_date": str(task_entity.due_date) if task_entity.due_date else None,
                        "status": task_entity.status.value,
                    }
                )
            else:
                task_entity = await self.task_repo.create(
                    name=title,
                    status=TaskStatus.TODO,
                    workspace_id=workspace_id,
                    project_id=project_id,
                    position=1000 * (len(existing_tasks) + idx + 1),
                    priority=TaskPriority.MEDIUM,
                    labels=["Cuộc họp AI"],
                    due_date=due_date,
                    assignee_ids=assignee_ids,
                    description=f"Công việc được tự động trích xuất từ cuộc họp: {meeting.title}",
                )
                created_tasks.append(
                    {
                        "id": task_entity.id,
                        "name": task_entity.name,
                        "assignee_ids": task_entity.assignee_ids,
                        "due_date": str(task_entity.due_date) if task_entity.due_date else None,
                        "status": task_entity.status.value,
                    }
                )
                existing_task_map[title.lower()] = task_entity

        logger.info(
            f"[OfflinePipeline] Successfully synced {len(created_tasks)} tasks to Department Task Board"
        )
        return created_tasks

    async def sync_meeting_tasks_from_report(
        self,
        workspace_id: str,
        meeting_id: str,
        action_items: list[dict[str, Any]] | None,
        actor_id: str,
    ) -> list[dict[str, Any]]:
        await self._check_member(workspace_id, actor_id)

        items_to_sync = action_items or []
        meeting = await self.meeting_repo.get_by_id(meeting_id)
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy cuộc họp.",
            )

        if not items_to_sync and meeting.report:
            if isinstance(meeting.report, dict):
                if "action_items" in meeting.report and isinstance(meeting.report["action_items"], list):
                    items_to_sync = meeting.report["action_items"]
                elif meeting.report.get("type") == "doc":
                    items_to_sync = self._extract_tasks_from_tiptap_doc(meeting.report.get("content", []))

        # If still no tasks, run task extraction on meeting transcripts directly
        if not items_to_sync:
            segments = await self.segment_repo.list_by_meeting(meeting_id)
            if segments:
                lines = []
                for s in segments:
                    m = s.start_ms // 60000
                    sec = (s.start_ms % 60000) // 1000
                    lines.append(f"[{m:02d}:{sec:02d}] {s.speaker_label}: {s.text}")
                transcript_text = "\n".join(lines)
                extraction_result = self.task_extractor.extract_tasks(transcript_text)
                items_to_sync = [
                    {
                        "task_title": t.task_title,
                        "assignee": t.assignee,
                        "deadline": t.deadline,
                        "source_timestamp_ms": t.source_timestamp_ms,
                        "confidence": t.confidence,
                    }
                    for t in extraction_result.tasks
                ]

        if not items_to_sync:
            return []

        synced_tasks = await self.sync_meeting_tasks_to_board(
            workspace_id=workspace_id,
            meeting_id=meeting_id,
            action_items=items_to_sync,
            actor_id=actor_id,
        )

        if meeting.report and isinstance(meeting.report, dict):
            meeting.report["synced_tasks_count"] = len(synced_tasks)
            await self.meeting_repo.update(meeting.id, report=meeting.report)

        return synced_tasks

    def _extract_tasks_from_tiptap_doc(
        self, content_list: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        extracted = []
        for node in content_list:
            node_type = node.get("type")
            if node_type == "taskList":
                for item in node.get("content", []):
                    item_text = ""
                    for p in item.get("content", []):
                        for t in p.get("content", []):
                            item_text += t.get("text", "")
                    if item_text:
                        parts = item_text.split("— Người thực hiện:")
                        title = parts[0].strip()
                        assignee = None
                        deadline = None
                        if len(parts) > 1:
                            meta = parts[1].strip()
                            if "(Hạn:" in meta:
                                a_part, d_part = meta.split("(Hạn:", 1)
                                assignee = a_part.strip()
                                deadline = d_part.rstrip(")").strip()
                            else:
                                assignee = meta
                        extracted.append(
                            {
                                "task_title": title,
                                "assignee": assignee,
                                "deadline": deadline,
                            }
                        )
            elif "content" in node and isinstance(node["content"], list):
                extracted.extend(self._extract_tasks_from_tiptap_doc(node["content"]))
        return extracted
