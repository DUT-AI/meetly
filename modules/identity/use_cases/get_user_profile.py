from fastapi import HTTPException, status

from modules.identity.client.manage_client import ManageClient
from modules.identity.dtos.user_dtos import (
    UserProfileDetailDTO,
    UserProfileEnvelopeDTO,
)


class GetUserProfileUseCase:
    """Use case to fetch detailed user profile enveloped response."""

    def __init__(self, manage_client: ManageClient) -> None:
        self.manage_client = manage_client

    async def execute(self, user_id: str | int) -> UserProfileEnvelopeDTO:
        user_profile = await self.manage_client.get_user(user_id)
        if not user_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found",
            )

        return UserProfileEnvelopeDTO(
            is_success=True,
            status_code=200,
            data=user_profile,
            message="Fetched user profile",
            pagination=None,
        )
