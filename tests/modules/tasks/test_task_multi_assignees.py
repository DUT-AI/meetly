from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from core.database.base import Base
from core.exceptions import ForbiddenException
from modules.members.domain.entities import MemberEntity
from modules.members.domain.enums import MemberRole
from modules.tasks.domain.entities import PopulatedTaskEntity, TaskEntity
from modules.tasks.domain.enums import TaskPriority, TaskStatus
from modules.tasks.dtos.task_dtos import (
    TaskCreateDTO,
    TaskUpdateDTO,
)
from modules.tasks.models.task import TaskModel  # noqa: F401
from modules.tasks.repository.task_repository import SqlTaskRepository
from modules.tasks.use_cases.task_use_cases import (
    CreateTaskUseCase,
    UpdateTaskUseCase,
)


class TestTaskEntitiesAndDTOs:
    """Unit tests for multi-assignee support in domain entities and DTOs."""

    def test_task_entity_assignee_ids(self) -> None:
        now = datetime.now(UTC)
        entity = TaskEntity(
            id="task_1",
            name="Test Task",
            status=TaskStatus.TODO,
            priority=TaskPriority.HIGH,
            labels=["bug"],
            workspace_id="ws_1",
            project_id="prj_1",
            assignee_ids=["mem_1", "mem_2"],
            position=1000,
            due_date=now,
            description="Details",
            created_at=now,
            updated_at=now,
        )
        assert entity.assignee_ids == ["mem_1", "mem_2"]

    def test_populated_task_entity_assignees(self) -> None:
        now = datetime.now(UTC)
        entity = PopulatedTaskEntity(
            id="task_1",
            name="Test Task",
            status=TaskStatus.TODO,
            priority=TaskPriority.HIGH,
            labels=[],
            workspace_id="ws_1",
            project_id="prj_1",
            assignee_ids=["mem_1", "mem_2"],
            position=1000,
            due_date=None,
            description=None,
            created_at=now,
            updated_at=now,
            assignees=[{"id": "mem_1"}, {"id": "mem_2"}],
        )
        assert len(entity.assignees) == 2
        assert entity.assignee_ids == ["mem_1", "mem_2"]

    def test_task_create_and_update_dtos(self) -> None:
        create_dto = TaskCreateDTO(
            name="New Task",
            status=TaskStatus.TODO,
            workspace_id="ws_1",
            project_id="prj_1",
            assignee_ids=["mem_1", "mem_2"],
        )
        assert create_dto.assignee_ids == ["mem_1", "mem_2"]

        update_dto = TaskUpdateDTO(
            assignee_ids=["mem_3"],
        )
        assert update_dto.assignee_ids == ["mem_3"]


import pytest_asyncio


