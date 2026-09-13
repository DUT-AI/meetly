from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Query, status

from apps.api.deps.auth import CurrentUser
from modules.notifications.dtos.notification_dtos import (
    NotificationListResponseDTO,
    NotificationResponseDTO,
)
from modules.notifications.use_cases import (
    ListNotificationsUseCase,
    MarkAllNotificationsReadUseCase,
    MarkNotificationReadUseCase,
)

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=dict,
    summary="List notifications for the logged in user",
)
@inject
async def list_notifications(
    current_user: CurrentUser,
    use_case: FromDishka[ListNotificationsUseCase],
    unread_only: bool = Query(False, description="Filter unread notifications only"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> dict:
    result: NotificationListResponseDTO = await use_case.execute(
        user_id=str(current_user.id),
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )
    return {"data": result}


@router.patch(
    "/{notification_id}/read",
    response_model=dict,
    summary="Mark a specific notification as read",
)
@inject
async def mark_notification_read(
    notification_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[MarkNotificationReadUseCase],
) -> dict:
    result: NotificationResponseDTO | None = await use_case.execute(
        notification_id=notification_id,
        user_id=str(current_user.id),
    )
    return {"data": result}


@router.patch(
    "/read-all",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Mark all notifications as read for current user",
)
@inject
async def mark_all_read(
    current_user: CurrentUser,
    use_case: FromDishka[MarkAllNotificationsReadUseCase],
) -> dict:
    count = await use_case.execute(user_id=str(current_user.id))
    return {"data": {"marked_count": count}}
