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
    session_repo = AsyncMock()
    segment_repo = AsyncMock()
    session_repo.get_by_id.return_value = TranscriptionSessionEntity(
        id="sess_test123",
        meeting_id="meet_123",
        workspace_id="ws_123",
        status=SessionStatus.STREAMING.value,
        source_type="GOOGLE_MEET",
        sample_rate=16000,
        duration_samples=0,
        stt_model="openai/whisper-small",
        recording_asset_id=None,
        created_by="user_123",
        created_at=None,
        updated_at=None,
    )

    vad_mock = MagicMock(spec=SileroVADDetector)
    # Speech on first call, silence afterwards
    vad_mock.is_speech.side_effect = [(True, 0.9)] * 10 + [(False, 0.05)] * 100

    whisper_mock = AsyncMock(spec=FasterWhisperEngine)
    whisper_mock.transcribe_samples.return_value = (
        "Chào mừng bạn đến với Meetly!",
        [{"word": "Chào", "start_ms": 100, "end_ms": 300, "score": 0.95}],
        0.98,
    )

    use_case = StreamIngestionUseCase(
        session_repo=session_repo,
        segment_repo=segment_repo,
        vad_detector=vad_mock,
        whisper_engine=whisper_mock,
    )

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

    segment_repo.upsert_segment.return_value = MagicMock(id="seg_saved123")

    raw_frames = [frame0] + silence_frames + [eos_frame]
    mock_ws.receive.side_effect = [{"type": "websocket.receive", "bytes": f} for f in raw_frames]

    await use_case.handle_producer_stream("sess_test123", mock_ws)

    # Verify ASR was called
    assert whisper_mock.transcribe_samples.called

    # Verify segment was saved to DB
    assert segment_repo.upsert_segment.called
    saved_segment = segment_repo.upsert_segment.call_args.kwargs
    assert saved_segment["session_id"] == "sess_test123"
    assert saved_segment["text"] == "Chào mừng bạn đến với Meetly!"
    assert saved_segment["is_final"] is True
