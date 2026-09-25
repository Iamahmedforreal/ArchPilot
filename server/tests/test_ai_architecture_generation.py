import unittest

from pydantic import ValidationError

from schema.ai_canvas_schema import AIDesignModelResponse
from service.ai_context_service import SMALL_CANVAS_EXAMPLE


class AIArchitectureGenerationTests(unittest.TestCase):
    def test_generated_response_contains_a_canvas(self):
        response = AIDesignModelResponse.model_validate(SMALL_CANVAS_EXAMPLE)

        self.assertEqual(response.outcome, "generated")
        self.assertGreater(len(response.canvas.nodes), 0)
        self.assertGreaterEqual(len(response.canvas.edges), 0)

    def test_non_generated_response_cannot_include_a_canvas(self):
        with self.assertRaises(ValidationError):
            AIDesignModelResponse.model_validate(
                {
                    **SMALL_CANVAS_EXAMPLE,
                    "outcome": "unsupported",
                }
            )


if __name__ == "__main__":
    unittest.main()
