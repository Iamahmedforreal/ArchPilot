## AIRun Model

`AIRun` stores one asynchronous AI design request and its visible progress.

Fields:

- `id`: UUID primary key.
- `project_id`: project foreign key with cascade deletion.
- `instruction`: the user's design request.
- `status`: `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`, or `CANCELLED`.
- `stage`: optional safe progress label.
- `proposal_json`: optional complete generated canvas result.
- `explanation`: optional generated-design explanation.
- `error_code`: optional safe frontend error code.
- `error_message`: optional safe frontend error message.
- `result_canvas_revision`: optional saved result revision.
- `created_at`, `started_at`, and `completed_at`.

Ownership is derived through the project. Each accepted design request creates a
new run; the model does not store idempotency keys, request hashes, or an input
canvas revision.

Keep the project/creation-time and active-status indexes. Do not add conversation
tables, worker leases, heartbeat fields, or request snapshots.
