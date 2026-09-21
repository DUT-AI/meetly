from typing import Any
from pydantic import BaseModel, Field


class CreateSessionRequest(BaseModel):
    source_type: str = "GOOGLE_MEET"
    sample_rate: int = 16000
    stt_model: str = "openai/whisper-small"


class SessionResponse(BaseModel):
    session_id: str
    meeting_id: str
    workspace_id: str
    status: str
    source_type: str
    sample_rate: int
    producer_ticket: str | None = None
    subscriber_ticket: str | None = None
    ticket_expires_in: int = 60


class StopSessionRequest(BaseModel):
    total_samples: int = 0
    last_seq: int = 0
    recording_part_count: int = 0


class TranscriptWordDTO(BaseModel):
    word: str
    start_ms: int
    end_ms: int
    score: float = 1.0


class TranscriptSegmentDTO(BaseModel):
    id: str
    session_id: str
    utterance_id: str
    revision: int = 1
    start_ms: int
    end_ms: int
    text: str
    translation: str | None = None
    words: list[dict[str, Any]] = Field(default_factory=list)
    speaker_label: str = "UNKNOWN"
    confidence: float = 1.0
    is_final: bool = True


class MeetingTranscriptsResponse(BaseModel):
    session: SessionResponse | None = None
    recording_url: str | None = None
    segments: list[TranscriptSegmentDTO] = Field(default_factory=list)
