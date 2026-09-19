from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from model.db import get_db
from routes.auth import get_current_user_id
from schema.ai_chat_schema import (
    AIMessageRequest,
    AIMessageResponse,
    AIRunStatusResponse,
)
from service.ai_queue_service import enqueue_ai_run
from service.ai_run_service import (
    AIProjectNotFoundError,
    AIRunNotFoundError,
    create_ai_design_run,
    get_ai_run_status,
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
