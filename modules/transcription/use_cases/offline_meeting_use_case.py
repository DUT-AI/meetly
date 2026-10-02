import time
from typing import Any

from fastapi import HTTPException, status
from loguru import logger

from modules.ai_engine.infrastructure.qwen_extractor import QwenTaskExtractorService
from modules.meetings.domain.interfaces import IMeetingRepository
from modules.members.domain.interfaces import IMemberRepository
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
        offline_stt: OfflineSTTProcessor,
    ) -> None:
        self.session_repo = session_repo
        self.segment_repo = segment_repo
        self.voice_repo = voice_repo
        self.meeting_repo = meeting_repo
        self.member_repo = member_repo
        self.whisper_engine = whisper_engine
        self.task_extractor = task_extractor or QwenTaskExtractorService()
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

        # Parse audio segments (demonstrative multi-speaker sample if test bytes, or real whisper)
        segments_raw = self._extract_utterances_from_audio(audio_bytes, voice_profiles)

        aligned_lines = []
        identified_speakers = set()

        for idx, seg in enumerate(segments_raw):
            utterance_id = f"utt_{session.id}_{idx:04d}"

            # Step 3b: Match speaker embedding against Voicebank
            speaker_name = seg["speaker"]
            confidence = seg.get("confidence", 0.95)

            if seg.get("embedding"):
                matched_profile, score = self.voice_matcher.match_speaker(
                    query_vector=seg["embedding"],
                    profiles=voice_profiles,
                )
                if matched_profile:
                    speaker_name = matched_profile.member_name
                    confidence = score

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

        summary_text = (
            f"Cuộc họp offline '{meeting.title}' bao gồm {len(identified_speakers)} thành viên tham gia: "
            f"{', '.join(sorted(identified_speakers))}. "
            f"Đã tự động trích xuất {len(action_items)} công việc cần hoàn thành."
        )

        report_data = self._build_tiptap_report(
            title=meeting.title,
            summary=summary_text,
            speakers=list(identified_speakers),
            tasks=action_items,
        )
        report_data["transcript_segments_count"] = len(segments_raw)
        report_data["offline_processed"] = True
        report_data["extraction_latency_seconds"] = round(
            extraction_result.inference_time_ms / 1000.0, 3
        )
        report_data["model_used"] = extraction_result.model_name

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

    @staticmethod
    def _build_tiptap_report(
        title: str,
        summary: str,
        speakers: list[str],
        tasks: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Builds a valid ProseMirror / TipTap doc JSON representation of the meeting report
        while maintaining top-level metadata compatibility (summary, action_items, speakers).
        """
        content_nodes: list[dict[str, Any]] = [
            {
                "type": "heading",
                "attrs": {"level": 1},
                "content": [{"type": "text", "text": f"Báo cáo Cuộc họp: {title}"}],
            },
            {
                "type": "heading",
                "attrs": {"level": 2},
                "content": [{"type": "text", "text": "📋 Tóm tắt Cuộc họp"}],
            },
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": summary}],
            },
        ]

        if speakers:
            content_nodes.extend(
                [
                    {
                        "type": "heading",
                        "attrs": {"level": 3},
                        "content": [{"type": "text", "text": "👥 Thành viên tham gia"}],
                    },
                    {
                        "type": "bulletList",
                        "content": [
                            {
                                "type": "listItem",
                                "content": [
                                    {
                                        "type": "paragraph",
                                        "content": [{"type": "text", "text": spk}],
                                    }
                                ],
                            }
                            for spk in sorted(speakers)
                        ],
                    },
                ]
            )

        task_items_nodes = []
        for t in tasks:
            assignee = t.get("assignee") or "Chưa rõ"
            deadline = t.get("deadline") or "Chưa rõ"
            task_title = t.get("task_title") or "Nhiệm vụ"
            task_items_nodes.append(
                {
                    "type": "taskItem",
                    "attrs": {"checked": False},
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {
                                    "type": "text",
                                    "marks": [{"type": "bold"}],
                                    "text": f"{task_title}: ",
                                },
                                {
                                    "type": "text",
                                    "text": f"Giao cho {assignee} (Hạn: {deadline})",
                                },
                            ],
                        }
                    ],
                }
            )

        content_nodes.append(
            {
                "type": "heading",
                "attrs": {"level": 2},
                "content": [
                    {
                        "type": "text",
                        "text": f"✅ Nhiệm vụ & Action Items ({len(tasks)})",
                    }
                ],
            }
        )

        if task_items_nodes:
            content_nodes.append(
                {
                    "type": "taskList",
                    "content": task_items_nodes,
                }
            )
        else:
            content_nodes.append(
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Không phát hiện Action Item nào trong cuộc họp.",
                        }
                    ],
                }
            )

        return {
            "type": "doc",
            "content": content_nodes,
            "summary": summary,
            "action_items": tasks,
            "speakers": speakers,
        }
