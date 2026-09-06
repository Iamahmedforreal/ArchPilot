from datetime import datetime
import logging
from time import perf_counter

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
logger = logging.getLogger(__name__)


@router.get("", response_model=list[ProjectResponse])
async def get_projects(
    response: Response,
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    started_at = perf_counter()
    response.headers["Cache-Control"] = "no-store"
    projects = await list_projects(session, owner_id)
    logger.info(
        "projects.list duration_ms=%.2f owner_id=%s count=%s",
        (perf_counter() - started_at) * 1000,
        owner_id,
        len(projects),
    )
    return projects


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def post_project(
    payload: ProjectCreateRequest | None = None,
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> dict:
    started_at = perf_counter()
    project = await create_project(session, owner_id, payload.name if payload else None)
    logger.info(
        "projects.create duration_ms=%.2f owner_id=%s project_id=%s",
        (perf_counter() - started_at) * 1000,
        owner_id,
        project["id"],
    )
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def patch_project(
    project_id: int,
    payload: ProjectRenameRequest,
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> dict:
    started_at = perf_counter()
    try:
        project = await rename_project(session, owner_id, project_id, payload.name)
        logger.info(
            "projects.rename duration_ms=%.2f owner_id=%s project_id=%s",
            (perf_counter() - started_at) * 1000,
            owner_id,
            project_id,
        )
        return project
    except ProjectForbiddenError as exc:
        logger.info(
            "projects.rename_forbidden duration_ms=%.2f owner_id=%s project_id=%s",
            (perf_counter() - started_at) * 1000,
            owner_id,
            project_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        ) from exc
    except ProjectNotFoundError as exc:
        logger.info(
            "projects.rename_not_found duration_ms=%.2f owner_id=%s project_id=%s",
            (perf_counter() - started_at) * 1000,
            owner_id,
            project_id,
        )
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
    started_at = perf_counter()
    try:
        await delete_project(session, owner_id, project_id)
        logger.info(
            "projects.delete duration_ms=%.2f owner_id=%s project_id=%s",
            (perf_counter() - started_at) * 1000,
            owner_id,
            project_id,
        )
    except ProjectForbiddenError as exc:
        logger.info(
            "projects.delete_forbidden duration_ms=%.2f owner_id=%s project_id=%s",
            (perf_counter() - started_at) * 1000,
            owner_id,
            project_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        ) from exc
    except ProjectNotFoundError as exc:
        logger.info(
            "projects.delete_not_found duration_ms=%.2f owner_id=%s project_id=%s",
            (perf_counter() - started_at) * 1000,
            owner_id,
            project_id,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        ) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)
