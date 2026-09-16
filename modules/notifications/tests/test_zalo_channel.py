from unittest.mock import AsyncMock, patch
import pytest

from modules.identity.dtos.manage_dtos import ManageUserDTO
from modules.notifications.channels.zalo_channel import ZaloBotChannel
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.services.zalo_bot_client import ZaloBotClient
from modules.notifications.services.zalo_sticker_service import (
    get_angry_stickers,
    get_normal_stickers,
    is_deadline_or_urgent,
    get_sticker_for_notification,
)


def test_sticker_service_categories():
    normals = get_normal_stickers()
    angrys = get_angry_stickers()

    assert len(normals) >= 19
    assert len(angrys) >= 20
    assert "9eb3a59c99d9708729c8" in normals

    # Test keyword matching for angry/deadline
    assert is_deadline_or_urgent("task_overdue", "Quá hạn", "Đã trễ 2 ngày") is True
    assert is_deadline_or_urgent("task_due_soon", "Sắp đến hạn", "Còn 2 giờ") is True
    assert is_deadline_or_urgent("task_assigned", "Giao việc", "Đúng deadline nhe") is True
    assert is_deadline_or_urgent("task_status_changed", "Đã hoàn thành", "Done việc") is False

    # Selection logic
    angry_stk = get_sticker_for_notification("task_overdue", "Trễ", "Trễ deadline")
    assert angry_stk in angrys

    normal_stk = get_sticker_for_notification("task_assigned", "Giao việc", "Làm nhé")
    assert normal_stk in normals

    # Custom sticker override
    custom_stk = get_sticker_for_notification(
        "task_overdue", "Trễ", "Trễ", default_sticker_id="custom_123"
    )
    assert custom_stk == "custom_123"


def test_loto_cluster_drawing():
    from modules.notifications.services.zalo_sticker_service import (
        get_normal_clusters,
        get_angry_clusters,
        _loto_picker,
    )

    n_clusters = get_normal_clusters()
    a_clusters = get_angry_clusters()

    assert len(n_clusters) >= 7
    assert len(a_clusters) >= 5

    # Test drawing multiple times: clusters should vary (loto across clusters)
    drawn_normal_clusters = set()
    for _ in range(15):
        stk, cluster = _loto_picker.draw_normal()
        assert stk in n_clusters[cluster]
        drawn_normal_clusters.add(cluster)

    assert len(drawn_normal_clusters) > 1

    drawn_angry_clusters = set()
    for _ in range(15):
        stk, cluster = _loto_picker.draw_angry()
        assert stk in a_clusters[cluster]
        drawn_angry_clusters.add(cluster)

    assert len(drawn_angry_clusters) > 1


@pytest.fixture
def mock_recipient():
    return ManageUserDTO(
        id="user_123",
        email="test@meetly.io",
        name="Test User",
        status="ACTIVE",
        roles=[],
        zalo_bot_id="zalo_chat_999",
    )


@pytest.mark.asyncio
async def test_zalo_channel_sends_text_and_normal_sticker(mock_recipient):
    mock_client = AsyncMock(spec=ZaloBotClient)
    mock_client.send_message.return_value = {"ok": True}
    mock_client.send_sticker.return_value = {"ok": True}

    channel = ZaloBotChannel(zalo_client=mock_client)
    message = NotificationMessage(
        recipient_user_id=mock_recipient.id,
        event_type="task_status_changed",
        title="Trạng thái đã cập nhật",
        content="Nội dung bình thường",
    )

    result = await channel.send(mock_recipient, message)

    assert result is True
    mock_client.send_message.assert_awaited_once()
    mock_client.send_sticker.assert_awaited_once()

    # Check sticker is in normal stickers
    call_args = mock_client.send_sticker.call_args
    assert call_args[1]["chat_id"] == "zalo_chat_999"
    assert call_args[1]["sticker"] in get_normal_stickers()


@pytest.mark.asyncio
async def test_zalo_channel_sends_angry_sticker_on_deadline(mock_recipient):
    mock_client = AsyncMock(spec=ZaloBotClient)
    mock_client.send_message.return_value = {"ok": True}
    mock_client.send_sticker.return_value = {"ok": True}

    channel = ZaloBotChannel(zalo_client=mock_client)
    message = NotificationMessage(
        recipient_user_id=mock_recipient.id,
        event_type="task_overdue",
        title="⚠️ Công việc đã quá hạn 1 ngày!",
        content="Hạn hoàn thành đã qua. Vui lòng cập nhật!",
    )

    result = await channel.send(mock_recipient, message)

    assert result is True
    mock_client.send_message.assert_awaited_once()
    mock_client.send_sticker.assert_awaited_once()

    # Check sticker is in angry stickers
    call_args = mock_client.send_sticker.call_args
    assert call_args[1]["chat_id"] == "zalo_chat_999"
    assert call_args[1]["sticker"] in get_angry_stickers()


@pytest.mark.asyncio
async def test_zalo_channel_respects_custom_sticker_id(mock_recipient):
    mock_client = AsyncMock(spec=ZaloBotClient)
    mock_client.send_message.return_value = {"ok": True}
    mock_client.send_sticker.return_value = {"ok": True}

    channel = ZaloBotChannel(zalo_client=mock_client)
    message = NotificationMessage(
        recipient_user_id=mock_recipient.id,
        event_type="task_status_changed",
        title="Tiêu đề",
        content="Nội dung",
        sticker_id="specific_custom_sticker_id",
    )

    result = await channel.send(mock_recipient, message)

    assert result is True
    mock_client.send_sticker.assert_awaited_once_with(
        chat_id="zalo_chat_999",
        sticker="specific_custom_sticker_id",
    )


@pytest.mark.asyncio
async def test_zalo_channel_sends_photo_and_sticker(mock_recipient):
    mock_client = AsyncMock(spec=ZaloBotClient)
    mock_client.send_photo.return_value = {"ok": True}
    mock_client.send_sticker.return_value = {"ok": True}

    channel = ZaloBotChannel(zalo_client=mock_client)
    message = NotificationMessage(
        recipient_user_id=mock_recipient.id,
        event_type="task_created",
        title="Có ảnh đính kèm",
        content="Xem ảnh nhé",
        image_url="https://example.com/image.png",
    )

    result = await channel.send(mock_recipient, message)

    assert result is True
    mock_client.send_photo.assert_awaited_once()
    mock_client.send_sticker.assert_awaited_once()
