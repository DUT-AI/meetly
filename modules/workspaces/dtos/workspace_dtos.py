from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class WorkspaceResponseDTO(BaseModel):
    """Workspace response payload."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    owner_id: str
    invite_code: str
    image_url: str | None = None
    note: str | None = None
    discord_room_id: str | None = None
    notify_on_task_status_change: bool = True
    notify_task_status_discord: bool = True
    notify_task_status_zalo: bool = True
    zalo_room_id: str | None = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_entity(cls, ws: Any) -> "WorkspaceResponseDTO":
        """Factory method to construct WorkspaceResponseDTO from a WorkspaceEntity or model instance."""
        return cls(
            id=ws.id,
            name=ws.name,
            owner_id=ws.owner_id,
            invite_code=ws.invite_code,
            image_url=ws.image_url,
            note=ws.note,
            discord_room_id=ws.discord_room_id,
            notify_on_task_status_change=ws.notify_on_task_status_change,
            notify_task_status_discord=ws.notify_task_status_discord,
            notify_task_status_zalo=ws.notify_task_status_zalo,
            zalo_room_id=ws.zalo_room_id,
            created_at=ws.created_at,
            updated_at=ws.updated_at,
        )


class WorkspaceInfoResponseDTO(BaseModel):
    """Public info of workspace for join preview."""

    id: str
    name: str
    image_url: str | None = None


class WorkspaceListResponseDTO(BaseModel):
    """List of workspaces."""

    documents: list[WorkspaceResponseDTO]
    total: int


class WorkspaceJoinDTO(BaseModel):
    """Join workspace payload."""

    code: str


class WorkspaceAnalyticsDTO(BaseModel):
    """Analytics for a workspace."""

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
