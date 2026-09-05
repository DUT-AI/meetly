from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectResponseDTO(BaseModel):
    """Project response payload."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    workspace_id: str
    image_url: str | None = None
    created_at: datetime
    updated_at: datetime


class ProjectListResponseDTO(BaseModel):
    """List of projects."""

    documents: list[ProjectResponseDTO]
    total: int


class ProjectAnalyticsDTO(BaseModel):
    """Analytics for a project."""

    task_count: int = 0
    task_difference: int = 0
    assigned_task_count: int = 0
    assigned_task_difference: int = 0
    completed_task_count: int = 0
    completed_task_difference: int = 0
    incomplete_task_count: int = 0
    incomplete_task_difference: int = 0
    overdue_task_count: int = 0
    overdue_task_difference: int = 0
