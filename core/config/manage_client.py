from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class ManageSettings(BaseSettings):
    """Manage Client Configuration loaded directly from .env without fallback."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    user_options_endpoint: str = ""
    user_detail_endpoint: str = ""
    manage_api_token: str = ""
    auth_api_key: str = ""
    api_timeout: float = 10.0
    user_cache_ttl: int = 86400  # 24 hours default for single user cache
    users_list_cache_ttl: int = 300  # 5 minutes default for user list cache

    @property
    def token(self) -> str:
        return self.manage_api_token or self.auth_api_key

    @property
    def users_options_url(self) -> str:
        return self.user_options_endpoint

    @property
    def users_detail_url(self) -> str:
        return self.user_detail_endpoint


manage_settings = ManageSettings()
