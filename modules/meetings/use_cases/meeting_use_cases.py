from datetime import UTC, datetime, timedelta, timezone

from fastapi import HTTPException
from loguru import logger

from modules.identity.client.manage_client import ManageClient
from modules.meetings.domain.entities import MeetingEntity
from modules.meetings.domain.interfaces import IMeetingRepository
from modules.members.domain.enums import MemberRole
from modules.members.domain.interfaces import IMemberRepository
from modules.notifications.dispatcher import NotificationDispatcher
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.services.discord_service import DiscordService
from modules.notifications.services.zalo_bot_client import ZaloBotClient
from modules.workspaces.domain.interfaces import IWorkspaceRepository


async def _send_meeting_discord_zalo_notification(
    discord_service: DiscordService,
    zalo_service: ZaloBotClient,
    workspace_repo: IWorkspaceRepository,
    manage_client: ManageClient,
    workspace_id: str,
    meeting_title: str,
    start_time: datetime,
    actor_id: str,
    action: str = "tạo",
) -> None:
    try:
        workspace = await workspace_repo.get_by_id(workspace_id)
        if not workspace:
            return

        actor = await manage_client.get_user(actor_id)
        actor_name = "Một người dùng"
        if actor and actor.name:
            actor_name = actor.name

        vn_tz = timezone(timedelta(hours=7))
        local_start = (
            start_time.astimezone(vn_tz)
            if start_time.tzinfo
            else start_time.replace(tzinfo=UTC).astimezone(vn_tz)
        )
        time_str = local_start.strftime("%d/%m/%Y %H:%M")

        if workspace.discord_room_id:
            await discord_service.send_message_to_channel(
                channel_id=workspace.discord_room_id,
                content=f"📅 Cuộc họp **{meeting_title}** vừa được {action} bởi {actor_name}.\n⏰ Thời gian: {time_str}",
            )

        if workspace.zalo_room_id:
            await zalo_service.send_message(
                chat_id=workspace.zalo_room_id,
                text=f"📅 Cuộc họp **{meeting_title}** vừa được {action} bởi {actor_name}.\n⏰ Thời gian: {time_str}",
            )
    except Exception as e:
        logger.warning(f"Failed to send meeting room notification: {e}")


