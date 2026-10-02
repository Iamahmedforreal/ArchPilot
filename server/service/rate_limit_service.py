import time

from arq.connections import ArqRedis

from utils.utils import settings


class RateLimitStorageError(Exception):
    """Raised when the Redis-backed rate limiter cannot read or write state."""


AI_RATE_LIMIT_SCRIPT = """
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local tokens = redis.call('HGET', KEYS[1], 'tokens')
local last_refill = redis.call('HGET', KEYS[1], 'last_refill_timestamp')

if tokens == false or last_refill == false then
    tokens = capacity
else
    local elapsed = math.max(0, now - tonumber(last_refill))
    tokens = math.min(capacity, tonumber(tokens) + elapsed * refill_rate)
end

local allowed = 0
if tokens >= 1 then
    tokens = tokens - 1
    allowed = 1
end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'last_refill_timestamp', now)
redis.call('EXPIRE', KEYS[1], math.ceil(capacity / refill_rate))
return allowed
"""


def rate_limit_key(user_id: str) -> str:
    return f"rate_limit:ai:{user_id}"


async def consume_ai_rate_limit(
    redis: ArqRedis,
    user_id: str,
    *,
    now: float | None = None,
) -> bool:
    """Consume one AI token through an atomic Redis-side token-bucket update."""
    current_time = time.time() if now is None else now
    capacity = settings.ai_rate_limit_capacity
    refill_period = settings.ai_rate_limit_period_seconds
    refill_rate = capacity / refill_period

    try:
        result = await redis.eval(
            AI_RATE_LIMIT_SCRIPT,
            1,
            rate_limit_key(user_id),
            str(capacity),
            str(refill_rate),
            str(current_time),
        )
        return bool(int(result))
    except Exception as exc:
        raise RateLimitStorageError from exc
