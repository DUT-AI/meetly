from loguru import logger

from modules.identity.dtos.manage_dtos import ManageUserDTO
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.domain.interfaces import (
    INotificationChannel,
    INotificationRepository,
)


class WebsiteInAppChannel(INotificationChannel):
    """Channel for storing notification in DB and pushing to Web client."""

    def __init__(self, notification_repo: INotificationRepository) -> None:
        self.notification_repo = notification_repo

    async def send(self, recipient: ManageUserDTO, message: NotificationMessage) -> bool:
        try:
            await self.notification_repo.create(
                user_id=str(recipient.id),
                type=message.event_type,
                title=message.title,
                content=message.content,
                entity_type=message.entity_type,
                entity_id=message.entity_id,
                actor_id=message.actor_id,
                actor_name=message.actor_name,
                actor_avatar_url=message.actor_avatar_url,
                workspace_id=message.workspace_id,
                action_url=message.action_url,
            )
            logger.debug(f"Created in-app notification for user {recipient.id}")
            return True
        except Exception as e:
            logger.error(f"Failed to create in-app notification for user {recipient.id}: {e}")
            return False
