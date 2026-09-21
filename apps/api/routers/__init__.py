from apps.api.routers.assets import router as assets_router
from apps.api.routers.identity import router as identity_router
from apps.api.routers.members import router as members_router
from apps.api.routers.notifications import router as notifications_router
from apps.api.routers.projects import router as projects_router
from apps.api.routers.tasks import router as tasks_router
from apps.api.routers.users import router as users_router
from apps.api.routers.workspaces import router as workspaces_router
from apps.api.routers.meetings import router as meetings_router
from apps.api.routers.transcription import router as transcription_router

__all__ = [
    "assets_router",
    "identity_router",
    "members_router",
    "notifications_router",
    "projects_router",
    "tasks_router",
    "users_router",
    "workspaces_router",
    "meetings_router",
    "transcription_router",
]
