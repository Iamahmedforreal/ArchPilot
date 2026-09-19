import unittest

from service.ai_retry_config import (
    AI_RUN_PERSISTENCE_MARGIN_SECONDS,
    DEFAULT_MODEL_REQUEST_TIMEOUT_SECONDS,
    MODEL_REQUEST_ATTEMPTS,
    MODEL_RETRY_DELAYS_SECONDS,
    ai_job_timeout_seconds,
    model_request_timeout_seconds,
)
from utils.utils import settings
from workers.config_worker import WorkerSettings


class AIRetryConfigurationTests(unittest.TestCase):
    def test_default_timeout_covers_every_attempt_backoff_and_persistence(self):
        expected = (
            MODEL_REQUEST_ATTEMPTS * DEFAULT_MODEL_REQUEST_TIMEOUT_SECONDS
            + sum(MODEL_RETRY_DELAYS_SECONDS)
            + AI_RUN_PERSISTENCE_MARGIN_SECONDS
        )

        self.assertEqual(model_request_timeout_seconds(None), 120)
        self.assertEqual(MODEL_REQUEST_ATTEMPTS, 3)
        self.assertEqual(MODEL_RETRY_DELAYS_SECONDS, (2, 4))
        self.assertEqual(ai_job_timeout_seconds(None), 426)
        self.assertEqual(ai_job_timeout_seconds(None), expected)

    def test_configured_request_timeout_updates_complete_job_budget(self):
        self.assertEqual(model_request_timeout_seconds(30), 30)
        self.assertEqual(ai_job_timeout_seconds(30), 156)

    def test_worker_uses_shared_timeout_calculation(self):
        self.assertEqual(
            WorkerSettings.job_timeout,
            ai_job_timeout_seconds(settings.gemini_timeout_seconds),
        )


if __name__ == "__main__":
    unittest.main()
