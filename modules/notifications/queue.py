import json

import redis.asyncio as aioredis
from arq.connections import ArqRedis, create_pool
from arq.connections import RedisSettings as ArqRedisSettings
from loguru import logger

from core.config import redis_settings
from modules.notifications.domain.entities import NotificationMessage

NOTIFICATION_JOB_NAME = "send_notification_job"
NOTIFICATION_QUEUE_KEY = "meetly:notifications:queue"


class NotificationQueueProducer:
    """Enqueues notification jobs using ARQ (Async Redis Queue) with fallback."""

    def __init__(self) -> None:
        self._arq_pool: ArqRedis | None = None
        self._redis: aioredis.Redis | None = None

    async def _get_arq_pool(self) -> ArqRedis:
        if self._arq_pool is None:
            self._arq_pool = await create_pool(
                ArqRedisSettings.from_dsn(redis_settings.redis_url),
                default_queue_name=NOTIFICATION_QUEUE_KEY,
            )
        return self._arq_pool

    async def enqueue(self, message: NotificationMessage) -> bool:
        """Enqueue notification job to ARQ / Redis."""
        try:
            pool = await self._get_arq_pool()
            await pool.enqueue_job(
                NOTIFICATION_JOB_NAME,
                message.to_dict(),
                _queue_name=NOTIFICATION_QUEUE_KEY,
            )
            logger.info(
                f"ARQ Job enqueued: type={message.event_type} recipient={message.recipient_user_id}"
            )
            return True
        except Exception as e:
            logger.warning(
                f"Failed to enqueue to ARQ ({e}), attempting raw redis fallback..."
            )
            try:
                if self._redis is None:
                    self._redis = aioredis.from_url(
                        redis_settings.redis_url, decode_responses=True
                    )
                payload = json.dumps(message.to_dict(), ensure_ascii=False)
                self._redis.lpush(NOTIFICATION_QUEUE_KEY, payload)
                return True
            except Exception as ex:
                logger.error(f"Failed to enqueue notification: {ex}")
                return False
