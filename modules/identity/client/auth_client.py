from typing import Any

import httpx
from fastapi import HTTPException, status

from core.config.auth import auth_settings
from modules.identity.domain.entities import AuthUser, TokenResponse


class AuthClient:
    """HTTP Client to interact with external Auth Server API (dut-ai-data-platform style)."""

    def __init__(self, timeout: float = 10.0):
        self.timeout = timeout

    async def get_me(self, token: str) -> AuthUser:
        """Fetch current user data from Auth Server GET /api/v1/auth/me."""
        headers = {"Authorization": f"Bearer {token}"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(auth_settings.me_url, headers=headers)
                if response.status_code == 401:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Phiên đăng nhập hết hạn hoặc không hợp lệ.",
                    )
                response.raise_for_status()

                payload: dict[str, Any] = response.json()
                if not payload.get("is_success") or "data" not in payload:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=payload.get("message", "Lỗi lấy thông tin người dùng"),
                    )

                data = payload["data"]
                return AuthUser(
                    id=data["id"],
                    name=data["name"],
                    email=data["email"],
                    status=data.get("status", "ACTIVE"),
                    avatar_url=data.get("avatar_url"),
                    role_names=data.get("role_names", []),
                )
        except httpx.ConnectError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Không thể kết nối tới Auth Server tại {auth_settings.me_url}. Vui lòng kiểm tra lại Auth Server.",
            ) from exc
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Yêu cầu tới Auth Server tại {auth_settings.me_url} bị quá thời gian (timeout).",
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=f"Lỗi Auth Server: {exc.response.text}",
            ) from exc

    async def login(self, email: str, password: str) -> TokenResponse:
        """Perform login against Auth Server POST /api/v1/auth/login."""
        payload = {"email": email, "password": password}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(auth_settings.login_url, json=payload)
                if response.status_code in (400, 401, 422):
                    res_err = response.json() if response.content else {}
                    msg = (
                        res_err.get("message") or "Email hoặc mật khẩu không chính xác."
                    )
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=msg,
                    )
                response.raise_for_status()

                res_json: dict[str, Any] = response.json()
                if not res_json.get("is_success") or "data" not in res_json:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=res_json.get("message", "Đăng nhập không thành công"),
                    )

                data = res_json["data"]
                return TokenResponse(
                    access_token=data["access_token"],
                    refresh_token=data.get("refresh_token"),
                    token_type=data.get("token_type", "bearer"),
                )
        except httpx.ConnectError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Không thể kết nối tới Auth Server tại {auth_settings.login_url}. Vui lòng kiểm tra lại Auth Server.",
            ) from exc
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Yêu cầu tới Auth Server tại {auth_settings.login_url} bị quá thời gian (timeout).",
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=f"Lỗi Auth Server: {exc.response.text}",
            ) from exc
