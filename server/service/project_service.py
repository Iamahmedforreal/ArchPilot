from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from model.project import Project


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
    result = await session.execute(
        select(Project)
        .where(Project.owner_id == owner_id)
        .order_by(Project.created_at.desc())
    )
    return [serialize_project(project) for project in result.scalars().all()]


#function for creating new project
async def create_project(
    session: AsyncSession,
    owner_id: str,
    name: str | None,
) -> dict:

    
    project = Project(
        owner_id=owner_id,
        name=name or "Untitled Project",
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return serialize_project(project)


async def rename_project(
    session: AsyncSession,
    owner_id: str,
    project_id: int,
    name: str,
) -> dict:
    project = await session.get(Project, project_id)
    if project is None:
        raise ProjectNotFoundError
    if project.owner_id != owner_id:
        raise ProjectForbiddenError

    project.name = name
    await session.commit()
    await session.refresh(project)
    return serialize_project(project)

#project for deleting project
async def delete_project(
    session: AsyncSession,
    owner_id: str,
    project_id: int,
) -> None:
    project = await session.get(Project, project_id)
    if project is None:
        raise ProjectNotFoundError
    if project.owner_id != owner_id:
        raise ProjectForbiddenError

    await session.delete(project)
    await session.commit()
