from modules.notifications.domain.interfaces import INotificationRepository
from modules.notifications.dtos.notification_dtos import NotificationResponseDTO


class MarkNotificationReadUseCase:
    """Mark a specific notification as read."""

    def __init__(self, repo: INotificationRepository) -> None:
        self.repo = repo

    async def execute(
        self, notification_id: str, user_id: str
    ) -> NotificationResponseDTO | None:
        entity = await self.repo.mark_as_read(
            notification_id=notification_id, user_id=user_id
        )
        if not entity:
            return None
        return NotificationResponseDTO(
            id=entity.id,
            user_id=entity.user_id,
            actor_id=entity.actor_id,
            actor_name=entity.actor_name,
            actor_avatar_url=entity.actor_avatar_url,
            workspace_id=entity.workspace_id,
            type=entity.type,
            title=entity.title,
            content=entity.content,
            entity_type=entity.entity_type,
            entity_id=entity.entity_id,
            action_url=entity.action_url,
            is_read=entity.is_read,
            read_at=entity.read_at,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
