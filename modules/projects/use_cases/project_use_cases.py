import random
import string
from typing import BinaryIO

from core.config import s3_settings
from core.exceptions import ForbiddenException, NotFoundException
from core.storage.interface import IStorageProvider
from core.storage.url_builder import parse_storage_uri
from modules.members.domain.interfaces import IMemberRepository
from modules.projects.domain.interfaces import IProjectRepository
from modules.projects.dtos.project_dtos import (
    ProjectAnalyticsDTO,
    ProjectListResponseDTO,
    ProjectResponseDTO,
)


def generate_random_id(length: int = 12) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(random.choices(chars, k=length))


class CreateProjectUseCase:
    """Create a new project in a workspace."""

    def __init__(
        self,
        project_repo: IProjectRepository,
        member_repo: IMemberRepository,
        storage_provider: IStorageProvider,
    ) -> None:
        self.project_repo = project_repo
        self.member_repo = member_repo
        self.storage_provider = storage_provider

    async def execute(
        self,
        name: str,
        workspace_id: str,
        user_id: str,
        image_data: BinaryIO | None = None,
        image_filename: str | None = None,
        content_type: str | None = None,
    ) -> ProjectResponseDTO:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        image_url: str | None = None
        if image_data and image_filename:
            file_ext = image_filename.split(".")[-1] if "." in image_filename else "png"
            key = f"projects/{generate_random_id(12)}.{file_ext}"
            image_url = await self.storage_provider.upload(
                bucket=s3_settings.default_bucket,
                key=key,
                data=image_data,
                content_type=content_type or "image/png",
            )
            image_url = self.storage_provider.build_public_url(image_url)

        proj = await self.project_repo.create(
            name=name,
            workspace_id=workspace_id,
            image_url=image_url,
        )

        return ProjectResponseDTO(
            id=proj.id,
            name=proj.name,
            workspace_id=proj.workspace_id,
            image_url=proj.image_url,
            created_at=proj.created_at,
            updated_at=proj.updated_at,
        )


class ListProjectsUseCase:
    """List projects in a workspace."""

    def __init__(
        self,
        project_repo: IProjectRepository,
        member_repo: IMemberRepository,
    ) -> None:
        self.project_repo = project_repo
        self.member_repo = member_repo

    async def execute(self, workspace_id: str, user_id: str) -> ProjectListResponseDTO:
        member = await self.member_repo.get_member(workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        projects = await self.project_repo.list_by_workspace(workspace_id)
        documents = [
            ProjectResponseDTO(
                id=p.id,
                name=p.name,
                workspace_id=p.workspace_id,
                image_url=p.image_url,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
            for p in projects
        ]
        return ProjectListResponseDTO(documents=documents, total=len(documents))


class GetProjectUseCase:
    """Get project by ID."""

    def __init__(
        self,
        project_repo: IProjectRepository,
        member_repo: IMemberRepository,
    ) -> None:
        self.project_repo = project_repo
        self.member_repo = member_repo

    async def execute(self, project_id: str, user_id: str) -> ProjectResponseDTO:
        proj = await self.project_repo.get_by_id(project_id)
        if not proj:
            raise NotFoundException("Project not found.")

        member = await self.member_repo.get_member(proj.workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        return ProjectResponseDTO(
            id=proj.id,
            name=proj.name,
            workspace_id=proj.workspace_id,
            image_url=proj.image_url,
            created_at=proj.created_at,
            updated_at=proj.updated_at,
        )


class UpdateProjectUseCase:
    """Update project name or image."""

    def __init__(
        self,
        project_repo: IProjectRepository,
        member_repo: IMemberRepository,
        storage_provider: IStorageProvider,
    ) -> None:
        self.project_repo = project_repo
        self.member_repo = member_repo
        self.storage_provider = storage_provider

    async def execute(
        self,
        project_id: str,
        user_id: str,
        name: str | None = None,
        image_data: BinaryIO | None = None,
        image_filename: str | None = None,
        content_type: str | None = None,
        remove_image: bool = False,
    ) -> ProjectResponseDTO:
        proj = await self.project_repo.get_by_id(project_id)
        if not proj:
            raise NotFoundException("Project not found.")

        member = await self.member_repo.get_member(proj.workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        new_image_url: str | None = None
        clear_image: bool = False

        if remove_image:
            clear_image = True
            if proj.image_url:
                try:
                    bucket, old_key = parse_storage_uri(
                        proj.image_url, s3_settings.default_bucket
                    )
                    await self.storage_provider.delete(bucket, old_key)
                except Exception:
                    pass
        elif image_data and image_filename:
            file_ext = image_filename.split(".")[-1] if "." in image_filename else "png"
            key = f"projects/{generate_random_id(12)}.{file_ext}"
            new_image_url = await self.storage_provider.upload(
                bucket=s3_settings.default_bucket,
                key=key,
                data=image_data,
                content_type=content_type or "image/png",
            )
            new_image_url = self.storage_provider.build_public_url(new_image_url)

            # Delete old image if existed
            if proj.image_url:
                try:
                    bucket, old_key = parse_storage_uri(
                        proj.image_url, s3_settings.default_bucket
                    )
                    await self.storage_provider.delete(bucket, old_key)
                except Exception:
                    pass

        updated = await self.project_repo.update(
            project_id=project_id,
            name=name,
            image_url=new_image_url,
            clear_image=clear_image,
        )
        return ProjectResponseDTO(
            id=updated.id,
            name=updated.name,
            workspace_id=updated.workspace_id,
            image_url=updated.image_url,
            created_at=updated.created_at,
            updated_at=updated.updated_at,
        )


class DeleteProjectUseCase:
    """Delete project."""

    def __init__(
        self,
        project_repo: IProjectRepository,
        member_repo: IMemberRepository,
        storage_provider: IStorageProvider,
    ) -> None:
        self.project_repo = project_repo
        self.member_repo = member_repo
        self.storage_provider = storage_provider

    async def execute(self, project_id: str, user_id: str) -> None:
        proj = await self.project_repo.get_by_id(project_id)
        if not proj:
            raise NotFoundException("Project not found.")

        member = await self.member_repo.get_member(proj.workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        if proj.image_url:
            try:
                bucket, key = parse_storage_uri(
                    proj.image_url, s3_settings.default_bucket
                )
                await self.storage_provider.delete(bucket, key)
            except Exception:
                pass

        await self.project_repo.delete(project_id)


from core.utils.task_analytics import compute_task_analytics
from modules.tasks.domain.interfaces import ITaskRepository


class GetProjectAnalyticsUseCase:
    """Compute analytics for tasks in a project."""

    def __init__(
        self,
        project_repo: IProjectRepository,
        member_repo: IMemberRepository,
        task_repo: ITaskRepository,
    ) -> None:
        self.project_repo = project_repo
        self.member_repo = member_repo
        self.task_repo = task_repo

    async def execute(self, project_id: str, user_id: str) -> ProjectAnalyticsDTO:
        proj = await self.project_repo.get_by_id(project_id)
        if not proj:
            raise NotFoundException("Project not found.")

        member = await self.member_repo.get_member(proj.workspace_id, user_id)
        if not member:
            raise ForbiddenException("Unauthorized.")

        tasks = await self.task_repo.list_tasks(
            workspace_id=proj.workspace_id, project_id=project_id
        )
        return compute_task_analytics(tasks, ProjectAnalyticsDTO)
