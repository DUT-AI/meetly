from dataclasses import dataclass
from datetime import datetime


@dataclass
class WorkspaceEntity:
    id: str
    name: str
    owner_id: str
    invite_code: str
    image_url: str | None
    created_at: datetime
    updated_at: datetime
    note: str | None = None
    discord_room_id: str | None = None
    notify_on_task_status_change: bool = True
    notify_task_status_discord: bool = True
    notify_task_status_zalo: bool = True
    zalo_room_id: str | None = None


@dataclass
class WorkspaceLabelEntity:
    id: str
    workspace_id: str
    name: str
    color: str
    created_at: datetime
    updated_at: datetime
