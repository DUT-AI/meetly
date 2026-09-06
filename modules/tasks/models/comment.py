from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin
from modules.tasks.domain.entities import TaskCommentEntity, TaskCommentUserEntity


class TaskCommentModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    """Task Comment model for task discussions and mentions."""

    __tablename__ = "task_comments"

    task_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(String(26), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    mentions: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)

    def to_entity(
        self,
        user: TaskCommentUserEntity | None = None,
    ) -> TaskCommentEntity:
        return TaskCommentEntity(
            id=self.id,
            task_id=self.task_id,
            user_id=self.user_id,
            content=self.content,
            mentions=self.mentions or [],
            created_at=self.created_at,
            updated_at=self.updated_at,
            user=user,
        )
