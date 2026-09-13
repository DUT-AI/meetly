from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin
from modules.tasks.domain.entities import TaskEntity
from modules.tasks.domain.enums import TaskPriority, TaskStatus


class TaskModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    """Task / Issue model."""

    __tablename__ = "tasks"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default=TaskStatus.TODO.value, index=True, nullable=False
    )
    priority: Mapped[str] = mapped_column(
        String(20), default=TaskPriority.MEDIUM.value, index=True, nullable=False
    )
    labels: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
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

    def to_entity(self, assignee_ids: list[str] | None = None) -> TaskEntity:
        resolved_assignee_ids = assignee_ids
        if resolved_assignee_ids is None:
            resolved_assignee_ids = [self.assignee_id] if self.assignee_id else []
        return TaskEntity(
            id=self.id,
            name=self.name,
            status=TaskStatus(self.status),
            priority=TaskPriority(self.priority),
            labels=self.labels or [],
            workspace_id=self.workspace_id,
            project_id=self.project_id,
            assignee_id=self.assignee_id,
            assignee_ids=resolved_assignee_ids,
            position=self.position,
            due_date=self.due_date,
            description=self.description,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


class TaskAssigneeModel(Base):
    """Task Assignee junction table model."""

    __tablename__ = "task_assignees"

    task_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    member_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("members.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

