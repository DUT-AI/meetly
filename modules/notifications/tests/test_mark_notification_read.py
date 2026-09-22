from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest

from modules.notifications.domain.entities import NotificationEntity
from modules.notifications.domain.interfaces import INotificationRepository
from modules.notifications.use_cases.mark_notification_read import (
    MarkNotificationReadUseCase,
)


@pytest.mark.asyncio
async def test_mark_notification_read_found() -> None:
    # Arrange
    mock_repo = AsyncMock(spec=INotificationRepository)
    now = datetime.now(UTC)
    mock_entity = NotificationEntity(
        id="notif_1",
        user_id="user_123",
        actor_id="actor_456",
        actor_name="Admin User",
        actor_avatar_url=None,
        workspace_id="ws_789",
        type="task_status_changed",
        title="Trạng thái công việc đã đổi",
        content="Công việc: Refactor",
        entity_type="task",
        entity_id="task_001",
        action_url="/workspaces/ws_789/tasks/task_001",
        is_read=True,
        read_at=now,
        created_at=now,
        updated_at=now,
    )
    mock_repo.mark_as_read.return_value = mock_entity

    use_case = MarkNotificationReadUseCase(repo=mock_repo)

    # Act
    result = await use_case.execute(notification_id="notif_1", user_id="user_123")

    # Assert
    assert result is not None
    assert result.id == "notif_1"
    assert result.is_read is True
    assert result.read_at == now
    mock_repo.mark_as_read.assert_awaited_once_with(
        notification_id="notif_1", user_id="user_123"
    )


@pytest.mark.asyncio
async def test_mark_notification_read_not_found() -> None:
    mock_repo = AsyncMock(spec=INotificationRepository)
    mock_repo.mark_as_read.return_value = None

    use_case = MarkNotificationReadUseCase(repo=mock_repo)

    result = await use_case.execute(notification_id="nonexistent", user_id="user_123")

    assert result is None
    mock_repo.mark_as_read.assert_awaited_once_with(
        notification_id="nonexistent", user_id="user_123"
    )
