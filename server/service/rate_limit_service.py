import asyncio
import json
import time
from typing import Any

from arq.connections import ArqRedis

from utils.utils import settings


class RateLimitStorageError(Exception):
    """Raised when the Redis-backed rate limiter cannot read or write state."""


_rate_limit_lock = asyncio.Lock()


def rate_limit_key(user_id: str) -> str:
    return f"rate_limit:ai:{user_id}"


def _read_bucket(value: Any) -> tuple[float, float] | None:
    if value is None:
        return None

    if isinstance(value, bytes):
        value = value.decode("utf-8")

    bucket = json.loads(value)
    return float(bucket["tokens"]), float(bucket["last_refill_timestamp"])


async def consume_ai_rate_limit(
    redis: ArqRedis,
    user_id: str,
    *,
    now: float | None = None,
) -> bool:
    """Consume one AI token for a user, serializing the Redis read/update locally."""
    current_time = time.time() if now is None else now
    capacity = settings.ai_rate_limit_capacity
    refill_period = settings.ai_rate_limit_period_seconds
    refill_rate = capacity / refill_period

    async with _rate_limit_lock:
        try:
            raw_bucket = await redis.get(rate_limit_key(user_id))
            bucket = _read_bucket(raw_bucket)
            if bucket is None:
                tokens = float(capacity)
                last_refill_timestamp = current_time
            else:
                previous_tokens, last_refill_timestamp = bucket
                elapsed = max(0.0, current_time - last_refill_timestamp)
                tokens = min(capacity, previous_tokens + elapsed * refill_rate)

            allowed = tokens >= 1
            if allowed:
                tokens -= 1

            await redis.set(
                rate_limit_key(user_id),
                json.dumps(
                    {
                        "tokens": tokens,
                        "last_refill_timestamp": current_time,
                    }
                ),
            )
            return allowed
        except Exception as exc:
            raise RateLimitStorageError from exc
