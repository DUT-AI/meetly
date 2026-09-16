from datetime import datetime
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.meetings.domain.entities import MeetingEntity
from modules.meetings.domain.interfaces import IMeetingRepository
from modules.meetings.models.meeting import MeetingModel


class SqlMeetingRepository(IMeetingRepository):
    """PostgreSQL implementation of IMeetingRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

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
        model = MeetingModel(
            workspace_id=workspace_id,
            title=title,
            start_time=start_time,
            end_time=end_time,
            participants=participants,
            report=report,
            created_by=created_by,
        )
        self.session.add(model)
        await self.session.flush()
        return model.to_entity()

    async def get_by_id(self, meeting_id: str) -> MeetingEntity | None:
        stmt = select(MeetingModel).where(MeetingModel.id == meeting_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def list_by_workspace(self, workspace_id: str) -> list[MeetingEntity]:
        stmt = (
            select(MeetingModel)
            .where(MeetingModel.workspace_id == workspace_id)
            .order_by(MeetingModel.start_time.asc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [m.to_entity() for m in models]

    async def get_upcoming_meetings(self, from_time: datetime, to_time: datetime) -> list[MeetingEntity]:
        stmt = (
            select(MeetingModel)
            .where(MeetingModel.start_time >= from_time)
            .where(MeetingModel.start_time <= to_time)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [m.to_entity() for m in models]

    async def update(
        self,
        meeting_id: str,
        title: str | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        participants: list[str] | None = None,
        report: dict[str, Any] | None = None,
    ) -> MeetingEntity:
        stmt = select(MeetingModel).where(MeetingModel.id == meeting_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one()

        if title is not None:
            model.title = title
        if start_time is not None:
            model.start_time = start_time
        if end_time is not None:
            model.end_time = end_time
        if participants is not None:
            model.participants = participants
        if report is not None:
            model.report = report

        await self.session.flush()
        return model.to_entity()

    async def delete(self, meeting_id: str) -> None:
        stmt = delete(MeetingModel).where(MeetingModel.id == meeting_id)
        await self.session.execute(stmt)
