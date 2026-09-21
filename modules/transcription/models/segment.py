from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin
from modules.transcription.domain.entities import TranscriptSegmentEntity


class TranscriptSegmentModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    """Transcript Segment database model."""

    __tablename__ = "transcript_segments"

    session_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("transcription_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    utterance_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    start_ms: Mapped[int] = mapped_column(BigInteger, nullable=False)
    end_ms: Mapped[int] = mapped_column(BigInteger, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    translation: Mapped[str | None] = mapped_column(Text, nullable=True)
    words: Mapped[list[dict]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=list, nullable=False
    )
    speaker_label: Mapped[str] = mapped_column(
        String(50), default="UNKNOWN", nullable=False
    )
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    is_final: Mapped[bool] = mapped_column(
        Boolean, default=True, index=True, nullable=False
    )

    __table_args__ = (
        Index("ix_transcript_segments_session_start", "session_id", "start_ms"),
        Index(
            "uq_transcript_segments_session_utterance",
            "session_id",
            "utterance_id",
            unique=True,
        ),
    )

    def to_entity(self) -> TranscriptSegmentEntity:
        return TranscriptSegmentEntity(
            id=self.id,
            session_id=self.session_id,
            utterance_id=self.utterance_id,
            revision=self.revision,
            start_ms=self.start_ms,
            end_ms=self.end_ms,
            text=self.text,
            translation=self.translation,
            words=self.words or [],
            speaker_label=self.speaker_label,
            confidence=self.confidence,
            is_final=self.is_final,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
