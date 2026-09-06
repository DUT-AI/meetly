from abc import ABC, abstractmethod
from collections.abc import Sequence

from modules.workspaces.domain.entities import (
    WorkspaceEntity,
    WorkspaceLabelEntity,
)


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


class IWorkspaceLabelRepository(ABC):
    """Repository interface for Workspace Labels."""

    @abstractmethod
    async def create(
        self,
        workspace_id: str,
        name: str,
        color: str,
    ) -> WorkspaceLabelEntity:
        """Create a new workspace label."""

    @abstractmethod
    async def get_by_id(self, label_id: str) -> WorkspaceLabelEntity | None:
        """Get label by ID."""

    @abstractmethod
    async def get_by_workspace_and_name(
        self, workspace_id: str, name: str
    ) -> WorkspaceLabelEntity | None:
        """Find label in workspace by name."""

    @abstractmethod
    async def list_by_workspace(self, workspace_id: str) -> list[WorkspaceLabelEntity]:
        """List all labels in a workspace."""

    @abstractmethod
    async def update(
        self,
        label_id: str,
        name: str | None = None,
        color: str | None = None,
    ) -> WorkspaceLabelEntity:
        """Update label details."""

    @abstractmethod
    async def delete(self, label_id: str) -> None:
        """Delete label."""
