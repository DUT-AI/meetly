from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.config.auth import auth_settings
from core.exceptions import UnauthorizedException
from core.security.jwt import decode_access_token
from modules.identity.domain.entities import AuthUser

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthUser:
    """Verify user identity via Meetly's own JWT token.

    Precedence:
    1. HttpOnly Cookie (`settings.auth_cookie_name`) - primary for browser clients.
    2. Authorization Bearer header - fallback for API clients / external integrations / test suites.
    """
    platform_access_token = request.cookies.get(auth_settings.auth_cookie_name)
    if not platform_access_token and credentials and credentials.credentials:
        platform_access_token = credentials.credentials

    if not platform_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Thiếu token xác thực (Cookie hoặc Authorization header)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(platform_access_token)
    except UnauthorizedException as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token không hợp lệ hoặc đã hết hạn: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user_id_raw = payload.get("sub")
    if not user_id_raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không chứa thông tin định danh người dùng (sub).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(user_id_raw)
    except (ValueError, TypeError):
        user_id = user_id_raw

    return AuthUser(
        id=user_id,
        email=payload.get("email", ""),
        name=payload.get("name", ""),
        avatar_url=payload.get("avatar_url"),
        role_names=payload.get("role_names", []),
        status="ACTIVE",
    )


CurrentUser = Annotated[AuthUser, Depends(get_current_user)]


async def get_current_user_id(user: AuthUser = Depends(get_current_user)) -> str:
    return str(user.id)
