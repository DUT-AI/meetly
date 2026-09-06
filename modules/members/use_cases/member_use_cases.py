from core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from modules.identity.client.manage_client import ManageClient
from modules.members.domain.enums import MemberRole
from modules.members.domain.interfaces import IMemberRepository
from modules.members.dtos.member_dtos import MemberResponseDTO


class ListMembersUseCase:
    """List all members of a workspace populated with user profile."""

    def __init__(
        self, member_repo: IMemberRepository, manage_client: ManageClient
    ) -> None:
        self.member_repo = member_repo
        self.manage_client = manage_client

    async def execute(
        self, workspace_id: str, current_user_id: str
    ) -> list[MemberResponseDTO]:
        caller = await self.member_repo.get_member(
            workspace_id=workspace_id, user_id=current_user_id
        )
        if not caller:
            raise ForbiddenException("You are not a member of this workspace.")

        members = await self.member_repo.list_by_workspace(workspace_id)
        if not members:
            return []

        # Fetch users from manage client to populate name/email
        user_info_map: dict[str, dict[str, str | None]] = {}
        try:
            manage_resp = await self.manage_client.list_users(page=1, page_size=200)
            for u in manage_resp.items:
                user_info_map[str(u.id)] = {
                    "name": u.name,
                    "email": u.email,
                    "avatar_url": u.avatar_url,
                }
        except Exception as exc:
            from loguru import logger

            logger.warning(
                f"Failed to fetch users from ManageClient in ListMembersUseCase: {exc}"
            )

        result: list[MemberResponseDTO] = []
        for m in members:
            info = user_info_map.get(m.user_id, {})
            result.append(
                MemberResponseDTO(
                    id=m.id,
                    workspace_id=m.workspace_id,
                    user_id=m.user_id,
                    name=info.get("name") or f"User {m.user_id}",
                    email=info.get("email") or "",
                    avatar_url=info.get("avatar_url"),
                    role=m.role,
                    created_at=m.created_at,
                    updated_at=m.updated_at,
                )
            )
        return result


class UpdateMemberRoleUseCase:
    """Update role of a member in workspace."""

    def __init__(self, member_repo: IMemberRepository) -> None:
        self.member_repo = member_repo

    async def execute(
        self, member_id: str, new_role: MemberRole, current_user_id: str
    ) -> MemberResponseDTO:
        target = await self.member_repo.get_by_id(member_id)
        if not target:
            raise NotFoundException("Member not found.")

        total_members = await self.member_repo.count_by_workspace(target.workspace_id)
        if total_members <= 1:
            raise BadRequestException(
                "Cannot downgrade the only member in the workspace."
            )

        caller = await self.member_repo.get_member(
            workspace_id=target.workspace_id, user_id=current_user_id
        )
        if not caller or caller.role != MemberRole.ADMIN:
            raise ForbiddenException("Admin permissions required.")

        updated = await self.member_repo.update_role(member_id, new_role)
        return MemberResponseDTO(
            id=updated.id,
            workspace_id=updated.workspace_id,
            user_id=updated.user_id,
            role=updated.role,
            created_at=updated.created_at,
            updated_at=updated.updated_at,
        )


class RemoveMemberUseCase:
    """Remove a member from a workspace."""

    def __init__(self, member_repo: IMemberRepository) -> None:
        self.member_repo = member_repo

    async def execute(self, member_id: str, current_user_id: str) -> None:
        target = await self.member_repo.get_by_id(member_id)
        if not target:
            raise NotFoundException("Member not found.")

        total_members = await self.member_repo.count_by_workspace(target.workspace_id)
        if total_members <= 1:
            raise BadRequestException("Cannot remove the only member in the workspace.")

        caller = await self.member_repo.get_member(
            workspace_id=target.workspace_id, user_id=current_user_id
        )
        if not caller:
            raise ForbiddenException("You are not a member of this workspace.")

        is_self = caller.id == target.id or caller.user_id == target.user_id
        is_admin = caller.role == MemberRole.ADMIN

        if not is_self and not is_admin:
            raise ForbiddenException("Admin permissions required.")

        await self.member_repo.delete(member_id)
