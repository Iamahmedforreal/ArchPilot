import hashlib
import json
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from model.ai import AIRun, AIRunStatus
from model.project import Project

from service.canvas_service import (
    CanvasNotFoundError,
    CanvasRevisionConflictError,
    CanvasStorageError,
    load_project_canvas_revision,
)


class AIIdempotencyConflictError(Exception):
    pass


class AIProjectBusyError(Exception):
    pass


class AIProjectNotFoundError(Exception):
    pass


@dataclass(frozen=True)
class AIRunSubmissionResult:
    response: dict
    created: bool


def _serialize_run(run: AIRun) -> dict:
    return {
        "run_id": run.id,
        "status": run.status.value,
    }


def _stable_request_hash(message: str, expected_canvas_revision: str | None) -> str:
    payload = {
        "expected_canvas_revision": expected_canvas_revision,
        "message": message,
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


async def _get_existing_run(
    session: AsyncSession,
    project_id: int,
    idempotency_key: str,
) -> AIRun | None:
    return await session.scalar(
        select(AIRun).where(
            AIRun.project_id == project_id,
            AIRun.idempotency_key == idempotency_key,
        )
    )


def _resolve_existing_run(existing_run: AIRun, request_hash: str) -> dict:
    if existing_run.request_hash != request_hash:
        raise AIIdempotencyConflictError

    return _serialize_run(existing_run)


async def _insert_ai_run(
    session: AsyncSession,
    project: Project,
    idempotency_key: str,
    request_hash: str,
    message: str,
    expected_canvas_revision: str | None,
) -> AIRun:
    run = AIRun(
        project_id=project.id,
        idempotency_key=idempotency_key,
        request_hash=request_hash,
        instruction=message,
        base_canvas_revision=expected_canvas_revision,
        status=AIRunStatus.PENDING,
    )
    session.add(run)
    await session.flush()
    return run


async def submit_ai_run(
    session: AsyncSession,
    owner_id: str,
    project_id: int,
    message: str,
    expected_canvas_revision: str | None,
    idempotency_key: str,
) -> AIRunSubmissionResult:
    request_hash = _stable_request_hash(message, expected_canvas_revision)

    try:
        locked_project = await session.scalar(
            select(Project)
            .where(Project.id == project_id, Project.owner_id == owner_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if locked_project is None:
            raise AIProjectNotFoundError

        existing_run = await _get_existing_run(session, project_id, idempotency_key)
        if existing_run is not None:
            result = _resolve_existing_run(existing_run, request_hash)
            await session.rollback()
            return AIRunSubmissionResult(response=result, created=False)

        active_run = await session.scalar(
            select(AIRun.id).where(
                AIRun.project_id == project_id,
                AIRun.status.in_([AIRunStatus.PENDING, AIRunStatus.RUNNING]),
            )
        )
        if active_run is not None:
            raise AIProjectBusyError

        current_canvas_revision = await load_project_canvas_revision(locked_project)
        if expected_canvas_revision != current_canvas_revision:
            raise CanvasRevisionConflictError("Canvas revision has changed")

        run = await _insert_ai_run(
            session,
            locked_project,
            idempotency_key,
            request_hash,
            message,
            expected_canvas_revision,
        )
        await session.commit()
        return AIRunSubmissionResult(response=_serialize_run(run), created=True)
    except IntegrityError as exc:
        await session.rollback()
        existing_project = await session.scalar(
            select(Project).where(Project.id == project_id, Project.owner_id == owner_id)
        )
        if existing_project is None:
            raise AIProjectNotFoundError from exc

        existing_run = await _get_existing_run(session, project_id, idempotency_key)
        if existing_run is None:
            raise exc

        return AIRunSubmissionResult(
            response=_resolve_existing_run(existing_run, request_hash),
            created=False,
        )
    except (
        AIIdempotencyConflictError,
        AIProjectBusyError,
        AIProjectNotFoundError,
        CanvasNotFoundError,
        CanvasRevisionConflictError,
        CanvasStorageError,
    ):
        await session.rollback()
        raise


create_ai_run = submit_ai_run
