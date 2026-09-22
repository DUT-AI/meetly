from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from modules.transcription.domain.entities import TranscriptSegmentEntity
from modules.transcription.dtos.session_dtos import TranscriptSegmentDTO
from modules.transcription.infrastructure.seamless_client import (
    SeamlessTranslationClient,
)


@pytest.mark.asyncio
async def test_seamless_client_translate_success():
    client = SeamlessTranslationClient(base_url="http://mock-service:8005", timeout=2.0)

    # Mock httpx AsyncClient post
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "translation": "Good morning everyone",
        "src_lang": "vie",
        "tgt_lang": "eng",
    }

    with patch.object(httpx.AsyncClient, "post", new=AsyncMock(return_value=mock_resp)):
        result = await client.translate(
            "Chào buổi sáng mọi người", src_lang="vie", tgt_lang="eng"
        )
        assert result == "Good morning everyone"
    await client.close()


@pytest.mark.asyncio
async def test_seamless_client_graceful_fallback_on_network_error():
    client = SeamlessTranslationClient(
        base_url="http://invalid-host-unreachable:9999", timeout=0.5
    )

    with patch.object(
        httpx.AsyncClient, "post", side_effect=httpx.ConnectError("Connection refused")
    ):
        # Should not raise exception, but return None gracefully
        result = await client.translate("Xin chào")
        assert result is None
    await client.close()


@pytest.mark.asyncio
async def test_seamless_client_empty_text():
    client = SeamlessTranslationClient(base_url="http://mock-service:8005")
    result = await client.translate("   ")
    assert result is None
    await client.close()


def test_transcript_segment_entity_and_dto_translation_field():
    entity = TranscriptSegmentEntity(
        id="seg_1",
        session_id="sess_1",
        utterance_id="utt_1",
        revision=1,
        start_ms=0,
        end_ms=2000,
        text="Xin chào",
        translation="Hello",
        speaker_label="LOCAL_USER",
        confidence=0.95,
        is_final=True,
    )
    assert entity.translation == "Hello"

    dto = TranscriptSegmentDTO(
        id=entity.id,
        session_id=entity.session_id,
        utterance_id=entity.utterance_id,
        revision=entity.revision,
        start_ms=entity.start_ms,
        end_ms=entity.end_ms,
        text=entity.text,
        translation=entity.translation,
        speaker_label=entity.speaker_label,
        confidence=entity.confidence,
        is_final=entity.is_final,
    )
    assert dto.translation == "Hello"


@pytest.mark.asyncio
async def test_remote_gpu_asr_success():
    import numpy as np

    from modules.transcription.infrastructure.faster_whisper_engine import (
        FasterWhisperEngine,
    )

    engine = FasterWhisperEngine(model_size_or_path="small")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "text": "Chào mừng đến với dự án Meetly",
        "words": [{"word": "Chào", "start_ms": 0, "end_ms": 300, "score": 0.99}],
        "confidence": 0.98,
        "language": "vi",
    }

    dummy_audio = np.zeros(16000, dtype=np.int16)
    with patch.object(httpx.AsyncClient, "post", new=AsyncMock(return_value=mock_resp)):
        text, words, conf = await engine.transcribe_samples(dummy_audio, language="vi")
        assert text == "Chào mừng đến với dự án Meetly"
        assert len(words) == 1
        assert conf == 0.98


@pytest.mark.asyncio
async def test_remote_gpu_asr_fallback_to_local():
    import numpy as np

    from modules.transcription.infrastructure.faster_whisper_engine import (
        FasterWhisperEngine,
    )

    engine = FasterWhisperEngine(model_size_or_path="small")

    dummy_audio = np.zeros(16000, dtype=np.int16)
    with (
        patch.object(
            httpx.AsyncClient,
            "post",
            side_effect=httpx.ConnectError("Connection refused"),
        ),
        patch.object(
            engine, "_sync_transcribe", return_value=("Local fallback text", [], 0.9)
        ),
    ):
        text, words, conf = await engine.transcribe_samples(dummy_audio, language="vi")
        assert text == "Local fallback text"
