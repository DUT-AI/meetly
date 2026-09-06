from dataclasses import dataclass
from datetime import datetime

from modules.members.dtos.member_dtos import MemberResponseDTO
from modules.projects.dtos.project_dtos import ProjectResponseDTO
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
    assignee_id: str | None
    position: int
    due_date: datetime | None
    description: str | None
    created_at: datetime
    updated_at: datetime


@dataclass
class PopulatedTaskEntity:
    id: str
    name: str
    status: TaskStatus
    priority: TaskPriority
    labels: list[str]
    workspace_id: str
    project_id: str
    assignee_id: str | None
    position: int
    due_date: datetime | None
    description: str | None
    created_at: datetime
    updated_at: datetime
    project: ProjectResponseDTO
    assignee: MemberResponseDTO | None = None


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

