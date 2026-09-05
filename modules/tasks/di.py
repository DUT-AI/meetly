from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.tasks.domain.interfaces import ITaskRepository
from modules.tasks.repository.task_repository import SqlTaskRepository
from modules.tasks.use_cases import (
    BulkUpdateTasksUseCase,
    CreateTaskUseCase,
    DeleteTaskUseCase,
    GetTaskUseCase,
    ListTasksUseCase,
    UpdateTaskUseCase,
)


class TaskProvider(Provider):
    """Dishka provider for Tasks domain module."""

    scope = Scope.REQUEST

    @provide
    def get_task_repository(self, session: AsyncSession) -> ITaskRepository:
        return SqlTaskRepository(session)

    create_task_uc = provide(CreateTaskUseCase)
    list_tasks_uc = provide(ListTasksUseCase)
    get_task_uc = provide(GetTaskUseCase)
    update_task_uc = provide(UpdateTaskUseCase)
    bulk_update_tasks_uc = provide(BulkUpdateTasksUseCase)
    delete_task_uc = provide(DeleteTaskUseCase)
