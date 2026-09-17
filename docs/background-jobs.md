# Background Jobs

AI runs are delivered through Redis and processed by ARQ. FastAPI and the
worker share the Redis configuration from `server/utils/redis.py`.

## Submission Flow

```text
POST /api/projects/{project_id}/ai/runs
    -> validate auth, ownership, idempotency, and canvas revision
    -> commit the PENDING AIRun
    -> enqueue generate_canvas(run_id)
    -> return 202
```

The queue helper is `server/service/ai_queue_service.py`. It creates this ARQ
job ID:

```text
ai-run:{run_id}
```

That deterministic ID prevents the same run from being present in ARQ twice.
If ARQ returns `None` because the job ID already exists, delivery is treated as
successful.

Only newly created runs are enqueued. An idempotent HTTP replay returns the
saved run and does not send another job.

## Delivery Failure

The database commit happens before Redis enqueueing. If a Redis connection or
timeout error occurs, the route returns `503` with the run ID and leaves the run
`PENDING`. It is not marked failed because Redis may have accepted the job
before the connection error became visible to FastAPI.

## Worker

Start the worker from the `server` directory:

```powershell
uv run arq workers.config_worker.WorkerSettings
```

`server/workers/config_worker.py` registers `generate_canvas` and defines the
job timeout and concurrency. `server/workers/ai_chat_worker.py` contains the
job function.

For each job, the worker:

1. Logs the received run ID.
2. Opens its own database session.
3. Loads the corresponding `AIRun`.
4. Exits when the run no longer exists.
5. Skips terminal `SUCCEEDED`, `FAILED`, or future `CANCELLED` runs.
6. Logs a non-terminal run and exits.

The worker does not yet mark runs as `RUNNING`, invoke an AI model, save a
generated canvas, or mark runs as completed.

## Important Files

| File | Responsibility |
| --- | --- |
| `server/routes/ai_route.py` | Enqueues newly committed runs and maps delivery failures to `503` |
| `server/service/ai_run_service.py` | Creates runs and identifies new versus replayed submissions |
| `server/service/ai_queue_service.py` | Builds the ARQ job name, argument, and deterministic job ID |
| `server/workers/ai_chat_worker.py` | Loads and inspects an AI run in the worker process |
| `server/workers/config_worker.py` | ARQ functions, Redis settings, timeout, and concurrency |

