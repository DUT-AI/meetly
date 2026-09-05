from collections.abc import Sequence

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.workspaces.domain.entities import WorkspaceEntity
from modules.workspaces.domain.interfaces import IWorkspaceRepository
from modules.workspaces.models.workspace import WorkspaceModel


class SqlWorkspaceRepository(IWorkspaceRepository):
    """PostgreSQL implementation of IWorkspaceRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        name: str,
        owner_id: str,
        invite_code: str,
        image_url: str | None = None,
    ) -> WorkspaceEntity:
        model = WorkspaceModel(
            name=name,
            owner_id=owner_id,
            invite_code=invite_code,
            image_url=image_url,
        )
        self.session.add(model)
        await self.session.flush()
        return model.to_entity()

    async def get_by_id(self, workspace_id: str) -> WorkspaceEntity | None:
        stmt = select(WorkspaceModel).where(WorkspaceModel.id == workspace_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def get_by_ids(self, workspace_ids: Sequence[str]) -> list[WorkspaceEntity]:
        if not workspace_ids:
            return []
        stmt = (
            select(WorkspaceModel)
            .where(WorkspaceModel.id.in_(workspace_ids))
            .order_by(WorkspaceModel.created_at.desc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [m.to_entity() for m in models]

    async def get_by_invite_code(self, invite_code: str) -> WorkspaceEntity | None:
        stmt = select(WorkspaceModel).where(WorkspaceModel.invite_code == invite_code)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def update(
        self,
        workspace_id: str,
        name: str | None = None,
        image_url: str | None = None,
        invite_code: str | None = None,
    ) -> WorkspaceEntity:
        stmt = select(WorkspaceModel).where(WorkspaceModel.id == workspace_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one()
        if name is not None:
            model.name = name
        if image_url is not None:
            model.image_url = image_url
        if invite_code is not None:
            model.invite_code = invite_code
        await self.session.flush()
        return model.to_entity()

    async def delete(self, workspace_id: str) -> None:
        stmt = delete(WorkspaceModel).where(WorkspaceModel.id == workspace_id)
        await self.session.execute(stmt)
