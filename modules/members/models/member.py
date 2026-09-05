from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin
from modules.members.domain.entities import MemberEntity
from modules.members.domain.enums import MemberRole


class MemberModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    """Member model mapping users to workspaces with roles."""

    __tablename__ = "members"

    workspace_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(
        String(64),
        index=True,
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(20),
        default=MemberRole.MEMBER.value,
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_user"),
    )

    def to_entity(self) -> MemberEntity:
        return MemberEntity(
            id=self.id,
            workspace_id=self.workspace_id,
            user_id=self.user_id,
            role=MemberRole(self.role),
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
