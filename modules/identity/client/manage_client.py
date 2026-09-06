from typing import Any

import httpx
import redis.asyncio as aioredis
from fastapi import HTTPException, status
from loguru import logger

from core.config.manage_client import manage_settings
from core.config.redis import redis_settings
from modules.identity.dtos.manage_dtos import (
    ManageUserDTO,
    ManageUsersResponseDTO,
)


class ManageClient:
    """HTTP Client to interact with external Manage Service API (Read-Only) with Redis Caching."""

    def __init__(
        self,
        timeout: float = 10.0,
    ):
        self.timeout = timeout
        self._redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis | None:
        """Get or initialize Redis connection."""
        if self._redis is None:
            try:
                self._redis = aioredis.from_url(
                    redis_settings.redis_url,
                    decode_responses=True,
                    socket_timeout=3.0,
                )
            except Exception as e:
                logger.warning(f"Could not connect to Redis for user caching: {e}")
                return None
        return self._redis

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
            discord_id=item.get("discord_id"),
            zalo_bot_id=item.get("zalo_bot_id"),
        )

    async def list_users(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> ManageUsersResponseDTO:
        """Fetch users from Manage Service GET /api/v1/users with Redis caching."""
        redis_client = await self._get_redis()
        search_key = search.strip().lower() if search and search.strip() else "_"
        list_cache_key = f"meetly:manage:users_list:{page}:{page_size}:{search_key}"

        # 1. Try reading from Redis cache
        if redis_client:
            try:
                cached = await redis_client.get(list_cache_key)
                if cached:
                    logger.debug(f"Redis cache hit for users list: {list_cache_key}")
                    return ManageUsersResponseDTO.model_validate_json(cached)
            except Exception as e:
                logger.warning(f"Redis get error for {list_cache_key}: {e}")

        # 2. Cache miss -> fetch from external Manage API
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

                result_dto = ManageUsersResponseDTO(
                    items=items,
                    total=total,
                    page=page,
                    page_size=page_size,
                )

                # 3. Store individual users & user list in Redis
                if redis_client:
                    try:
                        ttl = manage_settings.user_cache_ttl
                        for u in all_items:
                            user_json = u.model_dump_json()
                            await redis_client.set(
                                f"meetly:manage:user:{u.id}", user_json, ex=ttl
                            )
                        list_ttl = manage_settings.users_list_cache_ttl
                        await redis_client.set(
                            list_cache_key, result_dto.model_dump_json(), ex=list_ttl
                        )
                    except Exception as e:
                        logger.warning(f"Redis cache set error for users: {e}")

                return result_dto
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

    async def get_user(self, user_id: str | int) -> ManageUserDTO | None:
        """Fetch a single user by ID from Manage Service GET /api/v1/users/{id} with Redis caching."""
        redis_client = await self._get_redis()
        cache_key = f"meetly:manage:user:{user_id}"

        # 1. Try reading user from Redis cache
        if redis_client:
            try:
                cached = await redis_client.get(cache_key)
                if cached:
                    logger.debug(f"Redis cache hit for user: {cache_key}")
                    return ManageUserDTO.model_validate_json(cached)
            except Exception as e:
                logger.warning(f"Redis get error for {cache_key}: {e}")

        # 2. Cache miss -> fetch from external Manage API
        headers = {}
        if manage_settings.token:
            headers["Authorization"] = f"Bearer {manage_settings.token}"

        url = f"{manage_settings.users_url.rstrip('/')}/{user_id}"
        found_user: ManageUserDTO | None = None

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 404:
                    return None
                if response.status_code == 401:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Phiên đăng nhập hết hạn hoặc không có quyền truy cập Manage API.",
                    )
                response.raise_for_status()

                payload: dict[str, Any] = response.json()
                data = payload.get("data") if "data" in payload else payload
                if isinstance(data, dict):
                    found_user = self._parse_user(data)
        except Exception:
            # Fallback: find user from list_users
            try:
                users_resp = await self.list_users(page=1, page_size=200)
                for u in users_resp.items:
                    if str(u.id) == str(user_id):
                        found_user = u
                        break
            except Exception:
                pass

        # 3. Store user in Redis cache if found
        if found_user and redis_client:
            try:
                user_json = found_user.model_dump_json()
                ttl = manage_settings.user_cache_ttl
                await redis_client.set(cache_key, user_json, ex=ttl)
                if str(found_user.id) != str(user_id):
                    await redis_client.set(
                        f"meetly:manage:user:{found_user.id}", user_json, ex=ttl
                    )
            except Exception as e:
                logger.warning(f"Redis set error for user {user_id}: {e}")

        return found_user

    async def invalidate_user_cache(self, user_id: str | int) -> None:
        """Manually invalidate user cache in Redis."""
        redis_client = await self._get_redis()
        if redis_client:
            try:
                await redis_client.delete(f"meetly:manage:user:{user_id}")
            except Exception as e:
                logger.warning(f"Failed to invalidate user cache for {user_id}: {e}")
