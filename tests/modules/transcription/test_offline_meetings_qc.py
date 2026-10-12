import io
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from apps.api.deps.auth import get_current_user
from apps.api.main import app
from core.database.base import Base
from dishka import Provider, Scope, make_async_container
from modules.identity.domain.entities import AuthUser
from modules.members.domain.entities import MemberEntity
from modules.members.domain.enums import MemberRole
from modules.transcription.domain.interfaces import IVoiceProfileRepository
from modules.transcription.domain.voice_profile import VoiceProfileEntity
from modules.transcription.models.voice_profile import MemberVoiceProfileModel
from modules.transcription.repository.voice_profile_repository import (
    SqlVoiceProfileRepository,
)
from modules.transcription.use_cases.offline_meeting_use_case import (
    OfflineMeetingUseCase,
)


# ============================================================================
# 1. DATABASE & REPOSITORY TEST FIXTURES (SQLite In-Memory)
# ============================================================================
@pytest_asyncio.fixture
async def sqlite_session():
    """Provides an isolated SQLite in-memory session for testing SqlVoiceProfileRepository."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(
                sync_conn, tables=[MemberVoiceProfileModel.__table__]
            )
        )
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_repo_save_and_get(sqlite_session):
    """Verifies that a new voice profile can be saved and retrieved from DB."""
    repo = SqlVoiceProfileRepository(sqlite_session)
    vector = [0.1 * i for i in range(192)]

    profile = await repo.save(
        workspace_id="ws_01",
        user_id="user_alice",
        member_name="Alice Nguyen",
        centroid_vector=vector,
        sample_count=1,
    )

    assert profile.workspace_id == "ws_01"
    assert profile.user_id == "user_alice"
    assert profile.member_name == "Alice Nguyen"
    assert profile.sample_count == 1
    assert len(profile.centroid_vector) == 192

    fetched = await repo.get_by_user_id("ws_01", "user_alice")
    assert fetched is not None
    assert fetched.id == profile.id
    assert fetched.member_name == "Alice Nguyen"
    assert len(fetched.centroid_vector) == 192


@pytest.mark.asyncio
async def test_repo_save_updates_existing(sqlite_session):
    """Verifies that saving with the same workspace_id and user_id updates the existing profile."""
    repo = SqlVoiceProfileRepository(sqlite_session)
    v1 = [1.0] + [0.0] * 191
    v2 = [0.5] + [0.5] + [0.0] * 190

    p1 = await repo.save(
        workspace_id="ws_01",
        user_id="user_bob",
        member_name="Bob Tran",
        centroid_vector=v1,
        sample_count=1,
    )

    p2 = await repo.save(
        workspace_id="ws_01",
        user_id="user_bob",
        member_name="Bob Tran Updated",
        centroid_vector=v2,
        sample_count=2,
    )

    assert p2.id == p1.id
    assert p2.member_name == "Bob Tran Updated"
    assert p2.sample_count == 2

    # Verify only 1 profile exists
    all_profiles = await repo.list_by_workspace("ws_01")
    assert len(all_profiles) == 1
    assert all_profiles[0].member_name == "Bob Tran Updated"


@pytest.mark.asyncio
async def test_repo_list_by_workspace_ordering(sqlite_session):
    """Verifies that list_by_workspace sorts profiles by member_name ascending."""
    repo = SqlVoiceProfileRepository(sqlite_session)
    dummy_vec = [0.0] * 192

    await repo.save("ws_01", "u_z", "Zachary", dummy_vec)
    await repo.save("ws_01", "u_a", "Alice", dummy_vec)
    await repo.save("ws_01", "u_m", "Minh", dummy_vec)
    # Different workspace
    await repo.save("ws_other", "u_x", "Xavier", dummy_vec)

    profiles = await repo.list_by_workspace("ws_01")
    assert len(profiles) == 3
    names = [p.member_name for p in profiles]
    assert names == ["Alice", "Minh", "Zachary"]


@pytest.mark.asyncio
async def test_repo_delete(sqlite_session):
    """Verifies profile deletion."""
    repo = SqlVoiceProfileRepository(sqlite_session)
    p = await repo.save("ws_01", "u_1", "User 1", [0.0] * 192)

    deleted = await repo.delete(p.id)
    assert deleted is True

    # Deleting non-existent returns False
    deleted_again = await repo.delete("non_existent_id")
    assert deleted_again is False

    fetched = await repo.get_by_user_id("ws_01", "u_1")
    assert fetched is None


# ============================================================================
# 2. USE CASE UNIT TESTS
# ============================================================================
@pytest.fixture
def mock_use_case_deps():
    session_repo = AsyncMock()
    segment_repo = AsyncMock()
    voice_repo = AsyncMock()
    meeting_repo = AsyncMock()
    member_repo = AsyncMock()
    whisper_engine = MagicMock()
    task_extractor = MagicMock()

    use_case = OfflineMeetingUseCase(
        session_repo=session_repo,
        segment_repo=segment_repo,
        voice_repo=voice_repo,
        meeting_repo=meeting_repo,
        member_repo=member_repo,
        whisper_engine=whisper_engine,
        task_extractor=task_extractor,
    )
    return use_case, voice_repo, member_repo


@pytest.mark.asyncio
async def test_use_case_enroll_voice_new_profile(mock_use_case_deps):
    """Tests enrolling a brand new member voice profile via use case."""
    use_case, voice_repo, member_repo = mock_use_case_deps
    member_repo.get_member.return_value = MemberEntity(
        id="mem_1",
        workspace_id="ws_01",
        user_id="user_creator",
        role=MemberRole.ADMIN,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    voice_repo.get_by_user_id.return_value = None

    def fake_save(workspace_id, user_id, member_name, centroid_vector, sample_count):
        return VoiceProfileEntity(
            id="vp_new",
            workspace_id=workspace_id,
            user_id=user_id,
            member_name=member_name,
            centroid_vector=centroid_vector,
            sample_count=sample_count,
        )

    voice_repo.save.side_effect = fake_save

    # Dummy raw audio bytes (16000 16-bit PCM samples = 1 sec of silence)
    dummy_audio = b"\x00\x00" * 16000
    res = await use_case.enroll_member_voice(
        workspace_id="ws_01",
        user_id="user_target",
        member_name="Target Member",
        audio_samples=dummy_audio,
        actor_id="user_creator",
    )

    assert res["status"] == "success"
    assert res["user_id"] == "user_target"
    assert res["member_name"] == "Target Member"
    assert res["sample_count"] == 1
    assert res["vector_dimension"] == 192


@pytest.mark.asyncio
async def test_use_case_enroll_voice_forbidden_actor(mock_use_case_deps):
    """Tests that a non-member actor is rejected with 403 Forbidden."""
    from fastapi import HTTPException

    use_case, voice_repo, member_repo = mock_use_case_deps
    member_repo.get_member.return_value = None  # Not a member

    dummy_audio = b"\x00\x00" * 1600
    with pytest.raises(HTTPException) as exc_info:
        await use_case.enroll_member_voice(
            workspace_id="ws_foreign",
            user_id="user_target",
            member_name="Target Member",
            audio_samples=dummy_audio,
            actor_id="hacker_user",
        )
    assert exc_info.value.status_code == 403


# ============================================================================
# 3. FASTAPI ROUTER ENDPOINT INTEGRATION TESTS
# ============================================================================
@pytest.fixture
def auth_mock_user():
    return AuthUser(
        id=42,
        name="QC Tester",
        email="qc@meetly.ai",
        status="ACTIVE",
    )


def create_test_dishka_container(mock_use_case=None, mock_voice_repo=None):
    p = Provider()
    if mock_use_case is None:
        mock_use_case = AsyncMock(spec=OfflineMeetingUseCase)
    if mock_voice_repo is None:
        mock_voice_repo = AsyncMock(spec=IVoiceProfileRepository)

    p.provide(lambda: mock_use_case, scope=Scope.REQUEST, provides=OfflineMeetingUseCase)
    p.provide(lambda: mock_voice_repo, scope=Scope.REQUEST, provides=IVoiceProfileRepository)
    return make_async_container(p), mock_use_case, mock_voice_repo


@pytest.mark.asyncio
async def test_endpoint_enroll_voice_form_data_success(auth_mock_user):
    """Tests successful voice enrollment via multipart form-data."""
    app.dependency_overrides[get_current_user] = lambda: auth_mock_user

    mock_uc = AsyncMock(spec=OfflineMeetingUseCase)
    mock_uc.enroll_member_voice.return_value = {
        "status": "success",
        "user_id": "u_100",
        "member_name": "Nguyen QC",
        "sample_count": 1,
        "vector_dimension": 192,
    }
    container, _, _ = create_test_dishka_container(mock_use_case=mock_uc)
    old_container = app.state.dishka_container
    app.state.dishka_container = container

    try:
        dummy_wav = b"RIFF" + b"\x00" * 36 + b"data" + b"\x00" * 1600
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/v1/workspaces/ws_qc/voicebank/enroll",
                data={"user_id": "u_100", "member_name": "Nguyen QC"},
                files={"file": ("voice_sample.wav", dummy_wav, "audio/wav")},
            )
            assert resp.status_code == 201
            data = resp.json()
            assert data["data"]["status"] == "success"
            assert data["data"]["user_id"] == "u_100"
            assert data["data"]["sample_count"] == 1
            assert data["data"]["vector_dimension"] == 192

            mock_uc.enroll_member_voice.assert_called_once_with(
                workspace_id="ws_qc",
                user_id="u_100",
                member_name="Nguyen QC",
                audio_samples=dummy_wav,
                actor_id="42",
            )
    finally:
        app.state.dishka_container = old_container
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_endpoint_enroll_voice_query_params_fallback(auth_mock_user):
    """Tests that user_id and member_name can be supplied as query parameters."""
    app.dependency_overrides[get_current_user] = lambda: auth_mock_user

    mock_uc = AsyncMock(spec=OfflineMeetingUseCase)
    mock_uc.enroll_member_voice.return_value = {
        "status": "success",
        "user_id": "u_200",
        "member_name": "Minh Query",
        "sample_count": 1,
        "vector_dimension": 192,
    }
    container, _, _ = create_test_dishka_container(mock_use_case=mock_uc)
    old_container = app.state.dishka_container
    app.state.dishka_container = container

    try:
        dummy_wav = b"\x00" * 100
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/v1/workspaces/ws_qc/voicebank/enroll?user_id=u_200&member_name=Minh Query",
                files={"file": ("sample.wav", dummy_wav, "audio/wav")},
            )
            assert resp.status_code == 201
            assert resp.json()["data"]["user_id"] == "u_200"
    finally:
        app.state.dishka_container = old_container
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_endpoint_enroll_voice_missing_parameters_422(auth_mock_user):
    """Verifies that missing user_id or member_name returns 422 Unprocessable Entity."""
    app.dependency_overrides[get_current_user] = lambda: auth_mock_user
    container, _, _ = create_test_dishka_container()
    old_container = app.state.dishka_container
    app.state.dishka_container = container

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            # Missing user_id
            resp1 = await client.post(
                "/api/v1/workspaces/ws_qc/voicebank/enroll",
                data={"member_name": "Only Name"},
                files={"file": ("sample.wav", b"\x00" * 10, "audio/wav")},
            )
            assert resp1.status_code == 422
            assert "Vui lòng cung cấp đầy đủ user_id và member_name" in resp1.json()["detail"]

            # Missing member_name
            resp2 = await client.post(
                "/api/v1/workspaces/ws_qc/voicebank/enroll",
                data={"user_id": "only_id"},
                files={"file": ("sample.wav", b"\x00" * 10, "audio/wav")},
            )
            assert resp2.status_code == 422
            assert "Vui lòng cung cấp đầy đủ user_id và member_name" in resp2.json()["detail"]

            # Missing audio file
            resp3 = await client.post(
                "/api/v1/workspaces/ws_qc/voicebank/enroll",
                data={"user_id": "only_id", "member_name": "Name"},
            )
            assert resp3.status_code == 422
    finally:
        app.state.dishka_container = old_container
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_endpoint_list_voicebank(auth_mock_user):
    """Tests listing voicebank profiles in workspace."""
    app.dependency_overrides[get_current_user] = lambda: auth_mock_user

    mock_repo = AsyncMock(spec=IVoiceProfileRepository)
    now = datetime.now(UTC)
    mock_repo.list_by_workspace.return_value = [
        VoiceProfileEntity(
            id="vp_1",
            workspace_id="ws_qc",
            user_id="u_alice",
            member_name="Alice Nguyen",
            centroid_vector=[0.1] * 192,
            sample_count=3,
            created_at=now,
            updated_at=now,
        ),
        VoiceProfileEntity(
            id="vp_2",
            workspace_id="ws_qc",
            user_id="u_bob",
            member_name="Bob Tran",
            centroid_vector=[],
            sample_count=1,
            created_at=now,
            updated_at=now,
        ),
    ]

    container, _, _ = create_test_dishka_container(mock_voice_repo=mock_repo)
    old_container = app.state.dishka_container
    app.state.dishka_container = container

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/v1/workspaces/ws_qc/voicebank")
            assert resp.status_code == 200
            data = resp.json()["data"]
            assert len(data) == 2
            assert data[0]["member_name"] == "Alice Nguyen"
            assert data[0]["vector_dimension"] == 192
            assert data[0]["sample_count"] == 3
            assert data[1]["vector_dimension"] == 0
    finally:
        app.state.dishka_container = old_container
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_endpoint_confirm_speakers(auth_mock_user):
    """Tests confirm-speakers endpoint with valid payload."""
    app.dependency_overrides[get_current_user] = lambda: auth_mock_user

    mock_uc = AsyncMock(spec=OfflineMeetingUseCase)
    mock_uc.confirm_speakers.return_value = {
        "status": "success",
        "updated_segments": 4,
        "mappings": {"Speaker 1": "Alice", "Speaker 2": "Bob"},
    }

    container, _, _ = create_test_dishka_container(mock_use_case=mock_uc)
    old_container = app.state.dishka_container
    app.state.dishka_container = container

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/v1/workspaces/ws_qc/meetings/meet_999/confirm-speakers",
                json={"speaker_mappings": {"Speaker 1": "Alice", "Speaker 2": "Bob"}},
            )
            assert resp.status_code == 200
            res = resp.json()["data"]
            assert res["status"] == "success"
            assert res["updated_segments"] == 4
    finally:
        app.state.dishka_container = old_container
        app.dependency_overrides.clear()
