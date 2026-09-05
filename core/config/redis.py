from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class RedisSettings(BaseSettings):
    """Redis Cache & Message Broker Configuration."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    redis_url: str = "redis://localhost:6379/0"

    @property
    def url(self) -> str:
        return self.redis_url
