# AI API Rate Limiting

The two expensive AI submission endpoints are protected by
`server/middleware/ai_rate_limit.py`:

- `POST /api/projects/{project_id}/ai/design`
- `POST /api/projects/{project_id}/ai/spec`

The middleware authenticates the request with the existing Clerk flow and uses
the authenticated `user_id` as the Redis bucket identity. Each user starts with
5 tokens and refills at 5 tokens per 60 seconds. Redis stores `tokens` and
`last_refill_timestamp` under `rate_limit:ai:{user_id}`.

Requests without a token receive HTTP `429` with the detail
`AI request rate limit exceeded. Please try again shortly.` Non-AI endpoints,
AI run polling, and file downloads do not consume this allowance.

The service serializes the Redis read/calculate/write operation with a Python
lock for the first implementation. Redis errors return HTTP `503`; the
limiter does not fail open and allow unlimited AI requests.

Defaults can be changed with:

```text
AI_RATE_LIMIT_CAPACITY=5
AI_RATE_LIMIT_PERIOD_SECONDS=60
```
