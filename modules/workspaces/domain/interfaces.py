from abc import ABC, abstractmethod
from collections.abc import Sequence

from modules.workspaces.domain.entities import WorkspaceEntity


class IWorkspaceRepository(ABC):
    """Repository interface for Workspaces."""

    @abstractmethod
    async def create(
        self,
        name: str,
        owner_id: str,
        invite_code: str,
        image_url: str | None = None,
    ) -> WorkspaceEntity:
        """Create a new workspace."""

    @abstractmethod
    async def get_by_id(self, workspace_id: str) -> WorkspaceEntity | None:
        """Get workspace by ID."""

    @abstractmethod
    async def get_by_ids(self, workspace_ids: Sequence[str]) -> list[WorkspaceEntity]:
        """Batch fetch workspaces by list of IDs."""

    @abstractmethod
    async def get_by_invite_code(self, invite_code: str) -> WorkspaceEntity | None:
        """Find workspace by invite code."""

    @abstractmethod
    async def update(
        self,
        workspace_id: str,
        name: str | None = None,
        image_url: str | None = None,
        invite_code: str | None = None,
    ) -> WorkspaceEntity:
        """Update workspace details."""

    @abstractmethod
    async def delete(self, workspace_id: str) -> None:
        """Delete workspace."""