class MeetingUseCases:
    def __init__(
        self,
        meeting_repo: IMeetingRepository,
        member_repo: IMemberRepository,
        workspace_repo: IWorkspaceRepository,
        manage_client: ManageClient,
        notification_dispatcher: NotificationDispatcher,
        discord_service: DiscordService,
        zalo_service: ZaloBotClient,
    ):
        self.meeting_repo = meeting_repo
        self.member_repo = member_repo
        self.workspace_repo = workspace_repo
        self.manage_client = manage_client
        self.notification_dispatcher = notification_dispatcher
        self.discord_service = discord_service
        self.zalo_service = zalo_service

    async def _check_admin(self, workspace_id: str, user_id: str) -> None:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member or member.role != MemberRole.ADMIN:
            raise HTTPException(
                status_code=403,
                detail="Chỉ có Admin của Workspace mới có quyền thực hiện thao tác này.",
            )

    async def create_meeting(
        self,
        workspace_id: str,
        title: str,
        start_time: datetime,
        end_time: datetime,
        participants: list[str],
        report: dict,
        actor_id: str,
    ) -> MeetingEntity:
        await self._check_admin(workspace_id, actor_id)

        now = datetime.now(UTC)
        st = (
            start_time.astimezone(UTC)
            if start_time.tzinfo
            else start_time.replace(tzinfo=UTC)
        )
        et = (
            end_time.astimezone(UTC)
            if end_time.tzinfo
            else end_time.replace(tzinfo=UTC)
        )

        if st < now - timedelta(seconds=60):
            raise HTTPException(
                status_code=400, detail="Thời gian bắt đầu không được ở quá khứ"
            )
        if et <= st:
            raise HTTPException(
                status_code=400,
                detail="Thời gian kết thúc phải lớn hơn thời gian bắt đầu",
            )
        if not participants:
            raise HTTPException(
                status_code=400, detail="Cuộc họp phải có ít nhất 1 người tham gia"
            )

        meeting = await self.meeting_repo.create(
            workspace_id=workspace_id,
            title=title,
            start_time=start_time,
            end_time=end_time,
            participants=participants,
            report=report,
            created_by=actor_id,
        )

        # Notify participants
        actor_user = await self.manage_client.get_user(actor_id)
        actor_name = actor_user.name if actor_user and actor_user.name else "Admin"
        actor_avatar = actor_user.avatar_url if actor_user else None

        for participant_id in participants:
            participant_member = await self.member_repo.get_by_id(participant_id)
            if participant_member:
                await self.notification_dispatcher.dispatch(
                    NotificationMessage(
                        recipient_user_id=str(participant_member.user_id),
                        event_type="meeting_created",
                        title="Cuộc họp mới đã được tạo",
                        content=f"Cuộc họp: {title} (bởi {actor_name})",
                        action_url=f"/workspaces/{workspace_id}/meetings",
                        actor_id=actor_id,
                        actor_name=actor_name,
                        actor_avatar_url=actor_avatar,
                        workspace_id=workspace_id,
                        entity_type="meeting",
                        entity_id=meeting.id,
                        channels=["website", "email", "discord", "zalo"],
                    )
                )

        # Notify Discord/Zalo channel
        await _send_meeting_discord_zalo_notification(
            self.discord_service,
            self.zalo_service,
            self.workspace_repo,
            self.manage_client,
            workspace_id,
            title,
            start_time,
            actor_id,
            action="tạo",
        )

        return meeting

    async def list_meetings(
        self, workspace_id: str, actor_id: str
    ) -> list[MeetingEntity]:
        # Any member can view meetings
        member = await self.member_repo.get_member(workspace_id, actor_id)
        if not member:
            raise HTTPException(
                status_code=403, detail="Not a member of this workspace"
            )
        return await self.meeting_repo.list_by_workspace(workspace_id)

    async def get_meeting(self, meeting_id: str, actor_id: str) -> MeetingEntity:
        meeting = await self.meeting_repo.get_by_id(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        member = await self.member_repo.get_member(meeting.workspace_id, actor_id)
        if not member:
            raise HTTPException(
                status_code=403, detail="Not a member of this workspace"
            )
        return meeting

    async def update_meeting(
        self,
        meeting_id: str,
        title: str | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        participants: list[str] | None = None,
        report: dict | None = None,
        actor_id: str = "",
    ) -> MeetingEntity:
        meeting = await self.meeting_repo.get_by_id(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        member = await self.member_repo.get_member(meeting.workspace_id, actor_id)
        if not member:
            raise HTTPException(
                status_code=403, detail="Not a member of this workspace"
            )

        # Chỉ Admin mới có quyền đổi tên, thời gian hoặc danh sách người tham gia
        if any(x is not None for x in (title, start_time, end_time, participants)):
            await self._check_admin(meeting.workspace_id, actor_id)

        # Tìm những người mới được thêm vào so với danh sách cũ
        old_participant_ids = set(str(p) for p in (meeting.participants or []))
        new_participant_ids = (
            set(str(p) for p in (participants or []))
            if participants is not None
            else old_participant_ids
        )
        newly_added_ids = new_participant_ids - old_participant_ids

        updated_meeting = await self.meeting_repo.update(
            meeting_id=meeting_id,
            title=title,
            start_time=start_time,
            end_time=end_time,
            participants=participants,
            report=report,
        )

        # Gửi thông báo cho những người mới được thêm vào cuộc họp
        if newly_added_ids:
            actor_user = await self.manage_client.get_user(actor_id)
            actor_name = actor_user.name if actor_user and actor_user.name else "Admin"
            actor_avatar = actor_user.avatar_url if actor_user else None
            meeting_title = title or meeting.title
            effective_start = start_time or meeting.start_time
            vn_tz = timezone(timedelta(hours=7))
            local_start = (
                effective_start.astimezone(vn_tz)
                if effective_start.tzinfo
                else effective_start.replace(tzinfo=UTC).astimezone(vn_tz)
            )
            time_str = local_start.strftime("%d/%m/%Y %H:%M")

            for participant_id in newly_added_ids:
                participant_member = await self.member_repo.get_by_id(participant_id)
                if participant_member:
                    await self.notification_dispatcher.dispatch(
                        NotificationMessage(
                            recipient_user_id=str(participant_member.user_id),
                            event_type="meeting_participant_added",
                            title="Bạn đã được thêm vào một cuộc họp",
                            content=f"Bạn được mời tham gia cuộc họp: {meeting_title} lúc {time_str} (bởi {actor_name})",
                            action_url=f"/workspaces/{meeting.workspace_id}/meetings",
                            actor_id=actor_id,
                            actor_name=actor_name,
                            actor_avatar_url=actor_avatar,
                            workspace_id=meeting.workspace_id,
                            entity_type="meeting",
                            entity_id=meeting_id,
                            channels=["website", "email", "discord", "zalo"],
                        )
                    )
            logger.info(
                f"Sent meeting_participant_added notification to {len(newly_added_ids)} new participant(s)."
            )

        # Gửi thông báo khi tên hoặc giờ bị thay đổi — cho tất cả participants hiện tại
        title_changed = title is not None and title != meeting.title
        time_changed = start_time is not None and start_time != meeting.start_time

        if title_changed or time_changed:
            actor_user = await self.manage_client.get_user(actor_id)
            actor_name = actor_user.name if actor_user and actor_user.name else "Admin"
            actor_avatar = actor_user.avatar_url if actor_user else None

            new_title = title or meeting.title
            effective_start = start_time or meeting.start_time
            vn_tz = timezone(timedelta(hours=7))
            local_start = (
                effective_start.astimezone(vn_tz)
                if effective_start.tzinfo
                else effective_start.replace(tzinfo=UTC).astimezone(vn_tz)
            )
            time_str = local_start.strftime("%d/%m/%Y %H:%M")

            # Xây dựng nội dung mô tả thay đổi
            changes = []
            if title_changed:
                changes.append(f'tên đổi thành "{new_title}"')
            if time_changed:
                changes.append(f"giờ họp đổi thành {time_str}")
            change_description = " và ".join(changes)

            all_participant_ids = set(str(p) for p in (meeting.participants or []))

            for participant_id in all_participant_ids:
                participant_member = await self.member_repo.get_by_id(participant_id)
                if participant_member:
                    await self.notification_dispatcher.dispatch(
                        NotificationMessage(
                            recipient_user_id=str(participant_member.user_id),
                            event_type="meeting_updated",
                            title="Cuộc họp vừa được cập nhật",
                            content=f'Cuộc họp "{meeting.title}" đã được sửa: {change_description} (bởi {actor_name}).',
                            action_url=f"/workspaces/{meeting.workspace_id}/meetings",
                            actor_id=actor_id,
                            actor_name=actor_name,
                            actor_avatar_url=actor_avatar,
                            workspace_id=meeting.workspace_id,
                            entity_type="meeting",
                            entity_id=meeting_id,
                            channels=["website", "email", "discord", "zalo"],
                        )
                    )
            logger.info(
                f"Sent meeting_updated notification to {len(all_participant_ids)} participant(s) due to: {change_description}."
            )

        return updated_meeting

    async def delete_meeting(self, meeting_id: str, actor_id: str) -> None:
        meeting = await self.meeting_repo.get_by_id(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        await self._check_admin(meeting.workspace_id, actor_id)

        # Gửi thông báo cho tất cả participants trước khi xóa
        actor_user = await self.manage_client.get_user(actor_id)
        actor_name = actor_user.name if actor_user and actor_user.name else "Admin"
        actor_avatar = actor_user.avatar_url if actor_user else None
        vn_tz = timezone(timedelta(hours=7))
        local_start = (
            meeting.start_time.astimezone(vn_tz)
            if meeting.start_time.tzinfo
            else meeting.start_time.replace(tzinfo=UTC).astimezone(vn_tz)
        )
        time_str = local_start.strftime("%d/%m/%Y %H:%M")

        for participant_id in meeting.participants or []:
            participant_member = await self.member_repo.get_by_id(participant_id)
            if participant_member:
                await self.notification_dispatcher.dispatch(
                    NotificationMessage(
                        recipient_user_id=str(participant_member.user_id),
                        event_type="meeting_deleted",
                        title="Cuộc họp đã bị hủy",
                        content=f'Cuộc họp "{meeting.title}" lúc {time_str} đã bị hủy bởi {actor_name}.',
                        action_url=f"/workspaces/{meeting.workspace_id}/meetings",
                        actor_id=actor_id,
                        actor_name=actor_name,
                        actor_avatar_url=actor_avatar,
                        workspace_id=meeting.workspace_id,
                        entity_type="meeting",
                        entity_id=meeting_id,
                        channels=["website", "email", "discord", "zalo"],
                    )
                )
        logger.info(
            f"Sent meeting_deleted notification to {len(meeting.participants or [])} participant(s)."
        )

        await self.meeting_repo.delete(meeting_id)
