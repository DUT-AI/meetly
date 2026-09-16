from dishka import AsyncContainer, make_async_container
from dishka.integrations.fastapi import setup_dishka
from fastapi import FastAPI

from core.database.session import DatabaseProvider
from core.storage.di import StorageProvider
from modules.assets.di import AssetProvider
from modules.identity.di import IdentityProvider
from modules.meetings.di import MeetingProvider
from modules.members.di import MemberProvider
from modules.notifications.di import NotificationProvider
from modules.projects.di import ProjectProvider
from modules.tasks.di import TaskProvider
from modules.workspaces.di import WorkspaceProvider


def create_container() -> AsyncContainer:
    """Instantiate and configure Dishka Dependency Injection Container."""
    return make_async_container(
        DatabaseProvider(),
        StorageProvider(),
        IdentityProvider(),
        WorkspaceProvider(),
        MemberProvider(),
        ProjectProvider(),
        TaskProvider(),
        NotificationProvider(),
        AssetProvider(),
        MeetingProvider(),
    )


def setup_di(app: FastAPI) -> None:
    """Bind Dishka DI container to FastAPI application instance."""
    container = create_container()
    setup_dishka(container, app)
