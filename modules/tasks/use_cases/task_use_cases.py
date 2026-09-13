from datetime import UTC, datetime
from typing import Any

from loguru import logger

from core.config.notification import notification_settings
from core.exceptions import ForbiddenException, NotFoundException
from modules.identity.client.manage_client import ManageClient
from modules.members.domain.interfaces import IMemberRepository
from modules.members.dtos.member_dtos import MemberResponseDTO
from modules.notifications.dispatcher import NotificationDispatcher
from modules.notifications.domain.entities import NotificationMessage
from modules.notifications.services.discord_service import DiscordService
from modules.projects.domain.interfaces import IProjectRepository
from modules.projects.dtos.project_dtos import ProjectResponseDTO
from modules.tasks.domain.enums import TaskPriority, TaskStatus
from modules.tasks.domain.interfaces import ITaskRepository
from modules.tasks.dtos.task_dtos import (
    PopulatedTaskResponseDTO,
    TaskBulkItemDTO,
    TaskListResponseDTO,
    TaskResponseDTO,
)
from modules.workspaces.domain.interfaces import IWorkspaceRepository
from modules.workspaces.dtos.workspace_dtos import WorkspaceInfoResponseDTO


async def _send_task_status_discord_notification(
    discord_service: DiscordService,
    workspace_repo: IWorkspaceRepository,
    project_repo: IProjectRepository,
    member_repo: IMemberRepository,
    manage_client: ManageClient,
    workspace_id: str,
    project_id: str,
    task_id: str,
    task_name: str,
    old_status: TaskStatus,
    new_status: TaskStatus,
    actor_name: str,
    assignee_id: str | None = None,
) -> None:
    """Send a rich Discord embed to workspace's discord_room_id channel on status change."""
    try:
        workspace = await workspace_repo.get_by_id(workspace_id)
        if not workspace or not workspace.discord_room_id:
            return

        status_names = {
            TaskStatus.BACKLOG: "Tồn đọng (Backlog)",
            TaskStatus.TODO: "Cần làm (Todo)",
            TaskStatus.IN_PROGRESS: "Đang làm (In Progress)",
            TaskStatus.IN_REVIEW: "Đang duyệt (In Review)",
            TaskStatus.DONE: "Đã hoàn thành (Done)",
        }
        status_colors = {
            TaskStatus.DONE: 0x22C55E,  # Green
            TaskStatus.IN_PROGRESS: 0x3B82F6,  # Blue
            TaskStatus.IN_REVIEW: 0xF59E0B,  # Amber
            TaskStatus.TODO: 0x64748B,  # Slate
            TaskStatus.BACKLOG: 0x94A3B8,  # Light Slate
        }

        old_st_label = status_names.get(old_status, old_status.value)
        new_st_label = status_names.get(new_status, new_status.value)

        project = await project_repo.get_by_id(project_id)
        project_name = project.name if project else "Không xác định"

        assignee_name = "Chưa giao"
        if assignee_id:
            assignee_m = await member_repo.get_by_id(assignee_id)
            if assignee_m:
                assignee_u = await manage_client.get_user(assignee_m.user_id)
                if assignee_u and assignee_u.name:
                    assignee_name = assignee_u.name

        base_url = notification_settings.app_url.rstrip("/")
        action_url = f"{base_url}/workspaces/{workspace_id}/tasks/{task_id}"

        embed = {
            "title": f"📋 {task_name}",
            "description": f"Trạng thái công việc vừa đổi: **{old_st_label}** ➔ **{new_st_label}**",
            "color": status_colors.get(new_status, 0x2563EB),
            "url": action_url,
            "fields": [
                {"name": "🏢 Phòng ban", "value": workspace.name, "inline": True},
                {"name": "📁 Dự án", "value": project_name, "inline": True},
                {"name": "👤 Người thực hiện", "value": assignee_name, "inline": True},
                {"name": "⚡ Người cập nhật", "value": actor_name, "inline": True},
            ],
            "footer": {"text": "Meetly Task Management"},
            "timestamp": datetime.now(UTC).isoformat(),
        }

        await discord_service.send_message_to_channel(
            channel_id=workspace.discord_room_id,
            content=f"🔔 **[Meetly • {workspace.name}]** Công việc **{task_name}** vừa đổi trạng thái sang **{new_st_label}**",
            embed=embed,
        )
    except Exception as e:
        logger.warning(f"Failed to send Discord room notification: {e}")


