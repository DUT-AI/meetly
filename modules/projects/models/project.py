from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin
from modules.projects.domain.entities import ProjectEntity


class ProjectModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    """Project model within a workspace."""

    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    workspace_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    def to_entity(self) -> ProjectEntity:
        return ProjectEntity(
            id=self.id,
            name=self.name,
            workspace_id=self.workspace_id,
            image_url=self.image_url,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
