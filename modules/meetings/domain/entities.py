from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class MeetingEntity:
    id: str
    workspace_id: str
    title: str
    start_time: datetime
    end_time: datetime
    participants: list[str] = field(default_factory=list)
    report: dict[str, Any] = field(default_factory=dict)
    created_by: str = ""
    created_at: datetime | None = None
    updated_at: datetime | None = None