class CreateTaskUseCase:
    """Create a new task with automatic position calculation and notification."""

    def __init__(
        self,
        task_repo: ITaskRepository,
        member_repo: IMemberRepository,
        manage_client: ManageClient,
        notification_dispatcher: NotificationDispatcher,
    ) -> None:
        self.task_repo = task_repo
        self.member_repo = member_repo
        self.manage_client = manage_client
        self.notification_dispatcher = notification_dispatcher

    async def execute(
        self,
        name: str,
        status: TaskStatus,
        workspace_id: str,
        project_id: str,
        user_id: str,
        priority: TaskPriority = TaskPriority.MEDIUM,
        labels: list[str] | None = None,
        due_date: datetime | None = None,
        assignee_id: str | None = None,
        description: str | None = None,
    ) -> TaskResponseDTO:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        highest = await self.task_repo.get_highest_position(workspace_id, status)
        new_position = (highest + 1000) if highest is not None else 1000

        task = await self.task_repo.create(
            name=name,
            status=status,
            workspace_id=workspace_id,
            project_id=project_id,
            position=new_position,
            priority=priority,
            labels=labels or [],
            due_date=due_date,
            assignee_id=assignee_id,
            description=description,
        )

        # Notify assignee
        logger.info(f"Task created: id={task.id}, assignee_id={assignee_id}")
        if assignee_id:
            assignee_member = await self.member_repo.get_by_id(assignee_id)
            logger.info(f"Assignee member found: {assignee_member}")
            if assignee_member:
                creator_user = await self.manage_client.get_user(user_id)
                creator_name = creator_user.name if creator_user else "Đồng nghiệp"
                creator_avatar = creator_user.avatar_url if creator_user else None

                title = f"{creator_name} đã giao việc cho bạn"

                msg = NotificationMessage(
                    recipient_user_id=assignee_member.user_id,
                    event_type="task_assigned",
                    title=title,
                    content=f"Công việc: {task.name}",
                    action_url=f"/workspaces/{task.workspace_id}/tasks/{task.id}",
                    actor_id=user_id,
                    actor_name=creator_name,
                    actor_avatar_url=creator_avatar,
                    workspace_id=task.workspace_id,
                    entity_type="task",
                    entity_id=task.id,
                )
                logger.info(
                    f"Dispatching notification: recipient={msg.recipient_user_id}, title={msg.title}"
                )
                await self.notification_dispatcher.dispatch(msg)

        return TaskResponseDTO(
            id=task.id,
            name=task.name,
            status=task.status,
            priority=task.priority,
            labels=task.labels,
            workspace_id=task.workspace_id,
            project_id=task.project_id,
            assignee_id=task.assignee_id,
            position=task.position,
            due_date=task.due_date,
            description=task.description,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )


