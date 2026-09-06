from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin
from modules.notifications.domain.entities import NotificationEntity


class NotificationModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    """Notification model for website in-app notifications."""

    __tablename__ = "notifications"

    user_id: Mapped[str] = mapped_column(String(26), nullable=False, index=True)
    actor_id: Mapped[str | None] = mapped_column(String(26), nullable=True)
    actor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    actor_avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    workspace_id: Mapped[str | None] = mapped_column(String(26), nullable=True, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(26), nullable=False)
    action_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def to_entity(self) -> NotificationEntity:
        return NotificationEntity(
            id=self.id,
            user_id=self.user_id,
            actor_id=self.actor_id,
            actor_name=self.actor_name,
            actor_avatar_url=self.actor_avatar_url,
            workspace_id=self.workspace_id,
            type=self.type,
            title=self.title,
            content=self.content,
            entity_type=self.entity_type,
            entity_id=self.entity_id,
            action_url=self.action_url,
            is_read=self.is_read,
            read_at=self.read_at,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
