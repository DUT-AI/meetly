from enum import StrEnum


class MeetingStatus(StrEnum):
    """Meeting Status based on schedule and lifecycle."""

    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
