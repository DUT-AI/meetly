from abc import ABC, abstractmethod
from collections.abc import Sequence
from datetime import datetime

from modules.tasks.domain.entities import TaskCommentEntity, TaskEntity
from modules.tasks.domain.enums import TaskPriority, TaskStatus


class ITaskRepository(ABC):
    """Repository interface for Tasks."""

    @abstractmethod
    async def create(
        self,
        name: str,
        status: TaskStatus,
        workspace_id: str,
        project_id: str,
        position: int,
        priority: TaskPriority = TaskPriority.MEDIUM,
        labels: list[str] | None = None,
        due_date: datetime | None = None,
        assignee_id: str | None = None,
        description: str | None = None,
    ) -> TaskEntity:
        """Create a new task."""

    @abstractmethod
    async def get_by_id(self, task_id: str) -> TaskEntity | None:
        """Get task by ID."""

    @abstractmethod
    async def get_highest_position(
        self, workspace_id: str, status: TaskStatus
    ) -> int | None:
        """Find highest position number in a column."""

    @abstractmethod
    async def list_tasks(
        self,
        workspace_id: str,
        project_id: str | None = None,
        assignee_id: str | None = None,
        status: TaskStatus | None = None,
        search: str | None = None,
        due_date: datetime | None = None,
    ) -> list[TaskEntity]:
        """List tasks by multiple filter criteria."""

    @abstractmethod
    async def list_by_workspace_ids(
        self,
        workspace_ids: Sequence[str],
        assignee_ids: Sequence[str] | None = None,
        status: TaskStatus | None = None,
        search: str | None = None,
        due_date: datetime | None = None,
    ) -> list[TaskEntity]:
        """List tasks across multiple workspaces (for global cross-department tasks)."""

    @abstractmethod
    async def update(
        self,
        task_id: str,
        name: str | None = None,
        status: TaskStatus | None = None,
        priority: TaskPriority | None = None,
        labels: list[str] | None = None,
        project_id: str | None = None,
        assignee_id: str | None = None,
        due_date: datetime | None = None,
        description: str | None = None,
        position: int | None = None,
    ) -> TaskEntity:
        """Update single task fields."""

    @abstractmethod
    async def bulk_update_positions(
        self, updates: Sequence[tuple[str, TaskStatus, int]]
    ) -> list[TaskEntity]:
        """Bulk update task statuses and positions."""

    @abstractmethod
    async def delete(self, task_id: str) -> None:
        """Delete task by ID."""


class ITaskCommentRepository(ABC):
    """Repository interface for Task Comments."""

    @abstractmethod
    async def create(
        self,
        task_id: str,
        user_id: str,
        content: str,
        mentions: list[str] | None = None,
    ) -> TaskCommentEntity:
        """Create a new comment."""

    @abstractmethod
    async def get_by_id(self, comment_id: str) -> TaskCommentEntity | None:
        """Get comment by ID."""

    @abstractmethod
    async def list_by_task(self, task_id: str) -> list[TaskCommentEntity]:
        """List comments for a task ordered chronologically."""

    @abstractmethod
    async def update(
        self,
        comment_id: str,
        content: str,
        mentions: list[str] | None = None,
    ) -> TaskCommentEntity:
        """Update comment content and mentions."""

    @abstractmethod
    async def delete(self, comment_id: str) -> None:
        """Delete comment by ID."""

