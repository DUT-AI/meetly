from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, File, Form, UploadFile, status

from apps.api.deps.auth import CurrentUser
from modules.workspaces.dtos.label_dtos import (
    WorkspaceLabelCreateDTO,
    WorkspaceLabelUpdateDTO,
)
from modules.workspaces.dtos.workspace_dtos import (
    WorkspaceJoinDTO,
)
from modules.workspaces.use_cases import (
    CreateWorkspaceLabelUseCase,
    CreateWorkspaceUseCase,
    DeleteWorkspaceLabelUseCase,
    DeleteWorkspaceUseCase,
    GetWorkspaceAnalyticsUseCase,
    GetWorkspaceInfoUseCase,
    GetWorkspaceUseCase,
    JoinWorkspaceUseCase,
    ListUserWorkspacesUseCase,
    ListWorkspaceLabelsUseCase,
    ResetInviteCodeUseCase,
    UpdateWorkspaceLabelUseCase,
    UpdateWorkspaceUseCase,
)

router = APIRouter(prefix="/api/v1/workspaces", tags=["Workspaces"])


@router.get(
    "",
    summary="List all workspaces for current user",
)
@inject
async def list_workspaces(
    current_user: CurrentUser,
    use_case: FromDishka[ListUserWorkspacesUseCase],
) -> dict:
    result = await use_case.execute(str(current_user.id))
    return {"data": result}


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workspace",
)
@inject
async def create_workspace(
    current_user: CurrentUser,
    use_case: FromDishka[CreateWorkspaceUseCase],
    name: str = Form(...),
    image: UploadFile | None = File(None),
) -> dict:
    image_data = image.file if image else None
    image_filename = image.filename if image else None
    content_type = image.content_type if image else None

    result = await use_case.execute(
        name=name,
        user_id=str(current_user.id),
        image_data=image_data,
        image_filename=image_filename,
        content_type=content_type,
    )
    return {"data": result}


@router.get(
    "/{workspace_id}",
    summary="Get single workspace details",
)
@inject
async def get_workspace(
    workspace_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetWorkspaceUseCase],
) -> dict:
    result = await use_case.execute(
        workspace_id=workspace_id,
        user_id=str(current_user.id),
    )
    return {"data": result}


@router.get(
    "/{workspace_id}/info",
    summary="Get public workspace info",
)
@inject
async def get_workspace_info(
    workspace_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetWorkspaceInfoUseCase],
) -> dict:
    result = await use_case.execute(workspace_id=workspace_id)
    return {"data": result}


@router.patch(
    "/{workspace_id}",
    summary="Update workspace",
)
@inject
async def update_workspace(
    workspace_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateWorkspaceUseCase],
    name: str | None = Form(None),
    note: str | None = Form(None),
    discord_room_id: str | None = Form(None),
    notify_on_task_status_change: bool | None = Form(None),
    notify_task_status_discord: bool | None = Form(None),
    notify_task_status_zalo: bool | None = Form(None),
    zalo_room_id: str | None = Form(None),
    image: UploadFile | None = File(None),
    remove_image: bool = Form(False),
) -> dict:
    image_data = image.file if image else None
    image_filename = image.filename if image else None
    content_type = image.content_type if image else None

    result = await use_case.execute(
        workspace_id=workspace_id,
        user_id=str(current_user.id),
        name=name,
        note=note,
        discord_room_id=discord_room_id,
        notify_on_task_status_change=notify_on_task_status_change,
        notify_task_status_discord=notify_task_status_discord,
        notify_task_status_zalo=notify_task_status_zalo,
        zalo_room_id=zalo_room_id,
        image_data=image_data,
        image_filename=image_filename,
        content_type=content_type,
        remove_image=remove_image,
    )
    return {"data": result}


@router.delete(
    "/{workspace_id}",
    summary="Delete workspace",
)
@inject
async def delete_workspace(
    workspace_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[DeleteWorkspaceUseCase],
) -> dict:
    await use_case.execute(
        workspace_id=workspace_id,
        user_id=str(current_user.id),
    )
    return {"data": {"id": workspace_id}}


@router.post(
    "/{workspace_id}/reset-invite-code",
    summary="Reset workspace invite code",
)
@inject
async def reset_invite_code(
    workspace_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ResetInviteCodeUseCase],
) -> dict:
    result = await use_case.execute(
        workspace_id=workspace_id,
        user_id=str(current_user.id),
    )
    return {"data": result}


@router.post(
    "/{workspace_id}/join",
    summary="Join workspace via invite code",
)
@inject
async def join_workspace(
    workspace_id: str,
    payload: WorkspaceJoinDTO,
    current_user: CurrentUser,
    use_case: FromDishka[JoinWorkspaceUseCase],
) -> dict:
    result = await use_case.execute(
        workspace_id=workspace_id,
        code=payload.code,
        user_id=str(current_user.id),
    )
    return {"data": result}


@router.get(
    "/{workspace_id}/analytics",
    summary="Get workspace analytics",
)
@inject
async def get_workspace_analytics(
    workspace_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetWorkspaceAnalyticsUseCase],
) -> dict:
    result = await use_case.execute(
        workspace_id=workspace_id,
        user_id=str(current_user.id),
    )
    return {"data": result}


# --- Workspace Labels Endpoints ---


@router.get(
    "/{workspace_id}/labels",
    summary="List workspace labels",
)
@inject
async def list_workspace_labels(
    workspace_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListWorkspaceLabelsUseCase],
) -> dict:
    result = await use_case.execute(
        workspace_id=workspace_id,
        user_id=str(current_user.id),
    )
    return {"data": result}


@router.post(
    "/{workspace_id}/labels",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workspace label",
)
@inject
async def create_workspace_label(
    workspace_id: str,
    payload: WorkspaceLabelCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateWorkspaceLabelUseCase],
) -> dict:
    result = await use_case.execute(
        workspace_id=workspace_id,
        user_id=str(current_user.id),
        name=payload.name,
        color=payload.color,
    )
    return {"data": result}


@router.patch(
    "/{workspace_id}/labels/{label_id}",
    summary="Update a workspace label",
)
@inject
async def update_workspace_label(
    workspace_id: str,
    label_id: str,
    payload: WorkspaceLabelUpdateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateWorkspaceLabelUseCase],
) -> dict:
    result = await use_case.execute(
        workspace_id=workspace_id,
        label_id=label_id,
        user_id=str(current_user.id),
        name=payload.name,
        color=payload.color,
    )
    return {"data": result}


@router.delete(
    "/{workspace_id}/labels/{label_id}",
    summary="Delete a workspace label",
)
@inject
async def delete_workspace_label(
    workspace_id: str,
    label_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[DeleteWorkspaceLabelUseCase],
) -> dict:
    await use_case.execute(
        workspace_id=workspace_id,
        label_id=label_id,
        user_id=str(current_user.id),
    )
    return {"data": {"id": label_id}}
