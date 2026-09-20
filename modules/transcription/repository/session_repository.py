from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.transcription.domain.entities import TranscriptionSessionEntity
from modules.transcription.domain.enums import SessionStatus
from modules.transcription.domain.interfaces import ITranscriptionSessionRepository
from modules.transcription.models.session import TranscriptionSessionModel


class SqlTranscriptionSessionRepository(ITranscriptionSessionRepository):
    """PostgreSQL implementation of ITranscriptionSessionRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        meeting_id: str,
        workspace_id: str,
        created_by: str,
        source_type: str = "GOOGLE_MEET",
        sample_rate: int = 16000,
        stt_model: str = "openai/whisper-small",
    ) -> TranscriptionSessionEntity:
        model = TranscriptionSessionModel(
            meeting_id=meeting_id,
            workspace_id=workspace_id,
            created_by=created_by,
            source_type=source_type,
            sample_rate=sample_rate,
            stt_model=stt_model,
            status=SessionStatus.CREATED.value,
        )
        self.session.add(model)
        await self.session.flush()
        return model.to_entity()

    async def get_by_id(self, session_id: str) -> TranscriptionSessionEntity | None:
        stmt = select(TranscriptionSessionModel).where(
            TranscriptionSessionModel.id == session_id
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def get_active_session_by_meeting(
        self, meeting_id: str
    ) -> TranscriptionSessionEntity | None:
        stmt = (
            select(TranscriptionSessionModel)
            .where(
                TranscriptionSessionModel.meeting_id == meeting_id,
                TranscriptionSessionModel.status.in_(
                    [
                        SessionStatus.CREATED.value,
                        SessionStatus.STREAMING.value,
                        SessionStatus.FINALIZING.value,
                    ]
                ),
            )
            .order_by(TranscriptionSessionModel.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def update_status(
        self,
        session_id: str,
        status: str,
        duration_samples: int | None = None,
        recording_asset_id: str | None = None,
    ) -> TranscriptionSessionEntity:
        stmt = select(TranscriptionSessionModel).where(
            TranscriptionSessionModel.id == session_id
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            raise ValueError(f"Session {session_id} not found")

        model.status = status
        if duration_samples is not None:
            model.duration_samples = duration_samples
        if recording_asset_id is not None:
            model.recording_asset_id = recording_asset_id

        await self.session.flush()
        return model.to_entity()
