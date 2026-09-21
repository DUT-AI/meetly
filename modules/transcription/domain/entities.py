from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from modules.transcription.domain.enums import SessionStatus, SourceType, SpeakerLabel


@dataclass
class TranscriptionSessionEntity:
    id: str
    meeting_id: str
    workspace_id: str
    status: str = SessionStatus.CREATED.value
    source_type: str = SourceType.GOOGLE_MEET.value
    sample_rate: int = 16000
    duration_samples: int = 0
    stt_model: str = "openai/whisper-small"
    recording_asset_id: str | None = None
    created_by: str = ""
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class TranscriptSegmentEntity:
    id: str
    session_id: str
    utterance_id: str
    revision: int = 1
    start_ms: int = 0
    end_ms: int = 0
    text: str = ""
    words: list[dict[str, Any]] = field(default_factory=list)
    speaker_label: str = SpeakerLabel.UNKNOWN.value
    confidence: float = 1.0
    is_final: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None
