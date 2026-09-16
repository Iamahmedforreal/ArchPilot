from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints


IDEMPOTENCY_KEY_HEADER = "Idempotency-Key"
MessageText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=8000),
]


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AIMessageRequest(StrictSchema):
    message: MessageText
    expected_canvas_revision: str | None


class AIMessageResponse(StrictSchema):
    run_id: UUID
    status: str


class CanvasModelResponse(StrictSchema):
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]


class AIRunResponse(StrictSchema):
    run_id: UUID
    project_id: int
    status: str
    stage: str
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    explanation: str | None = None
    canvas: CanvasModelResponse | None = None
    error_code: str | None = None
    error_message: str | None = None
