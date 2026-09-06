from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin
from modules.workspaces.domain.entities import WorkspaceLabelEntity


class WorkspaceLabelModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    """Workspace Label model for categorizing tasks."""

    __tablename__ = "workspace_labels"

    workspace_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    color: Mapped[str] = mapped_column(String(20), default="#3b82f6", nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "workspace_id", "name", name="uq_workspace_label_workspace_name"
        ),
    )

    def to_entity(self) -> WorkspaceLabelEntity:
        return WorkspaceLabelEntity(
            id=self.id,
            workspace_id=self.workspace_id,
            name=self.name,
            color=self.color,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
