from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.transcription.domain.entities import TranscriptSegmentEntity
from modules.transcription.domain.interfaces import ITranscriptSegmentRepository
from modules.transcription.models.segment import TranscriptSegmentModel
from modules.transcription.models.session import TranscriptionSessionModel


class SqlTranscriptSegmentRepository(ITranscriptSegmentRepository):
    """PostgreSQL implementation of ITranscriptSegmentRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def upsert_segment(
        self,
        session_id: str,
        utterance_id: str,
        revision: int,
        start_ms: int,
        end_ms: int,
        text: str,
        words: list[dict[str, Any]],
        translation: str | None = None,
        speaker_label: str = "UNKNOWN",
        confidence: float = 1.0,
        is_final: bool = True,
    ) -> TranscriptSegmentEntity:
        stmt = select(TranscriptSegmentModel).where(
            TranscriptSegmentModel.session_id == session_id,
            TranscriptSegmentModel.utterance_id == utterance_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model:
            model.revision = revision
            model.start_ms = start_ms
            model.end_ms = end_ms
            model.text = text
            model.translation = translation
            model.words = words
            model.speaker_label = speaker_label
            model.confidence = confidence
            model.is_final = is_final
        else:
            model = TranscriptSegmentModel(
                session_id=session_id,
                utterance_id=utterance_id,
                revision=revision,
                start_ms=start_ms,
                end_ms=end_ms,
                text=text,
                translation=translation,
                words=words,
                speaker_label=speaker_label,
                confidence=confidence,
                is_final=is_final,
            )
            self.session.add(model)

        await self.session.flush()
        return model.to_entity()

    async def list_by_session(self, session_id: str) -> list[TranscriptSegmentEntity]:
        stmt = (
            select(TranscriptSegmentModel)
            .where(TranscriptSegmentModel.session_id == session_id)
            .order_by(TranscriptSegmentModel.start_ms.asc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [m.to_entity() for m in models]

    async def list_by_meeting(self, meeting_id: str) -> list[TranscriptSegmentEntity]:
        stmt = (
            select(TranscriptSegmentModel)
            .join(
                TranscriptionSessionModel,
                TranscriptSegmentModel.session_id == TranscriptionSessionModel.id,
            )
            .where(TranscriptionSessionModel.meeting_id == meeting_id)
            .order_by(TranscriptSegmentModel.start_ms.asc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [m.to_entity() for m in models]
