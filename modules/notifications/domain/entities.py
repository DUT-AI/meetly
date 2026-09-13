from dataclasses import dataclass
from datetime import datetime


@dataclass
class NotificationEntity:
    id: str
    user_id: str
    actor_id: str | None
    actor_name: str | None
    actor_avatar_url: str | None
    workspace_id: str | None
    type: str
    title: str
    content: str
    entity_type: str
    entity_id: str
    action_url: str | None
    is_read: bool
    read_at: datetime | None
    created_at: datetime
    updated_at: datetime


@dataclass
class NotificationMessage:
    """Message object dispatched to multiple channels."""

    recipient_user_id: str
    event_type: str
    title: str
    content: str
    action_url: str | None = None
    actor_id: str | None = None
    actor_name: str | None = None
    actor_avatar_url: str | None = None
    workspace_id: str | None = None
    entity_type: str = "task"
    entity_id: str = ""
    image_url: str | None = None
    sticker_id: str | None = None

    def to_dict(self) -> dict:
        return {
            "recipient_user_id": self.recipient_user_id,
            "event_type": self.event_type,
            "title": self.title,
            "content": self.content,
            "action_url": self.action_url,
            "actor_id": self.actor_id,
            "actor_name": self.actor_name,
            "actor_avatar_url": self.actor_avatar_url,
            "workspace_id": self.workspace_id,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "image_url": self.image_url,
            "sticker_id": self.sticker_id,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "NotificationMessage":
        return cls(
            recipient_user_id=data.get("recipient_user_id", ""),
            event_type=data.get("event_type", ""),
            title=data.get("title", ""),
            content=data.get("content", ""),
            action_url=data.get("action_url"),
            actor_id=data.get("actor_id"),
            actor_name=data.get("actor_name"),
            actor_avatar_url=data.get("actor_avatar_url"),
            workspace_id=data.get("workspace_id"),
            entity_type=data.get("entity_type", "task"),
            entity_id=data.get("entity_id", ""),
            image_url=data.get("image_url"),
            sticker_id=data.get("sticker_id"),
        )
