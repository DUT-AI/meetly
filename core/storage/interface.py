from abc import ABC, abstractmethod
from typing import BinaryIO


class IStorageProvider(ABC):
    """Abstract interface for S3 / Object Storage Operations."""

    @abstractmethod
    async def upload(
        self,
        bucket: str,
        key: str,
        data: BinaryIO,
        content_type: str | None = None,
    ) -> str:
        """Upload data stream to object storage and return relative URI (e.g. /{bucket}/{key})."""

    @abstractmethod
    async def get_presigned_url(
        self, bucket: str, key: str, expires: int = 3600
    ) -> str:
        """Generate a presigned GET URL for temporary downloading."""

    @abstractmethod
    async def delete(self, bucket: str, key: str) -> None:
        """Delete an object from bucket."""

    @abstractmethod
    def build_public_url(self, uri_or_path: str, bucket: str | None = None) -> str:
        """Build a full public direct GET URL from a relative object path."""
