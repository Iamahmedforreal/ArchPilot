from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from model.ai import AIRun, AIRunStatus
from model.project import Project
from service.project_service import get_owned_project


class AIProjectNotFoundError(Exception):
    pass


class AIRunNotFoundError(Exception):
    pass


def _serialize_run(run: AIRun) -> dict:
    return {
        "run_id": run.id,
        "status": run.status.value,
    }


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
        instruction=message,
        status=AIRunStatus.PENDING,
    )
    session.add(run)
    await session.commit()
    return _serialize_run(run)


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

    result = run.proposal_json if run.status == AIRunStatus.SUCCEEDED else None
    error = None
    if run.status == AIRunStatus.FAILED:
        error = {
            "code": run.error_code,
            "message": run.error_message,
        }

    return {
        "run_id": run.id,
        "status": run.status.value,
        "stage": run.stage,
        "result": result,
        "error": error,
    }
