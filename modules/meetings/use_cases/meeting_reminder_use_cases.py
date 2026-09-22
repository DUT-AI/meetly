import logging
from datetime import UTC, datetime, timedelta, timezone

from modules.meetings.domain.interfaces import IMeetingRepository
from modules.members.domain.interfaces import IMemberRepository
from modules.notifications.dispatcher import NotificationDispatcher
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.services.discord_service import DiscordService
from modules.notifications.services.zalo_bot_client import ZaloBotClient
from modules.workspaces.domain.interfaces import IWorkspaceRepository

logger = logging.getLogger(__name__)


class CheckUpcomingMeetingsUseCase:
    """Scheduled use case to notify users and workspace about upcoming meetings."""

    def __init__(
        self,
        meeting_repo: IMeetingRepository,
        member_repo: IMemberRepository,
        workspace_repo: IWorkspaceRepository,
        notification_dispatcher: NotificationDispatcher,
        discord_service: DiscordService,
        zalo_service: ZaloBotClient,
    ):
        self.meeting_repo = meeting_repo
        self.member_repo = member_repo
        self.workspace_repo = workspace_repo
        self.notification_dispatcher = notification_dispatcher
        self.discord_service = discord_service
        self.zalo_service = zalo_service

    async def execute(self) -> dict:
        now = datetime.now(UTC)
        # Quét các cuộc họp bắt đầu ở đúng phút cách hiện tại 1 tiếng (60 phút)
        target_time = now + timedelta(hours=1)
        from_time = target_time.replace(second=0, microsecond=0)
        to_time = from_time + timedelta(seconds=59, microseconds=999999)

        upcoming_meetings = await self.meeting_repo.get_upcoming_meetings(
            from_time=from_time,
            to_time=to_time,
        )

        notified_meetings = 0

        for meeting in upcoming_meetings:
            workspace = await self.workspace_repo.get_by_id(meeting.workspace_id)
            if not workspace:
                continue

            vn_tz = timezone(timedelta(hours=7))
            local_start = (
                meeting.start_time.astimezone(vn_tz)
                if meeting.start_time.tzinfo
                else meeting.start_time.replace(tzinfo=UTC).astimezone(vn_tz)
            )
            time_str = local_start.strftime("%d/%m/%Y %H:%M")
            message_content = f"Cuộc họp {meeting.title} sẽ bắt đầu lúc {local_start.strftime('%H:%M')}."

            # 1. Notify Participants
            for participant_id in meeting.participants:
                participant_member = await self.member_repo.get_by_id(participant_id)
                if participant_member:
                    await self.notification_dispatcher.dispatch(
                        NotificationMessage(
                            recipient_user_id=str(participant_member.user_id),
                            event_type="meeting_reminder",
                            title="Sắp diễn ra cuộc họp!",
                            content=message_content,
                            action_url=f"/workspaces/{meeting.workspace_id}/meetings",
                            actor_id="system",
                            actor_name="Hệ thống",
                            workspace_id=meeting.workspace_id,
                            entity_type="meeting",
                            entity_id=meeting.id,
                            channels=["website", "email", "discord", "zalo"],
                        )
                    )

            # 2. Notify Discord/Zalo channel
            if workspace.discord_room_id:
                try:
                    await self.discord_service.send_message_to_channel(
                        channel_id=workspace.discord_room_id,
                        content=f"🔔 Nhắc nhở: {message_content}",
                    )
                except Exception as e:
                    logger.warning(f"Discord reminder failed for {meeting.id}: {e}")

            if workspace.zalo_room_id:
                try:
                    await self.zalo_service.send_message(
                        chat_id=workspace.zalo_room_id,
                        text=f"🔔 Nhắc nhở: {message_content}",
                    )
                except Exception as e:
                    logger.warning(f"Zalo reminder failed for {meeting.id}: {e}")

            notified_meetings += 1

        return {"reminders_sent_for": notified_meetings}
