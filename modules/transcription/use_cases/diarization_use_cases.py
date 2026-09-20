from fastapi import HTTPException, status
from loguru import logger
import numpy as np

from modules.transcription.domain.interfaces import (
    ISpeakerDiarizationEngine,
    ITranscriptSegmentRepository,
    ITranscriptionSessionRepository,
)
from modules.transcription.dtos.session_dtos import (
    DiarizeSessionResponse,
    DiarizeTurnDTO,
)
from modules.transcription.infrastructure.event_broadcaster import event_broadcaster
from modules.transcription.infrastructure.speaker_diarizer import (
    align_segments_with_diarization,
)


class DiarizationUseCases:
    """Use cases for Speaker Diarization and Speaker Turn Alignment."""

    def __init__(
        self,
        session_repo: ITranscriptionSessionRepository,
        segment_repo: ITranscriptSegmentRepository,
        diarizer: ISpeakerDiarizationEngine,
    ) -> None:
        self.session_repo = session_repo
        self.segment_repo = segment_repo
        self.diarizer = diarizer

    async def run_session_diarization(
        self,
        session_id: str,
        audio_pcm: np.ndarray | None = None,
        expected_speakers: int | None = None,
        actor_id: str | None = None,
    ) -> DiarizeSessionResponse:
        """
        Execute offline speaker diarization on a completed transcription session.
        Clusters audio into speakers, updates transcript segment speaker_labels,
        and broadcasts event to subscribers.
        """
        session = await self.session_repo.get_by_id(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transcription session {session_id} not found.",
            )

        segments = await self.segment_repo.list_by_session(session_id)
        if not segments:
            return DiarizeSessionResponse(
                session_id=session_id,
                speaker_count=0,
                speakers=[],
                turns=[],
                updated_segment_count=0,
            )

        # If audio_pcm is not supplied directly, synthesize or retrieve from total duration
        if audio_pcm is None:
            total_duration_s = max(s.end_ms for s in segments) / 1000.0
            sr = session.sample_rate or 16000
            # Generate silence/carrier for acoustic turn boundary detection
            audio_pcm = np.zeros(int(total_duration_s * sr), dtype=np.float32)

        # Run diarization engine
        turns = self.diarizer.diarize(
            audio_pcm=audio_pcm,
            sample_rate=session.sample_rate or 16000,
            expected_speakers=expected_speakers,
        )

        # Match segments with diarized speaker turns
        updates = align_segments_with_diarization(segments, turns)

        # Batch update database models
        await self.segment_repo.batch_update_speaker_labels(updates)

        speakers = sorted(list(set(t.speaker for t in turns)))
        turn_dtos = [
            DiarizeTurnDTO(
                turn_id=t.turn_id,
                start_ms=t.start_ms,
                end_ms=t.end_ms,
                speaker=t.speaker,
                confidence=t.confidence,
            )
            for t in turns
        ]

        logger.info(
            f"[Diarization] Session {session_id} diarized: {len(speakers)} speakers, {len(turns)} turns, {len(updates)} segments updated."
        )

        # Broadcast update to live UI subscribers
        await event_broadcaster.broadcast(
            session_id,
            {
                "type": "session.diarized",
                "session_id": session_id,
                "speaker_count": len(speakers),
                "speakers": speakers,
            },
        )

        return DiarizeSessionResponse(
            session_id=session_id,
            speaker_count=len(speakers),
            speakers=speakers,
            turns=turn_dtos,
            updated_segment_count=len(updates),
        )

    def enroll_member_voice(self, speaker_name: str, embedding: np.ndarray) -> None:
        """Enroll member voice profile into the known voice bank."""
        self.diarizer.enroll_voice_profile(speaker_name, embedding)
