from modules.identity.client.auth_client import AuthClient
from modules.identity.domain.entities import AuthUser


class GetMeUseCase:
    """Fetch current user profile via auth client."""

    def __init__(self, auth_client: AuthClient) -> None:
        self.auth_client = auth_client

    async def execute(self, token: str) -> AuthUser:
        return await self.auth_client.get_me(token)
