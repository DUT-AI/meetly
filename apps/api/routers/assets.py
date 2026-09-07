from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from apps.api.deps.auth import CurrentUser
from modules.assets.dtos.asset_dtos import (
    AssetDownloadResponseDTO,
    AssetListResponseDTO,
    AssetResponseDTO,
)
from modules.assets.use_cases import (
    DeleteAssetUseCase,
    GetAssetDownloadUrlUseCase,
    GetAssetUseCase,
    ListEntityAssetsUseCase,
    UploadAssetUseCase,
)

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/assets", tags=["Assets"])


@router.post(
    "/upload",
    response_model=AssetResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file and attach as asset to any entity (Task, Comment, Project, Workspace)",
)
@inject
async def upload_asset(
    workspace_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[UploadAssetUseCase],
    file: UploadFile = File(...),
    entity_type: str = Form(..., description="Entity type: TASK, TASK_COMMENT, PROJECT, WORKSPACE"),
    entity_id: str = Form(..., description="ID of the entity to attach to"),
) -> AssetResponseDTO:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên tệp không hợp lệ.",
        )

    # Read file content
    contents = await file.read()
    file_size = len(contents)

    # Reset cursor for upload
    import io
    file_stream = io.BytesIO(contents)

    asset = await use_case.execute(
        workspace_id=workspace_id,
        entity_type=entity_type,
        entity_id=entity_id,
        file_name=file.filename,
        file_data=file_stream,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        uploaded_by=str(current_user.id),
    )

    return AssetResponseDTO(
        id=asset.id,
        workspace_id=asset.workspace_id,
        entity_type=asset.entity_type,
        entity_id=asset.entity_id,
        file_name=asset.file_name,
        file_size=asset.file_size,
        mime_type=asset.mime_type,
        extension=asset.extension,
        category=asset.category,
        uploaded_by=asset.uploaded_by,
        metadata=asset.metadata,
        download_url=asset.download_url,
        preview_url=asset.preview_url,
        uploader_name=current_user.name,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
    )


@router.get(
    "",
    response_model=AssetListResponseDTO,
    summary="List all assets attached to an entity",
)
@inject
async def list_entity_assets(
    workspace_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListEntityAssetsUseCase],
    entity_type: str = Query(..., description="Entity type: TASK, TASK_COMMENT, PROJECT, WORKSPACE"),
    entity_id: str = Query(..., description="ID of the entity"),
) -> AssetListResponseDTO:
    assets = await use_case.execute(
        workspace_id=workspace_id,
        entity_type=entity_type,
        entity_id=entity_id,
    )

    documents = [
        AssetResponseDTO(
            id=a.id,
            workspace_id=a.workspace_id,
            entity_type=a.entity_type,
            entity_id=a.entity_id,
            file_name=a.file_name,
            file_size=a.file_size,
            mime_type=a.mime_type,
            extension=a.extension,
            category=a.category,
            uploaded_by=a.uploaded_by,
            metadata=a.metadata,
            download_url=a.download_url,
            preview_url=a.preview_url,
            created_at=a.created_at,
            updated_at=a.updated_at,
        )
        for a in assets
    ]

    return AssetListResponseDTO(
        documents=documents,
        total=len(documents),
    )


@router.get(
    "/{asset_id}",
    response_model=AssetResponseDTO,
    summary="Get single asset details",
)
@inject
async def get_asset(
    workspace_id: str,
    asset_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetAssetUseCase],
) -> AssetResponseDTO:
    asset = await use_case.execute(asset_id=asset_id)
    return AssetResponseDTO(
        id=asset.id,
        workspace_id=asset.workspace_id,
        entity_type=asset.entity_type,
        entity_id=asset.entity_id,
        file_name=asset.file_name,
        file_size=asset.file_size,
        mime_type=asset.mime_type,
        extension=asset.extension,
        category=asset.category,
        uploaded_by=asset.uploaded_by,
        metadata=asset.metadata,
        download_url=asset.download_url,
        preview_url=asset.preview_url,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
    )


@router.get(
    "/{asset_id}/download",
    response_model=AssetDownloadResponseDTO,
    summary="Get presigned download URL for asset",
)
@inject
async def get_asset_download_url(
    workspace_id: str,
    asset_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetAssetDownloadUrlUseCase],
    expires_in: int = Query(3600, ge=60, le=86400),
) -> AssetDownloadResponseDTO:
    return await use_case.execute(asset_id=asset_id, expires_in=expires_in)


@router.delete(
    "/{asset_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete an asset attachment",
)
@inject
async def delete_asset(
    workspace_id: str,
    asset_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[DeleteAssetUseCase],
) -> dict:
    success = await use_case.execute(asset_id=asset_id, current_user_id=str(current_user.id))
    return {"success": success, "id": asset_id}
