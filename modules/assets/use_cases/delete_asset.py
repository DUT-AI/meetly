from fastapi import HTTPException, status
from loguru import logger

from core.storage.interface import IStorageProvider
from modules.assets.domain.interfaces import IAssetRepository


class DeleteAssetUseCase:
    """Delete asset metadata and clean up storage object."""

    def __init__(
        self,
        asset_repo: IAssetRepository,
        storage_provider: IStorageProvider,
    ) -> None:
        self.asset_repo = asset_repo
        self.storage_provider = storage_provider

    async def execute(self, asset_id: str, current_user_id: str | None = None) -> bool:
        asset = await self.asset_repo.get_by_id(asset_id)
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tệp đính kèm không tồn tại.",
            )

        # Remove from database
        deleted = await self.asset_repo.delete(asset_id)

        # Remove object from S3/MinIO
        try:
            await self.storage_provider.delete(asset.bucket, asset.storage_key)
        except Exception as e:
            logger.warning(f"Failed to delete S3 object {asset.storage_key}: {e}")

        return deleted
