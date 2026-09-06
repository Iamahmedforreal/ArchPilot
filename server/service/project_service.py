import logging
from time import perf_counter

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from model.project import Project


logger = logging.getLogger(__name__)


class ProjectNotFoundError(Exception):
    pass


class ProjectForbiddenError(Exception):
    pass


def serialize_project(project: Project) -> dict:
    return {
        "id": project.id,
        "ownerId": project.owner_id,
        "name": project.name,
        "description": project.description,
        "status": project.status.value,
        "canvasJsonPath": project.canvas_json_path,
        "createdAt": project.created_at,
        "updatedAt": project.updated_at,
    }

# function for showing user all there project or just one
async def list_projects(session: AsyncSession, owner_id: str) -> list[dict]:
    started_at = perf_counter()
    result = await session.execute(
        select(Project)
        .where(Project.owner_id == owner_id)
        .order_by(Project.created_at.desc())
    )
    projects = [serialize_project(project) for project in result.scalars().all()]
    logger.info(
        "project_service.list duration_ms=%.2f owner_id=%s count=%s",
        (perf_counter() - started_at) * 1000,
        owner_id,
        len(projects),
    )
    return projects


#function for creating new project
async def create_project(
    session: AsyncSession,
    owner_id: str,
    name: str | None,
) -> dict:
    started_at = perf_counter()
    
    project = Project(
        owner_id=owner_id,
        name=name or "Untitled Project",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    logger.info(
        "project_service.create duration_ms=%.2f owner_id=%s project_id=%s",
        (perf_counter() - started_at) * 1000,
        owner_id,
        project.id,
    )
    return serialize_project(project)


async def rename_project(
    session: AsyncSession,
    owner_id: str,
    project_id: int,
    name: str,
) -> dict:
    started_at = perf_counter()
    project = await session.get(Project, project_id)
    if project is None:
        logger.info(
            "project_service.rename_not_found duration_ms=%.2f owner_id=%s project_id=%s",
            (perf_counter() - started_at) * 1000,
            owner_id,
            project_id,
        )
        raise ProjectNotFoundError
    if project.owner_id != owner_id:
        logger.info(
            "project_service.rename_forbidden duration_ms=%.2f owner_id=%s project_id=%s",
            (perf_counter() - started_at) * 1000,
            owner_id,
            project_id,
        )
        raise ProjectForbiddenError

    project.name = name
    await session.commit()
    await session.refresh(project)
    logger.info(
        "project_service.rename duration_ms=%.2f owner_id=%s project_id=%s",
        (perf_counter() - started_at) * 1000,
        owner_id,
        project_id,
    )
    return serialize_project(project)

#project for deleting project
async def delete_project(
    session: AsyncSession,
    owner_id: str,
    project_id: int,
) -> None:
    started_at = perf_counter()
    project = await session.get(Project, project_id)
    if project is None:
        logger.info(
            "project_service.delete_not_found duration_ms=%.2f owner_id=%s project_id=%s",
            (perf_counter() - started_at) * 1000,
            owner_id,
            project_id,
        )
        raise ProjectNotFoundError
    if project.owner_id != owner_id:
        logger.info(
            "project_service.delete_forbidden duration_ms=%.2f owner_id=%s project_id=%s",
            (perf_counter() - started_at) * 1000,
            owner_id,
            project_id,
        )
        raise ProjectForbiddenError

    await session.delete(project)
    await session.commit()
    logger.info(
        "project_service.delete duration_ms=%.2f owner_id=%s project_id=%s",
        (perf_counter() - started_at) * 1000,
        owner_id,
        project_id,
    )
