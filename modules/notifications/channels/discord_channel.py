from loguru import logger

from core.config.notification import notification_settings
from modules.identity.dtos.manage_dtos import ManageUserDTO
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.domain.interfaces import INotificationChannel
from modules.notifications.services.discord_service import DiscordService


class DiscordChannel(INotificationChannel):
    """Channel for sending Discord DM notifications."""

    channel_name: str = "discord"

    def __init__(self, discord_service: DiscordService) -> None:
        self.discord_service = discord_service

    async def send(
        self, recipient: ManageUserDTO, message: NotificationMessage
    ) -> bool:
        if not recipient.discord_id:
            return False

        try:
            embed_url = None
            if message.action_url:
                base_url = notification_settings.app_url.rstrip("/")
                path = message.action_url.lstrip("/")
                embed_url = f"{base_url}/{path}"

            embed = {
                "title": message.title,
                "description": message.content,
                "color": 0x2563EB,  # Blue color
            }
            if embed_url:
                embed["url"] = embed_url

            if message.actor_name:
                embed["footer"] = {"text": f"Gửi bởi {message.actor_name}"}

            await self.discord_service.send_message_to_user(
                user_id=recipient.discord_id,
                content=f"🔔 **[Meetly]** {message.title}",
                embed=embed,
            )
            return True
        except Exception as e:
            logger.error(
                f"Failed to send Discord notification to user {recipient.id}: {e}"
            )
            return False
