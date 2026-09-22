from typing import BinaryIO

from core.config import s3_settings
from core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from core.storage.interface import IStorageProvider
from core.storage.url_builder import parse_storage_uri
from core.utils.task_analytics import (
    compute_task_analytics,
    generate_invite_code,
)
from modules.identity.client.manage_client import ManageClient
from modules.members.domain.enums import MemberRole
from modules.members.domain.interfaces import IMemberRepository
from modules.notifications.dispatcher import NotificationDispatcher
from modules.notifications.domain.entities import NotificationMessage
from modules.tasks.domain.interfaces import ITaskRepository
from modules.workspaces.domain.interfaces import IWorkspaceRepository
from modules.workspaces.dtos.workspace_dtos import (
    WorkspaceAnalyticsDTO,
    WorkspaceInfoResponseDTO,
    WorkspaceListResponseDTO,
    WorkspaceResponseDTO,
)


class CreateWorkspaceUseCase:
    """Create a new workspace and add creator as ADMIN."""

    def __init__(
        self,
        workspace_repo: IWorkspaceRepository,
        member_repo: IMemberRepository,
        storage_provider: IStorageProvider,
    ) -> None:
        self.workspace_repo = workspace_repo
        self.member_repo = member_repo
        self.storage_provider = storage_provider

    async def execute(
        self,
        name: str,
        user_id: str,
        image_data: BinaryIO | None = None,
        image_filename: str | None = None,
        content_type: str | None = None,
    ) -> WorkspaceResponseDTO:
        image_url: str | None = None
        if image_data and image_filename:
            file_ext = image_filename.split(".")[-1] if "." in image_filename else "png"
            key = f"workspaces/{generate_invite_code(12)}.{file_ext}"
            image_url = await self.storage_provider.upload(
                bucket=s3_settings.default_bucket,
                key=key,
                data=image_data,
                content_type=content_type or "image/png",
            )
            image_url = self.storage_provider.build_public_url(image_url)

        invite_code = generate_invite_code(6)
        ws = await self.workspace_repo.create(
            name=name,
            owner_id=user_id,
            invite_code=invite_code,
            image_url=image_url,
        )

        # Automatically add creator as ADMIN
        await self.member_repo.add_member(
            workspace_id=ws.id,
            user_id=user_id,
            role=MemberRole.ADMIN,
        )

        return WorkspaceResponseDTO.from_entity(ws)


class ListUserWorkspacesUseCase:
    """List all workspaces where current user is a member."""

    def __init__(
        self,
        workspace_repo: IWorkspaceRepository,
        member_repo: IMemberRepository,
    ) -> None:
        self.workspace_repo = workspace_repo
        self.member_repo = member_repo

    async def execute(self, user_id: str) -> WorkspaceListResponseDTO:
        memberships = await self.member_repo.list_by_user(user_id)
        if not memberships:
            return WorkspaceListResponseDTO(documents=[], total=0)

        workspace_ids = [m.workspace_id for m in memberships]
        workspaces = await self.workspace_repo.get_by_ids(workspace_ids)

        documents = [WorkspaceResponseDTO.from_entity(ws) for ws in workspaces]
        return WorkspaceListResponseDTO(documents=documents, total=len(documents))


class GetWorkspaceUseCase:
    """Get single workspace by ID."""

    def __init__(
        self,
        workspace_repo: IWorkspaceRepository,
        member_repo: IMemberRepository,
    ) -> None:
        self.workspace_repo = workspace_repo
        self.member_repo = member_repo

    async def execute(self, workspace_id: str, user_id: str) -> WorkspaceResponseDTO:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        ws = await self.workspace_repo.get_by_id(workspace_id)
        if not ws:
            raise NotFoundException("Workspace not found.")

        return WorkspaceResponseDTO.from_entity(ws)


