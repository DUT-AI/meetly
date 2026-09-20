import time
import pytest

from modules.transcription.domain.entities import (
    TranscriptionSessionEntity,
    TranscriptSegmentEntity,
)
from modules.transcription.domain.enums import SessionStatus, SourceType, SpeakerLabel
from modules.transcription.infrastructure.ticket_store import TicketStore
from modules.transcription.models.segment import TranscriptSegmentModel
from modules.transcription.models.session import TranscriptionSessionModel


def test_timestamp_math_rule():
    """Verify timestamp is calculated strictly from sample clock."""
    sample_rate = 16000
    start_sample = 32000  # 2.0 seconds into the recording
    start_ms = int(start_sample * 1000 / sample_rate)
    assert start_ms == 2000

    # Test 100ms frame sample conversion
    chunk_100ms_samples = 1600
    duration_ms = int(chunk_100ms_samples * 1000 / sample_rate)
    assert duration_ms == 100


def test_ticket_store_lifecycle():
    """Verify short-lived, one-time tickets for WebSocket auth."""
    store = TicketStore()

    # 1. Create producer and subscriber tickets
    prod_ticket = store.create_ticket("session_123", "user_abc", role="producer", ttl_seconds=60)
    sub_ticket = store.create_ticket("session_123", "user_xyz", role="subscriber", ttl_seconds=60)

    assert prod_ticket.startswith("tkt_prod_")
    assert sub_ticket.startswith("tkt_sub_")

    # 2. Consume ticket successfully
    payload = store.consume_ticket(prod_ticket)
    assert payload is not None
    assert payload["session_id"] == "session_123"
    assert payload["user_id"] == "user_abc"
    assert payload["role"] == "producer"

    # 3. Second consume fails (one-time use guarantee)
    assert store.consume_ticket(prod_ticket) is None

    # 4. Expired ticket fails
    expired_ticket = store.create_ticket("session_123", "user_abc", role="producer", ttl_seconds=0)
    time.sleep(0.01)
    assert store.consume_ticket(expired_ticket) is None


def test_session_model_to_entity():
    """Verify TranscriptionSessionModel maps cleanly to TranscriptionSessionEntity."""
    model = TranscriptionSessionModel(
        id="01J8YTESTSESSION1234567890",
        meeting_id="01J8YMEETING12345678901234",
        workspace_id="01J8YWORKSPACE123456789012",
        status=SessionStatus.CREATED.value,
        source_type=SourceType.GOOGLE_MEET.value,
        sample_rate=16000,
        duration_samples=0,
        stt_model="openai/whisper-small",
        recording_asset_id=None,
        created_by="user_123",
    )
    entity = model.to_entity()
    assert isinstance(entity, TranscriptionSessionEntity)
    assert entity.id == "01J8YTESTSESSION1234567890"
    assert entity.sample_rate == 16000
    assert entity.status == "CREATED"


def test_segment_model_to_entity():
    """Verify TranscriptSegmentModel maps cleanly to TranscriptSegmentEntity."""
    model = TranscriptSegmentModel(
        id="01J8YTESTSEGMENT1234567890",
        session_id="01J8YTESTSESSION1234567890",
        utterance_id="utt_001",
        revision=2,
        start_ms=1500,
        end_ms=4200,
        text="Xin chào tất cả mọi người",
        words=[{"word": "Xin", "start_ms": 1500, "end_ms": 1800, "score": 0.99}],
        speaker_label=SpeakerLabel.LOCAL_USER.value,
        confidence=0.98,
        is_final=True,
    )
    entity = model.to_entity()
    assert isinstance(entity, TranscriptSegmentEntity)
    assert entity.utterance_id == "utt_001"
    assert entity.start_ms == 1500
    assert entity.end_ms == 4200
    assert len(entity.words) == 1
    assert entity.is_final is True
