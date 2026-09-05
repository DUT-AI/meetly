from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class S3Settings(BaseSettings):
    """S3 / MinIO Storage Configuration."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = ""
    minio_secret_key: str = ""
    minio_root_user: str = ""
    minio_root_password: str = ""
    minio_secure: bool = False
    default_bucket: str = "meetly-uploads"
    minio_public_endpoint: str | None = None

    @property
    def access_key(self) -> str:
        return self.minio_access_key or self.minio_root_user

    @property
    def secret_key(self) -> str:
        return self.minio_secret_key or self.minio_root_password

    @property
    def public_minio_endpoint(self) -> str:
        return (self.minio_public_endpoint or self.minio_endpoint).rstrip("/")

    @property
    def is_secure(self) -> bool:
        return self.minio_secure or self.minio_endpoint.startswith("https://")
