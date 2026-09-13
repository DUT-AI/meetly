import re
from datetime import UTC, datetime
from typing import BinaryIO

from fastapi import HTTPException, status

from core.config import s3_settings
from core.storage.interface import IStorageProvider
from core.utils.id_generator import generate_ulid
from modules.assets.domain.entities import AssetEntity
from modules.assets.domain.enums import AssetCategory, detect_category
from modules.assets.domain.interfaces import IAssetRepository

DANGEROUS_EXTENSIONS = {
    "exe",
    "bat",
    "cmd",
    "sh",
    "vbs",
    "msi",
    "com",
    "scr",
    "pif",
    "jar",
    "reg",
}


def sanitize_filename(filename: str) -> str:
    """Strip dangerous characters and keep filename clean."""
    clean = re.sub(r"[^\w\.\-\s]", "_", filename).strip()
    return clean or "unnamed_file"


class UploadAssetUseCase:
    """Upload file stream to S3/MinIO and register polymorphic Asset metadata."""

    def __init__(
        self,
        asset_repo: IAssetRepository,
        storage_provider: IStorageProvider,
    ) -> None:
        self.asset_repo = asset_repo
        self.storage_provider = storage_provider

    async def execute(
        self,
        workspace_id: str,
        entity_type: str,
        entity_id: str,
        file_name: str,
        file_data: BinaryIO,
        file_size: int,
        mime_type: str,
        uploaded_by: str,
    ) -> AssetEntity:
        # 1. Detect extension and category
        extension, category = detect_category(file_name, mime_type)

        # 2. Security validation
        if extension in DANGEROUS_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tệp với định dạng .{extension} không được phép tải lên vì lý do an toàn.",
            )

        asset_id = generate_ulid()
        safe_name = sanitize_filename(file_name)
        bucket = s3_settings.default_bucket

        # 3. Construct clean storage key: workspaces/{ws_id}/{entity_type_lower}/{entity_id}/{asset_id}_{safe_name}
        storage_key = f"workspaces/{workspace_id}/{entity_type.lower()}/{entity_id}/{asset_id}_{safe_name}"

        # 4. Upload to Object Storage
        await self.storage_provider.upload(
            bucket=bucket,
            key=storage_key,
            data=file_data,
            content_type=mime_type,
        )

        now = datetime.now(UTC)
        download_url = await self.storage_provider.get_presigned_url(
            bucket, storage_key, expires=3600
        )
        preview_url = (
            self.storage_provider.build_public_url(f"/{bucket}/{storage_key}")
            if category == AssetCategory.IMAGE
            else None
        )

        # 5. Save metadata into database
        asset = AssetEntity(
            id=asset_id,
            workspace_id=workspace_id,
            entity_type=entity_type.upper(),
            entity_id=entity_id,
            file_name=file_name,
            storage_key=storage_key,
            bucket=bucket,
            file_size=file_size,
            mime_type=mime_type or "application/octet-stream",
            extension=extension,
            category=category,
            uploaded_by=str(uploaded_by),
            created_at=now,
            updated_at=now,
            metadata={},
            download_url=download_url,
            preview_url=preview_url,
        )

        return await self.asset_repo.create(asset)
