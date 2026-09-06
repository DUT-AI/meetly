from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.workspaces.domain.entities import WorkspaceLabelEntity
from modules.workspaces.domain.interfaces import IWorkspaceLabelRepository
from modules.workspaces.models.label import WorkspaceLabelModel


class SqlWorkspaceLabelRepository(IWorkspaceLabelRepository):
    """PostgreSQL implementation of IWorkspaceLabelRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        workspace_id: str,
        name: str,
        color: str,
    ) -> WorkspaceLabelEntity:
        model = WorkspaceLabelModel(
            workspace_id=workspace_id,
            name=name,
            color=color,
        )
        self.session.add(model)
        await self.session.flush()
        return model.to_entity()

    async def get_by_id(self, label_id: str) -> WorkspaceLabelEntity | None:
        stmt = select(WorkspaceLabelModel).where(WorkspaceLabelModel.id == label_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def get_by_workspace_and_name(
        self, workspace_id: str, name: str
    ) -> WorkspaceLabelEntity | None:
        stmt = select(WorkspaceLabelModel).where(
            WorkspaceLabelModel.workspace_id == workspace_id,
            WorkspaceLabelModel.name == name,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def list_by_workspace(self, workspace_id: str) -> list[WorkspaceLabelEntity]:
        stmt = (
            select(WorkspaceLabelModel)
            .where(WorkspaceLabelModel.workspace_id == workspace_id)
            .order_by(WorkspaceLabelModel.name.asc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [m.to_entity() for m in models]

    async def update(
        self,
        label_id: str,
        name: str | None = None,
        color: str | None = None,
    ) -> WorkspaceLabelEntity:
        stmt = select(WorkspaceLabelModel).where(WorkspaceLabelModel.id == label_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one()

        if name is not None:
            model.name = name
        if color is not None:
            model.color = color

        await self.session.flush()
        return model.to_entity()

    async def delete(self, label_id: str) -> None:
        stmt = delete(WorkspaceLabelModel).where(WorkspaceLabelModel.id == label_id)
        await self.session.execute(stmt)
