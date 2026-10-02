import asyncio
import unittest

from starlette.requests import Request

from middleware.ai_rate_limit import is_ai_generation_request
from service.rate_limit_service import (
    RateLimitStorageError,
    consume_ai_rate_limit,
)


class FakeRedis:
    def __init__(self):
        self.values = {}

    async def get(self, key):
        return self.values.get(key)

    async def set(self, key, value):
        self.values[key] = value


class FailingRedis(FakeRedis):
    async def get(self, key):
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


if __name__ == "__main__":
    unittest.main()
