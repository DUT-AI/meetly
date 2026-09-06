from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.workspaces.domain.interfaces import (
    IWorkspaceLabelRepository,
    IWorkspaceRepository,
)
from modules.workspaces.repository.label_repository import SqlWorkspaceLabelRepository
from modules.workspaces.repository.workspace_repository import SqlWorkspaceRepository
from modules.workspaces.use_cases import (
    CreateWorkspaceLabelUseCase,
    CreateWorkspaceUseCase,
    DeleteWorkspaceLabelUseCase,
    DeleteWorkspaceUseCase,
    GetWorkspaceAnalyticsUseCase,
    GetWorkspaceInfoUseCase,
    GetWorkspaceUseCase,
    JoinWorkspaceUseCase,
    ListUserWorkspacesUseCase,
    ListWorkspaceLabelsUseCase,
    ResetInviteCodeUseCase,
    UpdateWorkspaceLabelUseCase,
    UpdateWorkspaceUseCase,
)


class WorkspaceProvider(Provider):
    """Dishka provider for Workspaces domain module."""

    scope = Scope.REQUEST

    @provide
    def get_workspace_repository(self, session: AsyncSession) -> IWorkspaceRepository:
        return SqlWorkspaceRepository(session)

    @provide
    def get_workspace_label_repository(
        self, session: AsyncSession
    ) -> IWorkspaceLabelRepository:
        return SqlWorkspaceLabelRepository(session)

    create_workspace_uc = provide(CreateWorkspaceUseCase)
    list_user_workspaces_uc = provide(ListUserWorkspacesUseCase)
    get_workspace_uc = provide(GetWorkspaceUseCase)
    get_workspace_info_uc = provide(GetWorkspaceInfoUseCase)
    update_workspace_uc = provide(UpdateWorkspaceUseCase)
    delete_workspace_uc = provide(DeleteWorkspaceUseCase)
    reset_invite_code_uc = provide(ResetInviteCodeUseCase)
    join_workspace_uc = provide(JoinWorkspaceUseCase)
    get_workspace_analytics_uc = provide(GetWorkspaceAnalyticsUseCase)
    list_workspace_labels_uc = provide(ListWorkspaceLabelsUseCase)
    create_workspace_label_uc = provide(CreateWorkspaceLabelUseCase)
    update_workspace_label_uc = provide(UpdateWorkspaceLabelUseCase)
    delete_workspace_label_uc = provide(DeleteWorkspaceLabelUseCase)
