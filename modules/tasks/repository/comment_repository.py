from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.tasks.domain.entities import TaskCommentEntity
from modules.tasks.domain.interfaces import ITaskCommentRepository
from modules.tasks.models.comment import TaskCommentModel


class SqlTaskCommentRepository(ITaskCommentRepository):
    """PostgreSQL implementation of ITaskCommentRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        task_id: str,
        user_id: str,
        content: str,
        mentions: list[str] | None = None,
    ) -> TaskCommentEntity:
        model = TaskCommentModel(
            task_id=task_id,
            user_id=user_id,
            content=content,
            mentions=mentions or [],
        )
        self.session.add(model)
        await self.session.flush()
        return model.to_entity()

    async def get_by_id(self, comment_id: str) -> TaskCommentEntity | None:
        stmt = select(TaskCommentModel).where(TaskCommentModel.id == comment_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def list_by_task(self, task_id: str) -> list[TaskCommentEntity]:
        stmt = (
            select(TaskCommentModel)
            .where(TaskCommentModel.task_id == task_id)
            .order_by(TaskCommentModel.created_at.asc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [m.to_entity() for m in models]

    async def update(
        self,
        comment_id: str,
        content: str,
        mentions: list[str] | None = None,
    ) -> TaskCommentEntity:
        stmt = select(TaskCommentModel).where(TaskCommentModel.id == comment_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one()

        model.content = content
        if mentions is not None:
            model.mentions = mentions

        await self.session.flush()
        return model.to_entity()

    async def delete(self, comment_id: str) -> None:
        stmt = delete(TaskCommentModel).where(TaskCommentModel.id == comment_id)
        await self.session.execute(stmt)
