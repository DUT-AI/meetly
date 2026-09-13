from loguru import logger

from core.config.notification import notification_settings
from modules.identity.dtos.manage_dtos import ManageUserDTO
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.domain.interfaces import INotificationChannel
from modules.notifications.services.zalo_bot_client import ZaloBotClient


class ZaloBotChannel(INotificationChannel):
    """Channel for sending notifications via Zalo Bot Platform."""

    channel_name: str = "zalo"

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
                f"🔔 [Meetly] **{message.title}**\nNội dung: {message.content}{action_link}"
            )
            
            # Nếu có cấu hình sticker, gửi sticker
            if message.sticker_id:
                res = await self.zalo_client.send_sticker(
                    chat_id=recipient.zalo_bot_id,
                    sticker=message.sticker_id,
                )
                return res is not None

            # Nếu có ảnh đính kèm, gửi ảnh kèm text làm caption
            if message.image_url:
                res = await self.zalo_client.send_photo(
                    chat_id=recipient.zalo_bot_id,
                    caption=text,
                    photo=message.image_url,
                )
                return res is not None

            # Nếu không, gửi tin nhắn text thông thường (hỗ trợ markdown parse_mode)
            res = await self.zalo_client.send_message(
                chat_id=recipient.zalo_bot_id,
                text=text,
                parse_mode="markdown"
            )
            return res is not None
        except Exception as e:
            logger.error(
                f"Failed to send Zalo Bot notification to user {recipient.id}: {e}"
            )
            return False
