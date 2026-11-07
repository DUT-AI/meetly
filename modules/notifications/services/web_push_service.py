import json
from loguru import logger
import pywebpush

from core.config.notification import notification_settings


class WebPushService:
    """Service to send Web Push notifications to browsers / PWA using VAPID."""

    def __init__(self) -> None:
        self.public_key = notification_settings.vapid_public_key
        self.private_key = notification_settings.vapid_private_key
        self.claim_email = notification_settings.vapid_claim_email

    def send_push(
        self,
        endpoint: str,
        p256dh: str,
        auth: str,
        payload: dict,
    ) -> bool:
        """Sends an encrypted push notification to a specific client endpoint."""
        if not self.private_key or not self.public_key:
            logger.warning("[WebPushService] VAPID keys not configured. Skipping push.")
            return False

        subscription_info = {
            "endpoint": endpoint,
            "keys": {
                "p256dh": p256dh,
                "auth": auth,
            },
        }

        try:
            pywebpush.webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=self.private_key,
                vapid_claims={"sub": self.claim_email},
                timeout=5,
            )
            logger.debug(f"[WebPushService] Push delivered to endpoint {endpoint[:30]}...")
            return True
        except pywebpush.WebPushException as ex:
            logger.warning(
                f"[WebPushService] WebPushException (status {getattr(ex.response, 'status_code', 'unknown')}): {ex}"
            )
            # 404 or 410 means subscription is no longer valid
            if ex.response is not None and ex.response.status_code in (404, 410):
                return False
            return False
        except Exception as exc:
            logger.error(f"[WebPushService] Unexpected error sending push: {exc}")
            return False

