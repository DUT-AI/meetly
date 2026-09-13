from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from modules.tasks.domain.enums import TaskPriority, TaskStatus


@dataclass
class TaskEntity:
    id: str
    name: str
    status: TaskStatus
    priority: TaskPriority
    labels: list[str]
    workspace_id: str
    project_id: str
    position: int
    due_date: datetime | None
    description: str | None
    created_at: datetime
    updated_at: datetime
    assignee_ids: list[str] = field(default_factory=list)


@dataclass
class PopulatedTaskEntity:
    id: str
    name: str
    status: TaskStatus
    priority: TaskPriority
    labels: list[str]
    workspace_id: str
    project_id: str
    position: int
    due_date: datetime | None
    description: str | None
    created_at: datetime
    updated_at: datetime
    project: Any = None
    assignee_ids: list[str] = field(default_factory=list)
    assignees: list[Any] = field(default_factory=list)


@dataclass
class TaskCommentUserEntity:
    id: str
    name: str
    email: str
    avatar_url: str | None = None


@dataclass
class TaskCommentEntity:
    id: str
    task_id: str
    user_id: str
    content: str
    mentions: list[str]
    created_at: datetime
    updated_at: datetime
    user: TaskCommentUserEntity | None = None
