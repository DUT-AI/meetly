from sqlalchemy import Boolean, String, Text, text
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
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    discord_room_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notify_on_task_status_change: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true"), nullable=False
    )
    notify_task_status_discord: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true"), nullable=False
    )
    notify_task_status_zalo: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true"), nullable=False
    )
    zalo_room_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    def to_entity(self) -> WorkspaceEntity:
        return WorkspaceEntity(
            id=self.id,
            name=self.name,
            owner_id=self.owner_id,
            invite_code=self.invite_code,
            image_url=self.image_url,
            note=self.note,
            discord_room_id=self.discord_room_id,
            notify_on_task_status_change=self.notify_on_task_status_change,
            notify_task_status_discord=self.notify_task_status_discord,
            notify_task_status_zalo=self.notify_task_status_zalo,
            zalo_room_id=self.zalo_room_id,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