class ListTasksUseCase:
    """List tasks in a workspace populated with project and assignee information."""

    def __init__(
        self,
        task_repo: ITaskRepository,
        member_repo: IMemberRepository,
        project_repo: IProjectRepository,
        manage_client: ManageClient,
    ) -> None:
        self.task_repo = task_repo
        self.member_repo = member_repo
        self.project_repo = project_repo
        self.manage_client = manage_client

    async def execute(
        self,
        workspace_id: str,
        user_id: str,
        project_id: str | None = None,
        assignee_id: str | None = None,
        status: TaskStatus | None = None,
        search: str | None = None,
        due_date: datetime | None = None,
    ) -> TaskListResponseDTO:
        caller = await self.member_repo.get_member(workspace_id, user_id)
        if not caller:
            raise ForbiddenException("Unauthorized.")

        tasks = await self.task_repo.list_tasks(
            workspace_id=workspace_id,
            project_id=project_id,
            assignee_id=assignee_id,
            status=status,
            search=search,
            due_date=due_date,
        )

        if not tasks:
            return TaskListResponseDTO(documents=[], total=0)

        # Batch fetch projects
        project_ids = list({t.project_id for t in tasks})
        projects = await self.project_repo.get_by_ids(project_ids)
        project_map = {
            p.id: ProjectResponseDTO(
                id=p.id,
                name=p.name,
                workspace_id=p.workspace_id,
                image_url=p.image_url,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
            for p in projects
        }

        # Batch fetch members
        members = await self.member_repo.list_by_workspace(workspace_id)
        member_map = {m.id: m for m in members}

        # Fetch users from manage client to populate assignee profile
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

        populated: list[PopulatedTaskResponseDTO] = []
        for t in tasks:
            proj = project_map.get(t.project_id)
            if not proj:
                continue

            assignee_dto: MemberResponseDTO | None = None
            if t.assignee_id and t.assignee_id in member_map:
                m = member_map[t.assignee_id]
                info = user_info_map.get(m.user_id, {})
                assignee_dto = MemberResponseDTO(
                    id=m.id,
                    workspace_id=m.workspace_id,
                    user_id=m.user_id,
                    name=info.get("name") or f"User {m.user_id}",
                    email=info.get("email") or "",
                    avatar_url=info.get("avatar_url"),
                    role=m.role,
                    created_at=m.created_at,
                    updated_at=m.updated_at,
                )

            populated.append(
                PopulatedTaskResponseDTO(
                    id=t.id,
                    name=t.name,
                    status=t.status,
                    priority=t.priority,
                    labels=t.labels,
                    workspace_id=t.workspace_id,
                    project_id=t.project_id,
                    assignee_id=t.assignee_id,
                    position=t.position,
                    due_date=t.due_date,
                    description=t.description,
                    created_at=t.created_at,
                    updated_at=t.updated_at,
                    project=proj,
                    assignee=assignee_dto,
                )
            )

        return TaskListResponseDTO(documents=populated, total=len(populated))


class GetTaskUseCase:
    """Get single task populated with project and assignee."""

    def __init__(
        self,
        task_repo: ITaskRepository,
        member_repo: IMemberRepository,
        project_repo: IProjectRepository,
        manage_client: ManageClient,
    ) -> None:
        self.task_repo = task_repo
        self.member_repo = member_repo
        self.project_repo = project_repo
        self.manage_client = manage_client

    async def execute(self, task_id: str, user_id: str) -> PopulatedTaskResponseDTO:
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise NotFoundException("Task not found.")

        member = await self.member_repo.get_member(task.workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        proj = await self.project_repo.get_by_id(task.project_id)
        if not proj:
            raise NotFoundException("Project not found.")

        assignee_dto: MemberResponseDTO | None = None
        if task.assignee_id:
            m = await self.member_repo.get_by_id(task.assignee_id)
            if m:
                info: dict[str, str | None] = {}
                try:
                    manage_resp = await self.manage_client.list_users(
                        page=1, page_size=200
                    )
                    for u in manage_resp.items:
                        if str(u.id) == m.user_id:
                            info = {
                                "name": u.name,
                                "email": u.email,
                                "avatar_url": u.avatar_url,
                            }
                            break
                except Exception:
                    pass

                assignee_dto = MemberResponseDTO(
                    id=m.id,
                    workspace_id=m.workspace_id,
                    user_id=m.user_id,
                    name=info.get("name") or f"User {m.user_id}",
                    email=info.get("email") or "",
                    avatar_url=info.get("avatar_url"),
                    role=m.role,
                    created_at=m.created_at,
                    updated_at=m.updated_at,
                )

        return PopulatedTaskResponseDTO(
            id=task.id,
            name=task.name,
            status=task.status,
            priority=task.priority,
            labels=task.labels,
            workspace_id=task.workspace_id,
            project_id=task.project_id,
            assignee_id=task.assignee_id,
            position=task.position,
            due_date=task.due_date,
            description=task.description,
            created_at=task.created_at,
            updated_at=task.updated_at,
            project=ProjectResponseDTO(
                id=proj.id,
                name=proj.name,
                workspace_id=proj.workspace_id,
                image_url=proj.image_url,
                created_at=proj.created_at,
                updated_at=proj.updated_at,
            ),
            assignee=assignee_dto,
        )


class UpdateTaskUseCase:
    """Update task details and notify status changes to assignee and Discord room."""

    def __init__(
        self,
        task_repo: ITaskRepository,
        member_repo: IMemberRepository,
        workspace_repo: IWorkspaceRepository,
        project_repo: IProjectRepository,
        manage_client: ManageClient,
        notification_dispatcher: NotificationDispatcher,
        discord_service: DiscordService,
    ) -> None:
        self.task_repo = task_repo
        self.member_repo = member_repo
        self.workspace_repo = workspace_repo
        self.project_repo = project_repo
        self.manage_client = manage_client
        self.notification_dispatcher = notification_dispatcher
        self.discord_service = discord_service

    async def execute(
        self,
        task_id: str,
        user_id: str,
        name: str | None = None,
        status: TaskStatus | None = None,
        priority: TaskPriority | None = None,
        labels: list[str] | None = None,
        project_id: str | None = None,
        assignee_id: str | None = None,
        due_date: datetime | None = None,
        description: str | None = None,
    ) -> TaskResponseDTO:
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise NotFoundException("Task not found.")

        member = await self.member_repo.get_member(task.workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        old_status = task.status
        old_assignee_id = task.assignee_id

        updated = await self.task_repo.update(
            task_id=task_id,
            name=name,
            status=status,
            priority=priority,
            labels=labels,
            project_id=project_id,
            assignee_id=assignee_id,
            due_date=due_date,
            description=description,
        )

        # Notify events asynchronously
        try:
            actor = await self.manage_client.get_user(user_id)
            actor_name = actor.name if actor else "Đồng nghiệp"
            actor_avatar = actor.avatar_url if actor else None
            action_url = f"/workspaces/{task.workspace_id}/tasks/{task.id}"

            # 1. Check assignee change (Unassigned / Reassigned)
            if assignee_id is not None and assignee_id != old_assignee_id:
                # Notify unassigned user
                if old_assignee_id:
                    old_assignee_member = await self.member_repo.get_by_id(
                        old_assignee_id
                    )
                    if old_assignee_member:
                        await self.notification_dispatcher.dispatch(
                            NotificationMessage(
                                recipient_user_id=str(old_assignee_member.user_id),
                                event_type="task_unassigned",
                                title=f"{actor_name} đã gỡ bạn khỏi công việc",
                                content=f"Công việc: {updated.name}",
                                action_url=action_url,
                                actor_id=user_id,
                                actor_name=actor_name,
                                actor_avatar_url=actor_avatar,
                                workspace_id=task.workspace_id,
                                entity_type="task",
                                entity_id=task.id,
                            )
                        )

                # Notify newly assigned user
                if assignee_id:
                    new_assignee_member = await self.member_repo.get_by_id(assignee_id)
                    if new_assignee_member:
                        await self.notification_dispatcher.dispatch(
                            NotificationMessage(
                                recipient_user_id=str(new_assignee_member.user_id),
                                event_type="task_assigned",
                                title=f"{actor_name} đã giao việc cho bạn",
                                content=f"Công việc: {updated.name}",
                                action_url=action_url,
                                actor_id=user_id,
                                actor_name=actor_name,
                                actor_avatar_url=actor_avatar,
                                workspace_id=task.workspace_id,
                                entity_type="task",
                                entity_id=task.id,
                            )
                        )

            # 2. Check status change
            if status is not None and status != old_status:
                status_label = {
                    TaskStatus.BACKLOG: "Tồn đọng (Backlog)",
                    TaskStatus.TODO: "Cần làm (Todo)",
                    TaskStatus.IN_PROGRESS: "Đang làm (In Progress)",
                    TaskStatus.IN_REVIEW: "Đang duyệt (In Review)",
                    TaskStatus.DONE: "Đã hoàn thành (Done)",
                }.get(status, status.value)

                # Notify current assignee if any
                if updated.assignee_id:
                    current_assignee = await self.member_repo.get_by_id(
                        updated.assignee_id
                    )
                    if current_assignee:
                        await self.notification_dispatcher.dispatch(
                            NotificationMessage(
                                recipient_user_id=str(current_assignee.user_id),
                                event_type="task_status_changed",
                                title=f"Trạng thái công việc đã đổi sang '{status_label}'",
                                content=f"Công việc: {updated.name} (cập nhật bởi {actor_name})",
                                action_url=action_url,
                                actor_id=user_id,
                                actor_name=actor_name,
                                actor_avatar_url=actor_avatar,
                                workspace_id=task.workspace_id,
                                entity_type="task",
                                entity_id=task.id,
                            )
                        )

                # Notify Discord Room of workspace if configured
                await _send_task_status_discord_notification(
                    discord_service=self.discord_service,
                    workspace_repo=self.workspace_repo,
                    project_repo=self.project_repo,
                    member_repo=self.member_repo,
                    manage_client=self.manage_client,
                    workspace_id=task.workspace_id,
                    project_id=updated.project_id,
                    task_id=task.id,
                    task_name=updated.name,
                    old_status=old_status,
                    new_status=status,
                    actor_name=actor_name,
                    assignee_id=updated.assignee_id,
                )
        except Exception as e:
            logger.warning(f"Failed to dispatch update task notifications: {e}")

        return TaskResponseDTO(
            id=updated.id,
            name=updated.name,
            status=updated.status,
            priority=updated.priority,
            labels=updated.labels,
            workspace_id=updated.workspace_id,
            project_id=updated.project_id,
            assignee_id=updated.assignee_id,
            position=updated.position,
            due_date=updated.due_date,
            description=updated.description,
            created_at=updated.created_at,
            updated_at=updated.updated_at,
        )


class BulkUpdateTasksUseCase:
    """Bulk update tasks positions and statuses."""

    def __init__(
        self,
        task_repo: ITaskRepository,
        member_repo: IMemberRepository,
        workspace_repo: IWorkspaceRepository,
        project_repo: IProjectRepository,
        manage_client: ManageClient,
        notification_dispatcher: NotificationDispatcher,
        discord_service: DiscordService,
    ) -> None:
        self.task_repo = task_repo
        self.member_repo = member_repo
        self.workspace_repo = workspace_repo
        self.project_repo = project_repo
        self.manage_client = manage_client
        self.notification_dispatcher = notification_dispatcher
        self.discord_service = discord_service

    async def execute(
        self,
        items: list[TaskBulkItemDTO],
        user_id: str,
    ) -> list[TaskResponseDTO]:
        if not items:
            return []

        updates: list[tuple[str, TaskStatus, int]] = []
        workspace_id: str | None = None
        status_changed_tasks: list[tuple[Any, TaskStatus]] = []

        for item in items:
            t = await self.task_repo.get_by_id(item.id)
            if not t:
                continue
            if workspace_id is None:
                workspace_id = t.workspace_id
                member = await self.member_repo.get_member(workspace_id, user_id)
                if not member:
                    raise ForbiddenException("Unauthorized.")
            if t.status != item.status:
                status_changed_tasks.append((t, item.status))
            updates.append((item.id, item.status, item.position))

        updated_tasks = await self.task_repo.bulk_update_positions(updates)

        # Notify status changes for dragged tasks
        if status_changed_tasks:
            try:
                actor = await self.manage_client.get_user(user_id)
                actor_name = actor.name if actor else "Đồng nghiệp"
                actor_avatar = actor.avatar_url if actor else None
                for orig_task, new_st in status_changed_tasks:
                    st_label = {
                        TaskStatus.BACKLOG: "Tồn đọng (Backlog)",
                        TaskStatus.TODO: "Cần làm (Todo)",
                        TaskStatus.IN_PROGRESS: "Đang làm (In Progress)",
                        TaskStatus.IN_REVIEW: "Đang duyệt (In Review)",
                        TaskStatus.DONE: "Đã hoàn thành (Done)",
                    }.get(new_st, new_st.value)

                    if orig_task.assignee_id:
                        assignee_member = await self.member_repo.get_by_id(
                            orig_task.assignee_id
                        )
                        if assignee_member:
                            await self.notification_dispatcher.dispatch(
                                NotificationMessage(
                                    recipient_user_id=str(assignee_member.user_id),
                                    event_type="task_status_changed",
                                    title=f"Trạng thái công việc đã đổi sang '{st_label}'",
                                    content=f"Công việc: {orig_task.name} (cập nhật bởi {actor_name})",
                                    action_url=f"/workspaces/{orig_task.workspace_id}/tasks/{orig_task.id}",
                                    actor_id=user_id,
                                    actor_name=actor_name,
                                    actor_avatar_url=actor_avatar,
                                    workspace_id=orig_task.workspace_id,
                                    entity_type="task",
                                    entity_id=orig_task.id,
                                )
                            )

                    # Notify Discord room of workspace
                    await _send_task_status_discord_notification(
                        discord_service=self.discord_service,
                        workspace_repo=self.workspace_repo,
                        project_repo=self.project_repo,
                        member_repo=self.member_repo,
                        manage_client=self.manage_client,
                        workspace_id=orig_task.workspace_id,
                        project_id=orig_task.project_id,
                        task_id=orig_task.id,
                        task_name=orig_task.name,
                        old_status=orig_task.status,
                        new_status=new_st,
                        actor_name=actor_name,
                        assignee_id=orig_task.assignee_id,
                    )
            except Exception as e:
                logger.warning(
                    f"Failed to dispatch bulk update task notifications: {e}"
                )

        return [
            TaskResponseDTO(
                id=t.id,
                name=t.name,
                status=t.status,
                priority=t.priority,
                labels=t.labels,
                workspace_id=t.workspace_id,
                project_id=t.project_id,
                assignee_id=t.assignee_id,
                position=t.position,
                due_date=t.due_date,
                description=t.description,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
            for t in updated_tasks
        ]


class DeleteTaskUseCase:
    """Delete task."""

    def __init__(
        self,
        task_repo: ITaskRepository,
        member_repo: IMemberRepository,
    ) -> None:
        self.task_repo = task_repo
        self.member_repo = member_repo

    async def execute(self, task_id: str, user_id: str) -> None:
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise NotFoundException("Task not found.")

        member = await self.member_repo.get_member(task.workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        await self.task_repo.delete(task_id)


class ListMyGlobalTasksUseCase:
    """List all tasks assigned to the current user across all workspaces they belong to."""

    def __init__(
        self,
        task_repo: ITaskRepository,
        member_repo: IMemberRepository,
        workspace_repo: IWorkspaceRepository,
        project_repo: IProjectRepository,
        manage_client: ManageClient,
    ) -> None:
        self.task_repo = task_repo
        self.member_repo = member_repo
        self.workspace_repo = workspace_repo
        self.project_repo = project_repo
        self.manage_client = manage_client

    async def execute(
        self,
        user_id: str,
        status: TaskStatus | None = None,
        search: str | None = None,
        due_date: datetime | None = None,
    ) -> TaskListResponseDTO:
        user_memberships = await self.member_repo.list_by_user(user_id)
        if not user_memberships:
            return TaskListResponseDTO(documents=[], total=0)

        workspace_ids = [m.workspace_id for m in user_memberships]
        user_member_ids = [m.id for m in user_memberships]

        tasks = await self.task_repo.list_by_workspace_ids(
            workspace_ids=workspace_ids,
            assignee_ids=None,
            status=status,
            search=search,
            due_date=due_date,
        )

        if not tasks:
            return TaskListResponseDTO(documents=[], total=0)

        # Batch fetch projects
        project_ids = list({t.project_id for t in tasks})
        projects = await self.project_repo.get_by_ids(project_ids)
        project_map = {
            p.id: ProjectResponseDTO(
                id=p.id,
                name=p.name,
                workspace_id=p.workspace_id,
                image_url=p.image_url,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
            for p in projects
        }

        # Batch fetch workspaces
        task_ws_ids = list({t.workspace_id for t in tasks})
        workspaces = await self.workspace_repo.get_by_ids(task_ws_ids)
        workspace_map = {
            w.id: WorkspaceInfoResponseDTO(
                id=w.id,
                name=w.name,
                image_url=w.image_url,
            )
            for w in workspaces
        }

        # Assignee profiles
        member_map = {m.id: m for m in user_memberships}
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

        populated: list[PopulatedTaskResponseDTO] = []
        for t in tasks:
            proj_dto = project_map.get(
                t.project_id,
                ProjectResponseDTO(
                    id=t.project_id,
                    name="Unknown Project",
                    workspace_id=t.workspace_id,
                    image_url=None,
                    created_at=t.created_at,
                    updated_at=t.updated_at,
                ),
            )

            assignee_dto = None
            if t.assignee_id and t.assignee_id in member_map:
                m = member_map[t.assignee_id]
                u_info = user_info_map.get(m.user_id, {})
                assignee_dto = MemberResponseDTO(
                    id=m.id,
                    workspace_id=m.workspace_id,
                    user_id=m.user_id,
                    role=m.role,
                    name=u_info.get("name") or "User",
                    email=u_info.get("email") or "",
                    avatar_url=u_info.get("avatar_url"),
                    created_at=m.created_at,
                    updated_at=m.updated_at,
                )

            ws_dto = workspace_map.get(t.workspace_id)

            populated.append(
                PopulatedTaskResponseDTO(
                    id=t.id,
                    name=t.name,
                    status=t.status,
                    priority=t.priority,
                    labels=t.labels,
                    workspace_id=t.workspace_id,
                    project_id=t.project_id,
                    assignee_id=t.assignee_id,
                    position=t.position,
                    due_date=t.due_date,
                    description=t.description,
                    created_at=t.created_at,
                    updated_at=t.updated_at,
                    project=proj_dto,
                    assignee=assignee_dto,
                    workspace=ws_dto,
                )
            )

        return TaskListResponseDTO(documents=populated, total=len(populated))