class GetWorkspaceInfoUseCase:
    """Get public summary of workspace for invite link."""

    def __init__(self, workspace_repo: IWorkspaceRepository) -> None:
        self.workspace_repo = workspace_repo

    async def execute(self, workspace_id: str) -> WorkspaceInfoResponseDTO:
        ws = await self.workspace_repo.get_by_id(workspace_id)
        if not ws:
            raise NotFoundException("Workspace not found.")
        return WorkspaceInfoResponseDTO(id=ws.id, name=ws.name, image_url=ws.image_url)


class UpdateWorkspaceUseCase:
    """Update workspace name, note, image, or discord_room_id (ADMIN only)."""

    def __init__(
        self,
        workspace_repo: IWorkspaceRepository,
        member_repo: IMemberRepository,
        storage_provider: IStorageProvider,
    ) -> None:
        self.workspace_repo = workspace_repo
        self.member_repo = member_repo
        self.storage_provider = storage_provider

    async def execute(
        self,
        workspace_id: str,
        user_id: str,
        name: str | None = None,
        note: str | None = None,
        discord_room_id: str | None = None,
        notify_on_task_status_change: bool | None = None,
        notify_task_status_discord: bool | None = None,
        notify_task_status_zalo: bool | None = None,
        zalo_room_id: str | None = None,
        image_data: BinaryIO | None = None,
        image_filename: str | None = None,
        content_type: str | None = None,
        remove_image: bool = False,
    ) -> WorkspaceResponseDTO:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member or member.role != MemberRole.ADMIN:
            raise ForbiddenException("Unauthorized.")

        ws = await self.workspace_repo.get_by_id(workspace_id)
        if not ws:
            raise NotFoundException("Workspace not found.")

        new_image_url: str | None = None
        clear_image: bool = False

        if remove_image:
            clear_image = True
            if ws.image_url:
                try:
                    bucket, old_key = parse_storage_uri(
                        ws.image_url, s3_settings.default_bucket
                    )
                    await self.storage_provider.delete(bucket, old_key)
                except Exception:
                    pass
        elif image_data and image_filename:
            file_ext = image_filename.split(".")[-1] if "." in image_filename else "png"
            key = f"workspaces/{generate_invite_code(12)}.{file_ext}"
            new_image_url = await self.storage_provider.upload(
                bucket=s3_settings.default_bucket,
                key=key,
                data=image_data,
                content_type=content_type or "image/png",
            )
            new_image_url = self.storage_provider.build_public_url(new_image_url)

            # Delete old image if existed
            if ws.image_url:
                try:
                    bucket, old_key = parse_storage_uri(
                        ws.image_url, s3_settings.default_bucket
                    )
                    await self.storage_provider.delete(bucket, old_key)
                except Exception:
                    pass

        updated = await self.workspace_repo.update(
            workspace_id=workspace_id,
            name=name,
            note=note,
            discord_room_id=discord_room_id,
            notify_on_task_status_change=notify_on_task_status_change,
            notify_task_status_discord=notify_task_status_discord,
            notify_task_status_zalo=notify_task_status_zalo,
            zalo_room_id=zalo_room_id,
            image_url=new_image_url,
            clear_image=clear_image,
        )
        return WorkspaceResponseDTO.from_entity(updated)


class DeleteWorkspaceUseCase:
    """Delete workspace (ADMIN only)."""

    def __init__(
        self,
        workspace_repo: IWorkspaceRepository,
        member_repo: IMemberRepository,
        storage_provider: IStorageProvider,
    ) -> None:
        self.workspace_repo = workspace_repo
        self.member_repo = member_repo
        self.storage_provider = storage_provider

    async def execute(self, workspace_id: str, user_id: str) -> None:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member or member.role != MemberRole.ADMIN:
            raise ForbiddenException("Unauthorized.")

        ws = await self.workspace_repo.get_by_id(workspace_id)
        if not ws:
            raise NotFoundException("Workspace not found.")

        if ws.image_url:
            try:
                bucket, key = parse_storage_uri(
                    ws.image_url, s3_settings.default_bucket
                )
                await self.storage_provider.delete(bucket, key)
            except Exception:
                pass

        await self.workspace_repo.delete(workspace_id)


