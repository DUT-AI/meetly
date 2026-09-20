from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, status

from apps.api.deps.auth import CurrentUser
from modules.transcription.dtos.session_dtos import (
    CreateSessionRequest,
    DiarizeSessionRequest,
    DiarizeSessionResponse,
    MeetingTranscriptsResponse,
    SessionResponse,
    StopSessionRequest,
)
from modules.transcription.infrastructure.event_broadcaster import event_broadcaster
from modules.transcription.infrastructure.ticket_store import ticket_store
from modules.transcription.use_cases.diarization_use_cases import DiarizationUseCases
from modules.transcription.use_cases.session_use_cases import TranscriptionSessionUseCases
from modules.transcription.use_cases.stream_ingestion_use_case import StreamIngestionUseCase

router = APIRouter(tags=["Transcription"])


# ─── REST ENDPOINTS ──────────────────────────────────────────────────────────


@router.post(
    "/api/v1/workspaces/{workspace_id}/meetings/{meeting_id}/transcription-sessions",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
@inject
async def create_transcription_session(
    workspace_id: str,
    meeting_id: str,
    payload: CreateSessionRequest,
    current_user: CurrentUser,
    use_cases: FromDishka[TranscriptionSessionUseCases],
) -> dict:
    session = await use_cases.create_session(
        workspace_id=workspace_id,
        meeting_id=meeting_id,
        actor_id=str(current_user.id),
        source_type=payload.source_type,
        sample_rate=payload.sample_rate,
        stt_model=payload.stt_model,
    )
    return {"data": session.model_dump()}


@router.get(
    "/api/v1/workspaces/{workspace_id}/meetings/{meeting_id}/transcription-sessions/current",
    response_model=dict,
)
@inject
async def get_current_transcription_session(
    workspace_id: str,
    meeting_id: str,
    current_user: CurrentUser,
    use_cases: FromDishka[TranscriptionSessionUseCases],
) -> dict:
    session = await use_cases.get_current_session(
        workspace_id=workspace_id,
        meeting_id=meeting_id,
        actor_id=str(current_user.id),
    )
    return {"data": session.model_dump() if session else None}


@router.post(
    "/api/v1/transcription-sessions/{session_id}/stop",
    response_model=dict,
)
@inject
async def stop_transcription_session(
    session_id: str,
    payload: StopSessionRequest,
    current_user: CurrentUser,
    use_cases: FromDishka[TranscriptionSessionUseCases],
) -> dict:
    session = await use_cases.stop_session(
        session_id=session_id,
        total_samples=payload.total_samples,
        last_seq=payload.last_seq,
        recording_part_count=payload.recording_part_count,
        actor_id=str(current_user.id),
    )
    return {"data": session.model_dump()}


@router.get(
    "/api/v1/workspaces/{workspace_id}/meetings/{meeting_id}/transcripts",
    response_model=dict,
)
@inject
async def get_meeting_transcripts(
    workspace_id: str,
    meeting_id: str,
    current_user: CurrentUser,
    use_cases: FromDishka[TranscriptionSessionUseCases],
) -> dict:
    result = await use_cases.get_meeting_transcripts(
        workspace_id=workspace_id,
        meeting_id=meeting_id,
        actor_id=str(current_user.id),
    )
    return {"data": result.model_dump()}


@router.post(
    "/api/v1/transcription-sessions/{session_id}/diarize",
    response_model=dict,
)
@inject
async def diarize_transcription_session(
    session_id: str,
    payload: DiarizeSessionRequest,
    current_user: CurrentUser,
    use_cases: FromDishka[DiarizationUseCases],
) -> dict:
    """Execute offline speaker diarization and turn clustering on session audio."""
    result = await use_cases.run_session_diarization(
        session_id=session_id,
        expected_speakers=payload.expected_speakers,
        actor_id=str(current_user.id),
    )
    return {"data": result.model_dump()}


# ─── WEBSOCKET ENDPOINTS ─────────────────────────────────────────────────────



@router.websocket("/api/v1/transcription-sessions/{session_id}/audio")
@inject
async def ws_producer_audio(
    websocket: WebSocket,
    session_id: str,
    ticket: str = Query(...),
    use_case: FromDishka[StreamIngestionUseCase] = None,
) -> None:
    """Producer WebSocket: Receives binary PCM audio chunks from Chrome Extension."""
    # Verify short-lived one-time ticket
    ticket_data = ticket_store.consume_ticket(ticket)
    if not ticket_data or ticket_data["session_id"] != session_id or ticket_data["role"] != "producer":
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Ticket không hợp lệ hoặc đã hết hạn")
        return

    await use_case.handle_producer_stream(session_id=session_id, websocket=websocket)


@router.websocket("/api/v1/transcription-sessions/{session_id}/events")
async def ws_subscriber_events(
    websocket: WebSocket,
    session_id: str,
    ticket: str = Query(...),
) -> None:
    """Subscriber WebSocket: Streams real-time JSON transcript events to Web & Extension UI."""
    # Verify short-lived one-time ticket
    ticket_data = ticket_store.consume_ticket(ticket)
    if not ticket_data or ticket_data["session_id"] != session_id or ticket_data["role"] != "subscriber":
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Ticket không hợp lệ hoặc đã hết hạn")
        return

    await websocket.accept()
    await event_broadcaster.connect(session_id, websocket)

    try:
        # Keep connection open and send pings / listen for client close
        while True:
            # We don't expect messages from subscribers, but listen to detect disconnects
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        await event_broadcaster.disconnect(session_id, websocket)
