from loguru import logger

from core.config.notification import notification_settings
from modules.identity.dtos.manage_dtos import ManageUserDTO
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.domain.interfaces import INotificationChannel
from modules.notifications.services.zalo_bot_client import ZaloBotClient
from modules.notifications.services.zalo_sticker_service import (
    get_sticker_for_notification,
)


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

            # 1. Gửi tin nhắn nội dung (hoặc ảnh đính kèm nếu có)
            main_sent = False
            if message.image_url:
                res_photo = await self.zalo_client.send_photo(
                    chat_id=recipient.zalo_bot_id,
                    caption=text,
                    photo=message.image_url,
                )
                main_sent = res_photo is not None
            elif text.strip():
                res_msg = await self.zalo_client.send_message(
                    chat_id=recipient.zalo_bot_id,
                    text=text,
                    parse_mode="markdown",
                )
                main_sent = res_msg is not None

            # 2. Đảm bảo mọi tin nhắn gửi Zalo đều có sticker kèm theo
            # Ưu tiên message.sticker_id, nếu không thì tự động chọn theo ngữ cảnh (trễ/deadline hoặc bình thường)
            sticker_id = get_sticker_for_notification(
                event_type=message.event_type,
                title=message.title,
                content=message.content,
                default_sticker_id=message.sticker_id,
            )

            sticker_sent = False
            if sticker_id:
                res_sticker = await self.zalo_client.send_sticker(
                    chat_id=recipient.zalo_bot_id,
                    sticker=sticker_id,
                )
                sticker_sent = res_sticker is not None

            # Coi như thành công nếu đã gửi được tin nhắn hoặc sticker
            return main_sent or sticker_sent
        except Exception as e:
            logger.error(
                f"Failed to send Zalo Bot notification to user {recipient.id}: {e}"
            )
            return False
