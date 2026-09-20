from enum import IntEnum, StrEnum


class SessionStatus(StrEnum):
    """Transcription Session Lifecycle Status."""

    CREATED = "CREATED"
    STREAMING = "STREAMING"
    FINALIZING = "FINALIZING"
    RECORDED = "RECORDED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class SourceType(StrEnum):
    """Origin source of the audio stream."""

    GOOGLE_MEET = "GOOGLE_MEET"
    DISCORD = "DISCORD"
    WEB_MIC = "WEB_MIC"
    FILE_UPLOAD = "FILE_UPLOAD"


class StreamId(IntEnum):
    """Identifier for audio streams in binary frames."""

    TAB = 1  # Remote participants from Google Meet tab
    MIC = 2  # Local user microphone


class SpeakerLabel(StrEnum):
    """Speaker classification label before offline diarization."""

    LOCAL_USER = "LOCAL_USER"
    REMOTE_SPEAKER = "REMOTE_SPEAKER"
    UNKNOWN = "UNKNOWN"
