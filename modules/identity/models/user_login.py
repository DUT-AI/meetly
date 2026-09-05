from datetime import UTC, datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin
from modules.identity.domain.entities import UserLoginMetadataEntity


class UserLoginMetadataModel(Base, TimestampMixin):
    """Tracks the last time a user logged into Meetly."""

    __tablename__ = "user_login_metadata"

    user_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    last_login_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    def to_entity(self) -> UserLoginMetadataEntity:
        return UserLoginMetadataEntity(
            user_id=self.user_id,
            last_login_at=self.last_login_at,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )

    @classmethod
    def from_entity(cls, entity: UserLoginMetadataEntity) -> "UserLoginMetadataModel":
        return cls(
            user_id=entity.user_id,
            last_login_at=entity.last_login_at,
            created_at=entity.created_at or datetime.now(UTC),
            updated_at=entity.updated_at or datetime.now(UTC),
        )
