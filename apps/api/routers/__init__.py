from apps.api.routers.identity import router as identity_router
from apps.api.routers.members import router as members_router
from apps.api.routers.projects import router as projects_router
from apps.api.routers.tasks import router as tasks_router
from apps.api.routers.users import router as users_router
from apps.api.routers.workspaces import router as workspaces_router

__all__ = [
    "identity_router",
    "members_router",
    "projects_router",
    "tasks_router",
    "users_router",
    "workspaces_router",
]
