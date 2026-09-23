from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints


MessageText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=8000),
]
SpecInstructionText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=1000),
]
AIRunStatusValue = Literal[
    "PENDING",
    "RUNNING",
    "SUCCEEDED",
    "FAILED",
    "CANCELLED",
]
AIRunKindValue = Literal["DESIGN", "SPEC"]


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AIMessageRequest(StrictSchema):
    message: MessageText


class AIMessageResponse(StrictSchema):
    run_id: UUID
    status: AIRunStatusValue


class AISpecRequest(StrictSchema):
    expected_canvas_revision: str
    instruction: SpecInstructionText | None = None


class AIRunErrorResponse(StrictSchema):
    code: str | None = None
    message: str | None = None


class AIRunStatusResponse(StrictSchema):
    run_id: UUID
    kind: AIRunKindValue
    status: AIRunStatusValue
    stage: str | None = None
    result: dict[str, Any] | None = None
    error: AIRunErrorResponse | None = None
