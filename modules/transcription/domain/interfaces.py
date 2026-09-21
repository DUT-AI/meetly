from abc import ABC, abstractmethod
from typing import Any

from modules.transcription.domain.entities import (
    TranscriptSegmentEntity,
    TranscriptionSessionEntity,
)


class ITranscriptionSessionRepository(ABC):
    """Repository interface for transcription sessions."""

    @abstractmethod
    async def create(
        self,
        meeting_id: str,
        workspace_id: str,
        created_by: str,
        source_type: str = "GOOGLE_MEET",
        sample_rate: int = 16000,
        stt_model: str = "openai/whisper-small",
    ) -> TranscriptionSessionEntity:
        pass

    @abstractmethod
    async def get_by_id(self, session_id: str) -> TranscriptionSessionEntity | None:
        pass

    @abstractmethod
    async def get_active_session_by_meeting(
        self, meeting_id: str
    ) -> TranscriptionSessionEntity | None:
        pass

    @abstractmethod
    async def update_status(
        self,
        session_id: str,
        status: str,
        duration_samples: int | None = None,
        recording_asset_id: str | None = None,
    ) -> TranscriptionSessionEntity:
        pass


class ITranscriptSegmentRepository(ABC):
    """Repository interface for persisted transcript segments."""

    @abstractmethod
    async def upsert_segment(
        self,
        session_id: str,
        utterance_id: str,
        revision: int,
        start_ms: int,
        end_ms: int,
        text: str,
        words: list[dict[str, Any]],
        translation: str | None = None,
        speaker_label: str = "UNKNOWN",
        confidence: float = 1.0,
        is_final: bool = True,
    ) -> TranscriptSegmentEntity:
        pass

    @abstractmethod
    async def list_by_session(
        self, session_id: str
    ) -> list[TranscriptSegmentEntity]:
        pass

    @abstractmethod
    async def list_by_meeting(
        self, meeting_id: str
    ) -> list[TranscriptSegmentEntity]:
        pass
