from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from modules.ai_engine.infrastructure.qwen_extractor import (
    QwenTaskExtractorService,
)
from modules.ai_engine.infrastructure.reward_verifiers import (
    RuleBasedRewardVerifier,
)
from modules.ai_engine.training.grpo_rl_trainer import GRPOTaskTrainer
from modules.meetings.domain.entities import MeetingEntity
from modules.members.domain.entities import MemberEntity
from modules.members.domain.enums import MemberRole
from modules.transcription.ai.voicebank_matcher import VoicebankMatcher
from modules.transcription.domain.entities import TranscriptionSessionEntity
from modules.transcription.domain.voice_profile import VoiceProfileEntity
from modules.transcription.use_cases.offline_meeting_use_case import (
    OfflineMeetingUseCase,
)


def test_voice_profile_cosine_similarity_and_centroid_update():
    """Tests Centroid Voicebank vector algebra: Cosine Similarity and Online Centroid Update."""
    # Member A vector (192-dim normalized)
    vec_a = [1.0] + [0.0] * 191
    profile = VoiceProfileEntity(
        id="vp_01",
        workspace_id="ws_01",
        user_id="user_minh",
        member_name="Nguyễn Hoàng Minh",
        centroid_vector=vec_a,
        sample_count=1,
    )

    # Identical vector -> Cosine similarity should be 1.0
    sim_identical = profile.compute_cosine_similarity(vec_a)
    assert abs(sim_identical - 1.0) < 1e-5

    # Orthogonal vector -> Cosine similarity should be 0.0
    vec_orthogonal = [0.0, 1.0] + [0.0] * 190
    sim_ortho = profile.compute_cosine_similarity(vec_orthogonal)
    assert abs(sim_ortho - 0.0) < 1e-5

    # Incremental Centroid Update
    profile.update_centroid(vec_orthogonal)
    assert profile.sample_count == 2
    # After update with orthogonal vector, components should be non-zero and norm == 1.0
    assert profile.centroid_vector[0] > 0
    assert profile.centroid_vector[1] > 0


def test_voicebank_matcher_matching():
    """Tests speaker identification against workspace voicebank profiles."""
    matcher = VoicebankMatcher()

    vec_minh = [1.0] + [0.0] * 191
    vec_phuoc = [0.0, 1.0] + [0.0] * 190

    profiles = [
        VoiceProfileEntity(
            id="vp_01",
            workspace_id="ws_01",
            user_id="u_minh",
            member_name="Nguyễn Hoàng Minh",
            centroid_vector=vec_minh,
        ),
        VoiceProfileEntity(
            id="vp_02",
            workspace_id="ws_01",
            user_id="u_phuoc",
            member_name="Đặng Quốc Phước",
            centroid_vector=vec_phuoc,
        ),
    ]

    # Query matching Minh
    query_minh = [0.95] + [0.05] * 191
    # normalize query
    norm = sum(x * x for x in query_minh) ** 0.5
    query_minh = [x / norm for x in query_minh]

    matched, score = matcher.match_speaker(query_minh, profiles, threshold=0.7)
    assert matched is not None
    assert matched.member_name == "Nguyễn Hoàng Minh"
    assert score > 0.8


def test_rule_based_reward_verifier_and_grpo():
    """Tests GRPO Advantage calculation and Rule-Based Reward Verifier."""
    verifier = RuleBasedRewardVerifier()
    trainer = GRPOTaskTrainer(group_size=3)

    transcript = (
        "[00:03:10] Nguyễn Hoàng Minh: Phước ơi, cập nhật API authentication rồi deploy lên staging trước thứ Sáu nhé.\n"
        "[00:03:25] Đặng Quốc Phước: Dạ vâng anh Minh, thứ Năm em hoàn thành."
    )

    bad_output = "Chắc là Phước sẽ làm API nha."
    good_output = '[{"task_title": "Cập nhật API authentication", "assignee": "Đặng Quốc Phước", "deadline": "Thứ Năm", "source_timestamp_ms": 190000}]'

    r_bad = verifier.compute_total_reward(bad_output, transcript)
    r_good = verifier.compute_total_reward(good_output, transcript)

    assert r_bad < 0.0  # Invalid JSON penalized
    assert r_good > 0.7  # Valid formatted grounded JSON rewarded

    result = trainer.step_grpo_iteration(transcript, [bad_output, good_output])
    assert result["best_candidate"] == good_output
    assert result["advantages"][1] > result["advantages"][0]


@pytest.mark.asyncio
async def test_offline_meeting_pipeline_flow():
    """Tests end-to-end Offline Meeting processing pipeline."""
    # Mock repositories
    session_repo = AsyncMock()
    session_repo.create.return_value = TranscriptionSessionEntity(
        id="sess_offline_01",
        meeting_id="meet_01",
        workspace_id="ws_01",
        status="PROCESSING",
        source_type="FILE_UPLOAD",
        sample_rate=16000,
        duration_samples=0,
        stt_model="faster-whisper",
        recording_asset_id=None,
        created_by="user_01",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    session_repo.update_status.return_value = None

    segment_repo = AsyncMock()
    segment_repo.upsert_segment.return_value = None

    voice_repo = AsyncMock()
    voice_repo.list_by_workspace.return_value = [
        VoiceProfileEntity(
            id="vp_01",
            workspace_id="ws_01",
            user_id="user_minh",
            member_name="Nguyễn Hoàng Minh",
            centroid_vector=[1.0] + [0.0] * 191,
        ),
        VoiceProfileEntity(
            id="vp_02",
            workspace_id="ws_01",
            user_id="user_phuoc",
            member_name="Đặng Quốc Phước",
            centroid_vector=[0.0, 1.0] + [0.0] * 190,
        ),
    ]

    meeting_repo = AsyncMock()
    meeting_repo.get_by_id.return_value = MeetingEntity(
        id="meet_01",
        workspace_id="ws_01",
        title="Offline Sprint Review",
        start_time=datetime.now(UTC),
        end_time=datetime.now(UTC),
        participants=["user_minh", "user_phuoc"],
        report={},
        created_by="user_01",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    meeting_repo.update.return_value = None

    member_repo = AsyncMock()
    member_repo.get_member.return_value = MemberEntity(
        id="mem_01",
        workspace_id="ws_01",
        user_id="user_01",
        role=MemberRole.ADMIN,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    whisper_engine = MagicMock()
    task_extractor = QwenTaskExtractorService()

    use_case = OfflineMeetingUseCase(
        session_repo=session_repo,
        segment_repo=segment_repo,
        voice_repo=voice_repo,
        meeting_repo=meeting_repo,
        member_repo=member_repo,
        whisper_engine=whisper_engine,
        task_extractor=task_extractor,
    )

    result = await use_case.process_offline_audio(
        workspace_id="ws_01",
        meeting_id="meet_01",
        audio_bytes=b"dummy_pcm16_offline_audio_data",
        filename="meeting_offline_room302.wav",
        actor_id="user_01",
    )

    assert result["status"] == "COMPLETED"
    assert result["segments_count"] == 2
    assert "Nguyễn Hoàng Minh" in result["speakers"]
    assert "Đặng Quốc Phước" in result["speakers"]
    assert len(result["extracted_tasks"]) >= 1
    # Check that task title and assignee are correctly structured
    first_task = result["extracted_tasks"][0]
    assert "task_title" in first_task
    assert "assignee" in first_task
    assert "deadline" in first_task
    assert "source_timestamp_ms" in first_task
