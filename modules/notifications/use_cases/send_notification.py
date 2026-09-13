import asyncio

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
            target_channels = [
                c for c in self.channels if getattr(c, "channel_name", "") in message.channels
            ]

        tasks = [channel.send(recipient, message) for channel in target_channels]
        await asyncio.gather(*tasks, return_exceptions=True)
