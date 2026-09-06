from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from modules.notifications.domain.entities import NotificationEntity
from modules.notifications.domain.interfaces import INotificationRepository
from modules.notifications.models.notification import NotificationModel


class SqlNotificationRepository(INotificationRepository):
    """PostgreSQL implementation of INotificationRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        user_id: str,
        type: str,
        title: str,
        content: str,
        entity_type: str,
        entity_id: str,
        actor_id: str | None = None,
        actor_name: str | None = None,
        actor_avatar_url: str | None = None,
        workspace_id: str | None = None,
        action_url: str | None = None,
    ) -> NotificationEntity:
        model = NotificationModel(
            user_id=user_id,
            type=type,
            title=title,
            content=content,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_avatar_url=actor_avatar_url,
            workspace_id=workspace_id,
            action_url=action_url,
        )
        self.session.add(model)
        await self.session.flush()
        return model.to_entity()

    async def get_by_id(self, notification_id: str) -> NotificationEntity | None:
        stmt = select(NotificationModel).where(NotificationModel.id == notification_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def list_by_user(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[NotificationEntity]:
        stmt = (
            select(NotificationModel)
            .where(NotificationModel.user_id == user_id)
            .order_by(NotificationModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if unread_only:
            stmt = stmt.where(NotificationModel.is_read.is_(False))

        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [m.to_entity() for m in models]

    async def count_unread(self, user_id: str) -> int:
        stmt = (
            select(func.count(NotificationModel.id))
            .where(NotificationModel.user_id == user_id)
            .where(NotificationModel.is_read.is_(False))
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one() or 0)

    async def mark_as_read(
        self, notification_id: str, user_id: str
    ) -> NotificationEntity | None:
        stmt = (
            select(NotificationModel)
            .where(NotificationModel.id == notification_id)
            .where(NotificationModel.user_id == user_id)
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            return None

        if not model.is_read:
            model.is_read = True
            model.read_at = datetime.now(UTC)
            await self.session.flush()

        return model.to_entity()

    async def mark_all_as_read(self, user_id: str) -> int:
        stmt = (
            update(NotificationModel)
            .where(NotificationModel.user_id == user_id)
            .where(NotificationModel.is_read.is_(False))
            .values(is_read=True, read_at=datetime.now(UTC))
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return int(result.rowcount)
