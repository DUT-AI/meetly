from datetime import datetime

from core.exceptions import ForbiddenException, NotFoundException
from modules.identity.client.manage_client import ManageClient
from modules.members.domain.interfaces import IMemberRepository
from modules.members.dtos.member_dtos import MemberResponseDTO
from modules.projects.domain.interfaces import IProjectRepository
from modules.projects.dtos.project_dtos import ProjectResponseDTO
from modules.tasks.domain.enums import TaskStatus
from modules.tasks.domain.interfaces import ITaskRepository
from modules.tasks.dtos.task_dtos import (
    PopulatedTaskResponseDTO,
    TaskBulkItemDTO,
    TaskListResponseDTO,
    TaskResponseDTO,
)


class CreateTaskUseCase:
    """Create a new task with automatic position calculation."""

    def __init__(
        self,
        task_repo: ITaskRepository,
        member_repo: IMemberRepository,
    ) -> None:
        self.task_repo = task_repo
        self.member_repo = member_repo

    async def execute(
        self,
        name: str,
        status: TaskStatus,
        workspace_id: str,
        project_id: str,
        user_id: str,
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
            due_date=due_date,
            assignee_id=assignee_id,
            description=description,
        )

        return TaskResponseDTO(
            id=task.id,
            name=task.name,
            status=task.status,
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
    """Update task details."""

    def __init__(
        self,
        task_repo: ITaskRepository,
        member_repo: IMemberRepository,
    ) -> None:
        self.task_repo = task_repo
        self.member_repo = member_repo

    async def execute(
        self,
        task_id: str,
        user_id: str,
        name: str | None = None,
        status: TaskStatus | None = None,
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

        updated = await self.task_repo.update(
            task_id=task_id,
            name=name,
            status=status,
            project_id=project_id,
            assignee_id=assignee_id,
            due_date=due_date,
            description=description,
        )

        return TaskResponseDTO(
            id=updated.id,
            name=updated.name,
            status=updated.status,
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
    ) -> None:
        self.task_repo = task_repo
        self.member_repo = member_repo

    async def execute(
        self,
        items: list[TaskBulkItemDTO],
        user_id: str,
    ) -> list[TaskResponseDTO]:
        if not items:
            return []

        updates: list[tuple[str, TaskStatus, int]] = []
        workspace_id: str | None = None

        for item in items:
            t = await self.task_repo.get_by_id(item.id)
            if not t:
                continue
            if workspace_id is None:
                workspace_id = t.workspace_id
                member = await self.member_repo.get_member(workspace_id, user_id)
                if not member:
                    raise ForbiddenException("Unauthorized.")
            updates.append((item.id, item.status, item.position))

        updated_tasks = await self.task_repo.bulk_update_positions(updates)
        return [
            TaskResponseDTO(
                id=t.id,
                name=t.name,
                status=t.status,
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
