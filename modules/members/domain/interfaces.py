from abc import ABC, abstractmethod

from modules.members.domain.entities import MemberEntity
from modules.members.domain.enums import MemberRole


class IMemberRepository(ABC):
    """Repository interface for workspace members."""

    @abstractmethod
    async def add_member(
        self, workspace_id: str, user_id: str, role: MemberRole = MemberRole.MEMBER
    ) -> MemberEntity:
        """Add a user to a workspace."""

    @abstractmethod
    async def get_member(self, workspace_id: str, user_id: str) -> MemberEntity | None:
        """Find member by workspace ID and user ID."""

    @abstractmethod
    async def get_by_id(self, member_id: str) -> MemberEntity | None:
        """Find member by member ID."""

    @abstractmethod
    async def list_by_workspace(self, workspace_id: str) -> list[MemberEntity]:
        """List all members in a workspace."""

    @abstractmethod
    async def list_by_user(self, user_id: str) -> list[MemberEntity]:
        """List all memberships of a user."""

    @abstractmethod
    async def update_role(self, member_id: str, role: MemberRole) -> MemberEntity:
        """Update role of a member."""

    @abstractmethod
    async def count_by_workspace(self, workspace_id: str) -> int:
        """Count total members in a workspace."""

    @abstractmethod
    async def delete(self, member_id: str) -> None:
        """Delete member by ID."""

    @abstractmethod
    async def delete_by_workspace(self, workspace_id: str) -> None:
        """Delete all members of a workspace."""
