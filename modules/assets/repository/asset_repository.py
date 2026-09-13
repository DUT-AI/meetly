from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.assets.domain.entities import AssetEntity
from modules.assets.domain.interfaces import IAssetRepository
from modules.assets.models.asset import AssetModel


class SqlAssetRepository(IAssetRepository):
    """PostgreSQL Async implementation of IAssetRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, asset: AssetEntity) -> AssetEntity:
        model = AssetModel(
            id=asset.id,
            workspace_id=asset.workspace_id,
            entity_type=asset.entity_type,
            entity_id=asset.entity_id,
            file_name=asset.file_name,
            storage_key=asset.storage_key,
            bucket=asset.bucket,
            file_size=asset.file_size,
            mime_type=asset.mime_type,
            extension=asset.extension,
            category=asset.category.value,
            metadata_=asset.metadata,
            uploaded_by=str(asset.uploaded_by),
        )
        self.session.add(model)
        await self.session.flush()
        return model.to_entity()

    async def get_by_id(self, asset_id: str) -> AssetEntity | None:
        stmt = select(AssetModel).where(AssetModel.id == asset_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def list_by_entity(
        self,
        workspace_id: str,
        entity_type: str,
        entity_id: str,
    ) -> list[AssetEntity]:
        stmt = (
            select(AssetModel)
            .where(
                AssetModel.workspace_id == workspace_id,
                AssetModel.entity_type == entity_type,
                AssetModel.entity_id == entity_id,
            )
            .order_by(AssetModel.created_at.desc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [m.to_entity() for m in models]

    async def list_by_workspace(
        self,
        workspace_id: str,
        skip: int = 0,
        limit: int = 50,
        category: str | None = None,
    ) -> tuple[list[AssetEntity], int]:
        query = select(AssetModel).where(AssetModel.workspace_id == workspace_id)
        count_query = select(func.count(AssetModel.id)).where(
            AssetModel.workspace_id == workspace_id
        )

        if category:
            query = query.where(AssetModel.category == category)
            count_query = count_query.where(AssetModel.category == category)

        total_res = await self.session.execute(count_query)
        total = total_res.scalar_one() or 0

        query = query.order_by(AssetModel.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        models = result.scalars().all()

        return [m.to_entity() for m in models], total

    async def delete(self, asset_id: str) -> bool:
        stmt = delete(AssetModel).where(AssetModel.id == asset_id)
        res = await self.session.execute(stmt)
        await self.session.flush()
        return (res.rowcount or 0) > 0

    async def delete_by_entity(
        self, entity_type: str, entity_id: str
    ) -> list[AssetEntity]:
        select_stmt = select(AssetModel).where(
            AssetModel.entity_type == entity_type,
            AssetModel.entity_id == entity_id,
        )
        result = await self.session.execute(select_stmt)
        models = list(result.scalars().all())
        entities = [m.to_entity() for m in models]

        delete_stmt = delete(AssetModel).where(
            AssetModel.entity_type == entity_type,
            AssetModel.entity_id == entity_id,
        )
        await self.session.execute(delete_stmt)
        await self.session.flush()
        return entities
