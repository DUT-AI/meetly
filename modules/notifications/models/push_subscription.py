from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin


class PushSubscriptionModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    """Model to store client Web Push subscriptions (VAPID)."""

    __tablename__ = "push_subscriptions"

    user_id: Mapped[str] = mapped_column(String(26), nullable=False, index=True)
    endpoint: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    p256dh: Mapped[str] = mapped_column(Text, nullable=False)
    auth: Mapped[str] = mapped_column(Text, nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)

