from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints


IDEMPOTENCY_KEY_HEADER = "Idempotency-Key"
MessageText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=8000),
]
AIRunStatusValue = Literal["PENDING", "RUNNING", "SUCCEEDED", "FAILED"]



class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AIMessageRequest(StrictSchema):
    message: MessageText
    expected_canvas_revision: str | None = None




class CanvasModelResponse(StrictSchema):
    explanation: str | None = None
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]



class AIMessageResponse(StrictSchema):
    run_id: UUID
    status: AIRunStatusValue

class AIRunResponse(StrictSchema):
    run_id: UUID
    status: AIRunStatusValue
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    explanation: str | None = None
    result_canvas_revision: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    canvas: CanvasModelResponse | None = None
