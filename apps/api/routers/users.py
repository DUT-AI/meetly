from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Query

from apps.api.deps.auth import CurrentUser
from modules.identity.dtos.user_dtos import UsersListResponseDTO
from modules.identity.use_cases.list_users import ListUsersUseCase

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.get(
    "",
    response_model=UsersListResponseDTO,
    summary="List users from Manage Service with Meetly last login info",
)
@inject
async def list_users(
    current_user: CurrentUser,
    use_case: FromDishka[ListUsersUseCase],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: str | None = Query(None, description="Search by name or email"),
) -> UsersListResponseDTO:
    return await use_case.execute(
        page=page,
        page_size=page_size,
        search=search,
    )
