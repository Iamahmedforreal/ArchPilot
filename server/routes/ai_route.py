import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError
from sqlalchemy.ext.asyncio import AsyncSession

from model.db import get_db
from routes.auth import get_current_user_id
from schema.ai_chat_schema import (
    IDEMPOTENCY_KEY_HEADER,
    AIMessageRequest,
    AIMessageResponse,
)
from service.ai_run_service import (
    AIIdempotencyConflictError,
    AIProjectBusyError,
    AIProjectNotFoundError,
    submit_ai_run,
)
from service.ai_queue_service import enqueue_ai_run
from service.canvas_service import (
    CanvasNotFoundError,
    CanvasRevisionConflictError,
    CanvasStorageError,
)


router = APIRouter(prefix="/api/projects", tags=["ai"])
logger = logging.getLogger(__name__)


@router.post(
    "/{project_id}/ai/runs",
    response_model=AIMessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def post_project_ai_run(
    request: Request,
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
        submission = await submit_ai_run(
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


    if submission.created:
        run_id = submission.response["run_id"]
        try:
            await enqueue_ai_run(request.app.state.redis, run_id)
        except (RedisConnectionError, RedisTimeoutError) as exc:
            logger.exception("Unable to confirm AI job delivery for run_id=%s", run_id)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "message": "AI job delivery could not be confirmed.",
                    "run_id": str(run_id),
                },
            ) from exc

    return submission.response
