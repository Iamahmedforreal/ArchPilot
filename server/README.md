# ArchPilot Server

## Local Services

The Compose Redis service uses host port `6380` by default because `6379` may
already be occupied. Set `REDIS_URL=redis://127.0.0.1:6380/0` when FastAPI and
the worker run on your host; this is also the application default. Override the
published port with `REDIS_PORT` if needed, and set `REDIS_URL` to the same
port. When FastAPI and the worker run as Docker Compose services, use
`REDIS_URL=redis://redis:6379/0` so they connect through the Compose service
name.

Start PostgreSQL and Redis:

```powershell
docker compose up -d database redis
```

Start FastAPI from the `server` directory:

```powershell
uv run fastapi dev main.py
```

Start the ARQ worker in a separate terminal from the `server` directory:

```powershell
uv run arq worker.WorkerSettings
```

To manually verify job delivery, run this from the `server` directory while
Redis and the worker are running:

```powershell
@'
import asyncio

from arq import create_pool
from utils.redis import redis_settings


async def main():
    redis = await create_pool(redis_settings)
    try:
        await redis.enqueue_job("generate_canvas", "manual-run-id")
    finally:
        await redis.aclose()


asyncio.run(main())
'@ | uv run python -
```

For normal application code, enqueue with the pool stored at
`request.app.state.redis`:

```python
await request.app.state.redis.enqueue_job("generate_canvas", str(run_id))
```
