from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from modules.members.dtos.member_dtos import MemberResponseDTO
from modules.projects.dtos.project_dtos import ProjectResponseDTO
from modules.tasks.domain.enums import TaskStatus


class TaskCreateDTO(BaseModel):
    name: str
    status: TaskStatus
    workspace_id: str
    project_id: str
    due_date: datetime | str | None = None
    assignee_id: str | None = None
    description: str | None = None


class TaskUpdateDTO(BaseModel):
    name: str | None = None
    status: TaskStatus | None = None
    project_id: str | None = None
    due_date: datetime | str | None = None
    assignee_id: str | None = None
    description: str | None = None


class TaskBulkItemDTO(BaseModel):
    id: str = Field(alias="$id", default="")
    status: TaskStatus
    position: int

    model_config = ConfigDict(populate_by_name=True)


class TaskBulkUpdateDTO(BaseModel):
    tasks: list[TaskBulkItemDTO]


class TaskResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    status: TaskStatus
    workspace_id: str
    project_id: str
    assignee_id: str | None = None
    position: int
    due_date: datetime | None = None
    description: str | None = None
    created_at: datetime
    updated_at: datetime


class PopulatedTaskResponseDTO(TaskResponseDTO):
    project: ProjectResponseDTO
    assignee: MemberResponseDTO | None = None


class TaskListResponseDTO(BaseModel):
    documents: list[PopulatedTaskResponseDTO]
    total: int
