from loguru import logger

from core.exceptions import ForbiddenException, NotFoundException
from modules.identity.client.manage_client import ManageClient
from modules.members.domain.interfaces import IMemberRepository
from modules.notifications.dispatcher import NotificationDispatcher
from modules.notifications.domain.entities import NotificationMessage
from modules.tasks.domain.interfaces import ITaskCommentRepository, ITaskRepository
from modules.tasks.dtos.comment_dtos import TaskCommentResponseDTO, TaskCommentUserDTO


class ListTaskCommentsUseCase:
    """List comments for a task populated with user profile info."""

    def __init__(
        self,
        comment_repo: ITaskCommentRepository,
        task_repo: ITaskRepository,
        member_repo: IMemberRepository,
        manage_client: ManageClient,
    ) -> None:
        self.comment_repo = comment_repo
        self.task_repo = task_repo
        self.member_repo = member_repo
        self.manage_client = manage_client

    async def execute(self, task_id: str, user_id: str) -> list[TaskCommentResponseDTO]:
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise NotFoundException("Task not found.")

        member = await self.member_repo.get_member(task.workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        comments = await self.comment_repo.list_by_task(task_id)
        if not comments:
            return []

        # Populate user info
        user_info_map: dict[str, dict[str, str | None]] = {}
        try:
            manage_resp = await self.manage_client.list_users(page=1, page_size=200)
            for u in manage_resp.items:
                user_info_map[str(u.id)] = {
                    "name": u.name,
                    "email": u.email,
                    "avatar_url": u.avatar_url,
                }
        except Exception:
            pass

        return [
            TaskCommentResponseDTO(
                id=c.id,
                task_id=c.task_id,
                user_id=c.user_id,
                content=c.content,
                mentions=c.mentions,
                created_at=c.created_at,
                updated_at=c.updated_at,
                user=TaskCommentUserDTO(
                    id=c.user_id,
                    name=user_info_map.get(c.user_id, {}).get("name")
                    or f"User {c.user_id}",
                    email=user_info_map.get(c.user_id, {}).get("email") or "",
                    avatar_url=user_info_map.get(c.user_id, {}).get("avatar_url"),
                ),
            )
            for c in comments
        ]


class CreateTaskCommentUseCase:
    """Create a new task comment and notify mentioned users."""

    def __init__(
        self,
        comment_repo: ITaskCommentRepository,
        task_repo: ITaskRepository,
        member_repo: IMemberRepository,
        manage_client: ManageClient,
        notification_dispatcher: NotificationDispatcher,
    ) -> None:
        self.comment_repo = comment_repo
        self.task_repo = task_repo
        self.member_repo = member_repo
        self.manage_client = manage_client
        self.notification_dispatcher = notification_dispatcher

    async def execute(
        self,
        task_id: str,
        user_id: str,
        content: str,
        mentions: list[str] | None = None,
    ) -> TaskCommentResponseDTO:
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise NotFoundException("Task not found.")

        member = await self.member_repo.get_member(task.workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        clean_content = content.strip()
        if not clean_content:
            raise NotFoundException("Content cannot be empty.")

        clean_mentions = mentions or []

        created = await self.comment_repo.create(
            task_id=task_id,
            user_id=user_id,
            content=clean_content,
            mentions=clean_mentions,
        )

        user_name: str | None = None
        user_email: str | None = None
        user_avatar_url: str | None = None
        try:
            user = await self.manage_client.get_user(user_id)
            if user:
                user_name = user.name
                user_email = user.email
                user_avatar_url = user.avatar_url
        except Exception:
            pass

        # Dispatch notifications to mentioned users
        logger.info(
            f"Comment created on task {task.id}: clean_mentions={clean_mentions}"
        )
        notified_user_ids = set()
        action_url = f"/workspaces/{task.workspace_id}/tasks/{task.id}"

        for mentioned_id in clean_mentions:
            title = f"{user_name or 'Đồng nghiệp'} đã nhắc đến bạn trong một bình luận"
            msg = NotificationMessage(
                recipient_user_id=str(mentioned_id),
                event_type="task_comment_mention",
                title=title,
                content=clean_content[:200]
                + ("..." if len(clean_content) > 200 else ""),
                action_url=action_url,
                actor_id=user_id,
                actor_name=user_name,
                actor_avatar_url=user_avatar_url,
                workspace_id=task.workspace_id,
                entity_type="task",
                entity_id=task.id,
            )
            notified_user_ids.add(str(mentioned_id))
            await self.notification_dispatcher.dispatch(msg)

        # Notify task assignees about new comment if not already notified
        for a_id in (task.assignee_ids or []):
            assignee_member = await self.member_repo.get_by_id(a_id)
            if (
                assignee_member
                and str(assignee_member.user_id) not in notified_user_ids
            ):
                msg = NotificationMessage(
                    recipient_user_id=str(assignee_member.user_id),
                    event_type="task_new_comment",
                    title=f"{user_name or 'Đồng nghiệp'} đã bình luận về công việc của bạn",
                    content=clean_content[:200]
                    + ("..." if len(clean_content) > 200 else ""),
                    action_url=action_url,
                    actor_id=user_id,
                    actor_name=user_name,
                    actor_avatar_url=user_avatar_url,
                    workspace_id=task.workspace_id,
                    entity_type="task",
                    entity_id=task.id,
                )
                notified_user_ids.add(str(assignee_member.user_id))
                await self.notification_dispatcher.dispatch(msg)

        return TaskCommentResponseDTO(
            id=created.id,
            task_id=created.task_id,
            user_id=created.user_id,
            content=created.content,
            mentions=created.mentions,
            created_at=created.created_at,
            updated_at=created.updated_at,
            user=TaskCommentUserDTO(
                id=user_id,
                name=user_name or f"User {user_id}",
                email=user_email or "",
                avatar_url=user_avatar_url,
            ),
        )


class UpdateTaskCommentUseCase:
    """Update comment (only by author)."""

    def __init__(
        self,
        comment_repo: ITaskCommentRepository,
        task_repo: ITaskRepository,
        member_repo: IMemberRepository,
        manage_client: ManageClient,
    ) -> None:
        self.comment_repo = comment_repo
        self.task_repo = task_repo
        self.member_repo = member_repo
        self.manage_client = manage_client

    async def execute(
        self,
        task_id: str,
        comment_id: str,
        user_id: str,
        content: str,
        mentions: list[str] | None = None,
    ) -> TaskCommentResponseDTO:
        comment = await self.comment_repo.get_by_id(comment_id)
        if not comment or comment.task_id != task_id:
            raise NotFoundException("Comment not found.")

        if comment.user_id != user_id:
            raise ForbiddenException("You can only edit your own comments.")

        clean_content = content.strip()
        if not clean_content:
            raise NotFoundException("Content cannot be empty.")

        updated = await self.comment_repo.update(
            comment_id=comment_id,
            content=clean_content,
            mentions=mentions,
        )

        user_name: str | None = None
        user_email: str | None = None
        user_avatar_url: str | None = None
        try:
            user = await self.manage_client.get_user(user_id)
            if user:
                user_name = user.name
                user_email = user.email
                user_avatar_url = user.avatar_url
        except Exception:
            pass

        return TaskCommentResponseDTO(
            id=updated.id,
            task_id=updated.task_id,
            user_id=updated.user_id,
            content=updated.content,
            mentions=updated.mentions,
            created_at=updated.created_at,
            updated_at=updated.updated_at,
            user=TaskCommentUserDTO(
                id=user_id,
                name=user_name or f"User {user_id}",
                email=user_email or "",
                avatar_url=user_avatar_url,
            ),
        )


class DeleteTaskCommentUseCase:
    """Delete comment (by author or ADMIN/OWNER)."""

    def __init__(
        self,
        comment_repo: ITaskCommentRepository,
        task_repo: ITaskRepository,
        member_repo: IMemberRepository,
    ) -> None:
        self.comment_repo = comment_repo
        self.task_repo = task_repo
        self.member_repo = member_repo

    async def execute(self, task_id: str, comment_id: str, user_id: str) -> None:
        comment = await self.comment_repo.get_by_id(comment_id)
        if not comment or comment.task_id != task_id:
            raise NotFoundException("Comment not found.")

        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise NotFoundException("Task not found.")

        member = await self.member_repo.get_member(task.workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        # Allow author or workspace admin
        if comment.user_id != user_id and member.role != "ADMIN":
            raise ForbiddenException("You can only delete your own comments.")

        await self.comment_repo.delete(comment_id)
