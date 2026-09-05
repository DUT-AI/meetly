from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.workspaces.domain.interfaces import IWorkspaceRepository
from modules.workspaces.repository.workspace_repository import SqlWorkspaceRepository
from modules.workspaces.use_cases import (
    CreateWorkspaceUseCase,
    DeleteWorkspaceUseCase,
    GetWorkspaceAnalyticsUseCase,
    GetWorkspaceInfoUseCase,
    GetWorkspaceUseCase,
    JoinWorkspaceUseCase,
    ListUserWorkspacesUseCase,
    ResetInviteCodeUseCase,
    UpdateWorkspaceUseCase,
)


class WorkspaceProvider(Provider):
    """Dishka provider for Workspaces domain module."""

    scope = Scope.REQUEST

    @provide
    def get_workspace_repository(self, session: AsyncSession) -> IWorkspaceRepository:
        return SqlWorkspaceRepository(session)

    create_workspace_uc = provide(CreateWorkspaceUseCase)
    list_user_workspaces_uc = provide(ListUserWorkspacesUseCase)
    get_workspace_uc = provide(GetWorkspaceUseCase)
    get_workspace_info_uc = provide(GetWorkspaceInfoUseCase)
    update_workspace_uc = provide(UpdateWorkspaceUseCase)
    delete_workspace_uc = provide(DeleteWorkspaceUseCase)
    reset_invite_code_uc = provide(ResetInviteCodeUseCase)
    join_workspace_uc = provide(JoinWorkspaceUseCase)
    get_workspace_analytics_uc = provide(GetWorkspaceAnalyticsUseCase)
