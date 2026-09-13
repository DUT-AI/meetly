from typing import Any

import zalo_bot
from loguru import logger

from core.config.notification import notification_settings


class ZaloBotClient:
    """Client giao tiếp với Zalo Bot Platform (qua thư viện zalo_bot nếu có hoặc fallback)."""

    def __init__(self) -> None:
        self.bot = zalo_bot.Bot(token=notification_settings.zalo_bot_token)

    async def send_message(self, chat_id: str, text: str, parse_mode: str | None = None, text_styles: list[dict] | None = None) -> dict[str, Any] | None:
        if not self.bot:
            logger.warning(
                f"Zalo Bot client chưa được cấu hình token hoặc chưa sẵn sàng, bỏ qua gửi tin tới {chat_id}"
            )
            return None
        try:
            import httpx
            url = f"https://bot-api.zaloplatforms.com/bot{notification_settings.zalo_bot_token}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": text
            }
            if parse_mode:
                payload["parse_mode"] = parse_mode
            elif text_styles:
                payload["text_styles"] = text_styles
                
            async with httpx.AsyncClient() as hc:
                res = await hc.post(url, json=payload)
                res.raise_for_status()
                logger.debug(f"Đã gửi tin nhắn Zalo Bot tới {chat_id}. Response: {res.text}")
                return res.json()
        except Exception as e:
            logger.error(f"Lỗi khi gửi tin nhắn Zalo Bot tới {chat_id}: {e}")
            return None

    async def send_photo(
        self, chat_id: str, caption: str, photo: str
    ) -> dict[str, Any] | None:
        if not self.bot:
            logger.warning(
                f"Zalo Bot client chưa được cấu hình token hoặc chưa sẵn sàng, bỏ qua gửi ảnh tới {chat_id}"
            )
            return None
        try:
            import httpx
            url = f"https://bot-api.zaloplatforms.com/bot{notification_settings.zalo_bot_token}/sendPhoto"
            payload = {
                "chat_id": chat_id,
                "caption": caption,
                "photo": photo
            }
            async with httpx.AsyncClient() as hc:
                res = await hc.post(url, json=payload)
                res.raise_for_status()
                logger.debug(f"Đã gửi ảnh Zalo Bot tới {chat_id}. Response: {res.text}")
                return res.json()
        except Exception as e:
            logger.error(f"Lỗi khi gửi ảnh Zalo Bot tới {chat_id}: {e}")
            return None

    async def send_sticker(
        self, chat_id: str, sticker: str
    ) -> dict[str, Any] | None:
        """Gửi Zalo sticker bằng Sticker ID (lấy từ https://stickers.zaloapp.com/)."""
        if not self.bot:
            logger.warning(
                f"Zalo Bot client chưa được cấu hình token hoặc chưa sẵn sàng, bỏ qua gửi sticker tới {chat_id}"
            )
            return None
        try:
            import httpx
            url = f"https://bot-api.zaloplatforms.com/bot{notification_settings.zalo_bot_token}/sendSticker"
            payload = {
                "chat_id": chat_id,
                "sticker": sticker
            }
            async with httpx.AsyncClient() as hc:
                res = await hc.post(url, json=payload)
                res.raise_for_status()
                logger.debug(f"Đã gửi sticker Zalo Bot tới {chat_id}. Response: {res.text}")
                return res.json()
        except Exception as e:
            logger.error(f"Lỗi khi gửi sticker Zalo Bot tới {chat_id}: {e}")
            return None
