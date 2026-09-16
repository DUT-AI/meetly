from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any

from modules.meetings.domain.entities import MeetingEntity


class IMeetingRepository(ABC):
    """Interface for Meeting Repository."""

    @abstractmethod
    async def create(
        self,
        workspace_id: str,
        title: str,
        start_time: datetime,
        end_time: datetime,
        participants: list[str],
        report: dict[str, Any],
        created_by: str,
    ) -> MeetingEntity:
        pass

    @abstractmethod
    async def get_by_id(self, meeting_id: str) -> MeetingEntity | None:
        pass

    @abstractmethod
    async def list_by_workspace(self, workspace_id: str) -> list[MeetingEntity]:
        pass

    @abstractmethod
    async def get_upcoming_meetings(self, from_time: datetime, to_time: datetime) -> list[MeetingEntity]:
        pass

    @abstractmethod
    async def update(
        self,
        meeting_id: str,
        title: str | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        participants: list[str] | None = None,
        report: dict[str, Any] | None = None,
    ) -> MeetingEntity:
        pass

    @abstractmethod
    async def delete(self, meeting_id: str) -> None:
        pass
