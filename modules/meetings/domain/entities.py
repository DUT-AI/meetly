from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from modules.meetings.domain.enums import MeetingStatus


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

    @property
    def status(self) -> str:
        now = datetime.now(UTC)
        st = (
            self.start_time.astimezone(UTC)
            if self.start_time.tzinfo
            else self.start_time.replace(tzinfo=UTC)
        )
        et = (
            self.end_time.astimezone(UTC)
            if self.end_time.tzinfo
            else self.end_time.replace(tzinfo=UTC)
        )
        if now < st:
            return MeetingStatus.SCHEDULED.value
        elif now <= et:
            return MeetingStatus.IN_PROGRESS.value
        else:
            return MeetingStatus.COMPLETED.value
