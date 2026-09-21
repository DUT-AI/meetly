from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class STTSettings(BaseSettings):
    """Streaming STT & Transcription Configuration."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    stt_model_id: str = "tiny"
    stt_device: str = "auto"  # "auto", "cuda", "cpu"
    stt_compute_type: str = "auto"  # "auto", "float16", "int8", "float32"
    stt_vad_threshold: float = 0.5
    stt_context_window_s: float = 2.5
    stt_step_size_ms: int = 400
    stt_sample_rate: int = 16000
    stt_ticket_ttl_seconds: int = 60


stt_settings = STTSettings()
