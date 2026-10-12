from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Path, Query

from apps.api.deps.auth import CurrentUser
from modules.identity.dtos.user_dtos import (
    UserOptionDTO,
    UserProfileEnvelopeDTO,
)
from modules.identity.use_cases.get_user_options import GetUserOptionsUseCase
from modules.identity.use_cases.get_user_profile import GetUserProfileUseCase

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.get(
    "/option",
    response_model=list[UserOptionDTO],
    summary="Get lightweight list of user options (id, name, email, avatar_url)",
)
@inject
async def get_user_options(
    current_user: CurrentUser,
    use_case: FromDishka[GetUserOptionsUseCase],
    search: str | None = Query(None, description="Search by name or email"),
) -> list[UserOptionDTO]:
    return await use_case.execute(search=search)


@router.get(
    "/{id}",
    response_model=UserProfileEnvelopeDTO,
    summary="Get full user profile details by ID",
)
@inject
async def get_user_profile(
    current_user: CurrentUser,
    use_case: FromDishka[GetUserProfileUseCase],
    id: str = Path(..., description="User identifier"),
) -> UserProfileEnvelopeDTO:
    return await use_case.execute(user_id=id)
