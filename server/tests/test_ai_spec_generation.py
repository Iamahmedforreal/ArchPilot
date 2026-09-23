import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from model.ai import AIRunKind, AIRunStatus
from service.ai_context_service import SMALL_CANVAS_EXAMPLE
from service.ai_model_service import AIModelError
from service.ai_run_service import (
    AISpecCanvasRevisionConflictError,
    AIProjectNotFoundError,
    create_ai_spec_run,
    get_ai_run_status,
    get_project_file_blob,
)
from workers.ai_chat_worker import generate_spec, _persist_spec_success


def mocked_session(scalar_result=None):
    session = MagicMock()
    session.scalar = AsyncMock(return_value=scalar_result)
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.flush = AsyncMock()
    return session


class AISpecGenerationTests(unittest.IsolatedAsyncioTestCase):
    async def test_spec_run_uses_saved_canvas_snapshot_and_revision(self):
        project = SimpleNamespace(id=7)
        session = mocked_session()

        with (
            patch(
                "service.ai_run_service.get_owned_project",
                AsyncMock(return_value=project),
            ),
            patch(
                "service.ai_run_service.load_project_canvas",
                AsyncMock(return_value=(SMALL_CANVAS_EXAMPLE["canvas"], "rev-1")),
            ),
        ):
            result = await create_ai_spec_run(
                session,
                "user_123",
                7,
                "rev-1",
                "Focus on storage",
            )

        run = session.add.call_args.args[0]
        self.assertEqual(run.kind, AIRunKind.SPEC)
        self.assertEqual(run.project_id, 7)
        self.assertEqual(run.status, AIRunStatus.PENDING)
        self.assertEqual(run.instruction, "Focus on storage")
        self.assertEqual(run.base_canvas_revision, "rev-1")
        self.assertEqual(
            run.input_canvas_json["nodes"],
            SMALL_CANVAS_EXAMPLE["canvas"]["nodes"],
        )
        self.assertEqual(result["status"], "PENDING")
        session.commit.assert_awaited_once_with()

    async def test_spec_run_accepts_editor_canvas_without_ai_only_edge_style(self):
        editor_canvas = {
            "nodes": [
                {
                    "id": "api-1",
                    "type": "canvasNode",
                    "position": {"x": 20, "y": 30},
                    "data": {
                        "label": "API",
                        "componentType": "api",
                    },
                    "selected": False,
                },
                {
                    "id": "database-1",
                    "type": "canvasNode",
                    "position": {"x": 260, "y": 30},
                    "data": {
                        "label": "Database",
                        "componentType": "database",
                    },
                },
            ],
            "edges": [
                {
                    "id": "api-database",
                    "source": "api-1",
                    "target": "database-1",
                }
            ],
        }
        project = SimpleNamespace(id=7)
        session = mocked_session()

        with (
            patch(
                "service.ai_run_service.get_owned_project",
                AsyncMock(return_value=project),
            ),
            patch(
                "service.ai_run_service.load_project_canvas",
                AsyncMock(return_value=(editor_canvas, "rev-1")),
            ),
        ):
            await create_ai_spec_run(
                session,
                "user_123",
                7,
                "rev-1",
                None,
            )

        run = session.add.call_args.args[0]
        self.assertEqual(run.input_canvas_json, editor_canvas)

    async def test_spec_run_rejects_mismatched_saved_revision(self):
        session = mocked_session()

        with (
            patch(
                "service.ai_run_service.get_owned_project",
                AsyncMock(return_value=SimpleNamespace(id=7)),
            ),
            patch(
                "service.ai_run_service.load_project_canvas",
                AsyncMock(return_value=(SMALL_CANVAS_EXAMPLE["canvas"], "rev-2")),
            ),
        ):
            with self.assertRaises(AISpecCanvasRevisionConflictError):
                await create_ai_spec_run(
                    session,
                    "user_123",
                    7,
                    "rev-1",
                    None,
                )

        session.add.assert_not_called()
        session.rollback.assert_awaited_once_with()

    async def test_cross_owner_spec_file_lookup_is_not_exposed(self):
        session = mocked_session()

        with patch(
            "service.ai_run_service.get_owned_project",
            AsyncMock(return_value=None),
        ):
            with self.assertRaises(AIProjectNotFoundError):
                await get_project_file_blob(
                    session,
                    "other_user",
                    7,
                    uuid4(),
                )

        session.scalar.assert_not_awaited()

    async def test_cross_owner_cannot_create_or_poll_spec_run(self):
        session = mocked_session()
        run_id = uuid4()

        with patch(
            "service.ai_run_service.get_owned_project",
            AsyncMock(return_value=None),
        ):
            with self.assertRaises(AIProjectNotFoundError):
                await create_ai_spec_run(
                    session,
                    "other_user",
                    7,
                    "rev-1",
                    None,
                )

            with self.assertRaises(AIProjectNotFoundError):
                await get_ai_run_status(
                    session,
                    "other_user",
                    7,
                    run_id,
                )

    async def test_successful_spec_status_returns_file_metadata_not_blob_url(self):
        run_id = uuid4()
        file_id = uuid4()
        session = mocked_session(
            SimpleNamespace(
                id=run_id,
                kind=AIRunKind.SPEC,
                status=AIRunStatus.SUCCEEDED,
                stage=None,
                file_blob_id=file_id,
                proposal_json=None,
                error_code=None,
                error_message=None,
            )
        )

        with patch(
            "service.ai_run_service.get_owned_project",
            AsyncMock(return_value=SimpleNamespace(id=7)),
        ):
            result = await get_ai_run_status(session, "user_123", 7, run_id)

        self.assertEqual(result["kind"], "SPEC")
        self.assertEqual(result["status"], "SUCCEEDED")
        self.assertEqual(
            result["result"],
            {
                "file_id": str(file_id),
                "filename": "architecture-spec.md",
            },
        )
        self.assertNotIn("blob_url", str(result))

    async def test_worker_generates_spec_from_stored_snapshot_only(self):
        run_id = uuid4()
        snapshot = SMALL_CANVAS_EXAMPLE["canvas"]
        run = SimpleNamespace(
            id=run_id,
            project_id=7,
            instruction="Focus on the API",
            input_canvas_json=snapshot,
        )

        with (
            patch("workers.ai_chat_worker._claim_run", AsyncMock(return_value=run)),
            patch(
                "workers.ai_chat_worker._set_generation_stage",
                AsyncMock(return_value=True),
            ),
            patch(
                "workers.ai_chat_worker.generate_spec_markdown",
                AsyncMock(return_value="# Architecture Spec"),
            ) as generate_markdown,
            patch(
                "workers.ai_chat_worker.save_markdown_file",
                AsyncMock(return_value="private/spec.md"),
            ) as save_file,
            patch(
                "workers.ai_chat_worker._persist_spec_success",
                AsyncMock(return_value=True),
            ) as persist_success,
        ):
            await generate_spec({}, str(run_id))

        generate_markdown.assert_awaited_once_with(snapshot, "Focus on the API")
        save_file.assert_awaited_once_with(
            f"projects/7/specs/{run_id}.md",
            "# Architecture Spec",
        )
        persist_success.assert_awaited_once_with(run_id, "private/spec.md")

    async def test_worker_model_error_fails_spec_run_safely(self):
        run_id = uuid4()
        run = SimpleNamespace(
            id=run_id,
            project_id=7,
            instruction="",
            input_canvas_json=SMALL_CANVAS_EXAMPLE["canvas"],
        )
        model_error = AIModelError(
            "MODEL_PROVIDER_ERROR",
            "AI generation is temporarily unavailable.",
        )

        with (
            patch("workers.ai_chat_worker._claim_run", AsyncMock(return_value=run)),
            patch(
                "workers.ai_chat_worker._set_generation_stage",
                AsyncMock(return_value=True),
            ),
            patch(
                "workers.ai_chat_worker.generate_spec_markdown",
                AsyncMock(side_effect=model_error),
            ),
            patch(
                "workers.ai_chat_worker._persist_failure_or_raise",
                AsyncMock(),
            ) as persist_failure,
        ):
            await generate_spec({}, str(run_id))

        persist_failure.assert_awaited_once_with(
            run_id,
            "MODEL_PROVIDER_ERROR",
            "AI generation is temporarily unavailable.",
        )

    async def test_spec_completion_reuses_existing_file_blob_for_retry(self):
        run_id = uuid4()
        file_id = uuid4()
        run = SimpleNamespace(
            id=run_id,
            kind=AIRunKind.SPEC,
            status=AIRunStatus.RUNNING,
            project_id=7,
            file_blob_id=None,
            proposal_json=None,
            explanation=None,
            stage="generation",
            completed_at=None,
            error_code="OLD",
            error_message="Old error",
        )
        file_blob = SimpleNamespace(id=file_id, project_id=7, blob_url="private/spec.md")
        session = mocked_session()
        session.scalar = AsyncMock(side_effect=[run, file_blob])
        context = MagicMock()
        context.__aenter__ = AsyncMock(return_value=session)
        context.__aexit__ = AsyncMock(return_value=None)

        with patch("workers.ai_chat_worker.async_session", MagicMock(return_value=context)):
            persisted = await _persist_spec_success(run_id, "private/spec.md")

        self.assertTrue(persisted)
        self.assertEqual(run.file_blob_id, file_id)
        self.assertEqual(run.status, AIRunStatus.SUCCEEDED)
        self.assertIsNone(run.error_code)
        self.assertIsNone(run.error_message)
        session.add.assert_not_called()
        session.commit.assert_awaited_once_with()


if __name__ == "__main__":
    unittest.main()
