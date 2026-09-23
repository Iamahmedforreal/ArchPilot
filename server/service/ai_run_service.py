from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from model.ai import AIRun, AIRunKind, AIRunStatus, FileBlob
from model.project import Project
from schema.ai_canvas_schema import MAX_AI_EDGES, MAX_AI_NODES
from service.canvas_service import load_project_canvas
from service.project_service import get_owned_project


class AIProjectNotFoundError(Exception):
    pass


class AIRunNotFoundError(Exception):
    pass


class AISpecCanvasNotFoundError(Exception):
    pass


class AISpecCanvasRevisionConflictError(Exception):
    pass


class AISpecCanvasInvalidError(Exception):
    pass


def _serialize_run(run: AIRun) -> dict:
    return {
        "run_id": run.id,
        "status": run.status.value,
    }


def _validate_spec_canvas_snapshot(canvas_state: object) -> dict:
    if not isinstance(canvas_state, dict):
        raise AISpecCanvasInvalidError

    nodes = canvas_state.get("nodes")
    edges = canvas_state.get("edges", [])
    if not isinstance(nodes, list) or not nodes:
        raise AISpecCanvasInvalidError
    if not isinstance(edges, list):
        raise AISpecCanvasInvalidError
    if len(nodes) > MAX_AI_NODES or len(edges) > MAX_AI_EDGES:
        raise AISpecCanvasInvalidError

    node_ids = []
    for node in nodes:
        if not isinstance(node, dict):
            raise AISpecCanvasInvalidError
        node_id = node.get("id")
        if not isinstance(node_id, str) or not node_id.strip():
            raise AISpecCanvasInvalidError
        node_ids.append(node_id)

    known_node_ids = set(node_ids)
    if len(known_node_ids) != len(node_ids):
        raise AISpecCanvasInvalidError

    for edge in edges:
        if not isinstance(edge, dict):
            raise AISpecCanvasInvalidError
        source = edge.get("source")
        target = edge.get("target")
        if source not in known_node_ids or target not in known_node_ids:
            raise AISpecCanvasInvalidError

    return {"nodes": nodes, "edges": edges}


async def create_ai_design_run(
    session: AsyncSession,
    owner_id: str,
    project_id: int,
    message: str,
) -> dict:
    owned_project_id = await session.scalar(
        select(Project.id).where(
            Project.id == project_id,
            Project.owner_id == owner_id,
        )
    )
    if owned_project_id is None:
        await session.rollback()
        raise AIProjectNotFoundError

    run = AIRun(
        project_id=owned_project_id,
        kind=AIRunKind.DESIGN,
        instruction=message,
        status=AIRunStatus.PENDING,
    )
    session.add(run)
    await session.commit()
    return _serialize_run(run)


async def create_ai_spec_run(
    session: AsyncSession,
    owner_id: str,
    project_id: int,
    expected_canvas_revision: str,
    instruction: str | None,
) -> dict:
    project = await get_owned_project(session, owner_id, project_id)
    if project is None:
        await session.rollback()
        raise AIProjectNotFoundError

    canvas_snapshot = await load_project_canvas(project)
    if canvas_snapshot is None:
        await session.rollback()
        raise AISpecCanvasNotFoundError

    canvas_state, revision = canvas_snapshot
    if revision != expected_canvas_revision:
        await session.rollback()
        raise AISpecCanvasRevisionConflictError

    try:
        canvas = _validate_spec_canvas_snapshot(canvas_state)
    except AISpecCanvasInvalidError:
        await session.rollback()
        raise

    run = AIRun(
        project_id=project.id,
        kind=AIRunKind.SPEC,
        instruction=instruction or "",
        status=AIRunStatus.PENDING,
        base_canvas_revision=revision,
        input_canvas_json=canvas,
    )
    session.add(run)
    await session.commit()
    return _serialize_run(run)


async def mark_ai_run_enqueue_failed(
    session: AsyncSession,
    run_id: UUID,
) -> None:
    run = await session.get(AIRun, run_id)
    if run is None or run.status != AIRunStatus.PENDING:
        await session.rollback()
        return

    run.status = AIRunStatus.FAILED
    run.error_code = "QUEUE_DELIVERY_FAILED"
    run.error_message = "AI generation could not be queued."
    await session.commit()


async def get_ai_run_status(
    session: AsyncSession,
    owner_id: str,
    project_id: int,
    run_id: UUID,
) -> dict:
    project = await get_owned_project(session, owner_id, project_id)
    if project is None:
        raise AIProjectNotFoundError

    run = await session.scalar(
        select(AIRun).where(
            AIRun.id == run_id,
            AIRun.project_id == project_id,
        )
    )
    if run is None:
        raise AIRunNotFoundError

    result = None
    if run.status == AIRunStatus.SUCCEEDED:
        if run.kind == AIRunKind.SPEC:
            if run.file_blob_id is not None:
                result = {
                    "file_id": str(run.file_blob_id),
                    "filename": "architecture-spec.md",
                }
        else:
            result = run.proposal_json

    error = None
    if run.status == AIRunStatus.FAILED:
        error = {
            "code": run.error_code,
            "message": run.error_message,
        }

    return {
        "run_id": run.id,
        "kind": run.kind.value,
        "status": run.status.value,
        "stage": run.stage,
        "result": result,
        "error": error,
    }


async def get_project_file_blob(
    session: AsyncSession,
    owner_id: str,
    project_id: int,
    file_id: UUID,
) -> FileBlob:
    project = await get_owned_project(session, owner_id, project_id)
    if project is None:
        raise AIProjectNotFoundError

    file_blob = await session.scalar(
        select(FileBlob).where(
            FileBlob.id == file_id,
            FileBlob.project_id == project_id,
        )
    )
    if file_blob is None:
        raise AIRunNotFoundError

    return file_blob
