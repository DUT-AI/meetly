from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.meetings.domain.interfaces import IMeetingRepository
from modules.meetings.repository.meeting_repository import SqlMeetingRepository
from modules.meetings.use_cases.meeting_use_cases import MeetingUseCases
from modules.meetings.use_cases.meeting_reminder_use_cases import CheckUpcomingMeetingsUseCase


class MeetingProvider(Provider):
    """Dependency injection provider for meetings module."""

    scope = Scope.REQUEST

    @provide
    def provide_meeting_repo(
        self, session: AsyncSession
    ) -> IMeetingRepository:
        return SqlMeetingRepository(session)

    meeting_use_cases = provide(MeetingUseCases)
    meeting_reminder_use_cases = provide(CheckUpcomingMeetingsUseCase)
