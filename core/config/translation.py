from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class TranslationSettings(BaseSettings):
    """Real-time Streaming Translation Configuration."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    translation_enabled: bool = True
    translation_service_url: str = "http://100.84.133.34:8005"
    translation_source_lang: str = "vie"
    translation_target_lang: str = "eng"
    translation_timeout_s: float = 3.0


translation_settings = TranslationSettings()
