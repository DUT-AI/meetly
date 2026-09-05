from dataclasses import dataclass
from datetime import datetime


@dataclass
class ProjectEntity:
    id: str
    name: str
    workspace_id: str
    image_url: str | None
    created_at: datetime
    updated_at: datetime
