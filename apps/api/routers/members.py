from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Query

from apps.api.deps.auth import CurrentUser
from modules.members.dtos.member_dtos import UpdateMemberRoleDTO
from modules.members.use_cases import (
    ListMembersUseCase,
    RemoveMemberUseCase,
    UpdateMemberRoleUseCase,
)

router = APIRouter(prefix="/api/v1/members", tags=["Members"])


@router.get(
    "",
    summary="List members in a workspace",
)
@inject
async def list_members(
    current_user: CurrentUser,
    use_case: FromDishka[ListMembersUseCase],
    workspace_id: str | None = Query(
        None, alias="workspaceId", description="Workspace ID"
    ),
    workspace_id_snake: str | None = Query(
        None, alias="workspace_id", description="Workspace ID"
    ),
) -> dict:
    target_id = workspace_id or workspace_id_snake
    if not target_id:
        return {"data": {"documents": [], "total": 0}}
    members = await use_case.execute(
        workspace_id=target_id,
        current_user_id=str(current_user.id),
    )
    return {
        "data": {
            "documents": members,
            "total": len(members),
        }
    }


@router.patch(
    "/{member_id}",
    summary="Update member role",
)
@inject
async def update_member_role(
    member_id: str,
    payload: UpdateMemberRoleDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateMemberRoleUseCase],
) -> dict:
    updated = await use_case.execute(
        member_id=member_id,
        new_role=payload.role,
        current_user_id=str(current_user.id),
    )
    return {
        "data": {
            "id": updated.id,
            "workspace_id": updated.workspace_id,
        }
    }


@router.delete(
    "/{member_id}",
    summary="Remove a member from workspace",
)
@inject
async def remove_member(
    member_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[RemoveMemberUseCase],
) -> dict:
    await use_case.execute(
        member_id=member_id,
        current_user_id=str(current_user.id),
    )
    return {
        "data": {
            "id": member_id,
        }
    }
