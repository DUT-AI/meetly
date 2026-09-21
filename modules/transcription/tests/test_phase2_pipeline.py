import struct
import asyncio
from unittest.mock import AsyncMock, MagicMock
import numpy as np
import pytest

from modules.transcription.domain.entities import TranscriptionSessionEntity
from modules.transcription.domain.enums import SessionStatus
from modules.transcription.infrastructure.faster_whisper_engine import FasterWhisperEngine
from modules.transcription.infrastructure.silero_vad import SileroVADDetector
from modules.transcription.use_cases.stream_ingestion_use_case import StreamIngestionUseCase


def create_mock_binary_frame(stream_id: int, flags: int, seq: int, start_sample: int, pcm_data: np.ndarray) -> bytes:
    header = struct.pack("<BBHIQ", 1, stream_id, flags, seq, start_sample)
    payload = pcm_data.tobytes()
    return header + payload


@pytest.mark.asyncio
async def test_stream_ingestion_full_lifecycle():
    """Verify StreamIngestionUseCase receives binary frames, invokes ASR on speech endpoint, and persists segment."""
    mock_session = AsyncMock()
    mock_session_factory = MagicMock()
    mock_session_factory.return_value.__aenter__.return_value = mock_session
    mock_session_factory.return_value.__aexit__.return_value = None

    whisper_mock = AsyncMock(spec=FasterWhisperEngine)
    whisper_mock.transcribe_samples.return_value = (
        "Chào mừng bạn đến với Meetly!",
        [{"word": "Chào", "start_ms": 100, "end_ms": 300, "score": 0.95}],
        0.98,
    )

    use_case = StreamIngestionUseCase(
        session_factory=mock_session_factory,
        whisper_engine=whisper_mock,
    )

    from unittest.mock import patch

    # Mock WebSocket
    mock_ws = AsyncMock()
    pcm_speech = np.ones(1600, dtype=np.int16) * 2000
    pcm_silence = np.zeros(1600, dtype=np.int16)

    # Frame 0: Speech
    frame0 = create_mock_binary_frame(stream_id=1, flags=0, seq=0, start_sample=0, pcm_data=pcm_speech)
    # Frame 1..8: Silence to trigger endpointing
    silence_frames = [
        create_mock_binary_frame(stream_id=1, flags=0, seq=i, start_sample=i * 1600, pcm_data=pcm_silence)
        for i in range(1, 9)
    ]
    # Frame 9: EOS frame
    eos_frame = create_mock_binary_frame(stream_id=1, flags=1, seq=9, start_sample=9 * 1600, pcm_data=np.array([], dtype=np.int16))

    raw_frames = [frame0] + silence_frames + [eos_frame]
    mock_ws.receive.side_effect = [{"type": "websocket.receive", "bytes": f} for f in raw_frames]

    with (
        patch("modules.transcription.use_cases.stream_ingestion_use_case.SqlTranscriptSegmentRepository") as mock_segment_repo_cls,
        patch("modules.transcription.use_cases.stream_ingestion_use_case.SqlTranscriptionSessionRepository") as mock_session_repo_cls,
        patch("modules.transcription.use_cases.stream_ingestion_use_case.SileroVADDetector") as mock_vad_cls,
    ):
        mock_segment_repo = mock_segment_repo_cls.return_value
        mock_segment_repo.upsert_segment = AsyncMock(return_value=MagicMock(id="seg_saved123"))

        mock_session_repo = mock_session_repo_cls.return_value
        mock_session_repo.update_status = AsyncMock()

        mock_vad = mock_vad_cls.return_value
        mock_vad.is_speech.side_effect = [(True, 0.9)] * 10 + [(False, 0.05)] * 100

        await use_case.handle_producer_stream("sess_test123", mock_ws)

        # Verify ASR was called
        assert whisper_mock.transcribe_samples.called

        # Verify segment was saved to DB
        assert mock_segment_repo.upsert_segment.called
        saved_segment = mock_segment_repo.upsert_segment.call_args.kwargs
        assert saved_segment["session_id"] == "sess_test123"
        assert saved_segment["text"] == "Chào mừng bạn đến với Meetly!"
        assert saved_segment["is_final"] is True


@pytest.mark.asyncio
async def test_stream_ingestion_speaker_identification_and_dual_stream():
    """Verify StreamIngestionUseCase receives speaker_update control messages and assigns dynamic speaker names."""
    from unittest.mock import patch

    mock_session = AsyncMock()
    mock_session_factory = MagicMock()
    mock_session_factory.return_value.__aenter__.return_value = mock_session
    mock_session_factory.return_value.__aexit__.return_value = None

    whisper_mock = AsyncMock(spec=FasterWhisperEngine)
    whisper_mock.transcribe_samples.return_value = (
        "Xin chào tôi là Phước.",
        [],
        0.99,
    )

    use_case = StreamIngestionUseCase(
        session_factory=mock_session_factory,
        whisper_engine=whisper_mock,
    )

    mock_ws = AsyncMock()
    pcm_speech = np.ones(1600, dtype=np.int16) * 2000
    pcm_silence = np.zeros(1600, dtype=np.int16)

    # 1. Text control message: update speaker for stream 1 to "Phước Nguyễn"
    ctrl_msg = {"type": "websocket.receive", "text": '{"type":"speaker_update","stream_id":1,"speaker_name":"Phước Nguyễn"}'}

    # 2. Binary audio frame on stream 1
    frame0 = create_mock_binary_frame(stream_id=1, flags=0, seq=0, start_sample=0, pcm_data=pcm_speech)
    silence_frames = [
        create_mock_binary_frame(stream_id=1, flags=0, seq=i, start_sample=i * 1600, pcm_data=pcm_silence)
        for i in range(1, 9)
    ]
    eos_frame = create_mock_binary_frame(stream_id=1, flags=1, seq=9, start_sample=9 * 1600, pcm_data=np.array([], dtype=np.int16))

    mock_ws.receive.side_effect = [ctrl_msg, {"type": "websocket.receive", "bytes": frame0}] + [
        {"type": "websocket.receive", "bytes": f} for f in silence_frames
    ] + [{"type": "websocket.receive", "bytes": eos_frame}]

    with (
        patch("modules.transcription.use_cases.stream_ingestion_use_case.SqlTranscriptSegmentRepository") as mock_segment_repo_cls,
        patch("modules.transcription.use_cases.stream_ingestion_use_case.SqlTranscriptionSessionRepository") as mock_session_repo_cls,
        patch("modules.transcription.use_cases.stream_ingestion_use_case.SileroVADDetector") as mock_vad_cls,
    ):
        mock_segment_repo = mock_segment_repo_cls.return_value
        mock_segment_repo.upsert_segment = AsyncMock(return_value=MagicMock(id="seg_saved456"))

        mock_session_repo = mock_session_repo_cls.return_value
        mock_session_repo.update_status = AsyncMock()

        mock_vad = mock_vad_cls.return_value
        mock_vad.is_speech.side_effect = [(True, 0.9)] * 10 + [(False, 0.05)] * 100

        await use_case.handle_producer_stream("sess_test456", mock_ws)

        assert mock_segment_repo.upsert_segment.called
        saved_segment = mock_segment_repo.upsert_segment.call_args.kwargs
        # Verify the speaker label was dynamically set to "Phước Nguyễn"
        assert saved_segment["speaker_label"] == "Phước Nguyễn"

