from datetime import datetime, timezone
import redis.asyncio as aioredis
from loguru import logger

from core.config import redis_settings
from modules.members.domain.interfaces import IMemberRepository
from modules.notifications.dispatcher import NotificationDispatcher
from modules.notifications.domain.entities import NotificationMessage
from modules.tasks.domain.interfaces import ITaskRepository


class CheckTaskDeadlinesUseCase:
    """Check task deadlines periodically and dispatch due soon or overdue notifications.
    
    Prevents duplicate notifications within the same day using Redis key tracking.
    """

    def __init__(
        self,
        task_repo: ITaskRepository,
        member_repo: IMemberRepository,
        notification_dispatcher: NotificationDispatcher,
    ) -> None:
        self.task_repo = task_repo
        self.member_repo = member_repo
        self.notification_dispatcher = notification_dispatcher
        self._redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(redis_settings.redis_url, decode_responses=True)
        return self._redis

    async def execute(self) -> dict[str, int]:
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")
        redis_client = await self._get_redis()

        tasks = await self.task_repo.get_pending_tasks_with_deadlines()
        due_soon_count = 0
        overdue_count = 0

        for task in tasks:
            if not task.due_date or not task.assignee_id:
                continue

            due_date = task.due_date
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)

            delta = due_date - now
            delta_seconds = delta.total_seconds()
            assignee_member = await self.member_repo.get_by_id(task.assignee_id)
            if not assignee_member:
                continue

            action_url = f"/workspaces/{task.workspace_id}/tasks/{task.id}"

            # 1. Overdue checks (Overdue 1 day, Overdue 3 days)
            if delta_seconds < 0:
                overdue_days = int(abs(delta_seconds) // 86400)
                # Overdue today (past due date within 24h) or Overdue >= 1 day
                alert_type = None
                if overdue_days >= 3:
                    alert_type = "overdue_3_days"
                    title = f"⚠️ Công việc '{task.name}' đã quá hạn 3 ngày!"
                elif overdue_days >= 1:
                    alert_type = "overdue_1_day"
                    title = f"⚠️ Công việc '{task.name}' đã quá hạn 1 ngày!"
                elif overdue_days == 0:
                    alert_type = "overdue_today"
                    title = f"⚠️ Công việc '{task.name}' đã quá hạn hôm nay!"

                if alert_type:
                    cache_key = f"meetly:notif:task:{task.id}:{alert_type}:{today_str}"
                    already_sent = await redis_client.get(cache_key)
                    if not already_sent:
                        msg = NotificationMessage(
                            recipient_user_id=str(assignee_member.user_id),
                            event_type="task_overdue",
                            title=title,
                            content=f"Hạn hoàn thành: {due_date.strftime('%H:%M %d/%m/%Y')}. Vui lòng cập nhật tiến độ!",
                            action_url=action_url,
                            workspace_id=task.workspace_id,
                            entity_type="task",
                            entity_id=task.id,
                        )
                        await self.notification_dispatcher.dispatch(msg)
                        await redis_client.set(cache_key, "1", ex=86400)
                        overdue_count += 1

            # 2. Due soon checks (Due today, Due in 24 hours)
            elif delta_seconds <= 86400:
                cache_key = f"meetly:notif:task:{task.id}:due_soon:{today_str}"
                already_sent = await redis_client.get(cache_key)
                if not already_sent:
                    hours_left = max(1, int(delta_seconds // 3600))
                    title = f"⏰ Công việc '{task.name}' sắp đến hạn (còn {hours_left} giờ)"
                    msg = NotificationMessage(
                        recipient_user_id=str(assignee_member.user_id),
                        event_type="task_due_soon",
                        title=title,
                        content=f"Hạn hoàn thành: {due_date.strftime('%H:%M %d/%m/%Y')}.",
                        action_url=action_url,
                        workspace_id=task.workspace_id,
                        entity_type="task",
                        entity_id=task.id,
                    )
                    await self.notification_dispatcher.dispatch(msg)
                    await redis_client.set(cache_key, "1", ex=86400)
                    due_soon_count += 1

        logger.info(
            f"CheckTaskDeadlines completed: {due_soon_count} due soon alerts, {overdue_count} overdue alerts sent."
        )
        return {"due_soon": due_soon_count, "overdue": overdue_count}
