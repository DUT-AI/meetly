import asyncio

from loguru import logger

from modules.identity.client.manage_client import ManageClient
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.domain.interfaces import INotificationChannel
from modules.notifications.queue import NotificationQueueProducer


class NotificationDispatcher:
    """Orchestrator to dispatch notification messages across multiple channels via Redis Queue."""

    def __init__(
        self,
        channels: list[INotificationChannel],
        manage_client: ManageClient,
        queue_producer: NotificationQueueProducer | None = None,
    ) -> None:
        self.channels = channels
        self.manage_client = manage_client
        self.queue_producer = queue_producer or NotificationQueueProducer()

    async def dispatch(self, message: NotificationMessage) -> None:
        """Enqueue message to Redis for background workers. Fallback to direct execution if Redis fails."""
        # Ensure web_push is included when website channel is targeted
        if message.channels is not None:
            if "website" in message.channels and "web_push" not in message.channels:
                message.channels.append("web_push")

        # Try pushing to Redis Queue
        enqueued = await self.queue_producer.enqueue(message)
        if enqueued:
            return

        # Fallback: Process immediately in-memory if Redis is unreachable
        logger.warning(
            f"Redis Queue unavailable. Falling back to direct in-memory dispatch for user {message.recipient_user_id}."
        )
        await self.process_directly(message)

    async def process_directly(self, message: NotificationMessage) -> None:
        """Directly send notification to all channels (used by worker or fallback)."""
        try:
            recipient = await self.manage_client.get_user(message.recipient_user_id)
            if not recipient:
                logger.warning(
                    f"Recipient {message.recipient_user_id} not found in Manage Client. Cannot dispatch notification."
                )
                return

            target_channels = self.channels
            if message.channels is not None:
                allowed_channels = set(message.channels)
                # If "website" (in-app) is targeted, also trigger "web_push" for mobile/PWA
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
                except Exception as ce:
                    logger.error(f"[WebPushChannel] Direct failed for user {message.recipient_user_id}: {ce}")

            # 2. Record in-app notification in DB
            website = next(
                (c for c in target_channels if getattr(c, "channel_name", "") == "website"),
                None,
            )
            if website:
                try:
                    await website.send(recipient, message)
                except Exception as ce:
                    logger.error(f"[WebsiteChannel] Direct failed for user {message.recipient_user_id}: {ce}")

            # 3. Dispatch external bot channels (Zalo & Discord) in parallel
            ext_channels = [
                c
                for c in target_channels
                if getattr(c, "channel_name", "") not in ("web_push", "website")
            ]
            if ext_channels:
                tasks = [channel.send(recipient, message) for channel in ext_channels]
                await asyncio.gather(*tasks, return_exceptions=True)
        except Exception as e:
            logger.error(
                f"Error while dispatching notification directly for user {message.recipient_user_id}: {e}"
            )
