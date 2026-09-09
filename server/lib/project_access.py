from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from model.project import Project

@dataclass(frozen=True)
class ClerkIdentity:
    user_id: str

async def get_project_with_access(session: AsyncSession,identity: ClerkIdentity, project_id: int,) -> Project | None:
    project = await session.get(Project, project_id)
    if project is None:
        return None

    if project.owner_id == identity.user_id:
        return project

    return None
