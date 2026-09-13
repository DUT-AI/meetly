from unittest.mock import AsyncMock

import pytest

from modules.identity.client.manage_client import ManageClient
from modules.identity.dtos.manage_dtos import ManageUserDTO
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.domain.interfaces import INotificationChannel
from modules.notifications.use_cases.send_notification import (
    SendNotificationUseCase,
)


@pytest.fixture
def mock_recipient() -> ManageUserDTO:
    return ManageUserDTO(
        id="user_123",
        name="John Doe",
        email="john@example.com",
        avatar_url="https://example.com/avatar.jpg",
        discord_id="discord_123",
        zalo_bot_id="zalo_123",
    )


@pytest.mark.asyncio
async def test_send_notification_all_channels(mock_recipient: ManageUserDTO) -> None:
    # Arrange
    manage_client = AsyncMock(spec=ManageClient)
    manage_client.get_user.return_value = mock_recipient

    channel_web = AsyncMock(spec=INotificationChannel)
    channel_web.channel_name = "website"
    channel_web.send.return_value = True

    channel_discord = AsyncMock(spec=INotificationChannel)
    channel_discord.channel_name = "discord"
    channel_discord.send.return_value = True

    channel_zalo = AsyncMock(spec=INotificationChannel)
    channel_zalo.channel_name = "zalo"
    channel_zalo.send.return_value = True

    channels = [channel_web, channel_discord, channel_zalo]
    use_case = SendNotificationUseCase(
        channels=channels, manage_client=manage_client
    )

    message = NotificationMessage(
        recipient_user_id="user_123",
        event_type="task_status_changed",
        title="Công việc đã hoàn thành",
        content="Task X đã chuyển sang Done",
        channels=None,  # No channel filter -> all channels
    )

    # Act
    await use_case.execute(message)

    # Assert
    channel_web.send.assert_awaited_once_with(mock_recipient, message)
    channel_discord.send.assert_awaited_once_with(mock_recipient, message)
    channel_zalo.send.assert_awaited_once_with(mock_recipient, message)


@pytest.mark.asyncio
async def test_send_notification_channel_filtering(
    mock_recipient: ManageUserDTO,
) -> None:
    # Arrange: message only targets 'website' and 'zalo'
    manage_client = AsyncMock(spec=ManageClient)
    manage_client.get_user.return_value = mock_recipient

    channel_web = AsyncMock(spec=INotificationChannel)
    channel_web.channel_name = "website"
    channel_web.send.return_value = True

    channel_discord = AsyncMock(spec=INotificationChannel)
    channel_discord.channel_name = "discord"
    channel_discord.send.return_value = True

    channel_zalo = AsyncMock(spec=INotificationChannel)
    channel_zalo.channel_name = "zalo"
    channel_zalo.send.return_value = True

    channels = [channel_web, channel_discord, channel_zalo]
    use_case = SendNotificationUseCase(
        channels=channels, manage_client=manage_client
    )

    message = NotificationMessage(
        recipient_user_id="user_123",
        event_type="task_status_changed",
        title="Công việc đã chuyển trạng thái",
        content="Task Y",
        channels=["website", "zalo"],  # Discord is disabled!
    )

    # Act
    await use_case.execute(message)

    # Assert
    channel_web.send.assert_awaited_once_with(mock_recipient, message)
    channel_zalo.send.assert_awaited_once_with(mock_recipient, message)
    channel_discord.send.assert_not_awaited()


@pytest.mark.asyncio
async def test_send_notification_recipient_not_found() -> None:
    manage_client = AsyncMock(spec=ManageClient)
    manage_client.get_user.return_value = None

    channel_web = AsyncMock(spec=INotificationChannel)
    channel_web.channel_name = "website"

    use_case = SendNotificationUseCase(
        channels=[channel_web], manage_client=manage_client
    )
    message = NotificationMessage(
        recipient_user_id="unknown_user",
        event_type="task_status_changed",
        title="Title",
        content="Content",
    )

    await use_case.execute(message)

    channel_web.send.assert_not_awaited()
