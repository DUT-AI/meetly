from modules.notifications.domain.interfaces import INotificationRepository
from modules.notifications.dtos.notification_dtos import (
    NotificationListResponseDTO,
    NotificationResponseDTO,
)


class ListNotificationsUseCase:
    """List notifications for the current user and return unread count."""

    def __init__(self, repo: INotificationRepository) -> None:
        self.repo = repo

    async def execute(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> NotificationListResponseDTO:
        items = await self.repo.list_by_user(
            user_id=user_id,
            unread_only=unread_only,
            limit=limit,
            offset=offset,
        )
        unread_count = await self.repo.count_unread(user_id=user_id)

        return NotificationListResponseDTO(
            items=[
                NotificationResponseDTO(
                    id=n.id,
                    user_id=n.user_id,
                    actor_id=n.actor_id,
                    actor_name=n.actor_name,
                    actor_avatar_url=n.actor_avatar_url,
                    workspace_id=n.workspace_id,
                    type=n.type,
                    title=n.title,
                    content=n.content,
                    entity_type=n.entity_type,
                    entity_id=n.entity_id,
                    action_url=n.action_url,
                    is_read=n.is_read,
                    read_at=n.read_at,
                    created_at=n.created_at,
                    updated_at=n.updated_at,
                )
                for n in items
            ],
            unread_count=unread_count,
        )
