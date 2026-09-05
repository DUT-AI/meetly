from abc import ABC, abstractmethod
from collections.abc import Sequence
from datetime import datetime

from modules.identity.domain.entities import UserLoginMetadataEntity


class IUserLoginRepository(ABC):
    """Repository interface for User Login metadata persistence."""

    @abstractmethod
    async def upsert_last_login(
        self, user_id: str, last_login_at: datetime
    ) -> UserLoginMetadataEntity:
        """Atomically insert or update the last login timestamp for a user."""

    @abstractmethod
    async def get_by_user_id(self, user_id: str) -> UserLoginMetadataEntity | None:
        """Get last login metadata for a specific user ID."""

    @abstractmethod
    async def get_by_user_ids(self, user_ids: Sequence[str]) -> dict[str, datetime]:
        """Batch fetch last login timestamps mapped by user ID."""
