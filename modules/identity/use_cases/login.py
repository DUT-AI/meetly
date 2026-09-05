from datetime import UTC, datetime

from loguru import logger

from core.security.jwt import create_access_token
from modules.identity.client.auth_client import AuthClient
from modules.identity.domain.interfaces import IUserLoginRepository
from modules.identity.dtos.auth_dtos import LoginRequestDTO, TokenResponseDTO


class LoginUseCase:
    """Authenticate user with external Auth Server, resolve identity, and issue Meetly's own JWT."""

    def __init__(
        self,
        auth_client: AuthClient,
        login_repo: IUserLoginRepository,
    ) -> None:
        self.auth_client = auth_client
        self.login_repo = login_repo

    async def execute(self, data: LoginRequestDTO) -> TokenResponseDTO:
        # 1. Authenticate against External Auth Server to verify credentials
        manage_login_res = await self.auth_client.login(
            email=data.email, password=data.password
        )
        manage_access_token = manage_login_res.access_token

        # 2. Get user info
        auth_user = await self.auth_client.get_me(manage_access_token)

        # 3. Track last login
        try:
            user_id = str(auth_user.id)
            now = datetime.now(UTC)
            await self.login_repo.upsert_last_login(user_id=user_id, last_login_at=now)
            logger.info(f"Updated last_login_at for user_id={user_id}")
        except Exception as e:
            logger.warning(
                f"Failed to record last_login_at for user after successful authentication: {e}"
            )

        # 4. Issue Meetly's own JWT token
        platform_jwt_claims = {
            "sub": str(auth_user.id),
            "email": auth_user.email,
            "name": auth_user.name,
            "role_names": auth_user.role_names,
        }
        platform_access_token = create_access_token(platform_jwt_claims)

        return TokenResponseDTO(
            access_token=platform_access_token,
            refresh_token=manage_login_res.refresh_token,
            token_type="bearer",
        )
