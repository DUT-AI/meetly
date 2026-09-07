from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from modules.assets.domain.enums import AssetCategory


@dataclass
class AssetEntity:
    """Core domain representation of an uploaded file / asset."""

    id: str
    workspace_id: str
    entity_type: str
    entity_id: str
    file_name: str
    storage_key: str
    bucket: str
    file_size: int
    mime_type: str
    extension: str
    category: AssetCategory
    uploaded_by: str
    created_at: datetime
    updated_at: datetime
    metadata: dict[str, Any] = field(default_factory=dict)
    download_url: str | None = None
    preview_url: str | None = None
    uploader_name: str | None = None
