from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from model.db import get_db
from routes.auth import get_current_user_id
from schema.ai_chat_schema import (
    AIMessageRequest,
    AIMessageResponse,
    AISpecRequest,
    AIRunStatusResponse,
)
from service.ai_queue_service import enqueue_ai_run, enqueue_ai_spec_run
from service.ai_run_service import (
    AISpecCanvasInvalidError,
    AISpecCanvasNotFoundError,
    AISpecCanvasRevisionConflictError,
    AIProjectNotFoundError,
    AIRunNotFoundError,
    create_ai_design_run,
    create_ai_spec_run,
    get_ai_run_status,
    get_project_file_blob,
    mark_ai_run_enqueue_failed,
)
from service.canvas_service import CanvasNotFoundError, CanvasStorageError
from service.file_blob_service import (
    FileBlobNotFoundError,
    FileBlobStorageError,
    load_markdown_file,
)

 
router = APIRouter(prefix="/api/projects", tags=["ai"])


@router.post(
    "/{project_id}/ai/design",
    response_model=AIMessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def post_project_ai_design(
    request: Request,
    project_id: int,
    payload: AIMessageRequest,
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> dict:
    
    try:
        run = await create_ai_design_run(
            session,
            owner_id,
            project_id,
            payload.message,
        )
    except AIProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        ) from exc

    await enqueue_ai_run(request.app.state.redis, run["run_id"])
    return run


@router.post(
    "/{project_id}/ai/spec",
    response_model=AIMessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def post_project_ai_spec(
    request: Request,
    project_id: int,
    payload: AISpecRequest,
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> dict:
    try:
        run = await create_ai_spec_run(
            session,
            owner_id,
            project_id,
            payload.expected_canvas_revision,
            payload.instruction,
        )
    except AIProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        ) from exc
    except (AISpecCanvasNotFoundError, CanvasNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved canvas not found",
        ) from exc
    except AISpecCanvasRevisionConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Canvas revision has changed",
        ) from exc
    except AISpecCanvasInvalidError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Saved canvas cannot be described",
        ) from exc
    except CanvasStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Canvas storage is unavailable",
        ) from exc

    try:
        job = await enqueue_ai_spec_run(request.app.state.redis, run["run_id"])
    except Exception as exc:
        await mark_ai_run_enqueue_failed(session, run["run_id"])
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI generation could not be queued",
        ) from exc

    if job is None:
        await mark_ai_run_enqueue_failed(session, run["run_id"])
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI generation could not be queued",
        )

    return run


@router.get(
    "/{project_id}/ai/runs/{run_id}",
    response_model=AIRunStatusResponse,
)
async def get_project_ai_run(
    project_id: int,
    run_id: UUID,
    response: Response,
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> dict:
    response.headers["Cache-Control"] = "no-store"

    try:
        return await get_ai_run_status(
            session,
            owner_id,
            project_id,
            run_id,
        )
    except (AIProjectNotFoundError, AIRunNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI run not found",
            headers={"Cache-Control": "no-store"},
        ) from exc


@router.get("/{project_id}/files/{file_id}/download")
async def download_project_file(
    project_id: int,
    file_id: UUID,
    response: Response,
    owner_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> Response:
    response.headers["Cache-Control"] = "no-store"

    try:
        file_blob = await get_project_file_blob(
            session,
            owner_id,
            project_id,
            file_id,
        )
        content = await load_markdown_file(file_blob)
    except (AIProjectNotFoundError, AIRunNotFoundError, FileBlobNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
            headers={"Cache-Control": "no-store"},
        ) from exc
    except FileBlobStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="File storage is unavailable",
            headers={"Cache-Control": "no-store"},
        ) from exc

    headers = {
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="architecture-spec.md"',
    }
    return Response(
        content=content,
        media_type="text/markdown; charset=utf-8",
        headers=headers,
    )
