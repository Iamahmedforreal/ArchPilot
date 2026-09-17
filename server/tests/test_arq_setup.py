import unittest
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI

import main
from utils.redis import redis_settings
from worker import WorkerSettings, generate_canvas


class ARQSetupTests(unittest.IsolatedAsyncioTestCase):
    async def test_generate_canvas_logs_run_id(self):
        with self.assertLogs("arq.worker", level="INFO") as logs:
            await generate_canvas({}, "run-123")

        self.assertIn("run-123", logs.output[0])

    async def test_lifespan_stores_and_closes_redis_pool(self):
        pool = AsyncMock()
        app = FastAPI()

        with patch("main.create_pool", AsyncMock(return_value=pool)) as create_pool:
            async with main.lifespan(app):
                self.assertIs(app.state.redis, pool)

        create_pool.assert_awaited_once_with(redis_settings)
        pool.aclose.assert_awaited_once_with()

    def test_worker_uses_shared_redis_configuration(self):
        self.assertIs(WorkerSettings.redis_settings, redis_settings)
        self.assertEqual(WorkerSettings.functions, [generate_canvas])
        self.assertGreater(WorkerSettings.job_timeout, 0)
        self.assertGreater(WorkerSettings.max_jobs, 0)
