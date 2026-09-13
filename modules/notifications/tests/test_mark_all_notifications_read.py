from unittest.mock import AsyncMock

import pytest

from modules.notifications.domain.interfaces import INotificationRepository
from modules.notifications.use_cases.mark_all_notifications_read import (
    MarkAllNotificationsReadUseCase,
)


@pytest.mark.asyncio
async def test_mark_all_notifications_read_success() -> None:
    mock_repo = AsyncMock(spec=INotificationRepository)
    mock_repo.mark_all_as_read.return_value = 5

    use_case = MarkAllNotificationsReadUseCase(repo=mock_repo)

    result = await use_case.execute(user_id="user_123")

    assert result == 5
    mock_repo.mark_all_as_read.assert_awaited_once_with(user_id="user_123")
