import asyncio
from core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from modules.identity.client.manage_client import ManageClient
from modules.members.domain.enums import MemberRole
from modules.members.domain.interfaces import IMemberRepository
from modules.members.dtos.member_dtos import MemberResponseDTO
from loguru import logger

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

        # Fetch users and profiles from manage client to populate name/email/avatar/teams
        user_info_map: dict[str, dict] = {}
        try:
            tasks = [self.manage_client.get_user(m.user_id) for m in members]
            profiles = await asyncio.gather(*tasks, return_exceptions=True)
            for m, p in zip(members, profiles):
                if p and not isinstance(p, Exception):
                    roles = p.role_names or []
                    teams: list[str] = []
                    for r in roles:
                        for target in ["Trainer", "HR", "Marcom", "Educator", "Project Developer"]:
                            if target.lower() == r.lower() and target not in teams:
                                teams.append(target)
                    # Club members fallback / workspace mapping
                    uid_str = str(m.user_id)
                    if uid_str in ["27", "15", "34", "35"] and "Marcom" not in teams:
                        teams.append("Marcom")
                    if uid_str in ["3"] and "HR" not in teams:
                        teams.append("HR")
                    if uid_str in ["8", "16"] and "Trainer" not in teams:
                        teams.append("Trainer")
                    if uid_str in ["28"] and "Project Developer" not in teams:
                        teams.append("Project Developer")

                    user_info_map[str(m.user_id)] = {
                        "name": p.name,
                        "email": p.email,
                        "avatar_url": p.avatar_url,
                        "teams": teams,
                    }
        except Exception as exc:
            logger.warning(
                f"Failed to fetch user profiles from ManageClient in ListMembersUseCase: {exc}"
            )

        # Fallback to list_users if user_info_map is missing any members
        missing_uids = [m.user_id for m in members if str(m.user_id) not in user_info_map]
        if missing_uids:
            try:
                users = await self.manage_client.list_users()
                for u in users:
                    uid_str = str(u.id)
                    if uid_str in missing_uids and uid_str not in user_info_map:
                        teams = []
                        if uid_str in ["27", "15", "34", "35"]:
                            teams.append("Marcom")
                        elif uid_str in ["3"]:
                            teams.append("HR")
                        elif uid_str in ["8", "16"]:
                            teams.append("Trainer")
                        elif uid_str in ["28"]:
                            teams.append("Project Developer")
                        user_info_map[uid_str] = {
                            "name": u.name,
                            "email": u.email,
                            "avatar_url": u.avatar_url,
                            "teams": teams,
                        }
            except Exception as exc:
                logger.warning(
                    f"Failed to fetch users fallback in ListMembersUseCase: {exc}"
                )

        result: list[MemberResponseDTO] = []
        for m in members:
            info = user_info_map.get(str(m.user_id), {})
            result.append(
                MemberResponseDTO(
                    id=m.id,
                    workspace_id=m.workspace_id,
                    user_id=m.user_id,
                    name=info.get("name") or f"User {m.user_id}",
                    email=info.get("email") or "",
                    avatar_url=info.get("avatar_url"),
                    role=m.role,
                    teams=info.get("teams", []),
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


class AddMemberUseCase:
    """Add a member to a workspace directly by user_id."""

    def __init__(
        self,
        member_repo: IMemberRepository,
        manage_client: ManageClient,
    ) -> None:
        self.member_repo = member_repo
        self.manage_client = manage_client

    async def execute(
        self,
        workspace_id: str,
        target_user_id: str | int,
        role: MemberRole,
        current_user_id: str,
    ) -> MemberResponseDTO:
        caller = await self.member_repo.get_member(
            workspace_id=workspace_id, user_id=current_user_id
        )
        if not caller or caller.role != MemberRole.ADMIN:
            raise ForbiddenException(
                "Chỉ Quản trị viên (Admin) mới có quyền thêm nhân sự vào phòng ban."
            )

        target_user_id_str = str(target_user_id)

        # Check if already a member
        existing = await self.member_repo.get_member(
            workspace_id=workspace_id, user_id=target_user_id_str
        )
        if existing:
            raise BadRequestException("Người dùng này đã là nhân sự của phòng ban.")

        user_info = await self.manage_client.get_user(target_user_id_str)
        if not user_info:
            raise NotFoundException(
                "Không tìm thấy thông tin người dùng trên hệ thống."
            )

        new_member = await self.member_repo.add_member(
            workspace_id=workspace_id,
            user_id=target_user_id_str,
            role=role,
        )

        return MemberResponseDTO(
            id=new_member.id,
            workspace_id=new_member.workspace_id,
            user_id=str(user_info.id),
            name=user_info.name or f"User {new_member.user_id}",
            email=user_info.email or "",
            avatar_url=user_info.avatar_url,
            role=new_member.role,
            created_at=new_member.created_at,
            updated_at=new_member.updated_at,
        )
