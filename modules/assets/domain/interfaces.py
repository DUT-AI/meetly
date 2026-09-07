from abc import ABC, abstractmethod

from modules.assets.domain.entities import AssetEntity


class IAssetRepository(ABC):
    """Interface for Asset persistence operations."""

    @abstractmethod
    async def create(self, asset: AssetEntity) -> AssetEntity:
        """Persist a new asset."""

    @abstractmethod
    async def get_by_id(self, asset_id: str) -> AssetEntity | None:
        """Fetch single asset by ULID."""

    @abstractmethod
    async def list_by_entity(
        self,
        workspace_id: str,
        entity_type: str,
        entity_id: str,
    ) -> list[AssetEntity]:
        """Fetch all assets attached to a specific entity."""

    @abstractmethod
    async def list_by_workspace(
        self,
        workspace_id: str,
        skip: int = 0,
        limit: int = 50,
        category: str | None = None,
    ) -> tuple[list[AssetEntity], int]:
        """Fetch assets across a workspace with pagination and total count."""

    @abstractmethod
    async def delete(self, asset_id: str) -> bool:
        """Delete an asset record by ULID."""

    @abstractmethod
    async def delete_by_entity(self, entity_type: str, entity_id: str) -> list[AssetEntity]:
        """Delete all assets associated with an entity, returning the deleted entities (for storage cleanup)."""
