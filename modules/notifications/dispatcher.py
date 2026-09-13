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
                target_channels = [
                    c for c in self.channels if getattr(c, "channel_name", "") in message.channels
                ]

            tasks = [channel.send(recipient, message) for channel in target_channels]
            await asyncio.gather(*tasks, return_exceptions=True)
        except Exception as e:
            logger.error(
                f"Error while dispatching notification directly for user {message.recipient_user_id}: {e}"
            )
