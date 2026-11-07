import asyncio
from loguru import logger

from core.config.notification import notification_settings
from modules.identity.dtos.user_dtos import UserProfileDetailDTO
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.domain.interfaces import INotificationChannel
from modules.notifications.repository.push_subscription_repository import (
    PushSubscriptionRepository,
)
from modules.notifications.services.web_push_service import WebPushService


class WebPushChannel(INotificationChannel):
    """Channel to send Web Push notifications to user's registered PWA/browser devices."""

    channel_name: str = "web_push"

    def __init__(
        self,
        push_repo: PushSubscriptionRepository,
        push_service: WebPushService,
    ) -> None:
        self.push_repo = push_repo
        self.push_service = push_service

    async def send(
        self,
        recipient: UserProfileDetailDTO,
        message: NotificationMessage,
    ) -> bool:
        try:
            subscriptions = await self.push_repo.list_by_user(str(recipient.id))
            if not subscriptions:
                logger.debug(
                    f"[WebPushChannel] No push subscriptions for user {recipient.id}"
                )
                return False

            base_url = notification_settings.app_url.rstrip("/")
            action_url = message.action_url or "/"
            if not action_url.startswith("http"):
                full_url = f"{base_url}/{action_url.lstrip('/')}"
            else:
                full_url = action_url

            payload = {
                "title": f"🔔 {message.title}",
                "body": message.content,
                "icon": "/icons/icon-192x192.png",
                "badge": "/icons/icon-192x192.png",
                "action_url": full_url,
                "tag": f"meetly-{message.entity_type}-{message.entity_id or message.event_type}",
                "data": {
                    "url": full_url,
                    "event_type": message.event_type,
                    "entity_id": message.entity_id,
                },
            }

            stale_endpoints = []

            def _send_sync(sub):
                success = self.push_service.send_push(
                    endpoint=sub.endpoint,
                    p256dh=sub.p256dh,
                    auth=sub.auth,
                    payload=payload,
                )
                if not success:
                    stale_endpoints.append(sub.endpoint)
                return success

            loop = asyncio.get_running_loop()
            tasks = [loop.run_in_executor(None, _send_sync, sub) for sub in subscriptions]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Cleanup expired/invalid subscriptions
            for endpoint in stale_endpoints:
                try:
                    await self.push_repo.delete_by_endpoint(endpoint)
                except Exception:
                    pass

            any_sent = any(r is True for r in results if not isinstance(r, Exception))
            logger.info(
                f"[WebPushChannel] Delivered push to {len(subscriptions)} devices for user {recipient.id}: success={any_sent}"
            )
            return any_sent
        except Exception as exc:
            logger.error(
                f"[WebPushChannel] Failed to dispatch push for user {recipient.id}: {exc}"
            )
            return False

