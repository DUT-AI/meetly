from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin
from modules.tasks.domain.entities import TaskEntity
from modules.tasks.domain.enums import TaskStatus


class TaskModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    """Task / Issue model."""

    __tablename__ = "tasks"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default=TaskStatus.TODO.value, index=True, nullable=False
    )
    workspace_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    project_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    assignee_id: Mapped[str | None] = mapped_column(
        String(26),
        ForeignKey("members.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    position: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    def to_entity(self) -> TaskEntity:
        return TaskEntity(
            id=self.id,
            name=self.name,
            status=TaskStatus(self.status),
            workspace_id=self.workspace_id,
            project_id=self.project_id,
            assignee_id=self.assignee_id,
            position=self.position,
            due_date=self.due_date,
            description=self.description,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
