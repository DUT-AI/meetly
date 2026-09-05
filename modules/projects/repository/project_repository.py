from collections.abc import Sequence

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.projects.domain.entities import ProjectEntity
from modules.projects.domain.interfaces import IProjectRepository
from modules.projects.models.project import ProjectModel


class SqlProjectRepository(IProjectRepository):
    """PostgreSQL implementation of IProjectRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        name: str,
        workspace_id: str,
        image_url: str | None = None,
    ) -> ProjectEntity:
        model = ProjectModel(
            name=name,
            workspace_id=workspace_id,
            image_url=image_url,
        )
        self.session.add(model)
        await self.session.flush()
        return model.to_entity()

    async def get_by_id(self, project_id: str) -> ProjectEntity | None:
        stmt = select(ProjectModel).where(ProjectModel.id == project_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def get_by_ids(self, project_ids: Sequence[str]) -> list[ProjectEntity]:
        if not project_ids:
            return []
        stmt = select(ProjectModel).where(ProjectModel.id.in_(project_ids))
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [m.to_entity() for m in models]

    async def list_by_workspace(self, workspace_id: str) -> list[ProjectEntity]:
        stmt = (
            select(ProjectModel)
            .where(ProjectModel.workspace_id == workspace_id)
            .order_by(ProjectModel.created_at.desc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [m.to_entity() for m in models]

    async def update(
        self,
        project_id: str,
        name: str | None = None,
        image_url: str | None = None,
    ) -> ProjectEntity:
        stmt = select(ProjectModel).where(ProjectModel.id == project_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one()
        if name is not None:
            model.name = name
        if image_url is not None:
            model.image_url = image_url
        await self.session.flush()
        return model.to_entity()

    async def delete(self, project_id: str) -> None:
        stmt = delete(ProjectModel).where(ProjectModel.id == project_id)
        await self.session.execute(stmt)
