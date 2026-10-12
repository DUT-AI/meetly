from typing import Any

import httpx
import redis.asyncio as aioredis
from fastapi import HTTPException, status
from loguru import logger

from core.config.manage_client import manage_settings
from core.config.redis import redis_settings
from modules.identity.dtos.user_dtos import (
    UserOptionDTO,
    UserProfileDetailDTO,
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
    def _parse_user(item: dict[str, Any]) -> UserOptionDTO:
        return UserOptionDTO(
            id=item.get("id") or item.get("user_id", ""),
            name=item.get("name") or item.get("username", ""),
            email=item.get("email", ""),
            avatar_url=item.get("avatar_url"),
        )

    async def list_users(
        self,
        search: str | None = None,
    ) -> list[UserOptionDTO]:
        """Fetch users from Manage Service GET /api/v1/users/options with Redis caching."""
        redis_client = await self._get_redis()
        search_key = search.strip().lower() if search and search.strip() else "_"
        cache_key = f"meetly:manage:users_options:{search_key}"

        # 1. Try reading from Redis cache
        if redis_client:
            try:
                cached = await redis_client.get(cache_key)
                if cached:
                    logger.debug(f"Redis cache hit for users list: {cache_key}")
                    import json

                    items_raw = json.loads(cached)
                    return [UserOptionDTO.model_validate(x) for x in items_raw]
            except Exception as e:
                logger.warning(f"Redis get error for {cache_key}: {e}")

        # 2. Cache miss -> fetch from external Manage API /users/options
        headers = {}
        if manage_settings.token:
            headers["Authorization"] = f"Bearer {manage_settings.token}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    manage_settings.users_options_url, headers=headers
                )
                if response.status_code == 401:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Phiên đăng nhập hết hạn hoặc không có quyền truy cập Manage API.",
                    )
                response.raise_for_status()

                payload: dict[str, Any] = response.json()
                data: list[dict[str, Any]] = (
                    payload.get("data") if "data" in payload else payload
                )
                if not isinstance(data, list):
                    data = []

                all_items = [
                    self._parse_user(item) for item in data if isinstance(item, dict)
                ]

                # In-memory search filter if search parameter is provided
                if search and search.strip():
                    s = search.strip().lower()
                    all_items = [
                        u
                        for u in all_items
                        if s in u.name.lower() or s in u.email.lower()
                    ]

                # 3. Store in Redis
                if redis_client and all_items:
                    try:
                        import json

                        ttl = manage_settings.users_list_cache_ttl
                        await redis_client.set(
                            cache_key,
                            json.dumps([u.model_dump() for u in all_items]),
                            ex=ttl,
                        )
                    except Exception as e:
                        logger.warning(f"Redis cache set error for users options: {e}")

                return all_items
        except httpx.ConnectError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Không thể kết nối tới Manage Server tại {manage_settings.users_options_url}.",
            ) from exc
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Yêu cầu tới Manage Server tại {manage_settings.users_options_url} bị timeout.",
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=f"Lỗi Manage Server: {exc.response.text}",
            ) from exc

    async def get_user(self, user_id: str | int) -> UserProfileDetailDTO | None:
        """Fetch full user profile by ID from Manage Service GET /api/v1/users/{id} with Redis caching."""
        # Non-numeric IDs (like usernames 'quetu0710') are invalid for upstream Manage Server (which expects integer id)
        user_id_str = str(user_id)
        if not user_id_str.isdigit():
            # Try to lookup by username/email from list_users
            users = await self.list_users(search=user_id_str)
            for u in users:
                if str(u.id) == user_id_str or u.name == user_id_str or u.email == user_id_str:
                    user_id = u.id
                    break
            else:
                return None

        redis_client = await self._get_redis()
        cache_key = f"meetly:manage:user:{user_id}"

        # 1. Try reading from Redis cache
        if redis_client:
            try:
                cached = await redis_client.get(cache_key)
                if cached:
                    logger.debug(f"Redis cache hit for user: {cache_key}")
                    return UserProfileDetailDTO.model_validate_json(cached)
            except Exception as e:
                logger.warning(f"Redis get error for {cache_key}: {e}")

        # 2. Cache miss -> fetch from external Manage API /users/{id}
        headers = {}
        if manage_settings.token:
            headers["Authorization"] = f"Bearer {manage_settings.token}"

        url = f"{manage_settings.users_detail_url.rstrip('/')}/{user_id}"
        user_profile: UserProfileDetailDTO | None = None

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
                raw_data = payload.get("data") if "data" in payload else payload
                if raw_data:
                    user_profile = UserProfileDetailDTO.model_validate(raw_data)
        except Exception as exc:
            logger.warning(f"Error fetching user from Manage API {url}: {exc}")
            return None

        # 3. Store user in Redis cache if found
        if user_profile and redis_client:
            try:
                ttl = manage_settings.user_cache_ttl
                await redis_client.set(cache_key, user_profile.model_dump_json(), ex=ttl)
            except Exception as e:
                logger.warning(f"Redis set error for user {user_id}: {e}")

        return user_profile

    async def invalidate_user_cache(self, user_id: str | int) -> None:
        """Manually invalidate user cache in Redis."""
        redis_client = await self._get_redis()
        if redis_client:
            try:
                await redis_client.delete(f"meetly:manage:user:{user_id}")
            except Exception as e:
                logger.warning(f"Failed to invalidate user cache for {user_id}: {e}")
