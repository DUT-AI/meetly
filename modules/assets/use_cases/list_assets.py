from core.storage.interface import IStorageProvider
from modules.assets.domain.entities import AssetEntity
from modules.assets.domain.enums import AssetCategory
from modules.assets.domain.interfaces import IAssetRepository


class ListEntityAssetsUseCase:
    """List assets attached to a specific entity with generated access URLs."""

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
    ) -> list[AssetEntity]:
        assets = await self.asset_repo.list_by_entity(
            workspace_id=workspace_id,
            entity_type=entity_type.upper(),
            entity_id=entity_id,
        )

        # Enrich with download / preview URLs
        for asset in assets:
            try:
                asset.download_url = await self.storage_provider.get_presigned_url(
                    asset.bucket, asset.storage_key, expires=3600
                )
                if asset.category == AssetCategory.IMAGE:
                    asset.preview_url = self.storage_provider.build_public_url(
                        f"/{asset.bucket}/{asset.storage_key}"
                    )
            except Exception:
                pass

        return assets
