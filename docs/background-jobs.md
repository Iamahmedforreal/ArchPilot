# Background Jobs

AI runs are delivered through Redis and processed by ARQ. FastAPI and the
worker share the Redis configuration from `server/utils/redis.py`.

## Submission Flow

```text
POST /api/projects/{project_id}/ai/design
    -> authenticate and verify project ownership
    -> commit the PENDING AIRun
    -> enqueue generate_canvas(run_id)
    -> return 202
```

The queue helper is `server/service/ai_queue_service.py`. It creates this ARQ
job ID:

```text
ai-run:{run_id}
```

That deterministic ID prevents one run from being present in ARQ twice. Every
HTTP request creates a new run ID and then enqueues it.

## Delivery Failure

The database commit happens before Redis enqueueing. The route does not add
custom Redis recovery behavior in this minimal flow; an enqueue exception is
handled by FastAPI's normal server-error behavior and the saved run remains
`PENDING`.

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

The frontend can read stored worker progress through
`GET /api/projects/{project_id}/ai/runs/{run_id}`. This endpoint only reads the
database and does not enqueue or execute work.

## Important Files

| File | Responsibility |
| --- | --- |
| `server/routes/ai_route.py` | Creates a run, enqueues its ID, and returns the response |
| `server/service/ai_run_service.py` | Verifies ownership and commits a new pending run |
| `server/service/ai_context_service.py` | Prepares editor-aware model context and response schema |
| `server/service/ai_queue_service.py` | Builds the ARQ job name, argument, and deterministic job ID |
| `server/workers/ai_chat_worker.py` | Loads and inspects an AI run in the worker process |
| `server/workers/config_worker.py` | ARQ functions, Redis settings, timeout, and concurrency |
