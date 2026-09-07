from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.assets.domain.interfaces import IAssetRepository
from modules.assets.repository.asset_repository import SqlAssetRepository
from modules.assets.use_cases import (
    DeleteAssetUseCase,
    GetAssetDownloadUrlUseCase,
    GetAssetUseCase,
    ListEntityAssetsUseCase,
    UploadAssetUseCase,
)


class AssetProvider(Provider):
    """Dishka Dependency Injection Provider for Asset domain module."""

    scope = Scope.REQUEST

    @provide
    def get_asset_repository(self, session: AsyncSession) -> IAssetRepository:
        return SqlAssetRepository(session)

    upload_asset_uc = provide(UploadAssetUseCase)
    list_entity_assets_uc = provide(ListEntityAssetsUseCase)
    get_asset_uc = provide(GetAssetUseCase)
    delete_asset_uc = provide(DeleteAssetUseCase)
    get_download_url_uc = provide(GetAssetDownloadUrlUseCase)
