from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from schema.crud_schema import ProjectCreateRequest, ProjectRenameRequest, ProjectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from model.db import get_db
from routes.auth import get_current_user_id
from service.project_service import (
    ProjectForbiddenError,
    ProjectNotFoundError,
    create_project,
    delete_project,
    list_projects,
    rename_project,
)


router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
async def get_projects(
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
        return await list_projects(session, owner_id)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def post_project(
    payload: ProjectCreateRequest | None = None,
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> dict:
    return await create_project(session, owner_id, payload.name if payload else None)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def patch_project(
    project_id: int,
    payload: ProjectRenameRequest,
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> dict:
    try:
        return await rename_project(session, owner_id, project_id, payload.name)
    except ProjectForbiddenError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        ) from exc
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        ) from exc


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_project(
    project_id: int,
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> Response:
    try:
        await delete_project(session, owner_id, project_id)
    except ProjectForbiddenError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        ) from exc
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        ) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)
