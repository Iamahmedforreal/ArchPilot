import json
from typing import Any

from model.ai import AIRun
from schema.ai_canvas_schema import AIDesignModelResponse, SUPPORTED_COMPONENT_ICONS


COMPONENT_MEANINGS = {
    "client": "Generic user or client device",
    "mobile": "Mobile application",
    "webApp": "Browser-based web application",
    "api": "API endpoint or gateway",
    "service": "Backend or microservice",
    "worker": "Asynchronous background worker",
    "container": "Containerized runtime or deployment unit",
    "database": "Persistent database",
    "cache": "Low-latency cache",
    "storage": "Object or file storage",
    "queue": "Message queue, broker, or event bus",
    "loadBalancer": "Load balancer or traffic router",
    "authentication": "Authentication or identity service",
    "externalService": "Third-party or external system",
}

DEFAULT_COMPONENT_SIZES = {
    component_type: {
        "width": 176 if component_type in {
            "service",
            "storage",
            "queue",
            "loadBalancer",
            "authentication",
            "externalService",
        } else 160,
        "height": 88,
    }
    for component_type in SUPPORTED_COMPONENT_ICONS
}

SMALL_CANVAS_EXAMPLE = {
    "outcome": "generated",
    "explanation": "A web application calls an API backed by PostgreSQL.",
    "canvas": {
        "nodes": [
            {
                "id": "web-app",
                "type": "canvasNode",
                "position": {"x": 0, "y": 100},
                "data": {
                    "label": "Web App",
                    "componentType": "webApp",
                    "iconKey": "webApp",
                    "color": "default",
                    "textColor": "var(--text-primary)",
                    "size": {"width": 160, "height": 88},
                },
            },
            {
                "id": "api",
                "type": "canvasNode",
                "position": {"x": 240, "y": 100},
                "data": {
                    "label": "API",
                    "componentType": "api",
                    "iconKey": "api",
                    "color": "default",
                    "textColor": "var(--text-primary)",
                    "size": {"width": 160, "height": 88},
                },
            },
            {
                "id": "postgres",
                "type": "canvasNode",
                "position": {"x": 480, "y": 100},
                "data": {
                    "label": "PostgreSQL",
                    "componentType": "database",
                    "iconKey": "database",
                    "color": "default",
                    "textColor": "var(--text-primary)",
                    "size": {"width": 160, "height": 88},
                },
            },
        ],
        "edges": [
            {
                "id": "web-app-api",
                "source": "web-app",
                "target": "api",
                "sourceHandle": "right",
                "targetHandle": "left",
                "type": "smoothstep",
                "animated": False,
                "style": {"stroke": "var(--text-faint)", "strokeWidth": 1.5},
                "markerEnd": {
                    "type": "arrowclosed",
                    "color": "var(--text-faint)",
                },
            },
            {
                "id": "api-postgres",
                "source": "api",
                "target": "postgres",
                "sourceHandle": "right",
                "targetHandle": "left",
                "type": "smoothstep",
                "animated": False,
                "style": {"stroke": "var(--text-faint)", "strokeWidth": 1.5},
                "markerEnd": {
                    "type": "arrowclosed",
                    "color": "var(--text-faint)",
                },
            },
        ],
    },
}


def _application_instructions() -> str:
    example = json.dumps(SMALL_CANVAS_EXAMPLE, indent=2)
    return (
        "Return only JSON matching the supplied response schema. Use outcome "
        "'generated' with a complete canvas, 'unsupported' when the request is "
        "not a system-design task, or 'needs_clarification' when essential "
        "requirements are missing. Non-generated outcomes must use a null "
        "canvas. Nodes use the fixed architecture-card rendering selected by "
        "type 'canvasNode'; do not add a shape field. Use only listed component "
        "and icon registry keys. Lay nodes out left to right with at least 64px "
        "between node bounds, avoid overlaps, use short labels, connect only "
        "existing node IDs, and choose handles that match the visual direction. "
        "All interaction callbacks stay in the frontend and must not appear in "
        f"JSON. Small valid example:\n{example}"
    )


def prepare_design_context(run: AIRun) -> dict[str, Any]:
    supported_components = [
        {
            "componentType": component_type,
            "iconKey": icon_key,
            "meaning": COMPONENT_MEANINGS[component_type],
            "defaultSize": DEFAULT_COMPONENT_SIZES[component_type],
        }
        for component_type, icon_key in SUPPORTED_COMPONENT_ICONS.items()
    ]

    return {
        "instruction": run.instruction,
        "supported_node_types": ["canvasNode"],
        "supported_shapes": [
            {
                "key": "architecture-card",
                "meaning": "The fixed rounded component card rendered by canvasNode",
            }
        ],
        "supported_components": supported_components,
        "connection_handles": ["top", "right", "bottom", "left"],
        "supported_edge_types": ["smoothstep"],
        "layout_rules": [
            "Prefer a left-to-right architecture flow.",
            "Keep at least 64px between node bounds and avoid overlaps.",
            "Use default component sizes unless extra label room is needed.",
            "Every edge endpoint must reference a node ID in the same canvas.",
        ],
        "response_schema": AIDesignModelResponse.model_json_schema(),
        "application_instructions": _application_instructions(),
    }
