from typing import Any

import httpx
from fastapi import HTTPException, status

from core.config.manage_client import manage_settings
from modules.identity.dtos.manage_dtos import (
    ManageUserDTO,
    ManageUsersResponseDTO,
)


class ManageClient:
    """HTTP Client to interact with external Manage Service API (Read-Only)."""

    def __init__(
        self,
        timeout: float = 10.0,
    ):
        self.timeout = timeout

    @staticmethod
    def _parse_user(item: dict[str, Any]) -> ManageUserDTO:
        return ManageUserDTO(
            id=item.get("id") or item.get("user_id", ""),
            name=item.get("name") or item.get("username", ""),
            email=item.get("email", ""),
            status=item.get("status", "ACTIVE"),
            avatar_url=item.get("avatar_url"),
            role_names=item.get("role_names")
            or ([item["role"]] if "role" in item else []),
        )

    async def list_users(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> ManageUsersResponseDTO:
        """Fetch users from Manage Service GET /api/v1/users."""
        headers = {}

        if manage_settings.token:
            headers["Authorization"] = f"Bearer {manage_settings.token}"
        params: dict[str, Any] = {
            "page": page,
            "page_size": page_size,
        }
        if search:
            params["search"] = search

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    manage_settings.users_url, headers=headers, params=params
                )
                if response.status_code == 401:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Phiên đăng nhập hết hạn hoặc không có quyền truy cập Manage API.",
                    )
                response.raise_for_status()

                payload: dict[str, Any] = response.json()
                if (
                    payload.get("is_success") is False
                    or "data" not in payload
                    or payload.get("data") is None
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=payload.get(
                            "message", "Lỗi lấy danh sách người dùng từ Manage API"
                        ),
                    )

                data: list[dict[str, Any]] = payload.get("data", [])
                items: list[ManageUserDTO] = []
                total = 0

                all_items = [
                    self._parse_user(item) for item in data if isinstance(item, dict)
                ]

                # In-memory search fallback if Manage server didn't filter
                if search and search.strip():
                    s = search.strip().lower()
                    all_items = [
                        u
                        for u in all_items
                        if s in u.name.lower() or s in u.email.lower()
                    ]

                total = len(all_items)
                start_idx = (page - 1) * page_size
                items = all_items[start_idx : start_idx + page_size]

                return ManageUsersResponseDTO(
                    items=items,
                    total=total,
                    page=page,
                    page_size=page_size,
                )
        except httpx.ConnectError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Không thể kết nối tới Manage Server tại {manage_settings.users_url}. Vui lòng kiểm tra lại Manage Server.",
            ) from exc
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Yêu cầu tới Manage Server tại {manage_settings.users_url} bị quá thời gian (timeout).",
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=f"Lỗi Manage Server: {exc.response.text}",
            ) from exc
