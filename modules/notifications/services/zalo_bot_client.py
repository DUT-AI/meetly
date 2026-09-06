from typing import Any

import zalo_bot
from loguru import logger

from core.config.notification import notification_settings


class ZaloBotClient:
    """Client giao tiếp với Zalo Bot Platform (qua thư viện     zalo_bot nếu có hoặc fallback)."""

    def __init__(self) -> None:
        self.bot = zalo_bot.Bot(token=notification_settings.zalo_bot_token)

    async def send_message(self, chat_id: str, text: str) -> dict[str, Any] | None:
        if not self.bot:
            logger.warning(
                f"Zalo Bot client chưa được cấu hình token hoặc chưa sẵn sàng, bỏ qua gửi tin tới {chat_id}"
            )
            return None
        try:
            async with self.bot:
                msg = await self.bot.send_message(chat_id, text)
                logger.debug(f"Đã gửi tin nhắn Zalo Bot tới {chat_id}")
                return msg.to_dict() if hasattr(msg, "to_dict") else {}
        except Exception as e:
            logger.error(f"Lỗi khi gửi tin nhắn Zalo Bot tới {chat_id}: {e}")
            return None
