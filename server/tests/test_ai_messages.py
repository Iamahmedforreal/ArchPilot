import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from model.ai import AIMessageRole, AIRunKind, AIRunStatus
from service.ai_run_service import (
    AIDesignCanvasRevisionConflictError,
    AIDesignCanvasRevisionRequiredError,
    create_ai_design_run,
    get_project_ai_messages,
)


class AIMessagePersistenceTests(unittest.IsolatedAsyncioTestCase):
    async def test_design_submission_persists_user_message_for_the_run(self):
        session = MagicMock()
        session.scalar = AsyncMock(
            return_value=SimpleNamespace(id=7, canvas_json_path=None)
        )
        session.flush = AsyncMock()
        session.commit = AsyncMock()

        result = await create_ai_design_run(
            session,
            "user-1",
            7,
            "Add a cache",
        )

        run = session.add.call_args_list[0].args[0]
        message = session.add.call_args_list[1].args[0]
        self.assertEqual(run.kind, AIRunKind.DESIGN)
        self.assertEqual(run.status, AIRunStatus.PENDING)
        self.assertEqual(message.run_id, run.id)
        self.assertEqual(message.role, AIMessageRole.USER)
        self.assertEqual(message.message, "Add a cache")
        self.assertIsNone(message.response)
        self.assertIsNone(run.base_canvas_revision)
        self.assertEqual(result["status"], "PENDING")

    async def test_design_submission_stores_expected_canvas_revision(self):
        session = MagicMock()
        session.scalar = AsyncMock(
            return_value=SimpleNamespace(id=7, canvas_json_path="blob://canvas")
        )
        session.flush = AsyncMock()
        session.commit = AsyncMock()

        with patch(
            "service.ai_run_service.load_project_canvas_revision",
            AsyncMock(return_value="rev-4"),
        ):
            await create_ai_design_run(
                session,
                "user-1",
                7,
                "Add a cache",
                "rev-4",
            )

        run = session.add.call_args_list[0].args[0]
        self.assertEqual(run.base_canvas_revision, "rev-4")

    async def test_design_submission_persists_clarification_answers(self):
        session = MagicMock()
        session.scalar = AsyncMock(
            return_value=SimpleNamespace(id=7, canvas_json_path=None)
        )
        session.flush = AsyncMock()
        session.commit = AsyncMock()

        await create_ai_design_run(
            session,
            "user-1",
            7,
            "Make my architecture scalable",
            clarification_answers=[
                {
                    "question": "What scale are you targeting?",
                    "answer": "Thousands of concurrent users",
                }
            ],
        )

        run = session.add.call_args_list[0].args[0]
        self.assertEqual(run.clarification_answers[0]["answer"], "Thousands of concurrent users")
        message = session.add.call_args_list[1].args[0]
        self.assertEqual(
            message.message,
            "Clarification answers: What scale are you targeting?: Thousands of concurrent users",
        )

    async def test_design_submission_requires_revision_for_saved_canvas(self):
        session = MagicMock()
        session.scalar = AsyncMock(
            return_value=SimpleNamespace(id=7, canvas_json_path="blob://canvas")
        )
        session.rollback = AsyncMock()

        with patch(
            "service.ai_run_service.load_project_canvas_revision",
            AsyncMock(return_value="rev-4"),
        ):
            with self.assertRaises(AIDesignCanvasRevisionRequiredError):
                await create_ai_design_run(
                    session,
                    "user-1",
                    7,
                    "Add a cache",
                )

        session.add.assert_not_called()
        session.rollback.assert_awaited_once_with()

    async def test_design_submission_accepts_revision_for_saved_canvas(self):
        session = MagicMock()
        session.scalar = AsyncMock(
            return_value=SimpleNamespace(id=7, canvas_json_path="blob://canvas")
        )
        session.flush = AsyncMock()
        session.commit = AsyncMock()

        with patch(
            "service.ai_run_service.load_project_canvas_revision",
            AsyncMock(return_value="rev-4"),
        ):
            await create_ai_design_run(
                session,
                "user-1",
                7,
                "Add a cache",
                "rev-4",
            )

        run = session.add.call_args_list[0].args[0]
        self.assertEqual(run.base_canvas_revision, "rev-4")

    async def test_design_submission_rejects_stale_canvas_revision(self):
        session = MagicMock()
        session.scalar = AsyncMock(
            return_value=SimpleNamespace(id=7, canvas_json_path="blob://canvas")
        )
        session.rollback = AsyncMock()

        with patch(
            "service.ai_run_service.load_project_canvas_revision",
            AsyncMock(return_value="rev-5"),
        ):
            with self.assertRaises(AIDesignCanvasRevisionConflictError):
                await create_ai_design_run(
                    session,
                    "user-1",
                    7,
                    "Add a cache",
                    "rev-4",
                )

        session.add.assert_not_called()

    async def test_project_messages_expand_saved_response_as_assistant_message(self):
        created_at = datetime(2026, 10, 8, tzinfo=timezone.utc)
        session = MagicMock()
        session.scalars = AsyncMock(
            return_value=[
                SimpleNamespace(
                    id=uuid4(),
                    role=AIMessageRole.USER,
                    message="Add a cache",
                    response="I added a cache to the design.",
                    created_at=created_at,
                )
            ]
        )

        with patch(
            "service.ai_run_service.get_owned_project",
            AsyncMock(return_value=SimpleNamespace(id=7)),
        ):
            result = await get_project_ai_messages(session, "user-1", 7)

        self.assertEqual([item["role"] for item in result], ["USER", "ASSISTANT"])
        self.assertEqual(result[0]["message"], "Add a cache")
        self.assertEqual(result[1]["message"], "I added a cache to the design.")


if __name__ == "__main__":
    unittest.main()
