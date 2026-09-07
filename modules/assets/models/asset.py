from sqlalchemy import JSON, BigInteger, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin
from modules.assets.domain.entities import AssetEntity
from modules.assets.domain.enums import AssetCategory


class AssetModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    """Polymorphic Asset / File Attachment model."""

    __tablename__ = "assets"

    workspace_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    entity_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    entity_id: Mapped[str] = mapped_column(String(26), index=True, nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    bucket: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    extension: Mapped[str] = mapped_column(String(20), nullable=False)
    category: Mapped[str] = mapped_column(
        String(30), default=AssetCategory.OTHER.value, index=True, nullable=False
    )
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)
    uploaded_by: Mapped[str] = mapped_column(String(26), nullable=False, index=True)

    def to_entity(self, download_url: str | None = None, preview_url: str | None = None) -> AssetEntity:
        return AssetEntity(
            id=self.id,
            workspace_id=self.workspace_id,
            entity_type=self.entity_type,
            entity_id=self.entity_id,
            file_name=self.file_name,
            storage_key=self.storage_key,
            bucket=self.bucket,
            file_size=self.file_size,
            mime_type=self.mime_type,
            extension=self.extension,
            category=AssetCategory(self.category),
            uploaded_by=self.uploaded_by,
            metadata=self.metadata_ or {},
            created_at=self.created_at,
            updated_at=self.updated_at,
            download_url=download_url,
            preview_url=preview_url,
        )
