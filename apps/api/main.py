import asyncio

import uvicorn
from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware

from apps.api.di import setup_di
from apps.api.health import check_database, check_minio, check_redis
from apps.api.routers import (
    assets_router,
    identity_router,
    meetings_router,
    members_router,
    notifications_router,
    offline_meetings_router,
    projects_router,
    tasks_router,
    transcription_router,
    users_router,
    workspaces_router,
)
from contextlib import asynccontextmanager
from loguru import logger
from core.config import settings
from core.exceptions import setup_exception_handlers
from core.telemetry import setup_telemetry


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-heal any missing tables (e.g. member_voice_profiles) on service startup
    try:
        from core.database.session import engine
        from core.database.base import Base
        import modules.assets.models  # noqa: F401
        import modules.identity.models  # noqa: F401
        import modules.meetings.models  # noqa: F401
        import modules.members.models  # noqa: F401
        import modules.notifications.models  # noqa: F401
        import modules.projects.models  # noqa: F401
        import modules.tasks.models  # noqa: F401
        import modules.transcription.models  # noqa: F401
        import modules.workspaces.models  # noqa: F401

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("[Database] Verified all DB tables exist.")
    except Exception as exc:
        logger.warning(f"[Database] Startup create_all check skipped: {exc}")
    yield


app = FastAPI(
    title="Meetly API",
    description="Modular Monolith Backend API for Meetly",
    version="0.1.0",
    lifespan=lifespan,
)

# 1. Setup Logging
setup_telemetry(app)

# 2. Setup Exception Handlers
setup_exception_handlers(app)

# 3. Setup Dishka Dependency Injection
setup_di(app)


class AppCORSMiddleware(CORSMiddleware):
    """Enhanced CORS Middleware supporting all local development ports and Chrome extensions."""

    def is_allowed_origin(self, origin: str) -> bool:
        if super().is_allowed_origin(origin):
            return True
        return origin.startswith(
            (
                "http://localhost:",
                "http://127.0.0.1:",
                "http://[::1]:",
                "http://192.168.",
                "http://100.",
                "http://10.",
                "http://172.",
                "chrome-extension://",
            )
        ) or origin in ("http://localhost", "http://127.0.0.1", "http://[::1]")


# 4. Configure CORS Middleware
app.add_middleware(
    AppCORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Register Application Routers
app.include_router(identity_router)
app.include_router(users_router)
app.include_router(workspaces_router)
app.include_router(members_router)
app.include_router(projects_router)
app.include_router(tasks_router)
app.include_router(notifications_router)
app.include_router(assets_router)
app.include_router(meetings_router)
app.include_router(transcription_router)
app.include_router(offline_meetings_router)


# 6. Health & Readiness Probes
@app.get("/health", tags=["Health"])
async def health_check():
    """Simple liveness probe endpoint."""
    return {"status": "ok", "version": "0.1.0"}


@app.get("/ready", tags=["Health"])
async def readiness_check(response: Response):
    """Readiness probe checking live status of PostgreSQL, Redis, and MinIO."""
    (
        (db_ok, db_msg),
        (redis_ok, redis_msg),
        (minio_ok, minio_msg),
    ) = await asyncio.gather(
        check_database(),
        check_redis(),
        check_minio(),
    )

    services_status = {
        "database": db_msg,
        "redis": redis_msg,
        "minio": minio_msg,
    }

    all_ready = db_ok and redis_ok and minio_ok

    if not all_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "unhealthy",
            "services": services_status,
        }

    return {
        "status": "ready",
        "services": services_status,
    }


if __name__ == "__main__":
    uvicorn.run(
        "apps.api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
    )
