from typing import Any

from dishka.integrations.fastapi import FromDishka, inject
from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from pydantic import BaseModel, Field

from apps.api.deps.auth import CurrentUser
from modules.transcription.domain.interfaces import IVoiceProfileRepository
from modules.transcription.use_cases.offline_meeting_use_case import (
    OfflineMeetingUseCase,
)

router = APIRouter(tags=["Offline Meetings & Voicebank"])


class EnrollVoiceRequest(BaseModel):
    user_id: str = Field(..., description="User ID to enroll in voicebank")
    member_name: str = Field(..., description="Full display name of the member")
    sample_text: str | None = Field(
        None, description="Optional text spoken during the voice sample"
    )


class ConfirmSpeakersRequest(BaseModel):
    speaker_mappings: dict[str, str] = Field(
        ...,
        description="Mapping from unidentified speaker labels to member names, e.g. {'Speaker 1': 'Nguyễn Hoàng Minh'}",
    )


@router.post(
    "/api/v1/workspaces/{workspace_id}/meetings/{meeting_id}/offline-audio",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def process_offline_meeting_audio(
    workspace_id: str,
    meeting_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[OfflineMeetingUseCase],
    file: UploadFile = File(
        ..., description="Meeting recording audio file (WAV, MP3, M4A)"
    ),
) -> dict:
    """
    Ingests and processes an offline meeting recording:
    1. VAD & ASR (Faster-Whisper).
    2. Speaker Diarization & Voicebank Matching (Cosine distance).
    3. AI Task Extraction via Meetly Qwen2.5-3B (LoRA + GRPO).
    4. Auto-generates Meeting Summary and Action Items.
    """
    audio_bytes = await file.read()
    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File âm thanh rỗng.",
        )

    result = await use_case.process_offline_audio(
        workspace_id=workspace_id,
        meeting_id=meeting_id,
        audio_bytes=audio_bytes,
        filename=file.filename or "offline_meeting.wav",
        actor_id=str(current_user.id),
    )
    return {"data": result}


class SyncTasksRequest(BaseModel):
    action_items: list[dict[str, Any]] | None = Field(
        None, description="Optional custom action items list to sync"
    )


@router.post(
    "/api/v1/workspaces/{workspace_id}/meetings/{meeting_id}/sync-tasks",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def sync_meeting_tasks_endpoint(
    workspace_id: str,
    meeting_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[OfflineMeetingUseCase],
    payload: SyncTasksRequest | None = None,
) -> dict:
    """
    Syncs extracted action items from a meeting directly into the workspace's Department Tasks board.
    If action_items are not provided in the payload, extracts them from the stored meeting report.
    """
    action_items = payload.action_items if payload else None
    result = await use_case.sync_meeting_tasks_from_report(
        workspace_id=workspace_id,
        meeting_id=meeting_id,
        action_items=action_items,
        actor_id=str(current_user.id),
    )
    return {"data": result, "synced_count": len(result)}


@router.post(
    "/api/v1/workspaces/{workspace_id}/voicebank/enroll",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
@inject
async def enroll_member_voice(
    workspace_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[OfflineMeetingUseCase],
    file: UploadFile = File(..., description="Voice sample audio file (3-10 seconds)"),
    user_id: str | None = Query(None),
    member_name: str | None = Query(None),
    form_user_id: str | None = Form(None, alias="user_id"),
    form_member_name: str | None = Form(None, alias="member_name"),
) -> dict:
    """
    Enrolls a team member's acoustic signature into the Workspace Centroid Voicebank.
    Extracts 192-dim ECAPA-TDNN feature embedding and computes the running centroid.
    Supports user_id and member_name passed as query params or multipart/form-data.
    """
    target_user_id = form_user_id or user_id
    target_member_name = form_member_name or member_name
    if not target_user_id or not target_member_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Vui lòng cung cấp đầy đủ user_id và member_name.",
        )

    audio_bytes = await file.read()
    result = await use_case.enroll_member_voice(
        workspace_id=workspace_id,
        user_id=target_user_id,
        member_name=target_member_name,
        audio_samples=audio_bytes,
        actor_id=str(current_user.id),
    )
    return {"data": result}


@router.get(
    "/api/v1/workspaces/{workspace_id}/voicebank",
    response_model=dict,
)
@inject
async def list_workspace_voicebank(
    workspace_id: str,
    current_user: CurrentUser,
    voice_repo: FromDishka[IVoiceProfileRepository],
) -> dict:
    """
    Lists all enrolled member voice profiles in the workspace.
    """
    profiles = await voice_repo.list_by_workspace(workspace_id)
    return {
        "data": [
            {
                "id": p.id,
                "user_id": p.user_id,
                "member_name": p.member_name,
                "sample_count": p.sample_count,
                "vector_dimension": len(p.centroid_vector),
                "updated_at": p.updated_at.isoformat(),
            }
            for p in profiles
        ]
    }


@router.post(
    "/api/v1/workspaces/{workspace_id}/meetings/{meeting_id}/confirm-speakers",
    response_model=dict,
)
@inject
async def confirm_speakers(
    workspace_id: str,
    meeting_id: str,
    payload: ConfirmSpeakersRequest,
    current_user: CurrentUser,
    use_case: FromDishka[OfflineMeetingUseCase],
) -> dict:
    """
    Confirms or adjusts speaker assignments from the UI 'Who is speaking?' step.
    Propagates speaker labels to transcript segments and incrementally updates the Voicebank.
    """
    result = await use_case.confirm_speakers(
        workspace_id=workspace_id,
        meeting_id=meeting_id,
        speaker_mappings=payload.speaker_mappings,
        actor_id=str(current_user.id),
    )
    return {"data": result}