@pytest_asyncio.fixture
async def async_session():
    """Provides an isolated in-memory SQLite database session."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


class TestSqlTaskRepositoryMultiAssignees:
    """Integration tests for SqlTaskRepository with SQLite in-memory."""

    @pytest.mark.asyncio
    async def test_create_and_get_task_with_multiple_assignees(
        self, async_session
    ) -> None:
        repo = SqlTaskRepository(async_session)

        created = await repo.create(
            name="Multi Assignee Task",
            status=TaskStatus.TODO,
            workspace_id="ws_1",
            project_id="prj_1",
            position=1000,
            assignee_ids=["mem_1", "mem_2"],
        )
        await async_session.commit()

        assert created.id is not None
        assert set(created.assignee_ids) == {"mem_1", "mem_2"}

        fetched = await repo.get_by_id(created.id)
        assert fetched is not None
        assert set(fetched.assignee_ids) == {"mem_1", "mem_2"}

    @pytest.mark.asyncio
    async def test_list_tasks_filter_by_assignee(self, async_session) -> None:
        repo = SqlTaskRepository(async_session)

        t1 = await repo.create(
            name="Task Shared",
            status=TaskStatus.TODO,
            workspace_id="ws_1",
            project_id="prj_1",
            position=1000,
            assignee_ids=["mem_1", "mem_2"],
        )
        t2 = await repo.create(
            name="Task Solo",
            status=TaskStatus.TODO,
            workspace_id="ws_1",
            project_id="prj_1",
            position=2000,
            assignee_ids=["mem_2"],
        )
        await async_session.commit()

        # mem_1 should see t1
        tasks_mem_1 = await repo.list_tasks(
            workspace_id="ws_1", assignee_id="mem_1"
        )
        assert len(tasks_mem_1) == 1
        assert tasks_mem_1[0].id == t1.id

        # mem_2 should see both t1 and t2
        tasks_mem_2 = await repo.list_tasks(
            workspace_id="ws_1", assignee_id="mem_2"
        )
        assert len(tasks_mem_2) == 2
        task_ids = {t.id for t in tasks_mem_2}
        assert task_ids == {t1.id, t2.id}

        # mem_3 should see nothing
        tasks_mem_3 = await repo.list_tasks(
            workspace_id="ws_1", assignee_id="mem_3"
        )
        assert len(tasks_mem_3) == 0

    @pytest.mark.asyncio
    async def test_update_task_assignees(self, async_session) -> None:
        repo = SqlTaskRepository(async_session)

        task = await repo.create(
            name="Update Assignees Task",
            status=TaskStatus.TODO,
            workspace_id="ws_1",
            project_id="prj_1",
            position=1000,
            assignee_ids=["mem_1", "mem_2"],
        )
        await async_session.commit()

        # Replace assignees with mem_2 and mem_3
        updated = await repo.update(
            task_id=task.id,
            assignee_ids=["mem_2", "mem_3"],
        )
        await async_session.commit()

        assert set(updated.assignee_ids) == {"mem_2", "mem_3"}

        fetched = await repo.get_by_id(task.id)
        assert fetched is not None
        assert set(fetched.assignee_ids) == {"mem_2", "mem_3"}


class TestCreateTaskUseCase:
    """Unit tests for CreateTaskUseCase multi-assignee logic."""

    @pytest.mark.asyncio
    async def test_create_task_dispatches_notifications_to_all_assignees(
        self,
    ) -> None:
        task_repo = AsyncMock()
        member_repo = AsyncMock()
        manage_client = AsyncMock()
        notification_dispatcher = AsyncMock()

        # Workspace member creator
        member_repo.get_member.return_value = MemberEntity(
            id="mem_creator",
            workspace_id="ws_1",
            user_id="user_creator",
            role=MemberRole.ADMIN,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        # Assignee members
        member_repo.get_by_id.side_effect = lambda m_id: MemberEntity(
            id=m_id,
            workspace_id="ws_1",
            user_id=f"user_{m_id}",
            role=MemberRole.MEMBER,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        task_repo.get_highest_position.return_value = 1000
        now = datetime.now(UTC)
        task_repo.create.return_value = TaskEntity(
            id="task_100",
            name="Feature Work",
            status=TaskStatus.TODO,
            priority=TaskPriority.MEDIUM,
            labels=[],
            workspace_id="ws_1",
            project_id="prj_1",
            assignee_ids=["mem_1", "mem_2"],
            position=2000,
            due_date=None,
            description=None,
            created_at=now,
            updated_at=now,
        )

        user_mock = MagicMock()
        user_mock.name = "Creator User"
        user_mock.avatar_url = None
        manage_client.get_user.return_value = user_mock

        use_case = CreateTaskUseCase(
            task_repo=task_repo,
            member_repo=member_repo,
            manage_client=manage_client,
            notification_dispatcher=notification_dispatcher,
        )

        res = await use_case.execute(
            name="Feature Work",
            status=TaskStatus.TODO,
            workspace_id="ws_1",
            project_id="prj_1",
            user_id="user_creator",
            assignee_ids=["mem_1", "mem_2"],
        )

        assert res.id == "task_100"
        assert res.assignee_ids == ["mem_1", "mem_2"]

        # Notification dispatcher must be called for both mem_1 and mem_2
        assert notification_dispatcher.dispatch.call_count == 2
        calls = notification_dispatcher.dispatch.call_args_list
        recipient_user_ids = {call[0][0].recipient_user_id for call in calls}
        assert recipient_user_ids == {"user_mem_1", "user_mem_2"}

    @pytest.mark.asyncio
    async def test_create_task_rejects_foreign_workspace_assignee(self) -> None:
        task_repo = AsyncMock()
        member_repo = AsyncMock()
        manage_client = AsyncMock()
        notification_dispatcher = AsyncMock()

        member_repo.get_member.return_value = MemberEntity(
            id="mem_creator",
            workspace_id="ws_1",
            user_id="user_creator",
            role=MemberRole.ADMIN,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        # Foreign member
        member_repo.get_by_id.return_value = MemberEntity(
            id="mem_foreign",
            workspace_id="ws_other",
            user_id="user_foreign",
            role=MemberRole.MEMBER,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        use_case = CreateTaskUseCase(
            task_repo=task_repo,
            member_repo=member_repo,
            manage_client=manage_client,
            notification_dispatcher=notification_dispatcher,
        )

        with pytest.raises(ForbiddenException):
            await use_case.execute(
                name="Bad Task",
                status=TaskStatus.TODO,
                workspace_id="ws_1",
                project_id="prj_1",
                user_id="user_creator",
                assignee_ids=["mem_foreign"],
            )


class TestUpdateTaskUseCase:
    """Unit tests for UpdateTaskUseCase multi-assignee diffing logic."""

    @pytest.mark.asyncio
    async def test_update_task_assignee_diff_notifications(self) -> None:
        task_repo = AsyncMock()
        member_repo = AsyncMock()
        workspace_repo = AsyncMock()
        project_repo = AsyncMock()
        manage_client = AsyncMock()
        notification_dispatcher = AsyncMock()
        discord_service = AsyncMock()
        zalo_client = AsyncMock()

        now = datetime.now(UTC)
        # Initial task had mem_1 and mem_2
        task_repo.get_by_id.return_value = TaskEntity(
            id="task_200",
            name="Task in progress",
            status=TaskStatus.TODO,
            priority=TaskPriority.MEDIUM,
            labels=[],
            workspace_id="ws_1",
            project_id="prj_1",
            assignee_ids=["mem_1", "mem_2"],
            position=1000,
            due_date=None,
            description=None,
            created_at=now,
            updated_at=now,
        )

        member_repo.get_member.return_value = MemberEntity(
            id="mem_updater",
            workspace_id="ws_1",
            user_id="user_updater",
            role=MemberRole.ADMIN,
            created_at=now,
            updated_at=now,
        )

        member_repo.get_by_id.side_effect = lambda m_id: MemberEntity(
            id=m_id,
            workspace_id="ws_1",
            user_id=f"user_{m_id}",
            role=MemberRole.MEMBER,
            created_at=now,
            updated_at=now,
        )

        # Updated task has mem_2 and mem_3 (mem_1 removed, mem_3 added)
        task_repo.update.return_value = TaskEntity(
            id="task_200",
            name="Task in progress",
            status=TaskStatus.TODO,
            priority=TaskPriority.MEDIUM,
            labels=[],
            workspace_id="ws_1",
            project_id="prj_1",
            assignee_ids=["mem_2", "mem_3"],
            position=1000,
            due_date=None,
            description=None,
            created_at=now,
            updated_at=now,
        )

        user_mock = MagicMock()
        user_mock.name = "Updater User"
        user_mock.avatar_url = None
        manage_client.get_user.return_value = user_mock

        use_case = UpdateTaskUseCase(
            task_repo=task_repo,
            member_repo=member_repo,
            workspace_repo=workspace_repo,
            project_repo=project_repo,
            manage_client=manage_client,
            notification_dispatcher=notification_dispatcher,
            discord_service=discord_service,
            zalo_client=zalo_client,
        )

        res = await use_case.execute(
            task_id="task_200",
            user_id="user_updater",
            assignee_ids=["mem_2", "mem_3"],
        )

        assert res.id == "task_200"
        assert res.assignee_ids == ["mem_2", "mem_3"]

        # Exactly two notifications dispatched: unassigned to user_mem_1, assigned to user_mem_3
        assert notification_dispatcher.dispatch.call_count == 2
        calls = notification_dispatcher.dispatch.call_args_list
        event_map = {
            call[0][0].recipient_user_id: call[0][0].event_type
            for call in calls
        }
        assert event_map == {
            "user_mem_1": "task_unassigned",
            "user_mem_3": "task_assigned",
        }


class TestGetAndListTasksUseCase:
    """Unit tests for GetTaskUseCase and ListTasksUseCase populating assignees."""

    @pytest.mark.asyncio
    async def test_get_task_populates_multiple_assignees(self) -> None:
        task_repo = AsyncMock()
        member_repo = AsyncMock()
        project_repo = AsyncMock()
        manage_client = AsyncMock()

        now = datetime.now(UTC)
        task_repo.get_by_id.return_value = TaskEntity(
            id="task_get_1",
            name="Inspect Task",
            status=TaskStatus.IN_PROGRESS,
            priority=TaskPriority.HIGH,
            labels=["dev"],
            workspace_id="ws_1",
            project_id="prj_1",
            assignee_ids=["mem_1", "mem_2"],
            position=1000,
            due_date=None,
            description=None,
            created_at=now,
            updated_at=now,
        )

        member_repo.get_member.return_value = MemberEntity(
            id="mem_viewer",
            workspace_id="ws_1",
            user_id="user_viewer",
            role=MemberRole.MEMBER,
            created_at=now,
            updated_at=now,
        )

        member_repo.get_by_id.side_effect = lambda m_id: MemberEntity(
            id=m_id,
            workspace_id="ws_1",
            user_id=f"user_{m_id}",
            role=MemberRole.MEMBER,
            created_at=now,
            updated_at=now,
        )

        from modules.projects.domain.entities import ProjectEntity

        project_repo.get_by_id.return_value = ProjectEntity(
            id="prj_1",
            name="Demo Project",
            workspace_id="ws_1",
            image_url=None,
            created_at=now,
            updated_at=now,
        )

        user_mock = MagicMock()
        user_mock.name = "Assignee Name"
        user_mock.email = "assignee@example.com"
        user_mock.avatar_url = None
        manage_client.get_user.return_value = user_mock

        from modules.tasks.use_cases.task_use_cases import GetTaskUseCase

        use_case = GetTaskUseCase(
            task_repo=task_repo,
            member_repo=member_repo,
            project_repo=project_repo,
            manage_client=manage_client,
        )

        res = await use_case.execute(task_id="task_get_1", user_id="user_viewer")

        assert res.id == "task_get_1"
        assert res.assignee_ids == ["mem_1", "mem_2"]
        assert len(res.assignees) == 2


class TestTaskReminderUseCases:
    """Unit tests for CheckTaskDeadlinesUseCase with multiple assignees."""

    @pytest.mark.asyncio
    async def test_deadline_reminders_sent_to_all_assignees(self) -> None:
        task_repo = AsyncMock()
        member_repo = AsyncMock()
        notification_dispatcher = AsyncMock()
        redis_mock = AsyncMock()

        # Redis returns None (not sent before)
        redis_mock.get.return_value = None

        now = datetime.now(UTC)
        from datetime import timedelta

        # Task is overdue by 1 day
        due = now - timedelta(days=1, hours=2)

        task_repo.get_pending_tasks_with_deadlines.return_value = [
            TaskEntity(
                id="task_overdue_1",
                name="Overdue Multi Task",
                status=TaskStatus.TODO,
                priority=TaskPriority.HIGH,
                labels=[],
                workspace_id="ws_1",
                project_id="prj_1",
                assignee_ids=["mem_1", "mem_2"],
                position=1000,
                due_date=due,
                description=None,
                created_at=now,
                updated_at=now,
            )
        ]

        member_repo.get_by_id.side_effect = lambda m_id: MemberEntity(
            id=m_id,
            workspace_id="ws_1",
            user_id=f"user_{m_id}",
            role=MemberRole.MEMBER,
            created_at=now,
            updated_at=now,
        )

        from modules.tasks.use_cases.task_reminder_use_cases import (
            CheckTaskDeadlinesUseCase,
        )

        use_case = CheckTaskDeadlinesUseCase(
            task_repo=task_repo,
            member_repo=member_repo,
            notification_dispatcher=notification_dispatcher,
        )
        use_case._redis = redis_mock

        result = await use_case.execute()

        assert result["overdue"] == 2
        assert notification_dispatcher.dispatch.call_count == 2
        recipients = {
            call[0][0].recipient_user_id
            for call in notification_dispatcher.dispatch.call_args_list
        }
        assert recipients == {"user_mem_1", "user_mem_2"}

