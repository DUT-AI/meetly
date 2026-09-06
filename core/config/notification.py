from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class NotificationSettings(BaseSettings):
    """Notification & External Bot Configuration."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    discord_bot_token: str = ""
    zalo_bot_token: str = ""
    app_url: str = "http://localhost:3000"
    environment: str = "development"


notification_settings = NotificationSettings()
