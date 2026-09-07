from fastapi import HTTPException, status

from core.storage.interface import IStorageProvider
from modules.assets.domain.entities import AssetEntity
from modules.assets.domain.enums import AssetCategory
from modules.assets.domain.interfaces import IAssetRepository


class GetAssetUseCase:
    """Retrieve single asset by ID."""

    def __init__(
        self,
        asset_repo: IAssetRepository,
        storage_provider: IStorageProvider,
    ) -> None:
        self.asset_repo = asset_repo
        self.storage_provider = storage_provider

    async def execute(self, asset_id: str) -> AssetEntity:
        asset = await self.asset_repo.get_by_id(asset_id)
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tệp đính kèm không tồn tại.",
            )

        asset.download_url = await self.storage_provider.get_presigned_url(
            asset.bucket, asset.storage_key, expires=3600
        )
        if asset.category == AssetCategory.IMAGE:
            asset.preview_url = self.storage_provider.build_public_url(
                f"/{asset.bucket}/{asset.storage_key}"
            )

        return asset
