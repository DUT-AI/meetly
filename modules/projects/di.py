from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.projects.domain.interfaces import IProjectRepository
from modules.projects.repository.project_repository import SqlProjectRepository
from modules.projects.use_cases import (
    CreateProjectUseCase,
    DeleteProjectUseCase,
    GetProjectAnalyticsUseCase,
    GetProjectUseCase,
    ListProjectsUseCase,
    UpdateProjectUseCase,
)


class ProjectProvider(Provider):
    """Dishka provider for Projects domain module."""

    scope = Scope.REQUEST

    @provide
    def get_project_repository(self, session: AsyncSession) -> IProjectRepository:
        return SqlProjectRepository(session)

    create_project_uc = provide(CreateProjectUseCase)
    list_projects_uc = provide(ListProjectsUseCase)
    get_project_uc = provide(GetProjectUseCase)
    update_project_uc = provide(UpdateProjectUseCase)
    delete_project_uc = provide(DeleteProjectUseCase)
    get_project_analytics_uc = provide(GetProjectAnalyticsUseCase)
