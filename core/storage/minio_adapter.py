import asyncio
from typing import BinaryIO

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from core.storage.interface import IStorageProvider
from core.storage.url_builder import build_storage_public_url


class MinIOStorageAdapter(IStorageProvider):
    """S3 / MinIO storage adapter implementation."""

    def __init__(
        self,
        endpoint_url: str,
        access_key: str,
        secret_key: str,
        secure: bool = False,
        public_endpoint_url: str | None = None,
    ) -> None:
        self.endpoint_url = endpoint_url
        self.public_endpoint_url = (public_endpoint_url or endpoint_url).rstrip("/")
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version="s3v4"),
            verify=secure,
        )

    def build_public_url(self, uri_or_path: str, bucket: str | None = None) -> str:
        return build_storage_public_url(
            uri_or_path, self.public_endpoint_url, bucket=bucket
        )

    async def upload(
        self,
        bucket: str,
        key: str,
        data: BinaryIO,
        content_type: str | None = None,
    ) -> str:
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None,
            lambda: self.client.upload_fileobj(data, bucket, key, ExtraArgs=extra_args),
        )
        clean_key = key.lstrip("/")
        return f"/{bucket}/{clean_key}"

    async def get_presigned_url(
        self, bucket: str, key: str, expires: int = 3600
    ) -> str:
        clean_key = key.lstrip("/")
        loop = asyncio.get_running_loop()
        url = await loop.run_in_executor(
            None,
            lambda: self.client.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": bucket, "Key": clean_key},
                ExpiresIn=expires,
            ),
        )
        return str(url)

    async def delete(self, bucket: str, key: str) -> None:
        clean_key = key.lstrip("/")
        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(
                None,
                lambda: self.client.delete_object(Bucket=bucket, Key=clean_key),
            )
        except ClientError:
            pass
