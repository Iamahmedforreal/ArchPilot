# API Rate Limiting

All HTTP endpoints use SlowAPI's in-memory limiter configured in
`server/main.py`. Each client IP may make five requests within three minutes;
additional requests receive HTTP `429` until the window resets.

Redis is used by the application only for ARQ background-job queuing and does
not store rate-limit state.
