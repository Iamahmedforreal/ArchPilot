from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from schema.crud_schema import (
    CanvasSaveResponse,
    CanvasStateRequest,
    CanvasStateResponse,
    ProjectCreateRequest,
    ProjectRenameRequest,
    ProjectResponse,
)
from schema.ai_chat_schema import (
    IDEMPOTENCY_KEY_HEADER,
    AIMessageRequest,
    AIMessageResponse,
)
from sqlalchemy.ext.asyncio import AsyncSession
from model.db import get_db
from routes.auth import get_current_user_id
from service.project_service import (
    ProjectForbiddenError,
    ProjectNotFoundError,
    create_project,
    delete_project,
    get_owned_project,
    list_projects,
    rename_project,
    serialize_project,
)
from service.canvas_service import (
    CanvasNotFoundError,
    CanvasRevisionConflictError,
    CanvasStorageError,
    load_project_canvas,
    save_project_canvas,
)
from service.ai_run_service import (
    AIIdempotencyConflictError,
    AIProjectBusyError,
    AIProjectNotFoundError,
    create_ai_run,
)


router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
async def get_projects(
    response: Response,
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    response.headers["Cache-Control"] = "no-store"
    return await list_projects(session, owner_id)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def post_project(
    payload: ProjectCreateRequest | None = None,
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> dict:
    return await create_project(session, owner_id, payload.name if payload else None)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    response: Response,
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> dict:
    project = await get_owned_project(session, owner_id, project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    response.headers["Cache-Control"] = "no-store"
    return serialize_project(project)


@router.get("/{project_id}/canvas", response_model=CanvasStateResponse)
async def get_project_canvas(
    project_id: int,
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> dict | Response:
    project = await get_owned_project(session, owner_id, project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    try:
        canvas_snapshot = await load_project_canvas(project)
    except CanvasNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved canvas not found",
        ) from exc
    except CanvasStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Canvas storage is unavailable",
        ) from exc

    if canvas_snapshot is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    canvas_state, revision = canvas_snapshot
    return {**canvas_state, "revision": revision}


@router.put("/{project_id}/canvas", response_model=CanvasSaveResponse)
async def put_project_canvas(
    project_id: int,
    payload: CanvasStateRequest,
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> dict:
    try:
        canvas_json_path, revision = await save_project_canvas(
            session,
            project_id,
            owner_id,
            payload.model_dump(mode="json", exclude={"revision"}),
            payload.revision,
        )
    except CanvasRevisionConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Canvas revision has changed",
        ) from exc
    except CanvasNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved canvas not found",
        ) from exc
    except CanvasStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Canvas storage is unavailable",
        ) from exc

    return {"canvasJsonPath": canvas_json_path, "revision": revision}


@router.post(
    "/{project_id}/ai/runs",
    response_model=AIMessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def post_project_ai_run(
    project_id: int,
    payload: AIMessageRequest,
    idempotency_key: Annotated[
        str,
        Header(
            alias=IDEMPOTENCY_KEY_HEADER,
            min_length=1,
            max_length=255,
        ),
    ],
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> dict:
    normalized_idempotency_key = idempotency_key.strip()
    if not normalized_idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Idempotency-Key is required",
        )

    try:
        return await create_ai_run(
            session,
            owner_id,
            project_id,
            payload.message,
            payload.expected_canvas_revision,
            normalized_idempotency_key,
        )
    except AIProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        ) from exc
    except AIIdempotencyConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Idempotency-Key has already been used for a different request",
        ) from exc
    except AIProjectBusyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Project already has an active AI run",
        ) from exc
    except CanvasRevisionConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Canvas revision has changed",
        ) from exc
    except CanvasNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved canvas not found",
        ) from exc
    except CanvasStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Canvas storage is unavailable",
        ) from exc


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
