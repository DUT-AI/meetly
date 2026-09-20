from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.transcription.domain.interfaces import (
    ISpeakerDiarizationEngine,
    ITranscriptSegmentRepository,
    ITranscriptionSessionRepository,
)
from modules.transcription.infrastructure.faster_whisper_engine import FasterWhisperEngine
from modules.transcription.infrastructure.silero_vad import SileroVADDetector
from modules.transcription.infrastructure.speaker_diarizer import SpeakerDiarizer
from modules.transcription.repository.segment_repository import SqlTranscriptSegmentRepository
from modules.transcription.repository.session_repository import SqlTranscriptionSessionRepository
from modules.transcription.use_cases.diarization_use_cases import DiarizationUseCases
from modules.transcription.use_cases.session_use_cases import TranscriptionSessionUseCases
from modules.transcription.use_cases.stream_ingestion_use_case import StreamIngestionUseCase


class TranscriptionProvider(Provider):
    """Dependency Injection provider for transcription module."""

    scope = Scope.REQUEST

    # Singleton App-scoped instances
    @provide(scope=Scope.APP)
    def provide_vad_detector(self) -> SileroVADDetector:
        return SileroVADDetector()

    @provide(scope=Scope.APP)
    def provide_whisper_engine(self) -> FasterWhisperEngine:
        return FasterWhisperEngine()

    @provide(scope=Scope.APP)
    def provide_speaker_diarizer(self) -> ISpeakerDiarizationEngine:
        return SpeakerDiarizer()

    # Request-scoped repositories
    @provide
    def provide_session_repo(
        self, session: AsyncSession
    ) -> ITranscriptionSessionRepository:
        return SqlTranscriptionSessionRepository(session)

    @provide
    def provide_segment_repo(
        self, session: AsyncSession
    ) -> ITranscriptSegmentRepository:
        return SqlTranscriptSegmentRepository(session)

    # Use cases
    session_use_cases = provide(TranscriptionSessionUseCases)
    stream_ingestion_use_case = provide(StreamIngestionUseCase)
    diarization_use_cases = provide(DiarizationUseCases)
