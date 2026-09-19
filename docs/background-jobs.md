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

The ARQ timeout is derived from shared model retry configuration:

```text
(model attempts x per-request timeout) + retry delays + persistence margin
(3 x 120 seconds) + (2 + 4 seconds) + 60 seconds = 426 seconds by default
```

Changing `GEMINI_TIMEOUT_SECONDS` updates both the SDK request timeout and the
complete ARQ job budget. Retry count, delay schedule, timeout default, and
persistence margin live in `server/service/ai_retry_config.py`.

For each job, the worker:

1. Logs the received run ID.
2. Atomically claims the run only when it is `PENDING`, setting `RUNNING`,
   `preparing`, and `started_at` in a short transaction.
3. Prepares editor-aware context from the stored instruction without loading a
   saved canvas or holding a database transaction open.
4. Guardedly changes the stage to `generation` while the run is still
   `RUNNING`.
5. Calls Gemini outside a database transaction and validates the response. A
   provider-capacity `503` is retried twice after 2 and 4 seconds, for three
   total attempts on the same run and ARQ job.
6. Guardedly persists a successful canvas proposal or safe failure while the
   run is still `RUNNING`.

Duplicate deliveries cannot claim an already running or terminal run, so only
one delivery calls Gemini. Successful generation stores only the canvas object
in `proposal_json`, stores the explanation, clears prior errors, and marks the
run `SUCCEEDED`. It does not write to Vercel Blob or change the project's saved
canvas.

`unsupported` and `needs_clarification` outcomes are stored as `FAILED` with
`OUT_OF_SCOPE` and `NEEDS_CLARIFICATION` respectively. Model and unexpected
execution failures store only safe codes and messages. Task cancellation is
handled with a shielded database transition and then re-raised to ARQ.

For cancellation before ARQ's final allowed try, the worker conditionally
changes the run from `RUNNING` back to `PENDING`, clears transient progress, and
lets ARQ redeliver the same job. On the final try it conditionally changes the
run to `FAILED` with `GENERATION_INTERRUPTED`. Both updates require the row to
still be `RUNNING`, so a run changed externally to `CANCELLED` is preserved.
The worker and ARQ configuration share an explicit five-try limit.

Only `MODEL_PROVIDER_BUSY` is retried. Invalid output, safety blocks, missing
configuration, timeouts, and other errors fail immediately. During backoff the
existing run remains `RUNNING` at the `generation` stage. The worker never
creates another `AIRun`, re-enqueues the job, or repeats the frontend POST.

The frontend can read stored worker progress through
`GET /api/projects/{project_id}/ai/runs/{run_id}`. This endpoint only reads the
database and does not enqueue or execute work.

## Recovery Limits

- Redis enqueue failure after the database commit can leave a run `PENDING`.
- Hard process termination after claiming can leave a run `RUNNING`.
- Model-capacity failures have bounded in-process retries. This scope still has
  no lease or recovery from hard process termination. Cooperative task
  cancellation resets the run for ARQ redelivery or fails it on the final try.

## Important Files

| File | Responsibility |
| --- | --- |
| `server/routes/ai_route.py` | Creates a run, enqueues its ID, and returns the response |
| `server/service/ai_run_service.py` | Verifies ownership and commits a new pending run |
| `server/service/ai_context_service.py` | Prepares editor-aware model context and response schema |
| `server/service/ai_model_service.py` | Makes one Gemini attempt and validates or safely rejects its response |
| `server/service/ai_retry_config.py` | Shared model attempt, backoff, timeout, and persistence-margin configuration |
| `server/service/ai_queue_service.py` | Builds the ARQ job name, argument, and deterministic job ID |
| `server/workers/ai_chat_worker.py` | Claims runs and persists progress, proposals, and safe failures |
| `server/workers/config_worker.py` | ARQ functions, Redis settings, timeout, and concurrency |