class ResetInviteCodeUseCase:
    """Generate a new invite code for workspace (ADMIN only)."""

    def __init__(
        self,
        workspace_repo: IWorkspaceRepository,
        member_repo: IMemberRepository,
    ) -> None:
        self.workspace_repo = workspace_repo
        self.member_repo = member_repo

    async def execute(self, workspace_id: str, user_id: str) -> WorkspaceResponseDTO:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member or member.role != MemberRole.ADMIN:
            raise ForbiddenException("Unauthorized.")

        new_code = generate_invite_code(6)
        updated = await self.workspace_repo.update(
            workspace_id=workspace_id, invite_code=new_code
        )
        return WorkspaceResponseDTO.from_entity(updated)


class JoinWorkspaceUseCase:
    """Join workspace using invite code."""

    def __init__(
        self,
        workspace_repo: IWorkspaceRepository,
        member_repo: IMemberRepository,
        manage_client: ManageClient,
        notification_dispatcher: NotificationDispatcher,
    ) -> None:
        self.workspace_repo = workspace_repo
        self.member_repo = member_repo
        self.manage_client = manage_client
        self.notification_dispatcher = notification_dispatcher

    async def execute(
        self, workspace_id: str, code: str, user_id: str
    ) -> WorkspaceResponseDTO:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if member:
            raise BadRequestException("Already a member.")

        ws = await self.workspace_repo.get_by_id(workspace_id)
        if not ws:
            raise NotFoundException("Workspace not found.")

        if ws.invite_code != code:
            raise BadRequestException("Invalid invite code.")

        await self.member_repo.add_member(
            workspace_id=workspace_id, user_id=user_id, role=MemberRole.MEMBER
        )

        # Notify workspace owner & admins
        try:
            joiner = await self.manage_client.get_user(user_id)
            joiner_name = joiner.name if joiner else "Thành viên mới"
            joiner_avatar = joiner.avatar_url if joiner else None
            action_url = f"/workspaces/{ws.id}/members"

            # Find admins
            all_members = await self.member_repo.list_by_workspace(workspace_id)
            admin_user_ids = {
                str(m.user_id)
                for m in all_members
                if m.role == MemberRole.ADMIN and str(m.user_id) != str(user_id)
            }
            if str(ws.owner_id) != str(user_id):
                admin_user_ids.add(str(ws.owner_id))

            for admin_id in admin_user_ids:
                await self.notification_dispatcher.dispatch(
                    NotificationMessage(
                        recipient_user_id=admin_id,
                        event_type="member_joined_workspace",
                        title=f"{joiner_name} đã tham gia workspace",
                        content=f"Thành viên mới đã gia nhập '{ws.name}' qua mã mời.",
                        action_url=action_url,
                        actor_id=user_id,
                        actor_name=joiner_name,
                        actor_avatar_url=joiner_avatar,
                        workspace_id=ws.id,
                        entity_type="workspace",
                        entity_id=ws.id,
                    )
                )
        except Exception:
            pass

        return WorkspaceResponseDTO.from_entity(ws)


class GetWorkspaceAnalyticsUseCase:
    """Compute analytics for tasks in a workspace."""

    def __init__(
        self,
        workspace_repo: IWorkspaceRepository,
        member_repo: IMemberRepository,
        task_repo: ITaskRepository,
    ) -> None:
        self.workspace_repo = workspace_repo
        self.member_repo = member_repo
        self.task_repo = task_repo

    async def execute(self, workspace_id: str, user_id: str) -> WorkspaceAnalyticsDTO:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        tasks = await self.task_repo.list_tasks(workspace_id=workspace_id)
        return compute_task_analytics(tasks, WorkspaceAnalyticsDTO)
