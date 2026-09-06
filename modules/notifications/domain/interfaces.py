from abc import ABC, abstractmethod
from collections.abc import Sequence

from modules.identity.dtos.manage_dtos import ManageUserDTO
from modules.notifications.domain.entities import (
    NotificationEntity,
    NotificationMessage,
)


class INotificationRepository(ABC):
    """Repository interface for Notification entities."""

    @abstractmethod
    async def create(
        self,
        user_id: str,
        type: str,
        title: str,
        content: str,
        entity_type: str,
        entity_id: str,
        actor_id: str | None = None,
        actor_name: str | None = None,
        actor_avatar_url: str | None = None,
        workspace_id: str | None = None,
        action_url: str | None = None,
    ) -> NotificationEntity:
        """Create a new notification record."""

    @abstractmethod
    async def get_by_id(self, notification_id: str) -> NotificationEntity | None:
        """Get notification by ID."""

    @abstractmethod
    async def list_by_user(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[NotificationEntity]:
        """List notifications for a user ordered by newest first."""

    @abstractmethod
    async def count_unread(self, user_id: str) -> int:
        """Count unread notifications for a user."""

    @abstractmethod
    async def mark_as_read(self, notification_id: str, user_id: str) -> NotificationEntity | None:
        """Mark a specific notification as read."""

    @abstractmethod
    async def mark_all_as_read(self, user_id: str) -> int:
        """Mark all notifications of a user as read."""


class INotificationChannel(ABC):
    """Interface for a notification dispatch channel (Strategy Pattern)."""

    @abstractmethod
    async def send(self, recipient: ManageUserDTO, message: NotificationMessage) -> bool:
        """Send notification to the recipient. Returns True if successfully sent."""
