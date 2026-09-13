import random
import string
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from modules.tasks.domain.entities import TaskEntity


def generate_invite_code(length: int = 6) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(random.choices(chars, k=length))


def compute_task_analytics(tasks: list["TaskEntity"], dto_cls: type) -> Any:
    """Compute task counts and month-over-month differences."""
    from modules.tasks.domain.enums import TaskStatus

    now = datetime.now(UTC)
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_end = this_month_start
    if this_month_start.month == 1:
        last_month_start = this_month_start.replace(
            year=this_month_start.year - 1, month=12, day=1
        )
    else:
        last_month_start = this_month_start.replace(
            month=this_month_start.month - 1, day=1
        )

    def to_utc(dt: datetime | None) -> datetime | None:
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=UTC)
        return dt.astimezone(UTC)

    this_month_tasks = []
    last_month_tasks = []
    for t in tasks:
        t_created = to_utc(t.created_at)
        if t_created:
            if t_created >= this_month_start:
                this_month_tasks.append(t)
            elif last_month_start <= t_created < last_month_end:
                last_month_tasks.append(t)

    task_count = len(tasks)
    task_difference = len(this_month_tasks) - len(last_month_tasks)

    assigned_task_count = len([t for t in tasks if t.assignee_id])
    assigned_this_month = len([t for t in this_month_tasks if t.assignee_id])
    assigned_last_month = len([t for t in last_month_tasks if t.assignee_id])
    assigned_task_difference = assigned_this_month - assigned_last_month

    completed_task_count = len([t for t in tasks if t.status == TaskStatus.DONE])
    completed_this_month = len(
        [t for t in this_month_tasks if t.status == TaskStatus.DONE]
    )
    completed_last_month = len(
        [t for t in last_month_tasks if t.status == TaskStatus.DONE]
    )
    completed_task_difference = completed_this_month - completed_last_month

    incomplete_task_count = len([t for t in tasks if t.status != TaskStatus.DONE])
    incomplete_this_month = len(
        [t for t in this_month_tasks if t.status != TaskStatus.DONE]
    )
    incomplete_last_month = len(
        [t for t in last_month_tasks if t.status != TaskStatus.DONE]
    )
    incomplete_task_difference = incomplete_this_month - incomplete_last_month

    overdue_tasks = []
    for t in tasks:
        t_due = to_utc(t.due_date)
        if t_due and t_due < now and t.status != TaskStatus.DONE:
            overdue_tasks.append(t)
    overdue_task_count = len(overdue_tasks)

    overdue_this_month = len(
        [
            t
            for t in this_month_tasks
            if (
                (d := to_utc(t.due_date)) is not None
                and d < now
                and t.status != TaskStatus.DONE
            )
        ]
    )
    overdue_last_month = len(
        [
            t
            for t in last_month_tasks
            if (
                (d := to_utc(t.due_date)) is not None
                and d < last_month_end
                and t.status != TaskStatus.DONE
            )
        ]
    )
    overdue_task_difference = overdue_this_month - overdue_last_month

    return dto_cls(
        task_count=task_count,
        task_difference=task_difference,
        assigned_task_count=assigned_task_count,
        assigned_task_difference=assigned_task_difference,
        completed_task_count=completed_task_count,
        completed_task_difference=completed_task_difference,
        incomplete_task_count=incomplete_task_count,
        incomplete_task_difference=incomplete_task_difference,
        overdue_task_count=overdue_task_count,
        overdue_task_difference=overdue_task_difference,
    )
