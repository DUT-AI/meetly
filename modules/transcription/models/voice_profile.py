from sqlalchemy import JSON, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin
from modules.transcription.domain.voice_profile import VoiceProfileEntity


class MemberVoiceProfileModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    """
    Member Voice Profile (Centroid Voicebank) database model.
    Stores the acoustic embedding centroid vector for speaker identification in offline meetings.
    """

    __tablename__ = "member_voice_profiles"

    workspace_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    member_name: Mapped[str] = mapped_column(String(255), nullable=False)
    sample_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    centroid_vector: Mapped[list[float]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=list, nullable=False
    )

    __table_args__ = (
        Index(
            "uq_member_voice_profiles_workspace_user",
            "workspace_id",
            "user_id",
            unique=True,
        ),
    )

    def to_entity(self) -> VoiceProfileEntity:
        return VoiceProfileEntity(
            id=self.id,
            workspace_id=self.workspace_id,
            user_id=self.user_id,
            member_name=self.member_name,
            centroid_vector=self.centroid_vector or [],
            sample_count=self.sample_count,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
