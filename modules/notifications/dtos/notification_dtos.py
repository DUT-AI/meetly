from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    actor_id: str | None = None
    actor_name: str | None = None
    actor_avatar_url: str | None = None
    workspace_id: str | None = None
    type: str
    title: str
    content: str
    entity_type: str
    entity_id: str
    action_url: str | None = None
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class NotificationListResponseDTO(BaseModel):
    items: list[NotificationResponseDTO]
    unread_count: int
