from dishka import FromDishka
from dishka.integrations.fastapi import inject
from fastapi import APIRouter, Depends

from apps.api.deps.auth import get_current_user_id
from modules.meetings.dtos.meeting_dtos import (
    CreateMeetingDTO,
    MeetingListResponseDTO,
    MeetingResponseDTO,
    UpdateMeetingDTO,
)
from modules.meetings.use_cases.meeting_use_cases import MeetingUseCases

router = APIRouter(prefix="/workspaces/{workspace_id}/meetings", tags=["meetings"])


@router.post("", response_model=MeetingResponseDTO)
@inject
async def create_meeting(
    workspace_id: str,
    dto: CreateMeetingDTO,
    use_cases: FromDishka[MeetingUseCases],
    user_id: str = Depends(get_current_user_id),
):
    """Tạo cuộc họp mới (Chỉ Admin)."""
    entity = await use_cases.create_meeting(
        workspace_id=workspace_id,
        title=dto.title,
        start_time=dto.start_time,
        end_time=dto.end_time,
        participants=dto.participants,
        report=dto.report,
        actor_id=user_id,
    )
    return entity


@router.get("", response_model=MeetingListResponseDTO)
@inject
async def list_meetings(
    workspace_id: str,
    use_cases: FromDishka[MeetingUseCases],
    user_id: str = Depends(get_current_user_id),
):
    """Lấy danh sách cuộc họp trong workspace."""
    entities = await use_cases.list_meetings(
        workspace_id=workspace_id, actor_id=user_id
    )
    return MeetingListResponseDTO(
        documents=[MeetingResponseDTO.model_validate(e) for e in entities],
        total=len(entities),
    )


@router.get("/{meeting_id}", response_model=MeetingResponseDTO)
@inject
async def get_meeting(
    workspace_id: str,
    meeting_id: str,
    use_cases: FromDishka[MeetingUseCases],
    user_id: str = Depends(get_current_user_id),
):
    """Lấy chi tiết 1 cuộc họp."""
    return await use_cases.get_meeting(meeting_id=meeting_id, actor_id=user_id)


@router.patch("/{meeting_id}", response_model=MeetingResponseDTO)
@router.put("/{meeting_id}", response_model=MeetingResponseDTO)
@inject
async def update_meeting(
    workspace_id: str,
    meeting_id: str,
    dto: UpdateMeetingDTO,
    use_cases: FromDishka[MeetingUseCases],
    user_id: str = Depends(get_current_user_id),
):
    """Cập nhật cuộc họp (Chỉ Admin)."""
    entity = await use_cases.update_meeting(
        meeting_id=meeting_id,
        title=dto.title,
        start_time=dto.start_time,
        end_time=dto.end_time,
        participants=dto.participants,
        report=dto.report,
        actor_id=user_id,
    )
    return entity


@router.delete("/{meeting_id}", status_code=204)
@inject
async def delete_meeting(
    workspace_id: str,
    meeting_id: str,
    use_cases: FromDishka[MeetingUseCases],
    user_id: str = Depends(get_current_user_id),
):
    """Xóa cuộc họp (Chỉ Admin)."""
    await use_cases.delete_meeting(meeting_id=meeting_id, actor_id=user_id)
