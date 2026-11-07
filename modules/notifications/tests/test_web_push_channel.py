from unittest.mock import AsyncMock, MagicMock
import pytest

from modules.identity.dtos.user_dtos import UserProfileDetailDTO
from modules.notifications.channels.web_push_channel import WebPushChannel
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.models.push_subscription import PushSubscriptionModel
from modules.notifications.repository.push_subscription_repository import (
    PushSubscriptionRepository,
)
from modules.notifications.services.web_push_service import WebPushService


@pytest.fixture
def mock_recipient() -> UserProfileDetailDTO:
    return UserProfileDetailDTO(
        id=10,
        name="Tester",
        email="test@example.com",
    )


@pytest.mark.asyncio
async def test_web_push_channel_send_success(mock_recipient: UserProfileDetailDTO) -> None:
    push_repo = AsyncMock(spec=PushSubscriptionRepository)
    push_service = MagicMock(spec=WebPushService)

    mock_sub = PushSubscriptionModel(
        id="01TESTSUB1234567890ABCDEF",
        user_id="10",
        endpoint="https://fcm.googleapis.com/fcm/send/test-endpoint",
        p256dh="test_p256dh",
        auth="test_auth",
    )
    push_repo.list_by_user.return_value = [mock_sub]
    push_service.send_push.return_value = True

    channel = WebPushChannel(push_repo=push_repo, push_service=push_service)

    msg = NotificationMessage(
        recipient_user_id="10",
        event_type="task_assigned",
        title="Công việc mới",
        content="Bạn được phân công làm việc A",
        action_url="/workspaces/1/tasks/1",
    )

    result = await channel.send(mock_recipient, msg)
    assert result is True
    push_service.send_push.assert_called_once()
    assert push_repo.delete_by_endpoint.call_count == 0


@pytest.mark.asyncio
async def test_web_push_channel_no_subscriptions(mock_recipient: UserProfileDetailDTO) -> None:
    push_repo = AsyncMock(spec=PushSubscriptionRepository)
    push_service = MagicMock(spec=WebPushService)
    push_repo.list_by_user.return_value = []

    channel = WebPushChannel(push_repo=push_repo, push_service=push_service)

    msg = NotificationMessage(
        recipient_user_id="10",
        event_type="meeting_report_ready",
        title="Báo cáo họp",
        content="Báo cáo đã xong",
    )

    result = await channel.send(mock_recipient, msg)
    assert result is False
    push_service.send_push.assert_not_called()

