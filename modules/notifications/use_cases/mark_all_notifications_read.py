from modules.notifications.domain.interfaces import INotificationRepository


class MarkAllNotificationsReadUseCase:
    """Mark all notifications of user as read."""

    def __init__(self, repo: INotificationRepository) -> None:
        self.repo = repo

    async def execute(self, user_id: str) -> int:
        return await self.repo.mark_all_as_read(user_id=user_id)
