from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest

from modules.notifications.domain.entities import NotificationEntity
from modules.notifications.domain.interfaces import INotificationRepository
from modules.notifications.use_cases.list_notifications import (
    ListNotificationsUseCase,
)


@pytest.mark.asyncio
async def test_list_notifications_success() -> None:
    # Arrange
    mock_repo = AsyncMock(spec=INotificationRepository)
    now = datetime.now(UTC)
    mock_entities = [
        NotificationEntity(
            id="notif_1",
            user_id="user_123",
            actor_id="actor_456",
            actor_name="Admin User",
            actor_avatar_url="https://example.com/avatar.png",
            workspace_id="ws_789",
            type="task_status_changed",
            title="Trạng thái công việc đã đổi sang 'Done'",
            content="Công việc: Fix bug",
            entity_type="task",
            entity_id="task_001",
            action_url="/workspaces/ws_789/tasks/task_001",
            is_read=False,
            read_at=None,
            created_at=now,
            updated_at=now,
        )
    ]
    mock_repo.list_by_user.return_value = mock_entities
    mock_repo.count_unread.return_value = 1

    use_case = ListNotificationsUseCase(repo=mock_repo)

    # Act
    result = await use_case.execute(
        user_id="user_123", unread_only=True, limit=10, offset=0
    )

    # Assert
    assert result.unread_count == 1
    assert len(result.items) == 1
    item = result.items[0]
    assert item.id == "notif_1"
    assert item.user_id == "user_123"
    assert item.title == "Trạng thái công việc đã đổi sang 'Done'"
    assert item.is_read is False

    mock_repo.list_by_user.assert_awaited_once_with(
        user_id="user_123", unread_only=True, limit=10, offset=0
    )
    mock_repo.count_unread.assert_awaited_once_with(user_id="user_123")


@pytest.mark.asyncio
async def test_list_notifications_empty() -> None:
    mock_repo = AsyncMock(spec=INotificationRepository)
    mock_repo.list_by_user.return_value = []
    mock_repo.count_unread.return_value = 0

    use_case = ListNotificationsUseCase(repo=mock_repo)

    result = await use_case.execute(user_id="user_empty")

    assert result.unread_count == 0
    assert len(result.items) == 0
