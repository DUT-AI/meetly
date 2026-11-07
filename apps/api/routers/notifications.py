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


from modules.notifications.use_cases.test_zalo_use_case import TestZaloUseCase


@router.post(
    "/test-zalo",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Test Zalo Integration natively",
)
@inject
async def test_zalo_integration(
    current_user: CurrentUser,
    use_case: FromDishka[TestZaloUseCase],
    zalo_chat_id: str = Query(
        ..., description="The recipient's Zalo Chat ID (User ID)"
    ),
    payload_type: str = Query(
        "text", description="Payload type: text, photo, or sticker"
    ),
    payload_value: str = Query(
        "Test Message", description="Text, Image URL, or Sticker ID"
    ),
) -> dict:
    """
    Test endpoint to test the integrated Zalo notification channel.
    """
    success = await use_case.execute(
        user_id=str(current_user.id),
        zalo_bot_id=zalo_chat_id,
        payload_type=payload_type,
        payload_value=payload_value,
    )

    if success:
        return {"success": True, "message": "Triggered Zalo successfully!"}

    return {"success": False, "message": "Failed to trigger Zalo. Check logs."}


from pydantic import BaseModel
from core.config.notification import notification_settings
from modules.notifications.repository.push_subscription_repository import (
    PushSubscriptionRepository,
)
from modules.notifications.services.web_push_service import WebPushService


class PushSubscriptionRequest(BaseModel):
    endpoint: str
    keys: dict[str, str]
    user_agent: str | None = None


@router.get(
    "/vapid-public-key",
    response_model=dict,
    summary="Get VAPID public key for Web Push registration",
)
def get_vapid_public_key() -> dict:
    return {"data": {"public_key": notification_settings.vapid_public_key}}


@router.post(
    "/push-subscriptions",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Register or update browser Web Push subscription",
)
@inject
async def register_push_subscription(
    payload: PushSubscriptionRequest,
    current_user: CurrentUser,
    repo: FromDishka[PushSubscriptionRepository],
) -> dict:
    p256dh = payload.keys.get("p256dh", "")
    auth = payload.keys.get("auth", "")
    if not payload.endpoint or not p256dh or not auth:
        return {"success": False, "detail": "Invalid subscription keys"}

    sub = await repo.upsert(
        user_id=str(current_user.id),
        endpoint=payload.endpoint,
        p256dh=p256dh,
        auth=auth,
        user_agent=payload.user_agent,
    )
    return {"data": {"id": sub.id, "registered": True}}


@router.delete(
    "/push-subscriptions",
    response_model=dict,
    summary="Unregister browser Web Push subscription",
)
@inject
async def unregister_push_subscription(
    endpoint: str = Query(..., description="Endpoint URL to delete"),
    repo: FromDishka[PushSubscriptionRepository] = None,
) -> dict:
    deleted = await repo.delete_by_endpoint(endpoint)
    return {"data": {"deleted": deleted}}


@router.post(
    "/test-push",
    response_model=dict,
    summary="Send a test Web Push notification to current user's devices",
)
@inject
async def test_push_notification(
    current_user: CurrentUser,
    repo: FromDishka[PushSubscriptionRepository],
    push_service: FromDishka[WebPushService],
    title: str = Query("Meetly Test Push", description="Title"),
    message: str = Query("Đây là thông báo thử nghiệm từ Meetly!", description="Body"),
) -> dict:
    subs = await repo.list_by_user(str(current_user.id))
    if not subs:
        return {
            "success": False,
            "message": "Chưa có thiết bị nào đăng ký Push Notification cho tài khoản này.",
        }

    payload = {
        "title": f"🔔 {title}",
        "body": message,
        "icon": "/icons/icon-192x192.png",
        "badge": "/icons/icon-192x192.png",
        "action_url": "https://meetly.dutai.io.vn",
        "tag": "meetly-test-push",
        "data": {"url": "https://meetly.dutai.io.vn"},
    }

    results = []
    for s in subs:
        sent = push_service.send_push(
            endpoint=s.endpoint,
            p256dh=s.p256dh,
            auth=s.auth,
            payload=payload,
        )
        results.append(sent)

    return {
        "success": any(results),
        "total_devices": len(subs),
        "delivered_devices": sum(1 for r in results if r),
    }

