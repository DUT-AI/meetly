from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from modules.transcription.ai.offline_stt import OfflineSTTProcessor
from modules.transcription.domain.interfaces import (
    ITranscriptionSessionRepository,
    ITranscriptSegmentRepository,
    IVoiceProfileRepository,
)
from modules.transcription.infrastructure.faster_whisper_engine import (
    FasterWhisperEngine,
)
from modules.transcription.infrastructure.silero_vad import SileroVADDetector
from modules.transcription.repository.segment_repository import (
    SqlTranscriptSegmentRepository,
)
from modules.transcription.repository.session_repository import (
    SqlTranscriptionSessionRepository,
)
from modules.transcription.repository.voice_profile_repository import (
    SqlVoiceProfileRepository,
)
from modules.transcription.use_cases.offline_meeting_use_case import (
    OfflineMeetingUseCase,
)
from modules.transcription.use_cases.session_use_cases import (
    TranscriptionSessionUseCases,
)
from modules.transcription.use_cases.stream_ingestion_use_case import (
    StreamIngestionUseCase,
)


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
    def provide_offline_stt(self) -> OfflineSTTProcessor:
        return OfflineSTTProcessor()

    @provide(scope=Scope.APP)
    def provide_stream_ingestion_use_case(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        whisper_engine: FasterWhisperEngine,
    ) -> StreamIngestionUseCase:
        return StreamIngestionUseCase(
            session_factory=session_factory,
            whisper_engine=whisper_engine,
        )

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

    @provide
    def provide_voice_repo(self, session: AsyncSession) -> IVoiceProfileRepository:
        return SqlVoiceProfileRepository(session)

    # Use cases
    session_use_cases = provide(TranscriptionSessionUseCases)
    offline_meeting_use_case = provide(OfflineMeetingUseCase)
