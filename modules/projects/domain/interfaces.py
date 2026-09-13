from abc import ABC, abstractmethod
from collections.abc import Sequence

from modules.projects.domain.entities import ProjectEntity


class IProjectRepository(ABC):
    """Repository interface for Projects."""

    @abstractmethod
    async def create(
        self,
        name: str,
        workspace_id: str,
        image_url: str | None = None,
    ) -> ProjectEntity:
        """Create a new project."""

    @abstractmethod
    async def get_by_id(self, project_id: str) -> ProjectEntity | None:
        """Get project by ID."""

    @abstractmethod
    async def get_by_ids(self, project_ids: Sequence[str]) -> list[ProjectEntity]:
        """Batch get projects by IDs."""

    @abstractmethod
    async def list_by_workspace(self, workspace_id: str) -> list[ProjectEntity]:
        """List all projects in a workspace."""

    @abstractmethod
    async def update(
        self,
        project_id: str,
        name: str | None = None,
        image_url: str | None = None,
        clear_image: bool = False,
    ) -> ProjectEntity:
        """Update project details."""

    @abstractmethod
    async def delete(self, project_id: str) -> None:
        """Delete project."""
