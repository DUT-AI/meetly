from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin
from modules.workspaces.domain.entities import WorkspaceEntity


class WorkspaceModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    """Workspace model representing a team organization."""

    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    invite_code: Mapped[str] = mapped_column(
        String(16), unique=True, index=True, nullable=False
    )

    def to_entity(self) -> WorkspaceEntity:
        return WorkspaceEntity(
            id=self.id,
            name=self.name,
            owner_id=self.owner_id,
            invite_code=self.invite_code,
            image_url=self.image_url,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
