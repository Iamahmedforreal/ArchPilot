Extend `server/workers/ai_chat_worker.py` to persist AI run progress, successful proposals, and safe failures.

First inspect:

* The `AIRun` model and existing status enum.
* `server/workers/ai_chat_worker.py`
* `server/workers/config_worker.py`
* `server/service/ai_run_service.py`
* `server/service/ai_context_service.py`
* `server/service/ai_model_service.py`
* `server/schema/ai_canvas_schema.py`
* The existing AI run-status response schema and GET route.

Reuse existing fields, enums, session configuration, and service conventions. Preserve the registered `generate_canvas(ctx, run_id)` function.

### 1. Claim the run

* Parse `run_id` as a UUID. Log and exit if invalid.
* In a short transaction, atomically update the matching run only when its status is `PENDING`.
* Set:

  * `status = RUNNING`
  * `started_at = current UTC time`
  * `stage = "preparing"`
* Commit before preparing context or calling Gemini.
* Exit if no row was claimed.

Do not use a separate read followed by an unconditional update. Duplicate delivery must not cause another model call for an already claimed or terminal run.

### 2. Prepare context

Load the claimed run using the worker’s own database session and call:

`prepare_design_context(run)`

Use the stored `run.instruction`. Continue generating a new design from the prompt only.

Do not load an existing canvas, canvas revision, or conversation history. Do not keep a database transaction open during context processing or the model call.

### 3. Generate and validate

* In a short transaction, set `stage = "generation"` only if the run is still `RUNNING`.
* Exit if the row no longer exists or is no longer running.
* Commit, then call `await generate_design(context)` outside a database transaction.

The existing model service already:

* Supplies application instructions and editor metadata.
* Sends the user instruction separately.
* Requests structured JSON.
* Validates `AIDesignModelResponse` and graph integrity.
* Maps provider failures to `AIModelError`.

Keep validation in that service. Do not add a misleading `"validating"` stage after validation has already completed.

Reuse the current canvas contract, including supported registry pairs, `canvasNode`, `smoothstep`, valid handles, and existing node/edge limits.

### 4. Persist successful generation

For `outcome == "generated"`, save in a short transaction:

* `proposal_json = response.canvas.model_dump(mode="json")`
* `explanation = response.explanation`
* `status = SUCCEEDED`
* `stage = null`
* `completed_at = current UTC time`
* Clear existing error fields.

Store only the serialized canvas object in `proposal_json`, not the complete model-response envelope.

Only update a row still marked `RUNNING`. A deleted or cancelled run must not be overwritten.

### 5. Persist non-generated outcomes

For `unsupported`:

* `status = FAILED`
* `error_code = OUT_OF_SCOPE`

For `needs_clarification`:

* `status = FAILED`
* `error_code = NEEDS_CLARIFICATION`

For both:

* `proposal_json = null`
* `explanation = response.explanation`
* `error_message = response.explanation`
* `stage = null`
* `completed_at = current UTC time`

Only update a row still marked `RUNNING`.

### 6. Handle execution errors

* Catch `AIModelError` and persist its existing `code` and `safe_message`.
* For unexpected execution errors, use a stable internal failure code and a generic safe message following repository conventions.
* Save `FAILED`, clear the proposal and stage, and set `completed_at`.
* Log internal exception details with `run_id`; do not log credentials.
* Use a fresh short transaction after a failed or rolled-back database operation.
* Do not swallow a failure to persist completion: log it and allow ARQ to observe it.

Explicitly re-raise `asyncio.CancelledError`. Worker shutdown or task cancellation must not be recorded as a normal model failure.

### 7. Preserve API and storage behavior

The existing GET run-status endpoint must expose:

* Stored status and stage while processing.
* Stored canvas proposal as `result` only for `SUCCEEDED`.
* Safe stored code/message as `error` only for `FAILED`.

Preserve its current HTTP response shape and `Cache-Control: no-store`.

Do not:

* Write the generated canvas to Vercel Blob.
* Change the project’s saved canvas or blob path.
* Set `result_canvas_revision`; leave it null.
* Add frontend submission, polling, or canvas application.
* Add idempotency keys, request hashes, outbox delivery, leases, automatic retries, or interrupted-run recovery.

Preserve the existing shared Gemini client and worker shutdown cleanup.

### 8. Verify and update documentation

Add focused backend tests for:

* Successful proposal persistence and GET result exposure.
* Unsupported and clarification outcomes.
* Safe model failure persistence.
* Invalid, missing, terminal, and already-running runs being skipped.
* Duplicate claims permitting only one execution.
* Cancellation or deletion during generation preventing completion updates.
* `asyncio.CancelledError` propagation.

Mock Gemini calls in tests.

Update the backend API, background-job documentation, and progress tracker to describe implemented progress and persistence. Keep frontend integration marked unimplemented.

Document the remaining limitations:

* Redis enqueue failure can leave a committed run `PENDING`.
* Worker interruption after claiming can leave a run `RUNNING`.
* These states have no automatic recovery in this scope.
