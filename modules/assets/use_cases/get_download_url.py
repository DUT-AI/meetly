from fastapi import HTTPException, status

from core.storage.interface import IStorageProvider
from modules.assets.domain.interfaces import IAssetRepository
from modules.assets.dtos.asset_dtos import AssetDownloadResponseDTO


class GetAssetDownloadUrlUseCase:
    """Generate fresh presigned download URL for an asset."""

    def __init__(
        self,
        asset_repo: IAssetRepository,
        storage_provider: IStorageProvider,
    ) -> None:
        self.asset_repo = asset_repo
        self.storage_provider = storage_provider

    async def execute(
        self, asset_id: str, expires_in: int = 3600
    ) -> AssetDownloadResponseDTO:
        asset = await self.asset_repo.get_by_id(asset_id)
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tệp đính kèm không tồn tại.",
            )

        url = await self.storage_provider.get_presigned_url(
            asset.bucket, asset.storage_key, expires=expires_in
        )

        return AssetDownloadResponseDTO(
            download_url=url,
            file_name=asset.file_name,
            mime_type=asset.mime_type,
            expires_in=expires_in,
        )
