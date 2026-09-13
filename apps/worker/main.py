from typing import Any, ClassVar

from arq import cron, run_worker
from arq.connections import RedisSettings as ArqRedisSettings
from loguru import logger

from apps.api.di import create_container
from core.config import redis_settings
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.queue import (
    NOTIFICATION_QUEUE_KEY,
)
from modules.notifications.use_cases import (
    SendNotificationUseCase,
)
from modules.tasks.use_cases.task_reminder_use_cases import (
    CheckTaskDeadlinesUseCase,
)


async def send_notification_job(ctx: dict[str, Any], payload: dict[str, Any]) -> None:
    """Worker Job Handler: Calls SendNotificationUseCase from notifications module."""
    message = NotificationMessage.from_dict(payload)
    logger.info(
        f"ARQ Worker executing notification job: event={message.event_type} recipient={message.recipient_user_id}"
    )

    # Resolve Use Case from DI container with fresh request scope
    container = ctx["container"]
    async with container() as request_container:
        use_case = await request_container.get(SendNotificationUseCase)
        await use_case.execute(message)

    logger.info(f"Notification job completed for recipient={message.recipient_user_id}")


async def check_task_deadlines_job(ctx: dict[str, Any]) -> None:
    """Scheduled Job Handler: Scans upcoming and overdue tasks and dispatches reminders."""
    logger.info("ARQ Worker executing periodic deadline check...")
    container = ctx["container"]
    async with container() as request_container:
        use_case = await request_container.get(CheckTaskDeadlinesUseCase)
        result = await use_case.execute()
        logger.info(f"Periodic deadline check completed: {result}")


async def startup(ctx: dict[str, Any]) -> None:
    """Initialize DI container on worker startup."""
    logger.info("Meetly ARQ Worker starting up...")
    ctx["container"] = create_container()


async def shutdown(ctx: dict[str, Any]) -> None:
    """Close DI container on worker shutdown."""
    logger.info("Meetly ARQ Worker shutting down...")
    container = ctx.get("container")
    if container:
        await container.close()


class WorkerSettings:
    """ARQ Worker configuration class."""

    functions: ClassVar[list[Any]] = [send_notification_job, check_task_deadlines_job]
    cron_jobs: ClassVar[list[Any]] = [
        cron(check_task_deadlines_job, minute={0, 15, 30, 45})  # Every 15 minutes
    ]
    queue_name: str = NOTIFICATION_QUEUE_KEY
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = ArqRedisSettings.from_dsn(redis_settings.redis_url)
    max_jobs: int = 10
    poll_delay: float = 0.5


def main() -> None:
    """Worker entrypoint executing ARQ worker loop."""
    logger.info(f"Starting ARQ Worker listening on queue '{NOTIFICATION_QUEUE_KEY}'...")
    run_worker(WorkerSettings)


if __name__ == "__main__":
    main()
