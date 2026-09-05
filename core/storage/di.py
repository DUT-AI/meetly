from dishka import Provider, Scope, provide

from core.config import s3_settings
from core.storage.interface import IStorageProvider
from core.storage.minio_adapter import MinIOStorageAdapter


class StorageProvider(Provider):
    """Dishka provider for MinIO / S3 Object Storage adapter."""

    scope = Scope.APP

    @provide
    def get_storage_provider(self) -> IStorageProvider:
        return MinIOStorageAdapter(
            endpoint_url=s3_settings.minio_endpoint,
            access_key=s3_settings.access_key,
            secret_key=s3_settings.secret_key,
            secure=s3_settings.is_secure,
            public_endpoint_url=s3_settings.public_minio_endpoint,
        )
