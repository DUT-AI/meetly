from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class CreateMeetingDTO(BaseModel):
    title: str
    workspace_id: str
    start_time: datetime
    end_time: datetime
    participants: list[str] = []
    report: dict[str, Any] = {}


class UpdateMeetingDTO(BaseModel):
    title: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    participants: list[str] | None = None
    report: dict[str, Any] | None = None


class MeetingResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    title: str
    start_time: datetime
    end_time: datetime
    participants: list[str]
    report: dict[str, Any]
    created_by: str
    created_at: datetime
    updated_at: datetime


class MeetingListResponseDTO(BaseModel):
    documents: list[MeetingResponseDTO]
    total: int
