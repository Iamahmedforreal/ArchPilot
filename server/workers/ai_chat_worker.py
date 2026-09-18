import asyncio
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import update

from model.ai import AIRun, AIRunStatus
from model.db import async_session
from schema.ai_canvas_schema import AIDesignModelResponse
from service.ai_context_service import prepare_design_context
from service.ai_model_service import AIModelError, generate_design

logger = logging.getLogger("arq.worker")
INTERNAL_ERROR_CODE = "INTERNAL_ERROR"
INTERNAL_ERROR_MESSAGE = "AI generation failed."
MODEL_GENERATION_ATTEMPTS = 3
MODEL_RETRY_BASE_DELAY_SECONDS = 2
MODEL_RETRY_MAX_DELAY_SECONDS = 8
RETRYABLE_MODEL_ERROR_CODES = {"MODEL_PROVIDER_BUSY"}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def _generate_design_with_retry(
    context: dict[str, Any],
    run_id: UUID,
) -> AIDesignModelResponse:
    for attempt in range(1, MODEL_GENERATION_ATTEMPTS + 1):
        try:
            return await generate_design(context)
        except AIModelError as exc:
            should_retry = (
                exc.code in RETRYABLE_MODEL_ERROR_CODES
                and attempt < MODEL_GENERATION_ATTEMPTS
            )
            if not should_retry:
                raise

            delay = min(
                MODEL_RETRY_BASE_DELAY_SECONDS * 2 ** (attempt - 1),
                MODEL_RETRY_MAX_DELAY_SECONDS,
            )
            logger.warning(
                "AI provider busy run_id=%s attempt=%s/%s retry_in=%ss",
                run_id,
                attempt,
                MODEL_GENERATION_ATTEMPTS,
                delay,
            )
            await asyncio.sleep(delay)

    raise RuntimeError("Model retry loop ended without a response")


async def _claim_run(run_id: UUID) -> AIRun | None:
    async with async_session() as session:
        run = await session.scalar(
            update(AIRun)
            .where(
                AIRun.id == run_id,
                AIRun.status == AIRunStatus.PENDING,
            )
            .values(
                status=AIRunStatus.RUNNING,
                started_at=_utc_now(),
                stage="preparing",
            )
            .returning(AIRun)
        )
        await session.commit()
        return run


async def _set_generation_stage(run_id: UUID) -> bool:
    async with async_session() as session:
        updated_id = await session.scalar(
            update(AIRun)
            .where(
                AIRun.id == run_id,
                AIRun.status == AIRunStatus.RUNNING,
            )
            .values(stage="generation")
            .returning(AIRun.id)
        )
        await session.commit()
        return updated_id is not None


async def _persist_success(
    run_id: UUID,
    response: AIDesignModelResponse,
) -> bool:
    canvas = response.canvas
    if canvas is None:
        raise ValueError("Generated response is missing its canvas")

    async with async_session() as session:
        updated_id = await session.scalar(
            update(AIRun)
            .where(
                AIRun.id == run_id,
                AIRun.status == AIRunStatus.RUNNING,
            )
            .values(
                proposal_json=canvas.model_dump(mode="json"),
                explanation=response.explanation,
                status=AIRunStatus.SUCCEEDED,
                stage=None,
                completed_at=_utc_now(),
                error_code=None,
                error_message=None,
            )
            .returning(AIRun.id)
        )
        await session.commit()
        return updated_id is not None


async def _persist_failure(
    run_id: UUID,
    error_code: str,
    error_message: str,
    *,
    explanation: str | None = None,
) -> bool:
    async with async_session() as session:
        updated_id = await session.scalar(
            update(AIRun)
            .where(
                AIRun.id == run_id,
                AIRun.status == AIRunStatus.RUNNING,
            )
            .values(
                proposal_json=None,
                explanation=explanation,
                status=AIRunStatus.FAILED,
                stage=None,
                completed_at=_utc_now(),
                error_code=error_code,
                error_message=error_message,
            )
            .returning(AIRun.id)
        )
        await session.commit()
        return updated_id is not None


async def _persist_failure_or_raise(
    run_id: UUID,
    error_code: str,
    error_message: str,
    *,
    explanation: str | None = None,
) -> None:
    try:
        await _persist_failure(
            run_id,
            error_code,
            error_message,
            explanation=explanation,
        )
    except Exception:
        logger.exception("Unable to persist AI failure run_id=%s", run_id)
        raise


async def _persist_response(
    run_id: UUID,
    response: AIDesignModelResponse,
) -> bool:
    if response.outcome == "generated":
        return await _persist_success(run_id, response)

    error_code = (
        "OUT_OF_SCOPE"
        if response.outcome == "unsupported"
        else "NEEDS_CLARIFICATION"
    )
    return await _persist_failure(
        run_id,
        error_code,
        response.explanation,
        explanation=response.explanation,
    )


async def generate_canvas(ctx: dict[str, Any], run_id: str) -> None:
    logger.info("Received canvas generation run_id=%s", run_id)

    try:
        parsed_run_id = UUID(run_id)
    except ValueError:
        logger.warning("Ignoring invalid AI run_id=%s", run_id)
        return

    try:
        run = await _claim_run(parsed_run_id)
    except Exception:
        logger.exception("Unable to claim AI run run_id=%s", run_id)
        raise

    if run is None:
        logger.info("Skipping unclaimable AI run run_id=%s", run_id)
        return

    try:
        context = prepare_design_context(run)
        if not await _set_generation_stage(parsed_run_id):
            logger.info("AI run stopped before generation run_id=%s", run_id)
            return

        response = await _generate_design_with_retry(context, parsed_run_id)
    except asyncio.CancelledError:
        raise
    except AIModelError as exc:
        logger.warning("AI generation failed run_id=%s code=%s", run_id, exc.code)
        await _persist_failure_or_raise(
            parsed_run_id,
            exc.code,
            exc.safe_message,
        )
        return
    except Exception:
        logger.exception("Unexpected AI generation failure run_id=%s", run_id)
        await _persist_failure_or_raise(
            parsed_run_id,
            INTERNAL_ERROR_CODE,
            INTERNAL_ERROR_MESSAGE,
        )
        return

    try:
        persisted = await _persist_response(parsed_run_id, response)
    except Exception:
        logger.exception("Unable to persist AI completion run_id=%s", run_id)
        raise

    if not persisted:
        logger.info("AI run stopped before completion run_id=%s", run_id)
        return

    logger.info("Completed AI run run_id=%s outcome=%s", run_id, response.outcome)
