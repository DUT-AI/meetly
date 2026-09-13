from modules.notifications.domain.entities import NotificationMessage


def test_notification_message_serialization_with_channels() -> None:
    msg = NotificationMessage(
        recipient_user_id="user_123",
        event_type="task_status_changed",
        title="Tiêu đề",
        content="Nội dung",
        action_url="/tasks/1",
        actor_id="actor_1",
        actor_name="Actor",
        actor_avatar_url="https://example.com/avatar.jpg",
        workspace_id="ws_1",
        entity_type="task",
        entity_id="task_1",
        channels=["website", "discord"],
    )

    data = msg.to_dict()
    assert data["channels"] == ["website", "discord"]
    assert data["recipient_user_id"] == "user_123"

    deserialized = NotificationMessage.from_dict(data)
    assert deserialized.channels == ["website", "discord"]
    assert deserialized.recipient_user_id == "user_123"
    assert deserialized.event_type == "task_status_changed"


def test_notification_message_serialization_default_channels() -> None:
    msg = NotificationMessage(
        recipient_user_id="user_123",
        event_type="task_status_changed",
        title="Tiêu đề",
        content="Nội dung",
    )

    data = msg.to_dict()
    assert data["channels"] is None

    deserialized = NotificationMessage.from_dict(data)
    assert deserialized.channels is None
