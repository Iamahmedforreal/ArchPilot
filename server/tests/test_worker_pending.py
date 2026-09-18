import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from model.ai import AIRunStatus
from schema.ai_canvas_schema import AIDesignModelResponse
from service.ai_context_service import SMALL_CANVAS_EXAMPLE
from service.ai_model_service import AIModelError
from service.ai_run_service import get_ai_run_status
from workers.ai_chat_worker import (
    _generate_design_with_retry,
    _claim_run,
    _persist_response,
    _persist_success,
    generate_canvas,
)


def model_response(**changes) -> AIDesignModelResponse:
    payload = {**SMALL_CANVAS_EXAMPLE, **changes}
    return AIDesignModelResponse.model_validate(payload)


def mocked_session(scalar_result):
    session = MagicMock()
    session.scalar = AsyncMock(return_value=scalar_result)
    session.commit = AsyncMock()
    context = MagicMock()
    context.__aenter__ = AsyncMock(return_value=session)
    context.__aexit__ = AsyncMock(return_value=None)
    return session, MagicMock(return_value=context)


def statement_values(statement):
    return {
        column.key: bind.value
        for column, bind in statement._values.items()
    }


class WorkerPersistenceTests(unittest.IsolatedAsyncioTestCase):
    async def test_provider_busy_retries_same_run_then_succeeds(self):
        run_id = uuid4()
        busy = AIModelError(
            "MODEL_PROVIDER_BUSY",
            "AI generation is temporarily busy. Try again shortly.",
        )
        response = model_response()

        with (
            patch(
                "workers.ai_chat_worker.generate_design",
                AsyncMock(side_effect=[busy, busy, response]),
            ) as generate,
            patch(
                "workers.ai_chat_worker.asyncio.sleep",
                AsyncMock(),
            ) as sleep,
        ):
            result = await _generate_design_with_retry({}, run_id)

        self.assertIs(result, response)
        self.assertEqual(generate.await_count, 3)
        self.assertEqual(
            [call.args[0] for call in sleep.await_args_list],
            [2, 4],
        )

    async def test_provider_busy_is_raised_after_bounded_attempts(self):
        run_id = uuid4()
        busy = AIModelError(
            "MODEL_PROVIDER_BUSY",
            "AI generation is temporarily busy. Try again shortly.",
        )

        with (
            patch(
                "workers.ai_chat_worker.generate_design",
                AsyncMock(side_effect=busy),
            ) as generate,
            patch(
                "workers.ai_chat_worker.asyncio.sleep",
                AsyncMock(),
            ) as sleep,
        ):
            with self.assertRaises(AIModelError) as raised:
                await _generate_design_with_retry({}, run_id)

        self.assertIs(raised.exception, busy)
        self.assertEqual(generate.await_count, 3)
        self.assertEqual(sleep.await_count, 2)

    async def test_non_retryable_model_error_is_not_retried(self):
        run_id = uuid4()
        invalid = AIModelError(
            "MODEL_INVALID_RESPONSE",
            "The model returned an invalid design.",
        )

        with (
            patch(
                "workers.ai_chat_worker.generate_design",
                AsyncMock(side_effect=invalid),
            ) as generate,
            patch(
                "workers.ai_chat_worker.asyncio.sleep",
                AsyncMock(),
            ) as sleep,
        ):
            with self.assertRaises(AIModelError):
                await _generate_design_with_retry({}, run_id)

        generate.assert_awaited_once_with({})
        sleep.assert_not_awaited()

    async def test_claim_is_atomic_and_sets_running_progress(self):
        run_id = uuid4()
        claimed_run = SimpleNamespace(id=run_id, instruction="Design an API")
        session, factory = mocked_session(claimed_run)

        with patch("workers.ai_chat_worker.async_session", factory):
            result = await _claim_run(run_id)

        self.assertIs(result, claimed_run)
        statement = session.scalar.await_args.args[0]
        values = statement_values(statement)
        params = statement.compile().params
        self.assertEqual(values["status"], AIRunStatus.RUNNING)
        self.assertEqual(values["stage"], "preparing")
        self.assertIsNotNone(values["started_at"].tzinfo)
        self.assertIn(AIRunStatus.PENDING, params.values())
        session.commit.assert_awaited_once_with()

    async def test_success_persists_canvas_and_get_exposes_result(self):
        run_id = uuid4()
        response = model_response()
        session, factory = mocked_session(run_id)

        with patch("workers.ai_chat_worker.async_session", factory):
            persisted = await _persist_success(run_id, response)

        self.assertTrue(persisted)
        statement = session.scalar.await_args.args[0]
        values = statement_values(statement)
        self.assertEqual(values["proposal_json"], response.canvas.model_dump(mode="json"))
        self.assertEqual(values["explanation"], response.explanation)
        self.assertEqual(values["status"], AIRunStatus.SUCCEEDED)
        self.assertIsNone(values["stage"])
        self.assertIsNone(values["error_code"])
        self.assertIn(AIRunStatus.RUNNING, statement.compile().params.values())

        stored_run = SimpleNamespace(
            id=run_id,
            status=AIRunStatus.SUCCEEDED,
            stage=None,
            proposal_json=values["proposal_json"],
            error_code=None,
            error_message=None,
        )
        read_session = MagicMock()
        read_session.scalar = AsyncMock(return_value=stored_run)
        with patch(
            "service.ai_run_service.get_owned_project",
            AsyncMock(return_value=SimpleNamespace(id=7)),
        ):
            result = await get_ai_run_status(
                read_session,
                "user_123",
                7,
                run_id,
            )

        self.assertEqual(result["status"], "SUCCEEDED")
        self.assertEqual(result["result"], values["proposal_json"])
        self.assertIsNone(result["error"])

    async def test_non_generated_outcomes_use_safe_failure_codes(self):
        cases = (
            ("unsupported", "OUT_OF_SCOPE"),
            ("needs_clarification", "NEEDS_CLARIFICATION"),
        )

        for outcome, expected_code in cases:
            with self.subTest(outcome=outcome):
                run_id = uuid4()
                response = model_response(
                    outcome=outcome,
                    explanation="More information is required.",
                    canvas=None,
                )
                session, factory = mocked_session(run_id)
                with patch("workers.ai_chat_worker.async_session", factory):
                    persisted = await _persist_response(run_id, response)

                self.assertTrue(persisted)
                statement = session.scalar.await_args.args[0]
                values = statement_values(statement)
                self.assertEqual(values["status"], AIRunStatus.FAILED)
                self.assertEqual(values["error_code"], expected_code)
                self.assertEqual(values["error_message"], response.explanation)
                self.assertEqual(values["explanation"], response.explanation)
                self.assertIsNone(values["proposal_json"])
                self.assertIsNone(values["stage"])
                self.assertIn(
                    AIRunStatus.RUNNING,
                    statement.compile().params.values(),
                )

    async def test_model_failure_is_persisted_safely(self):
        run_id = uuid4()
        run = SimpleNamespace(id=run_id, instruction="Design an API")
        model_error = AIModelError("MODEL_TIMEOUT", "AI generation timed out.")

        with (
            patch("workers.ai_chat_worker._claim_run", AsyncMock(return_value=run)),
            patch(
                "workers.ai_chat_worker._set_generation_stage",
                AsyncMock(return_value=True),
            ),
            patch(
                "workers.ai_chat_worker.generate_design",
                AsyncMock(side_effect=model_error),
            ),
            patch(
                "workers.ai_chat_worker._persist_failure_or_raise",
                AsyncMock(),
            ) as persist_failure,
        ):
            await generate_canvas({}, str(run_id))

        persist_failure.assert_awaited_once_with(
            run_id,
            "MODEL_TIMEOUT",
            "AI generation timed out.",
        )

    async def test_invalid_and_unclaimable_runs_are_skipped(self):
        with patch("workers.ai_chat_worker._claim_run", AsyncMock()) as claim:
            await generate_canvas({}, "invalid")
        claim.assert_not_awaited()

        for state in ("missing", "terminal", "already-running"):
            with self.subTest(state=state):
                with (
                    patch(
                        "workers.ai_chat_worker._claim_run",
                        AsyncMock(return_value=None),
                    ),
                    patch(
                        "workers.ai_chat_worker.generate_design",
                        AsyncMock(),
                    ) as generate,
                ):
                    await generate_canvas({}, str(uuid4()))
                generate.assert_not_awaited()

    async def test_duplicate_claims_permit_only_one_generation(self):
        run_id = uuid4()
        run = SimpleNamespace(id=run_id, instruction="Design an API")
        response = model_response()

        with (
            patch(
                "workers.ai_chat_worker._claim_run",
                AsyncMock(side_effect=[run, None]),
            ),
            patch(
                "workers.ai_chat_worker._set_generation_stage",
                AsyncMock(return_value=True),
            ),
            patch(
                "workers.ai_chat_worker.generate_design",
                AsyncMock(return_value=response),
            ) as generate,
            patch(
                "workers.ai_chat_worker._persist_response",
                AsyncMock(return_value=True),
            ),
        ):
            await asyncio.gather(
                generate_canvas({}, str(run_id)),
                generate_canvas({}, str(run_id)),
            )

        generate.assert_awaited_once()

    async def test_run_changed_during_generation_is_not_overwritten(self):
        run_id = uuid4()
        run = SimpleNamespace(id=run_id, instruction="Design an API")

        with (
            patch("workers.ai_chat_worker._claim_run", AsyncMock(return_value=run)),
            patch(
                "workers.ai_chat_worker._set_generation_stage",
                AsyncMock(return_value=True),
            ),
            patch(
                "workers.ai_chat_worker.generate_design",
                AsyncMock(return_value=model_response()),
            ),
            patch(
                "workers.ai_chat_worker._persist_response",
                AsyncMock(return_value=False),
            ) as persist,
        ):
            await generate_canvas({}, str(run_id))

        persist.assert_awaited_once()

    async def test_completion_persistence_failure_reaches_arq(self):
        run_id = uuid4()
        run = SimpleNamespace(id=run_id, instruction="Design an API")

        with (
            patch("workers.ai_chat_worker._claim_run", AsyncMock(return_value=run)),
            patch(
                "workers.ai_chat_worker._set_generation_stage",
                AsyncMock(return_value=True),
            ),
            patch(
                "workers.ai_chat_worker.generate_design",
                AsyncMock(return_value=model_response()),
            ),
            patch(
                "workers.ai_chat_worker._persist_response",
                AsyncMock(side_effect=RuntimeError("database unavailable")),
            ),
            patch(
                "workers.ai_chat_worker._persist_failure_or_raise",
                AsyncMock(),
            ) as persist_failure,
        ):
            with self.assertRaisesRegex(RuntimeError, "database unavailable"):
                await generate_canvas({}, str(run_id))

        persist_failure.assert_not_awaited()

    async def test_cancelled_error_propagates_without_failure_write(self):
        run_id = uuid4()
        run = SimpleNamespace(id=run_id, instruction="Design an API")

        with (
            patch("workers.ai_chat_worker._claim_run", AsyncMock(return_value=run)),
            patch(
                "workers.ai_chat_worker._set_generation_stage",
                AsyncMock(return_value=True),
            ),
            patch(
                "workers.ai_chat_worker.generate_design",
                AsyncMock(side_effect=asyncio.CancelledError),
            ),
            patch(
                "workers.ai_chat_worker._persist_failure_or_raise",
                AsyncMock(),
            ) as persist_failure,
        ):
            with self.assertRaises(asyncio.CancelledError):
                await generate_canvas({}, str(run_id))

        persist_failure.assert_not_awaited()
