from core.config.app import AppSettings
from core.config.auth import AuthSettings, auth_settings
from core.config.database import DatabaseSettings
from core.config.manage_client import ManageSettings, manage_settings
from core.config.redis import RedisSettings
from core.config.s3 import S3Settings

settings = AppSettings()
app_settings = settings
db_settings = DatabaseSettings()
redis_settings = RedisSettings()
s3_settings = S3Settings()

__all__ = [
    "AppSettings",
    "AuthSettings",
    "DatabaseSettings",
    "ManageSettings",
    "RedisSettings",
    "S3Settings",
    "app_settings",
    "auth_settings",
    "db_settings",
    "manage_settings",
    "redis_settings",
    "s3_settings",
    "settings",
]
