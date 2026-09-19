import unittest

from pydantic import ValidationError

from schema.ai_canvas_schema import AICanvasEdge
from service.ai_model_service import _build_response_json_schema


VALID_EDGE = {
    "id": "edge-1",
    "source": "node-1",
    "target": "node-2",
    "sourceHandle": "right",
    "targetHandle": "left",
    "type": "smoothstep",
    "animated": False,
    "style": {
        "stroke": "var(--text-faint)",
        "strokeWidth": 1.5,
    },
    "markerEnd": {
        "type": "arrowclosed",
        "color": "var(--text-faint)",
    },
}


class GeminiSchemaCompatibilityTests(unittest.TestCase):
    def test_response_json_schema_uses_supported_keywords(self) -> None:
        schema = _build_response_json_schema()

        self.assertEqual(
            schema["properties"]["outcome"]["enum"],
            ["generated", "unsupported", "needs_clarification"],
        )
        canvas_schema = schema["properties"]["canvas"]["anyOf"][0]
        self.assertEqual(canvas_schema["required"], ["nodes", "edges"])
        node_schema = canvas_schema["properties"]["nodes"]["items"]
        self.assertEqual(
            node_schema["required"],
            ["id", "type", "position", "data"],
        )
        self.assertEqual(node_schema["properties"]["type"]["enum"], ["canvasNode"])
        position_schema = node_schema["properties"]["position"]
        self.assertEqual(position_schema["properties"]["x"]["minimum"], -10000)
        self.assertEqual(position_schema["properties"]["x"]["maximum"], 10000)
        edge_schema = canvas_schema["properties"]["edges"]["items"]
        self.assertIn("sourceHandle", edge_schema["required"])
        self.assertNotIn("$ref", str(schema))
        self.assertFalse(schema["additionalProperties"])
        schema_text = str(schema)
        for keyword in ("additionalProperties", "minimum", "maximum"):
            self.assertIn(keyword, schema_text)

    def test_edge_contract_still_rejects_animation(self) -> None:
        with self.assertRaises(ValidationError):
            AICanvasEdge.model_validate({**VALID_EDGE, "animated": True})

    def test_edge_contract_still_rejects_other_stroke_widths(self) -> None:
        with self.assertRaises(ValidationError):
            AICanvasEdge.model_validate(
                {
                    **VALID_EDGE,
                    "style": {
                        **VALID_EDGE["style"],
                        "strokeWidth": 2,
                    },
                }
            )


if __name__ == "__main__":
    unittest.main()
