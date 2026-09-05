from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class AuthSettings(BaseSettings):
    """Auth Configuration matching dut-ai-data-platform."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Security & JWT
    jwt_secret_key: str = "change-this-to-a-very-secure-secret-key-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # Cookie Authentication
    auth_cookie_name: str = "access_token"
    auth_cookie_secure: bool = False
    auth_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    auth_cookie_max_age: int = 86400

    # Auth Server
    auth_server_url: str = "http://localhost:8000/api/v1/auth/login"
    get_me_url: str = ""
    api_time_out: float = 10.0

    @property
    def login_url(self) -> str:
        url = self.auth_server_url.rstrip("/")
        if url.endswith(("/auth/login", "/login")):
            return url
        return f"{url}/auth/login"

    @property
    def me_url(self) -> str:
        if self.get_me_url:
            return self.get_me_url
        url = self.auth_server_url.rstrip("/")
        if url.endswith("/auth/login"):
            base = url[: -len("/login")]
            return f"{base}/me"
        if url.endswith("/login"):
            base = url[: -len("/login")]
            return f"{base}/me"
        return f"{url}/auth/me"


auth_settings = AuthSettings()
