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

        # 1. Dispatch Web Push immediately for instant real-time alert on mobile devices
        web_push = next(
            (c for c in target_channels if getattr(c, "channel_name", "") == "web_push"),
            None,
        )
        if web_push:
            try:
                await web_push.send(recipient, message)
            except Exception as exc:
                logger.error(f"[WebPushChannel] Failed for user {recipient.id}: {exc}")

        # 2. Record in-app notification in DB
        website = next(
            (c for c in target_channels if getattr(c, "channel_name", "") == "website"),
            None,
        )
        if website:
            try:
                await website.send(recipient, message)
            except Exception as exc:
                logger.error(f"[WebsiteChannel] Failed for user {recipient.id}: {exc}")

        # 3. Dispatch external bot channels (Zalo & Discord) in parallel
        ext_channels = [
            c
            for c in target_channels
            if getattr(c, "channel_name", "") not in ("web_push", "website")
        ]
        if ext_channels:
            tasks = [channel.send(recipient, message) for channel in ext_channels]
            await asyncio.gather(*tasks, return_exceptions=True)
