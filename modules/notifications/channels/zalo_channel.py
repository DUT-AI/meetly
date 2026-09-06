from loguru import logger

from core.config.notification import notification_settings
from modules.identity.dtos.manage_dtos import ManageUserDTO
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.domain.interfaces import INotificationChannel
from modules.notifications.services.zalo_bot_client import ZaloBotClient


class ZaloBotChannel(INotificationChannel):
    """Channel for sending notifications via Zalo Bot Platform."""

    def __init__(self, zalo_client: ZaloBotClient) -> None:
        self.zalo_client = zalo_client

    async def send(
        self, recipient: ManageUserDTO, message: NotificationMessage
    ) -> bool:
        if not recipient.zalo_bot_id:
            return False

        try:
            action_link = ""
            if message.action_url:
                base_url = notification_settings.app_url.rstrip("/")
                path = message.action_url.lstrip("/")
                action_link = f"\n👉 Xem chi tiết: {base_url}/{path}"

            text = (
                f"🔔 [Meetly] {message.title}\nNội dung: {message.content}{action_link}"
            )

            res = await self.zalo_client.send_message(
                chat_id=recipient.zalo_bot_id,
                text=text,
            )
            return res is not None
        except Exception as e:
            logger.error(
                f"Failed to send Zalo Bot notification to user {recipient.id}: {e}"
            )
            return False
