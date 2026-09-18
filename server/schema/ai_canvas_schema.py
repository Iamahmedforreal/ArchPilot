from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    FiniteFloat,
    StringConstraints,
    field_validator,
    model_validator,
)


MAX_AI_NODES = 50
MAX_AI_EDGES = 100
MAX_NODE_LABEL_LENGTH = 120
MAX_EXPLANATION_LENGTH = 1000

SUPPORTED_COMPONENT_ICONS = {
    "client": "client",
    "mobile": "mobile",
    "webApp": "webApp",
    "api": "api",
    "service": "server",
    "worker": "worker",
    "container": "container",
    "database": "database",
    "cache": "cache",
    "storage": "storage",
    "queue": "queue",
    "loadBalancer": "loadBalancer",
    "authentication": "authentication",
    "externalService": "externalService",
}

SUPPORTED_NODE_COLOR_PAIRS = {
    ("default", "var(--text-primary)"),
    ("var(--bg-subtle)", "var(--text-primary)"),
    ("#3a1a14", "var(--accent-primary-hover)"),
    ("#2a2140", "#b7a9ff"),
    ("#332510", "var(--state-warning)"),
    ("#173524", "var(--state-success)"),
    ("#242424", "var(--text-primary)"),
}

NodeId = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=64,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]*$",
    ),
]
NodeLabel = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=MAX_NODE_LABEL_LENGTH,
    ),
]
Explanation = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=MAX_EXPLANATION_LENGTH,
    ),
]
Coordinate = Annotated[FiniteFloat, Field(ge=-10000, le=10000)]
NodeWidth = Annotated[FiniteFloat, Field(ge=80, le=480)]
NodeHeight = Annotated[FiniteFloat, Field(ge=48, le=320)]
NodeList = Annotated[list["AICanvasNode"], Field(min_length=1, max_length=MAX_AI_NODES)]
EdgeList = Annotated[list["AICanvasEdge"], Field(max_length=MAX_AI_EDGES)]


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AICanvasPosition(StrictSchema):
    x: Coordinate
    y: Coordinate


class AICanvasNodeSize(StrictSchema):
    width: NodeWidth
    height: NodeHeight


class AICanvasNodeData(StrictSchema):
    label: NodeLabel
    componentType: Literal[
        "client",
        "mobile",
        "webApp",
        "api",
        "service",
        "worker",
        "container",
        "database",
        "cache",
        "storage",
        "queue",
        "loadBalancer",
        "authentication",
        "externalService",
    ]
    iconKey: Literal[
        "client",
        "mobile",
        "webApp",
        "api",
        "server",
        "worker",
        "container",
        "database",
        "cache",
        "storage",
        "queue",
        "loadBalancer",
        "authentication",
        "externalService",
    ]
    color: Literal[
        "default",
        "var(--bg-subtle)",
        "#3a1a14",
        "#2a2140",
        "#332510",
        "#173524",
        "#242424",
    ]
    textColor: Literal[
        "var(--text-primary)",
        "var(--accent-primary-hover)",
        "#b7a9ff",
        "var(--state-warning)",
        "var(--state-success)",
    ]
    size: AICanvasNodeSize

    @model_validator(mode="after")
    def validate_registry_values(self) -> "AICanvasNodeData":
        expected_icon = SUPPORTED_COMPONENT_ICONS[self.componentType]
        if self.iconKey != expected_icon:
            raise ValueError(
                f"iconKey must be {expected_icon!r} for {self.componentType!r}"
            )

        if (self.color, self.textColor) not in SUPPORTED_NODE_COLOR_PAIRS:
            raise ValueError("color and textColor must use a supported palette pair")

        return self


class AICanvasNode(StrictSchema):
    id: NodeId
    type: Literal["canvasNode"]
    position: AICanvasPosition
    data: AICanvasNodeData


class AICanvasEdgeStyle(StrictSchema):
    stroke: Literal["var(--text-faint)"]
    strokeWidth: Annotated[FiniteFloat, Field(ge=1.5, le=1.5)]

    @field_validator("strokeWidth")
    @classmethod
    def validate_stroke_width(cls, value: float) -> float:
        if value != 1.5:
            raise ValueError("strokeWidth must be 1.5")
        return value


class AICanvasEdgeMarker(StrictSchema):
    type: Literal["arrowclosed"]
    color: Literal["var(--text-faint)"]


class AICanvasEdge(StrictSchema):
    id: NodeId
    source: NodeId
    target: NodeId
    sourceHandle: Literal["top", "right", "bottom", "left"]
    targetHandle: Literal["top", "right", "bottom", "left"]
    type: Literal["smoothstep"]
    animated: bool
    style: AICanvasEdgeStyle
    markerEnd: AICanvasEdgeMarker

    @field_validator("animated")
    @classmethod
    def validate_not_animated(cls, value: bool) -> bool:
        if value is not False:
            raise ValueError("animated must be false")
        return value


class AICanvas(StrictSchema):
    nodes: NodeList
    edges: EdgeList

    @model_validator(mode="after")
    def validate_graph_integrity(self) -> "AICanvas":
        node_ids = [node.id for node in self.nodes]
        if len(node_ids) != len(set(node_ids)):
            raise ValueError("node IDs must be unique")

        edge_ids = [edge.id for edge in self.edges]
        if len(edge_ids) != len(set(edge_ids)):
            raise ValueError("edge IDs must be unique")

        known_node_ids = set(node_ids)
        for edge in self.edges:
            if edge.source not in known_node_ids or edge.target not in known_node_ids:
                raise ValueError("edge endpoints must reference existing node IDs")

        return self


class AIDesignModelResponse(StrictSchema):
    outcome: Literal["generated", "unsupported", "needs_clarification"]
    explanation: Explanation
    canvas: AICanvas | None

    @model_validator(mode="after")
    def validate_outcome_canvas(self) -> "AIDesignModelResponse":
        if self.outcome == "generated" and self.canvas is None:
            raise ValueError("canvas is required when outcome is generated")
        if self.outcome != "generated" and self.canvas is not None:
            raise ValueError("canvas must be null unless outcome is generated")

        return self
