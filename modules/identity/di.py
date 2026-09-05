from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.identity.client.auth_client import AuthClient
from modules.identity.client.manage_client import ManageClient
from modules.identity.domain.interfaces import IUserLoginRepository
from modules.identity.repository.user_login_repository import SqlUserLoginRepository
from modules.identity.use_cases import GetMeUseCase, ListUsersUseCase, LoginUseCase


class IdentityProvider(Provider):
    """Dishka DI Provider for Identity & Auth feature module."""

    scope = Scope.REQUEST

    @provide(scope=Scope.APP)
    def get_auth_client(self) -> AuthClient:
        return AuthClient()

    @provide(scope=Scope.APP)
    def get_manage_client(self) -> ManageClient:
        return ManageClient()

    @provide
    def get_user_login_repository(self, session: AsyncSession) -> IUserLoginRepository:
        return SqlUserLoginRepository(session)

    login_uc = provide(LoginUseCase)
    get_me_uc = provide(GetMeUseCase)
    list_users_uc = provide(ListUsersUseCase)
