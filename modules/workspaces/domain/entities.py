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


@dataclass
class WorkspaceLabelEntity:
    id: str
    workspace_id: str
    name: str
    color: str
    created_at: datetime
    updated_at: datetime
