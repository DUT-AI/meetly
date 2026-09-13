from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, File, Form, Query, UploadFile, status

from apps.api.deps.auth import CurrentUser
from modules.projects.use_cases import (
    CreateProjectUseCase,
    DeleteProjectUseCase,
    GetProjectAnalyticsUseCase,
    GetProjectUseCase,
    ListProjectsUseCase,
    UpdateProjectUseCase,
)

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
)
@inject
async def create_project(
    current_user: CurrentUser,
    use_case: FromDishka[CreateProjectUseCase],
    name: str = Form(...),
    workspace_id: str = Form(..., alias="workspaceId"),
    image: UploadFile | None = File(None),
) -> dict:
    image_data = image.file if image else None
    image_filename = image.filename if image else None
    content_type = image.content_type if image else None

    result = await use_case.execute(
        name=name,
        workspace_id=workspace_id,
        user_id=str(current_user.id),
        image_data=image_data,
        image_filename=image_filename,
        content_type=content_type,
    )
    return {"data": result}


@router.get(
    "",
    summary="List projects in a workspace",
)
@inject
async def list_projects(
    current_user: CurrentUser,
    use_case: FromDishka[ListProjectsUseCase],
    workspace_id: str = Query(..., alias="workspaceId"),
) -> dict:
    result = await use_case.execute(
        workspace_id=workspace_id,
        user_id=str(current_user.id),
    )
    return {"data": result}


@router.get(
    "/{project_id}",
    summary="Get project details",
)
@inject
async def get_project(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetProjectUseCase],
) -> dict:
    result = await use_case.execute(
        project_id=project_id,
        user_id=str(current_user.id),
    )
    return {"data": result}


@router.patch(
    "/{project_id}",
    summary="Update project",
)
@inject
async def update_project(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateProjectUseCase],
    name: str | None = Form(None),
    image: UploadFile | None = File(None),
    remove_image: bool = Form(False),
) -> dict:
    image_data = image.file if image else None
    image_filename = image.filename if image else None
    content_type = image.content_type if image else None

    result = await use_case.execute(
        project_id=project_id,
        user_id=str(current_user.id),
        name=name,
        image_data=image_data,
        image_filename=image_filename,
        content_type=content_type,
        remove_image=remove_image,
    )
    return {"data": result}


@router.delete(
    "/{project_id}",
    summary="Delete project",
)
@inject
async def delete_project(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[DeleteProjectUseCase],
) -> dict:
    await use_case.execute(
        project_id=project_id,
        user_id=str(current_user.id),
    )
    return {"data": {"id": project_id}}


@router.get(
    "/{project_id}/analytics",
    summary="Get project analytics",
)
@inject
async def get_project_analytics(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetProjectAnalyticsUseCase],
) -> dict:
    result = await use_case.execute(
        project_id=project_id,
        user_id=str(current_user.id),
    )
    return {"data": result}
