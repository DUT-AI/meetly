import struct
from unittest.mock import AsyncMock, MagicMock
import numpy as np
import pytest

from modules.transcription.domain.enums import StreamId
from modules.transcription.infrastructure.event_broadcaster import EventBroadcaster
from modules.transcription.infrastructure.silero_vad import SileroVADDetector
from modules.transcription.infrastructure.utterance_buffer import UtteranceBuffer


def test_binary_frame_header_parsing():
    """Verify 16-byte fixed header unpacks strictly into stream_id, flags, seq, start_sample."""
    version = 1
    stream_id = StreamId.MIC.value  # 2
    flags = 0x01  # START
    seq = 42
    start_sample = 160000  # 10 seconds into audio (160000 * 1000 / 16000 = 10000 ms)

    header = struct.pack("<BBHIQ", version, stream_id, flags, seq, start_sample)
    assert len(header) == 16

    # 100ms PCM16 = 1600 samples = 3200 bytes
    payload = np.zeros(1600, dtype=np.int16).tobytes()
    frame_bytes = header + payload

    v, s_id, f, s, start_s = struct.unpack_from("<BBHIQ", frame_bytes, 0)
    assert v == 1
    assert s_id == StreamId.MIC.value
    assert f == 0x01
    assert s == 42
    assert start_s == 160000

    pcm16 = np.frombuffer(frame_bytes[16:], dtype=np.int16)
    assert len(pcm16) == 1600


def test_utterance_buffer_preroll_and_endpointing():
    """Verify UtteranceBuffer correctly accumulates pre-roll, detects speech, and endpoints."""
    buffer = UtteranceBuffer(
        sample_rate=16000,
        pre_roll_ms=250,      # 4000 samples
        partial_cadence_ms=800, # 12800 samples
        silence_endpoint_ms=600 # 9600 samples
    )

    vad_mock = MagicMock(spec=SileroVADDetector)

    # 1. Push 5 frames (500ms) of silence
    vad_mock.is_speech.return_value = (False, 0.05)
    silence_frame = np.zeros(1600, dtype=np.int16)

    for i in range(5):
        partial, endpoint = buffer.push_frame(silence_frame, i * 1600, vad_mock)
        assert not partial
        assert not endpoint

    assert not buffer.is_speech_active
    assert len(buffer._pre_roll) == 4000  # Capped at pre_roll_samples (250ms)

    # 2. Push 8 frames of speech (800ms)
    vad_mock.is_speech.return_value = (True, 0.95)
    speech_frame = np.ones(1600, dtype=np.int16) * 1000

    partial_triggered = False
    for i in range(5, 13):
        partial, endpoint = buffer.push_frame(speech_frame, i * 1600, vad_mock)
        if partial:
            partial_triggered = True

    assert buffer.is_speech_active
    assert partial_triggered is True

    # 3. Push 7 frames of silence (7 * 100ms = 700ms > 600ms endpoint threshold)
    vad_mock.is_speech.return_value = (False, 0.05)
    endpoint_triggered = False
    for i in range(13, 20):
        partial, endpoint = buffer.push_frame(silence_frame, i * 1600, vad_mock)
        if endpoint:
            endpoint_triggered = True
            break

    assert endpoint_triggered is True

    # 4. Finish utterance
    final_res = buffer.finish_utterance()
    assert final_res is not None
    audio, start_s, end_s = final_res
    assert len(audio) > 0
    assert not buffer.is_speech_active


@pytest.mark.asyncio
async def test_event_broadcaster():
    """Verify EventBroadcaster fans out JSON events to active subscribers and handles disconnects."""
    broadcaster = EventBroadcaster()
    mock_ws = AsyncMock()

    # 1. Connect subscriber
    await broadcaster.connect("session_123", mock_ws)
    assert len(broadcaster._subscribers["session_123"]) == 1

    # 2. Broadcast event
    test_event = {"type": "transcript.final", "text": "Hôm nay họp"}
    await broadcaster.broadcast("session_123", test_event)
    mock_ws.send_json.assert_called_once_with(test_event)

    # 3. Disconnect subscriber
    await broadcaster.disconnect("session_123", mock_ws)
    assert "session_123" not in broadcaster._subscribers
