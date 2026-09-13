from datetime import datetime

from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Query, status

from apps.api.deps.auth import CurrentUser
from modules.tasks.domain.enums import TaskStatus
from modules.tasks.dtos.comment_dtos import (
    TaskCommentCreateDTO,
    TaskCommentUpdateDTO,
)
from modules.tasks.dtos.task_dtos import (
    TaskBulkUpdateDTO,
    TaskCreateDTO,
    TaskUpdateDTO,
)
from modules.tasks.use_cases import (
    BulkUpdateTasksUseCase,
    CreateTaskCommentUseCase,
    CreateTaskUseCase,
    DeleteTaskCommentUseCase,
    DeleteTaskUseCase,
    GetTaskUseCase,
    ListMyGlobalTasksUseCase,
    ListTaskCommentsUseCase,
    ListTasksUseCase,
    UpdateTaskCommentUseCase,
    UpdateTaskUseCase,
)

router = APIRouter(prefix="/api/v1/tasks", tags=["Tasks"])


@router.get(
    "/my-tasks",
    summary="List all tasks assigned to the current user across all workspaces",
)
@inject
async def list_my_global_tasks(
    current_user: CurrentUser,
    use_case: FromDishka[ListMyGlobalTasksUseCase],
    task_status: TaskStatus | None = Query(None, alias="status"),
    search: str | None = Query(None),
    due_date: datetime | str | None = Query(None, alias="dueDate"),
) -> dict:
    parsed_due_date = None
    if isinstance(due_date, str):
        try:
            parsed_due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        except Exception:
            pass
    elif isinstance(due_date, datetime):
        parsed_due_date = due_date

    result = await use_case.execute(
        user_id=str(current_user.id),
        status=task_status,
        search=search,
        due_date=parsed_due_date,
    )
    return {"data": result}


@router.get(
    "",
    summary="List tasks with query filters",
)
@inject
async def list_tasks(
    current_user: CurrentUser,
    use_case: FromDishka[ListTasksUseCase],
    workspace_id: str = Query(..., alias="workspaceId"),
    project_id: str | None = Query(None, alias="projectId"),
    assignee_id: str | None = Query(None, alias="assigneeId"),
    task_status: TaskStatus | None = Query(None, alias="status"),
    search: str | None = Query(None),
    due_date: datetime | str | None = Query(None, alias="dueDate"),
) -> dict:
    parsed_due_date = None
    if isinstance(due_date, str):
        try:
            parsed_due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        except Exception:
            pass
    elif isinstance(due_date, datetime):
        parsed_due_date = due_date

    result = await use_case.execute(
        workspace_id=workspace_id,
        user_id=str(current_user.id),
        project_id=project_id,
        assignee_id=assignee_id,
        status=task_status,
        search=search,
        due_date=parsed_due_date,
    )
    return {"data": result}


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new task",
)
@inject
async def create_task(
    payload: TaskCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateTaskUseCase],
) -> dict:
    parsed_due_date = None
    if isinstance(payload.due_date, str):
        try:
            parsed_due_date = datetime.fromisoformat(
                payload.due_date.replace("Z", "+00:00")
            )
        except Exception:
            pass
    elif isinstance(payload.due_date, datetime):
        parsed_due_date = payload.due_date

    result = await use_case.execute(
        name=payload.name,
        status=payload.status,
        workspace_id=payload.workspace_id,
        project_id=payload.project_id,
        user_id=str(current_user.id),
        priority=payload.priority,
        labels=payload.labels,
        due_date=parsed_due_date,
        assignee_id=payload.assignee_id,
        assignee_ids=payload.assignee_ids,
        description=payload.description,
    )
    return {"data": result}


@router.get(
    "/{task_id}",
    summary="Get single task details",
)
@inject
async def get_task(
    task_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetTaskUseCase],
) -> dict:
    result = await use_case.execute(
        task_id=task_id,
        user_id=str(current_user.id),
    )
    return {"data": result}


@router.patch(
    "/{task_id}",
    summary="Update task",
)
@inject
async def update_task(
    task_id: str,
    payload: TaskUpdateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateTaskUseCase],
) -> dict:
    parsed_due_date = None
    if isinstance(payload.due_date, str):
        try:
            parsed_due_date = datetime.fromisoformat(
                payload.due_date.replace("Z", "+00:00")
            )
        except Exception:
            pass
    elif isinstance(payload.due_date, datetime):
        parsed_due_date = payload.due_date

    result = await use_case.execute(
        task_id=task_id,
        user_id=str(current_user.id),
        name=payload.name,
        status=payload.status,
        priority=payload.priority,
        labels=payload.labels,
        project_id=payload.project_id,
        assignee_id=payload.assignee_id,
        assignee_ids=payload.assignee_ids,
        due_date=parsed_due_date,
        description=payload.description,
    )
    return {"data": result}


@router.post(
    "/bulk-update",
    summary="Bulk update task positions and status",
)
@inject
async def bulk_update_tasks(
    payload: TaskBulkUpdateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[BulkUpdateTasksUseCase],
) -> dict:
    updated = await use_case.execute(
        items=payload.tasks,
        user_id=str(current_user.id),
    )
    workspace_id = updated[0].workspace_id if updated else ""
    return {
        "data": {
            "updatedTasks": updated,
            "workspaceId": workspace_id,
            "workspace_id": workspace_id,
        }
    }


@router.delete(
    "/{task_id}",
    summary="Delete task",
)
@inject
async def delete_task(
    task_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[DeleteTaskUseCase],
) -> dict:
    await use_case.execute(
        task_id=task_id,
        user_id=str(current_user.id),
    )
    return {"data": {"id": task_id}}


# --- Task Comments Endpoints ---


@router.get(
    "/{task_id}/comments",
    summary="List comments for a task",
)
@inject
async def list_task_comments(
    task_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListTaskCommentsUseCase],
) -> dict:
    result = await use_case.execute(
        task_id=task_id,
        user_id=str(current_user.id),
    )
    return {"data": result}


@router.post(
    "/{task_id}/comments",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new task comment",
)
@inject
async def create_task_comment(
    task_id: str,
    payload: TaskCommentCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateTaskCommentUseCase],
) -> dict:
    result = await use_case.execute(
        task_id=task_id,
        user_id=str(current_user.id),
        content=payload.content,
        mentions=payload.mentions,
    )
    return {"data": result}


@router.patch(
    "/{task_id}/comments/{comment_id}",
    summary="Update a task comment",
)
@inject
async def update_task_comment(
    task_id: str,
    comment_id: str,
    payload: TaskCommentUpdateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateTaskCommentUseCase],
) -> dict:
    result = await use_case.execute(
        task_id=task_id,
        comment_id=comment_id,
        user_id=str(current_user.id),
        content=payload.content,
        mentions=payload.mentions,
    )
    return {"data": result}


@router.delete(
    "/{task_id}/comments/{comment_id}",
    summary="Delete a task comment",
)
@inject
async def delete_task_comment(
    task_id: str,
    comment_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[DeleteTaskCommentUseCase],
) -> dict:
    await use_case.execute(
        task_id=task_id,
        comment_id=comment_id,
        user_id=str(current_user.id),
    )
    return {"data": {"id": comment_id}}
