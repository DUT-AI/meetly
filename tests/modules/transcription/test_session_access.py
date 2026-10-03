import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException

from modules.transcription.use_cases.session_use_cases import TranscriptionSessionUseCases
from modules.meetings.domain.entities import MeetingEntity
from modules.members.domain.entities import MemberEntity
from modules.members.domain.enums import MemberRole
from modules.transcription.domain.entities import TranscriptionSessionEntity
from modules.transcription.domain.enums import SessionStatus
from datetime import datetime, timezone


@pytest.fixture
def mock_deps():
    session_repo = AsyncMock()
    segment_repo = AsyncMock()
    meeting_repo = AsyncMock()
    member_repo = AsyncMock()
    storage_provider = AsyncMock()
    workspace_repo = AsyncMock()

    use_cases = TranscriptionSessionUseCases(
        session_repo=session_repo,
        segment_repo=segment_repo,
        meeting_repo=meeting_repo,
        member_repo=member_repo,
        storage_provider=storage_provider,
        workspace_repo=workspace_repo,
    )
    return use_cases, session_repo, meeting_repo, member_repo


@pytest.mark.asyncio
async def test_create_session_meeting_creator_auto_enrolled(mock_deps):
    use_cases, session_repo, meeting_repo, member_repo = mock_deps

    meeting = MeetingEntity(
        id="meet_123",
        workspace_id="ws_real",
        title="Test Meeting",
        created_by="user_creator",
        start_time=datetime.now(timezone.utc),
        end_time=datetime.now(timezone.utc),
        participants=[],
        report={},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    meeting_repo.get_by_id.return_value = meeting
    member_repo.get_member.return_value = None  # Creator not enrolled yet
    session_repo.get_active_session_by_meeting.return_value = None
    session_repo.create.return_value = TranscriptionSessionEntity(
        id="sess_123",
        meeting_id="meet_123",
        workspace_id="ws_real",
        created_by="user_creator",
        source_type="GOOGLE_MEET",
        sample_rate=16000,
        stt_model="whisper",
        status=SessionStatus.STREAMING,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    res = await use_cases.create_session(
        workspace_id="ws_wrong_or_old",
        meeting_id="meet_123",
        actor_id="user_creator",
    )

    assert res.session_id == "sess_123"
    assert res.workspace_id == "ws_real"
    # Verify creator was auto-enrolled to the real workspace
    member_repo.add_member.assert_called_once_with(
        workspace_id="ws_real",
        user_id="user_creator",
        role=MemberRole.ADMIN,
    )


@pytest.mark.asyncio
async def test_create_session_resolves_mismatched_workspace(mock_deps):
    use_cases, session_repo, meeting_repo, member_repo = mock_deps

    meeting = MeetingEntity(
        id="meet_456",
        workspace_id="ws_actual",
        title="Team Standup",
        created_by="someone_else",
        start_time=datetime.now(timezone.utc),
        end_time=datetime.now(timezone.utc),
        participants=[],
        report={},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    meeting_repo.get_by_id.return_value = meeting

    # User is member of ws_actual, but client sent ws_old
    async def fake_get_member(ws_id, u_id):
        if ws_id == "ws_actual" and u_id == "user_member":
            return MemberEntity(
                id="mem_1",
                workspace_id="ws_actual",
                user_id="user_member",
                role=MemberRole.MEMBER,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
        return None

    member_repo.get_member.side_effect = fake_get_member
    session_repo.get_active_session_by_meeting.return_value = None
    session_repo.create.return_value = TranscriptionSessionEntity(
        id="sess_456",
        meeting_id="meet_456",
        workspace_id="ws_actual",
        created_by="user_member",
        source_type="GOOGLE_MEET",
        sample_rate=16000,
        stt_model="whisper",
        status=SessionStatus.STREAMING,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    res = await use_cases.create_session(
        workspace_id="ws_old",
        meeting_id="meet_456",
        actor_id="user_member",
    )

    assert res.session_id == "sess_456"
    assert res.workspace_id == "ws_actual"


@pytest.mark.asyncio
async def test_create_session_unauthorized_user_throws_403(mock_deps):
    use_cases, session_repo, meeting_repo, member_repo = mock_deps

    meeting = MeetingEntity(
        id="meet_789",
        workspace_id="ws_private",
        title="Secret Meeting",
        created_by="owner",
        start_time=datetime.now(timezone.utc),
        end_time=datetime.now(timezone.utc),
        participants=[],
        report={},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    meeting_repo.get_by_id.return_value = meeting
    member_repo.get_member.return_value = None
    member_repo.list_by_user.return_value = []

    with pytest.raises(HTTPException) as exc_info:
        await use_cases.create_session(
            workspace_id="ws_private",
            meeting_id="meet_789",
            actor_id="stranger",
        )

    assert exc_info.value.status_code == 403
    assert "Bạn không có quyền truy cập workspace này" in exc_info.value.detail
