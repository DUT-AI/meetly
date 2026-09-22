from sqlalchemy import BigInteger, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin
from modules.transcription.domain.entities import TranscriptionSessionEntity


class TranscriptionSessionModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    """Transcription Session database model."""

    __tablename__ = "transcription_sessions"

    meeting_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    workspace_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(30), default="CREATED", index=True, nullable=False
    )
    source_type: Mapped[str] = mapped_column(
        String(30), default="GOOGLE_MEET", nullable=False
    )
    sample_rate: Mapped[int] = mapped_column(Integer, default=16000, nullable=False)
    duration_samples: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    stt_model: Mapped[str] = mapped_column(
        String(100), default="openai/whisper-small", nullable=False
    )
    recording_asset_id: Mapped[str | None] = mapped_column(
        String(26),
        ForeignKey("assets.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by: Mapped[str] = mapped_column(String(64), nullable=False)

    def to_entity(self) -> TranscriptionSessionEntity:
        return TranscriptionSessionEntity(
            id=self.id,
            meeting_id=self.meeting_id,
            workspace_id=self.workspace_id,
            status=self.status,
            source_type=self.source_type,
            sample_rate=self.sample_rate,
            duration_samples=self.duration_samples,
            stt_model=self.stt_model,
            recording_asset_id=self.recording_asset_id,
            created_by=self.created_by,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
