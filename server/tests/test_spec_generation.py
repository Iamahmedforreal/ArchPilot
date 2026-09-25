import unittest

from service.ai_model_service import _build_spec_prompt
from service.ai_context_service import SMALL_CANVAS_EXAMPLE


class SpecGenerationTests(unittest.TestCase):
    def test_spec_prompt_describes_nodes_edges_and_instruction(self):
        prompt = _build_spec_prompt(
            SMALL_CANVAS_EXAMPLE["canvas"],
            "Focus on storage",
        )

        self.assertIn('"nodes"', prompt)
        self.assertIn('"connections"', prompt)
        self.assertIn("Focus on storage", prompt)


if __name__ == "__main__":
    unittest.main()
