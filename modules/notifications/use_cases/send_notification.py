import asyncio
from loguru import logger

from modules.identity.client.manage_client import ManageClient
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.domain.interfaces import INotificationChannel


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

        target_channels = self.channels
        if message.channels is not None:
            allowed_channels = set(message.channels)
            # If "website" is targeted, also trigger "web_push" for mobile PWA
            if "website" in allowed_channels:
                allowed_channels.add("web_push")
            target_channels = [
                c
                for c in self.channels
                if getattr(c, "channel_name", "") in allowed_channels
            ]

        # Execute channels sequentially to prevent SQLAlchemy concurrent session operations
        for channel in target_channels:
            try:
                await channel.send(recipient, message)
            except Exception as exc:
                logger.error(
                    f"Channel {getattr(channel, 'channel_name', 'unknown')} failed for user {recipient.id}: {exc}"
                )
