from pydantic import BaseModel
from datetime import datetime
class ProjectCreateRequest(BaseModel):
    name: str | None = None


class ProjectRenameRequest(BaseModel):
    name: str


class ProjectResponse(BaseModel):
    id: int
    ownerId: str
    name: str
    description: str | None
    status: str
    canvasJsonPath: str | None
    createdAt: datetime
    updatedAt: datetime
