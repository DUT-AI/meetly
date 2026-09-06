from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.tasks.domain.interfaces import (
    ITaskCommentRepository,
    ITaskRepository,
)
from modules.tasks.repository.comment_repository import SqlTaskCommentRepository
from modules.tasks.repository.task_repository import SqlTaskRepository
from modules.tasks.use_cases import (
    BulkUpdateTasksUseCase,
    CheckTaskDeadlinesUseCase,
    CreateTaskCommentUseCase,
    CreateTaskUseCase,
    DeleteTaskCommentUseCase,
    DeleteTaskUseCase,
    GetTaskUseCase,
    ListMyGlobalTasksUseCase,
    ListTaskCommentsUseCase,
    ListTasksUseCase,
    UpdateTaskCommentUseCase,
    UpdateTaskUseCase,
)


class TaskProvider(Provider):
    """Dishka provider for Tasks domain module."""

    scope = Scope.REQUEST

    @provide
    def get_task_repository(self, session: AsyncSession) -> ITaskRepository:
        return SqlTaskRepository(session)

    @provide
    def get_task_comment_repository(
        self, session: AsyncSession
    ) -> ITaskCommentRepository:
        return SqlTaskCommentRepository(session)

    create_task_uc = provide(CreateTaskUseCase)
    list_tasks_uc = provide(ListTasksUseCase)
    list_my_global_tasks_uc = provide(ListMyGlobalTasksUseCase)
    get_task_uc = provide(GetTaskUseCase)
    update_task_uc = provide(UpdateTaskUseCase)
    bulk_update_tasks_uc = provide(BulkUpdateTasksUseCase)
    delete_task_uc = provide(DeleteTaskUseCase)
    check_task_deadlines_uc = provide(CheckTaskDeadlinesUseCase)

    list_task_comments_uc = provide(ListTaskCommentsUseCase)
    create_task_comment_uc = provide(CreateTaskCommentUseCase)
    update_task_comment_uc = provide(UpdateTaskCommentUseCase)
    delete_task_comment_uc = provide(DeleteTaskCommentUseCase)
