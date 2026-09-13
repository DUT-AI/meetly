from collections import defaultdict
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.tasks.domain.entities import TaskEntity
from modules.tasks.domain.enums import TaskPriority, TaskStatus
from modules.tasks.domain.interfaces import ITaskRepository
from modules.tasks.models.task import TaskAssigneeModel, TaskModel


class SqlTaskRepository(ITaskRepository):
    """PostgreSQL implementation of ITaskRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        name: str,
        status: TaskStatus,
        workspace_id: str,
        project_id: str,
        position: int,
        priority: TaskPriority = TaskPriority.MEDIUM,
        labels: list[str] | None = None,
        due_date: datetime | None = None,
        assignee_id: str | None = None,
        assignee_ids: list[str] | None = None,
        description: str | None = None,
    ) -> TaskEntity:
        resolved_assignee_ids = (
            list(dict.fromkeys(assignee_ids)) if assignee_ids else []
        )
        if not resolved_assignee_ids and assignee_id:
            resolved_assignee_ids = [assignee_id]

        primary_assignee_id = assignee_id or (
            resolved_assignee_ids[0] if resolved_assignee_ids else None
        )

        model = TaskModel(
            name=name,
            status=status.value,
            priority=priority.value,
            labels=labels or [],
            workspace_id=workspace_id,
            project_id=project_id,
            position=position,
            due_date=due_date,
            assignee_id=primary_assignee_id,
            description=description,
        )
        self.session.add(model)
        await self.session.flush()

        for member_id in resolved_assignee_ids:
            self.session.add(
                TaskAssigneeModel(task_id=model.id, member_id=member_id)
            )
        if resolved_assignee_ids:
            await self.session.flush()

        return model.to_entity(assignee_ids=resolved_assignee_ids)

    async def get_by_id(self, task_id: str) -> TaskEntity | None:
        stmt = select(TaskModel).where(TaskModel.id == task_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            return None

        assignees_stmt = select(TaskAssigneeModel.member_id).where(
            TaskAssigneeModel.task_id == task_id
        )
        assignees_res = await self.session.execute(assignees_stmt)
        assignee_ids = list(assignees_res.scalars().all())
        return model.to_entity(assignee_ids=assignee_ids)

    async def get_highest_position(
        self, workspace_id: str, status: TaskStatus
    ) -> int | None:
        stmt = (
            select(TaskModel.position)
            .where(
                TaskModel.workspace_id == workspace_id,
                TaskModel.status == status.value,
            )
            .order_by(TaskModel.position.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_tasks(
        self,
        workspace_id: str,
        project_id: str | None = None,
        assignee_id: str | None = None,
        status: TaskStatus | None = None,
        search: str | None = None,
        due_date: datetime | None = None,
    ) -> list[TaskEntity]:
        stmt = (
            select(TaskModel)
            .where(TaskModel.workspace_id == workspace_id)
            .order_by(TaskModel.position.asc(), TaskModel.created_at.desc())
        )

        if project_id:
            stmt = stmt.where(TaskModel.project_id == project_id)
        if assignee_id:
            stmt = stmt.where(
                (TaskModel.assignee_id == assignee_id)
                | TaskModel.id.in_(
                    select(TaskAssigneeModel.task_id).where(
                        TaskAssigneeModel.member_id == assignee_id
                    )
                )
            )
        if status:
            stmt = stmt.where(TaskModel.status == status.value)
        if due_date:
            stmt = stmt.where(TaskModel.due_date <= due_date)
        if search and search.strip():
            stmt = stmt.where(TaskModel.name.ilike(f"%{search.strip()}%"))

        result = await self.session.execute(stmt)
        models = result.scalars().all()
        if not models:
            return []

        task_ids = [m.id for m in models]
        assignees_stmt = select(
            TaskAssigneeModel.task_id, TaskAssigneeModel.member_id
        ).where(TaskAssigneeModel.task_id.in_(task_ids))
        assignees_res = await self.session.execute(assignees_stmt)

        task_assignees_map: dict[str, list[str]] = defaultdict(list)
        for t_id, m_id in assignees_res.all():
            task_assignees_map[t_id].append(m_id)

        return [
            m.to_entity(
                assignee_ids=task_assignees_map.get(
                    m.id, [m.assignee_id] if m.assignee_id else []
                )
            )
            for m in models
        ]

    async def list_by_workspace_ids(
        self,
        workspace_ids: Sequence[str],
        assignee_ids: Sequence[str] | None = None,
        status: TaskStatus | None = None,
        search: str | None = None,
        due_date: datetime | None = None,
    ) -> list[TaskEntity]:
        if not workspace_ids:
            return []

        stmt = (
            select(TaskModel)
            .where(TaskModel.workspace_id.in_(workspace_ids))
            .order_by(
                TaskModel.due_date.asc().nulls_last(), TaskModel.created_at.desc()
            )
        )

        if assignee_ids is not None:
            stmt = stmt.where(
                TaskModel.assignee_id.in_(assignee_ids)
                | TaskModel.id.in_(
                    select(TaskAssigneeModel.task_id).where(
                        TaskAssigneeModel.member_id.in_(assignee_ids)
                    )
                )
            )
        if status:
            stmt = stmt.where(TaskModel.status == status.value)
        if due_date:
            stmt = stmt.where(TaskModel.due_date <= due_date)
        if search and search.strip():
            stmt = stmt.where(TaskModel.name.ilike(f"%{search.strip()}%"))

        result = await self.session.execute(stmt)
        models = result.scalars().all()
        if not models:
            return []

        task_ids = [m.id for m in models]
        assignees_stmt = select(
            TaskAssigneeModel.task_id, TaskAssigneeModel.member_id
        ).where(TaskAssigneeModel.task_id.in_(task_ids))
        assignees_res = await self.session.execute(assignees_stmt)

        task_assignees_map: dict[str, list[str]] = defaultdict(list)
        for t_id, m_id in assignees_res.all():
            task_assignees_map[t_id].append(m_id)

        return [
            m.to_entity(
                assignee_ids=task_assignees_map.get(
                    m.id, [m.assignee_id] if m.assignee_id else []
                )
            )
            for m in models
        ]

    async def update(
        self,
        task_id: str,
        name: str | None = None,
        status: TaskStatus | None = None,
        priority: TaskPriority | None = None,
        labels: list[str] | None = None,
        project_id: str | None = None,
        assignee_id: str | None = None,
        assignee_ids: list[str] | None = None,
        due_date: datetime | None = None,
        description: str | None = None,
        position: int | None = None,
    ) -> TaskEntity:
        stmt = select(TaskModel).where(TaskModel.id == task_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one()

        if name is not None:
            model.name = name
        if status is not None:
            model.status = status.value
        if priority is not None:
            model.priority = priority.value
        if labels is not None:
            model.labels = labels
        if project_id is not None:
            model.project_id = project_id
        if due_date is not None:
            model.due_date = due_date
        if description is not None:
            model.description = description
        if position is not None:
            model.position = position

        if assignee_ids is not None:
            resolved_assignee_ids = list(dict.fromkeys(assignee_ids))
            model.assignee_id = (
                assignee_id
                if assignee_id is not None
                else (resolved_assignee_ids[0] if resolved_assignee_ids else None)
            )
            await self.session.execute(
                delete(TaskAssigneeModel).where(
                    TaskAssigneeModel.task_id == task_id
                )
            )
            for m_id in resolved_assignee_ids:
                self.session.add(
                    TaskAssigneeModel(task_id=task_id, member_id=m_id)
                )
        elif assignee_id is not None:
            model.assignee_id = assignee_id or None
            await self.session.execute(
                delete(TaskAssigneeModel).where(
                    TaskAssigneeModel.task_id == task_id
                )
            )
            if assignee_id:
                self.session.add(
                    TaskAssigneeModel(task_id=task_id, member_id=assignee_id)
                )

        await self.session.flush()

        assignees_stmt = select(TaskAssigneeModel.member_id).where(
            TaskAssigneeModel.task_id == task_id
        )
        assignees_res = await self.session.execute(assignees_stmt)
        updated_assignee_ids = list(assignees_res.scalars().all())

        return model.to_entity(assignee_ids=updated_assignee_ids)

    async def bulk_update_positions(
        self, updates: Sequence[tuple[str, TaskStatus, int]]
    ) -> list[TaskEntity]:
        updated_entities: list[TaskEntity] = []
        for task_id, status, position in updates:
            stmt = select(TaskModel).where(TaskModel.id == task_id)
            result = await self.session.execute(stmt)
            model = result.scalar_one_or_none()
            if model:
                model.status = status.value
                model.position = position
                updated_entities.append(model.to_entity())
        await self.session.flush()
        return updated_entities

    async def delete(self, task_id: str) -> None:
        stmt = delete(TaskModel).where(TaskModel.id == task_id)
        await self.session.execute(stmt)

    async def get_pending_tasks_with_deadlines(self) -> list[TaskEntity]:
        stmt = (
            select(TaskModel)
            .where(
                TaskModel.due_date.isnot(None),
                TaskModel.status != TaskStatus.DONE.value,
                (TaskModel.assignee_id.isnot(None))
                | (
                    TaskModel.id.in_(
                        select(TaskAssigneeModel.task_id)
                    )
                ),
            )
            .order_by(TaskModel.due_date.asc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        if not models:
            return []

        task_ids = [m.id for m in models]
        assignees_stmt = select(
            TaskAssigneeModel.task_id, TaskAssigneeModel.member_id
        ).where(TaskAssigneeModel.task_id.in_(task_ids))
        assignees_res = await self.session.execute(assignees_stmt)

        task_assignees_map: dict[str, list[str]] = defaultdict(list)
        for t_id, m_id in assignees_res.all():
            task_assignees_map[t_id].append(m_id)

        return [
            m.to_entity(
                assignee_ids=task_assignees_map.get(
                    m.id, [m.assignee_id] if m.assignee_id else []
                )
            )
            for m in models
        ]
