from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin
from modules.meetings.domain.entities import MeetingEntity
from modules.meetings.domain.enums import MeetingStatus


class MeetingModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    """Meeting model for a workspace."""

    __tablename__ = "meetings"

    workspace_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    participants: Mapped[list[str]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=list, nullable=False
    )
    report: Mapped[dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=dict, nullable=False
    )
    created_by: Mapped[str] = mapped_column(String(64), nullable=False)

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

    def to_entity(self) -> MeetingEntity:
        return MeetingEntity(
            id=self.id,
            workspace_id=self.workspace_id,
            title=self.title,
            start_time=self.start_time,
            end_time=self.end_time,
            participants=self.participants or [],
            report=self.report or {},
            created_by=self.created_by,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
