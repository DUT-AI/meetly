from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Response, status

from apps.api.deps.auth import CurrentUser
from core.config.auth import auth_settings
from modules.identity.domain.entities import AuthUser
from modules.identity.dtos.auth_dtos import (
    LoginRequestDTO,
    LoginResponseDTO,
    LogoutResponseDTO,
)
from modules.identity.use_cases import LoginUseCase

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post(
    "/login",
    response_model=LoginResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="User Login",
)
@inject
async def login(
    payload: LoginRequestDTO,
    response: Response,
    use_case: FromDishka[LoginUseCase],
) -> LoginResponseDTO:
    res = await use_case.execute(payload)
    response.set_cookie(
        key=auth_settings.auth_cookie_name,
        value=res.access_token,
        httponly=True,
        secure=auth_settings.auth_cookie_secure,
        samesite=auth_settings.auth_cookie_samesite,
        max_age=auth_settings.auth_cookie_max_age,
        path="/",
    )
    return res


@router.get(
    "/me",
    response_model=AuthUser,
    status_code=status.HTTP_200_OK,
    summary="Get current logged in user information",
)
async def get_me(
    current_user: CurrentUser,
) -> AuthUser:
    """Return current logged in user (validated via CurrentUser dependency)."""
    return current_user


@router.get(
    "/current",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Get current user compatibility endpoint",
)
async def get_current(
    current_user: CurrentUser,
) -> dict:
    """Compatibility endpoint matching Next.js fullstack data format."""
    return {"data": current_user}


@router.post(
    "/logout",
    response_model=LogoutResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="User Logout",
)
async def logout(response: Response) -> LogoutResponseDTO:
    """Perform user session logout (clearing HttpOnly auth cookie)."""
    response.delete_cookie(
        key=auth_settings.auth_cookie_name,
        path="/",
        secure=auth_settings.auth_cookie_secure,
        samesite=auth_settings.auth_cookie_samesite,
    )
    return LogoutResponseDTO()
