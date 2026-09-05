from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class ManageSettings(BaseSettings):
    """Manage Client Configuration matching dut-ai-data-platform."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    user_endpoint: str = ""
    manage_api_token: str = ""
    auth_api_key: str = ""
    api_timeout: float = 10.0

    @property
    def token(self) -> str:
        return self.manage_api_token or self.auth_api_key

    @property
    def users_url(self) -> str:
        if self.user_endpoint:
            return self.user_endpoint
        from core.config.auth import auth_settings

        base = auth_settings.auth_server_url.rstrip("/")
        if "/auth" in base:
            base = base.split("/auth")[0]
        return f"{base}/users"


manage_settings = ManageSettings()
