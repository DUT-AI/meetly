import asyncio

from modules.identity.client.manage_client import ManageClient
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.domain.interfaces import (
    INotificationChannel,
    INotificationRepository,
)
from modules.notifications.dtos.notification_dtos import (
    NotificationListResponseDTO,
    NotificationResponseDTO,
)


class ListNotificationsUseCase:
    """List notifications for the current user and return unread count."""

    def __init__(self, repo: INotificationRepository) -> None:
        self.repo = repo

    async def execute(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> NotificationListResponseDTO:
        items = await self.repo.list_by_user(
            user_id=user_id,
            unread_only=unread_only,
            limit=limit,
            offset=offset,
        )
        unread_count = await self.repo.count_unread(user_id=user_id)

        return NotificationListResponseDTO(
            items=[
                NotificationResponseDTO(
                    id=n.id,
                    user_id=n.user_id,
                    actor_id=n.actor_id,
                    actor_name=n.actor_name,
                    actor_avatar_url=n.actor_avatar_url,
                    workspace_id=n.workspace_id,
                    type=n.type,
                    title=n.title,
                    content=n.content,
                    entity_type=n.entity_type,
                    entity_id=n.entity_id,
                    action_url=n.action_url,
                    is_read=n.is_read,
                    read_at=n.read_at,
                    created_at=n.created_at,
                    updated_at=n.updated_at,
                )
                for n in items
            ],
            unread_count=unread_count,
        )


class MarkNotificationReadUseCase:
    """Mark a specific notification as read."""

    def __init__(self, repo: INotificationRepository) -> None:
        self.repo = repo

    async def execute(
        self, notification_id: str, user_id: str
    ) -> NotificationResponseDTO | None:
        entity = await self.repo.mark_as_read(
            notification_id=notification_id, user_id=user_id
        )
        if not entity:
            return None
        return NotificationResponseDTO(
            id=entity.id,
            user_id=entity.user_id,
            actor_id=entity.actor_id,
            actor_name=entity.actor_name,
            actor_avatar_url=entity.actor_avatar_url,
            workspace_id=entity.workspace_id,
            type=entity.type,
            title=entity.title,
            content=entity.content,
            entity_type=entity.entity_type,
            entity_id=entity.entity_id,
            action_url=entity.action_url,
            is_read=entity.is_read,
            read_at=entity.read_at,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )


class MarkAllNotificationsReadUseCase:
    """Mark all notifications of user as read."""

    def __init__(self, repo: INotificationRepository) -> None:
        self.repo = repo

    async def execute(self, user_id: str) -> int:
        return await self.repo.mark_all_as_read(user_id=user_id)


class SendNotificationUseCase:
    """Use Case to execute dispatch of a notification message to all channels.

    Can be called by ARQ Worker, Background Tasks, or Fallback in-process.
    """

    def __init__(
        self,
        channels: list[INotificationChannel],
        manage_client: ManageClient,
    ) -> None:
        self.channels = channels
        self.manage_client = manage_client

    async def execute(self, message: NotificationMessage) -> None:
        recipient = await self.manage_client.get_user(message.recipient_user_id)
        if not recipient:
            return

        tasks = [channel.send(recipient, message) for channel in self.channels]
        await asyncio.gather(*tasks, return_exceptions=True)
