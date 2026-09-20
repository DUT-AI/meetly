from unittest.mock import AsyncMock, MagicMock
import numpy as np
import pytest

from modules.transcription.domain.entities import (
    TranscriptSegmentEntity,
    TranscriptionSessionEntity,
)
from modules.transcription.domain.interfaces import DiarizationTurn
from modules.transcription.infrastructure.speaker_diarizer import (
    DiarizationClusterer,
    SpeakerDiarizer,
    SpeakerEmbeddingExtractor,
    align_segments_with_diarization,
)
from modules.transcription.use_cases.diarization_use_cases import DiarizationUseCases


def test_embedding_extractor_dimension_and_norm():
    """Verify embedding extractor outputs 192-dim L2-normalized vector."""
    sr = 16000
    t = np.linspace(0, 1.0, sr, endpoint=False)
    audio = (0.5 * np.sin(2 * np.pi * 400 * t)).astype(np.float32)

    extractor = SpeakerEmbeddingExtractor(device="cpu")
    emb = extractor.extract_embedding(audio, sr=sr)

    assert isinstance(emb, np.ndarray)
    assert emb.shape == (192,)
    norm = float(np.linalg.norm(emb))
    assert abs(norm - 1.0) < 1e-3


def test_embedding_extractor_short_audio():
    """Verify audio under 10ms returns zero vector."""
    extractor = SpeakerEmbeddingExtractor(device="cpu")
    short_audio = np.zeros(50, dtype=np.float32)
    emb = extractor.extract_embedding(short_audio, sr=16000)

    assert emb.shape == (192,)
    assert np.all(emb == 0.0)


def test_clusterer_two_speakers():
    """Verify AHC clusters two distinct embedding clusters."""
    clusterer = DiarizationClusterer(distance_threshold=0.3)

    np.random.seed(42)
    v1 = np.zeros(192, dtype=np.float32)
    v1[:96] = 1.0
    v1 /= np.linalg.norm(v1)

    v2 = np.zeros(192, dtype=np.float32)
    v2[96:] = 1.0
    v2 /= np.linalg.norm(v2)

    embs = [v1 + np.random.normal(0, 0.02, 192).astype(np.float32) for _ in range(3)]
    embs += [v2 + np.random.normal(0, 0.02, 192).astype(np.float32) for _ in range(3)]

    labels = clusterer.cluster(embs, num_speakers=2)
    assert len(labels) == 6
    assert labels[0] == labels[1] == labels[2]
    assert labels[3] == labels[4] == labels[5]
    assert labels[0] != labels[3]


def test_align_segments_with_diarization():
    """Verify segment timestamps align accurately with diarized turns."""
    turns = [
        DiarizationTurn(turn_id=0, start_ms=0, end_ms=4000, speaker="Speaker 1"),
        DiarizationTurn(turn_id=1, start_ms=4500, end_ms=9000, speaker="Speaker 2"),
    ]

    segments = [
        {"id": "seg_1", "start_ms": 500, "end_ms": 3000},
        {"id": "seg_2", "start_ms": 5000, "end_ms": 8000},
    ]

    updates = align_segments_with_diarization(segments, turns)
    assert len(updates) == 2
    assert updates[0] == ("seg_1", "Speaker 1")
    assert updates[1] == ("seg_2", "Speaker 2")


def test_speaker_diarizer_pipeline():
    """Verify end-to-end diarizer processes audio array and returns turns."""
    sr = 16000
    dur = 2.0
    t = np.linspace(0, dur, int(sr * dur), endpoint=False)
    audio = (0.6 * np.sin(2 * np.pi * 300 * t)).astype(np.float32)

    diarizer = SpeakerDiarizer(device="cpu")
    diarizer.enroll_voice_profile("Alice", np.ones(192, dtype=np.float32) / np.sqrt(192))

    turns = diarizer.diarize(audio, sample_rate=sr)
    assert len(turns) >= 1
    assert hasattr(turns[0], "speaker")
    assert turns[0].start_ms >= 0


@pytest.mark.asyncio
async def test_diarization_use_cases():
    """Verify DiarizationUseCases coordinates session, segment updates, and broadcaster."""
    session_repo = AsyncMock()
    segment_repo = AsyncMock()
    diarizer = MagicMock()

    session_repo.get_by_id.return_value = TranscriptionSessionEntity(
        id="sess_123",
        meeting_id="meet_456",
        workspace_id="ws_789",
        status="RECORDED",
        source_type="GOOGLE_MEET",
        sample_rate=16000,
        duration_samples=32000,
        stt_model="openai/whisper-small",
        recording_asset_id=None,
        created_by="user_1",
    )

    segment_repo.list_by_session.return_value = [
        TranscriptSegmentEntity(
            id="seg_01",
            session_id="sess_123",
            utterance_id="utt_1",
            revision=1,
            start_ms=0,
            end_ms=2000,
            text="Hello world",
            words=[],
            speaker_label="REMOTE_SPEAKER",
            confidence=0.95,
            is_final=True,
        )
    ]

    diarizer.diarize.return_value = [
        DiarizationTurn(turn_id=0, start_ms=0, end_ms=2000, speaker="Speaker 1")
    ]

    use_cases = DiarizationUseCases(
        session_repo=session_repo,
        segment_repo=segment_repo,
        diarizer=diarizer,
    )

    response = await use_cases.run_session_diarization(session_id="sess_123")
    assert response.session_id == "sess_123"
    assert response.speaker_count == 1
    assert response.speakers == ["Speaker 1"]
    assert response.updated_segment_count == 1

    segment_repo.batch_update_speaker_labels.assert_called_once_with([("seg_01", "Speaker 1")])
