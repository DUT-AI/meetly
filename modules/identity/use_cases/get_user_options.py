from modules.identity.client.manage_client import ManageClient
from modules.identity.dtos.user_dtos import UserOptionDTO


class GetUserOptionsUseCase:
    """Use case to fetch lightweight user options for UI selectors."""

    def __init__(self, manage_client: ManageClient) -> None:
        self.manage_client = manage_client

    async def execute(self, search: str | None = None) -> list[UserOptionDTO]:
        return await self.manage_client.list_users(search=search)
