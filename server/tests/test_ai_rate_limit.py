import asyncio
import unittest

from starlette.requests import Request
from pydantic import ValidationError

from middleware.ai_rate_limit import is_ai_generation_request
from service.rate_limit_service import (
    AI_RATE_LIMIT_SCRIPT,
    RateLimitStorageError,
    consume_ai_rate_limit,
)
from utils.utils import Settings


class FakeRedis:
    def __init__(self):
        self.values = {}

    async def eval(self, script, numkeys, key, capacity, refill_rate, now):
        bucket = self.values.get(key)
        current_time = float(now)
        if bucket is None:
            tokens = float(capacity)
        else:
            elapsed = max(0.0, current_time - bucket["last_refill_timestamp"])
            tokens = min(
                float(capacity),
                bucket["tokens"] + elapsed * float(refill_rate),
            )

        allowed = tokens >= 1
        if allowed:
            tokens -= 1
        self.values[key] = {
            "tokens": tokens,
            "last_refill_timestamp": current_time,
        }
        return int(allowed)


class FailingRedis(FakeRedis):
    async def eval(self, *args):
        raise RuntimeError("Redis unavailable")


def request(method: str, path: str) -> Request:
    return Request(
        {
            "type": "http",
            "method": method,
            "path": path,
            "headers": [],
            "query_string": b"",
            "scheme": "http",
            "server": ("testserver", 80),
            "client": ("testclient", 50000),
        }
    )


class AIRateLimitTests(unittest.IsolatedAsyncioTestCase):
    async def test_five_requests_are_allowed_and_sixth_is_rejected(self):
        redis = FakeRedis()

        results = [
            await consume_ai_rate_limit(redis, "user-1", now=0)
            for _ in range(6)
        ]

        self.assertEqual(results, [True, True, True, True, True, False])

    async def test_users_have_independent_buckets(self):
        redis = FakeRedis()

        for _ in range(5):
            self.assertTrue(await consume_ai_rate_limit(redis, "user-1", now=0))

        self.assertFalse(await consume_ai_rate_limit(redis, "user-1", now=0))
        self.assertTrue(await consume_ai_rate_limit(redis, "user-2", now=0))

    async def test_tokens_refill_over_time(self):
        redis = FakeRedis()

        for _ in range(5):
            await consume_ai_rate_limit(redis, "user-1", now=0)

        self.assertTrue(await consume_ai_rate_limit(redis, "user-1", now=12))
        self.assertFalse(await consume_ai_rate_limit(redis, "user-1", now=12))

    async def test_concurrent_requests_cannot_overspend_a_bucket(self):
        redis = FakeRedis()

        results = await asyncio.gather(
            *(consume_ai_rate_limit(redis, "user-1", now=0) for _ in range(6))
        )

        self.assertEqual(sum(results), 5)

    async def test_redis_failure_is_not_treated_as_unlimited_access(self):
        with self.assertRaises(RateLimitStorageError):
            await consume_ai_rate_limit(FailingRedis(), "user-1", now=0)

    def test_only_ai_generation_posts_are_protected(self):
        self.assertTrue(
            is_ai_generation_request(request("POST", "/api/projects/1/ai/design"))
        )
        self.assertTrue(
            is_ai_generation_request(request("POST", "/api/projects/1/ai/spec"))
        )
        self.assertFalse(
            is_ai_generation_request(request("GET", "/api/projects/1/ai/runs/abc"))
        )
        self.assertFalse(
            is_ai_generation_request(request("GET", "/api/projects"))
        )

    def test_bucket_script_expires_idle_state_after_a_full_refill_period(self):
        self.assertIn("redis.call('EXPIRE'", AI_RATE_LIMIT_SCRIPT)
        self.assertIn("math.ceil(capacity / refill_rate)", AI_RATE_LIMIT_SCRIPT)

    def test_rate_limit_settings_must_be_positive(self):
        for field in ("ai_rate_limit_capacity", "ai_rate_limit_period_seconds"):
            with self.subTest(field=field), self.assertRaises(ValidationError):
                Settings(
                    database_url="postgresql+asyncpg://database",
                    redis_url="redis://localhost",
                    **{field: 0},
                )


if __name__ == "__main__":
    unittest.main()
