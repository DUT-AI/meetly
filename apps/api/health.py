import asyncio

import redis.asyncio as aioredis
from sqlalchemy import text

from core.config import redis_settings, s3_settings
from core.database.session import AsyncSessionLocal
from core.storage.minio_adapter import MinIOStorageAdapter


async def check_database() -> tuple[bool, str]:
    """Asynchronously test PostgreSQL connection."""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            if result.scalar() == 1:
                return True, "ok"
            return False, "error: unexpected query result"
    except Exception as e:
        return False, f"error: {e}"


async def check_redis() -> tuple[bool, str]:
    """Asynchronously test Redis connection."""
    try:
        client = aioredis.from_url(redis_settings.redis_url, socket_timeout=3.0)
        pong = await client.ping()
        await client.aclose()
        if pong:
            return True, "ok"
        return False, "error: ping failed"
    except Exception as e:
        return False, f"error: {e}"


async def check_minio() -> tuple[bool, str]:
    """Asynchronously test MinIO S3 connection."""
    try:
        adapter = MinIOStorageAdapter(
            endpoint_url=s3_settings.minio_endpoint,
            access_key=s3_settings.minio_access_key,
            secret_key=s3_settings.minio_secret_key,
            secure=s3_settings.is_secure,
            public_endpoint_url=s3_settings.public_minio_endpoint,
        )
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, adapter.client.list_buckets)
        return True, "ok"
    except Exception as e:
        return False, f"error: {e}"
