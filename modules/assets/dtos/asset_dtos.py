from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from modules.assets.domain.enums import AssetCategory, EntityType


class AssetResponseDTO(BaseModel):
    """Public representation of an asset."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Asset ULID")
    workspace_id: str = Field(..., description="Workspace ID")
    entity_type: str = Field(..., description="Polymorphic entity type (e.g. TASK, COMMENT)")
    entity_id: str = Field(..., description="ID of associated entity")
    file_name: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="File size in bytes")
    mime_type: str = Field(..., description="MIME content-type")
    extension: str = Field(..., description="File extension")
    category: AssetCategory = Field(..., description="Asset category")
    uploaded_by: str = Field(..., description="User ID of uploader")
    metadata: dict[str, Any] = Field(default_factory=dict)
    download_url: str | None = Field(None, description="Presigned download URL or public URL")
    preview_url: str | None = Field(None, description="Preview / thumbnail URL if available")
    uploader_name: str | None = Field(None, description="Display name of uploader")
    created_at: datetime
    updated_at: datetime


class AssetListResponseDTO(BaseModel):
    """List of assets response."""

    documents: list[AssetResponseDTO]
    total: int


class AssetDownloadResponseDTO(BaseModel):
    """Download URL response."""

    download_url: str
    file_name: str
    mime_type: str
    expires_in: int = 3600
