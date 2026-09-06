from core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from modules.members.domain.interfaces import IMemberRepository
from modules.workspaces.domain.interfaces import (
    IWorkspaceLabelRepository,
    IWorkspaceRepository,
)
from modules.workspaces.dtos.label_dtos import WorkspaceLabelResponseDTO


class ListWorkspaceLabelsUseCase:
    """List all labels in a workspace."""

    def __init__(
        self,
        label_repo: IWorkspaceLabelRepository,
        member_repo: IMemberRepository,
    ) -> None:
        self.label_repo = label_repo
        self.member_repo = member_repo

    async def execute(
        self, workspace_id: str, user_id: str
    ) -> list[WorkspaceLabelResponseDTO]:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        labels = await self.label_repo.list_by_workspace(workspace_id)
        return [
            WorkspaceLabelResponseDTO(
                id=lbl.id,
                workspace_id=lbl.workspace_id,
                name=lbl.name,
                color=lbl.color,
                created_at=lbl.created_at,
                updated_at=lbl.updated_at,
            )
            for lbl in labels
        ]


class CreateWorkspaceLabelUseCase:
    """Create a new workspace label (ADMIN/OWNER only)."""

    def __init__(
        self,
        label_repo: IWorkspaceLabelRepository,
        member_repo: IMemberRepository,
        workspace_repo: IWorkspaceRepository,
    ) -> None:
        self.label_repo = label_repo
        self.member_repo = member_repo
        self.workspace_repo = workspace_repo

    async def execute(
        self,
        workspace_id: str,
        user_id: str,
        name: str,
        color: str,
    ) -> WorkspaceLabelResponseDTO:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        clean_name = name.strip()
        if not clean_name:
            raise BadRequestException("Label name cannot be empty.")

        existing = await self.label_repo.get_by_workspace_and_name(
            workspace_id, clean_name
        )
        if existing:
            raise BadRequestException(
                f"Label '{clean_name}' already exists in this workspace."
            )

        created = await self.label_repo.create(
            workspace_id=workspace_id,
            name=clean_name,
            color=color.strip() or "#3b82f6",
        )

        return WorkspaceLabelResponseDTO(
            id=created.id,
            workspace_id=created.workspace_id,
            name=created.name,
            color=created.color,
            created_at=created.created_at,
            updated_at=created.updated_at,
        )


class UpdateWorkspaceLabelUseCase:
    """Update a workspace label (ADMIN/OWNER only)."""

    def __init__(
        self,
        label_repo: IWorkspaceLabelRepository,
        member_repo: IMemberRepository,
    ) -> None:
        self.label_repo = label_repo
        self.member_repo = member_repo

    async def execute(
        self,
        workspace_id: str,
        label_id: str,
        user_id: str,
        name: str | None = None,
        color: str | None = None,
    ) -> WorkspaceLabelResponseDTO:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        label = await self.label_repo.get_by_id(label_id)
        if not label or label.workspace_id != workspace_id:
            raise NotFoundException("Label not found in this workspace.")

        clean_name = name.strip() if name is not None else None
        if clean_name is not None and clean_name != label.name:
            existing = await self.label_repo.get_by_workspace_and_name(
                workspace_id, clean_name
            )
            if existing:
                raise BadRequestException(
                    f"Label '{clean_name}' already exists in this workspace."
                )

        updated = await self.label_repo.update(
            label_id=label_id,
            name=clean_name,
            color=color.strip() if color is not None else None,
        )

        return WorkspaceLabelResponseDTO(
            id=updated.id,
            workspace_id=updated.workspace_id,
            name=updated.name,
            color=updated.color,
            created_at=updated.created_at,
            updated_at=updated.updated_at,
        )


class DeleteWorkspaceLabelUseCase:
    """Delete a workspace label (ADMIN/OWNER only)."""

    def __init__(
        self,
        label_repo: IWorkspaceLabelRepository,
        member_repo: IMemberRepository,
    ) -> None:
        self.label_repo = label_repo
        self.member_repo = member_repo

    async def execute(
        self,
        workspace_id: str,
        label_id: str,
        user_id: str,
    ) -> None:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        label = await self.label_repo.get_by_id(label_id)
        if not label or label.workspace_id != workspace_id:
            raise NotFoundException("Label not found in this workspace.")

        await self.label_repo.delete(label_id)
