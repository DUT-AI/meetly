from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, status

from apps.api.deps.auth import CurrentUser
from modules.meetings.dtos.meeting_dtos import (
    CreateMeetingDTO,
    UpdateMeetingDTO,
)
from modules.meetings.use_cases.meeting_use_cases import MeetingUseCases

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/meetings", tags=["Meetings"])


@router.post("", status_code=status.HTTP_201_CREATED)
@inject
async def create_meeting(
    workspace_id: str,
    payload: CreateMeetingDTO,
    current_user: CurrentUser,
    use_cases: FromDishka[MeetingUseCases],
) -> dict:
    entity = await use_cases.create_meeting(
        workspace_id=workspace_id,
        title=payload.title,
        start_time=payload.start_time,
        end_time=payload.end_time,
        participants=payload.participants,
        report=payload.report,
        actor_id=str(current_user.id),
    )
    return {"data": entity}


@router.get("")
@inject
async def list_meetings(
    workspace_id: str,
    current_user: CurrentUser,
    use_cases: FromDishka[MeetingUseCases],
) -> dict:
    entities = await use_cases.list_meetings(workspace_id=workspace_id, actor_id=str(current_user.id))
    return {"data": {"documents": entities, "total": len(entities)}}


@router.patch("/{meeting_id}")
@inject
async def update_meeting(
    workspace_id: str,
    meeting_id: str,
    payload: UpdateMeetingDTO,
    current_user: CurrentUser,
    use_cases: FromDishka[MeetingUseCases],
) -> dict:
    entity = await use_cases.update_meeting(
        meeting_id=meeting_id,
        title=payload.title,
        start_time=payload.start_time,
        end_time=payload.end_time,
        participants=payload.participants,
        report=payload.report,
        actor_id=str(current_user.id),
    )
    return {"data": entity}


@router.delete("/{meeting_id}")
@inject
async def delete_meeting(
    workspace_id: str,
    meeting_id: str,
    current_user: CurrentUser,
    use_cases: FromDishka[MeetingUseCases],
) -> dict:
    await use_cases.delete_meeting(meeting_id=meeting_id, actor_id=str(current_user.id))
    return {"data": {"id": meeting_id}}
