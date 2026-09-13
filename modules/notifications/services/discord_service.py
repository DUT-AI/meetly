from datetime import UTC, datetime
from typing import Any

import aiohttp
from loguru import logger

from core.config.notification import notification_settings


class DiscordServiceError(Exception):
    """Custom exception for Discord service errors."""

    def __init__(self, message: str, status_code: int | None = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class DiscordService:
    """Service for sending messages via Discord Bot REST API."""

    BASE_URL = "https://discord.com/api/v10"

    def __init__(self) -> None:
        self.bot_token = notification_settings.discord_bot_token
        self.headers = {
            "Authorization": f"Bot {self.bot_token}",
            "Content-Type": "application/json",
        }

    async def send_message_to_user(
        self, user_id: str, content: str = "", embed: dict | None = None
    ) -> dict[str, Any]:
        """
        Send a direct message to a Discord user.

        Args:
            user_id: The Discord user snowflake ID to send the message to.
            content: The message content to send.
            embed: Optional embed dictionary for rich content.
        """
        if not self.bot_token:
            logger.warning(
                f"Discord Bot Token chưa được cấu hình, bỏ qua gửi DM tới {user_id}"
            )
            return {}

        try:
            async with aiohttp.ClientSession() as session:
                # First, create a DM channel with the user
                create_dm_url = f"{self.BASE_URL}/users/@me/channels"
                payload = {"recipient_id": user_id}

                async with session.post(
                    create_dm_url, json=payload, headers=self.headers
                ) as response:
                    if response.status not in (200, 201):
                        error_text = await response.text()
                        logger.error(
                            f"Failed to create Discord DM channel with user {user_id}: {error_text}"
                        )
                        raise DiscordServiceError(
                            f"Failed to create DM channel: {error_text}",
                            status_code=response.status,
                        )

                    dm_channel = await response.json()
                    channel_id = dm_channel["id"]

                # Then, send the message to the DM channel
                send_message_url = f"{self.BASE_URL}/channels/{channel_id}/messages"
                message_payload: dict[str, Any] = {"content": content}

                if embed:
                    if "timestamp" not in embed:
                        embed["timestamp"] = datetime.now(UTC).isoformat()
                    message_payload["embeds"] = [embed]

                async with session.post(
                    send_message_url, json=message_payload, headers=self.headers
                ) as response:
                    if response.status not in (200, 201):
                        error_text = await response.text()
                        logger.error(
                            f"Failed to send Discord message to user {user_id}: {error_text}"
                        )
                        raise DiscordServiceError(
                            f"Failed to send message: {error_text}",
                            status_code=response.status,
                        )

                    result = await response.json()
                    logger.info(f"Successfully sent Discord message to user {user_id}")
                    return result

        except aiohttp.ClientError as e:
            logger.error(
                f"Network error while sending Discord message to user {user_id}: {e}"
            )
            raise DiscordServiceError(f"Network error: {e}") from e

    async def send_message_to_channel(
        self, channel_id: str, content: str = "", embed: dict | None = None
    ) -> dict[str, Any]:
        """
        Send a message directly to a Discord channel / room.

        Args:
            channel_id: The Discord channel snowflake ID to send the message to.
            content: The message content to send.
            embed: Optional embed dictionary for rich content.
        """
        if not self.bot_token:
            logger.warning(
                f"Discord Bot Token chưa được cấu hình, bỏ qua gửi message tới channel {channel_id}"
            )
            return {}

        try:
            async with aiohttp.ClientSession() as session:
                send_message_url = f"{self.BASE_URL}/channels/{channel_id}/messages"
                message_payload: dict[str, Any] = {"content": content}

                if embed:
                    if "timestamp" not in embed:
                        embed["timestamp"] = datetime.now(UTC).isoformat()
                    message_payload["embeds"] = [embed]

                async with session.post(
                    send_message_url, json=message_payload, headers=self.headers
                ) as response:
                    if response.status not in (200, 201):
                        error_text = await response.text()
                        logger.error(
                            f"Failed to send Discord message to channel {channel_id}: {error_text}"
                        )
                        raise DiscordServiceError(
                            f"Failed to send message to channel {channel_id}: {error_text}",
                            status_code=response.status,
                        )

                    result = await response.json()
                    logger.info(
                        f"Successfully sent Discord message to channel {channel_id}"
                    )
                    return result

        except aiohttp.ClientError as e:
            logger.error(
                f"Network error while sending Discord message to channel {channel_id}: {e}"
            )
            raise DiscordServiceError(f"Network error: {e}") from e
