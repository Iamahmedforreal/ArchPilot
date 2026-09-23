# Backend API

FastAPI starts in `server/main.py`. Interactive OpenAPI documentation is
available at `/docs` while the server is running.

## Authentication

All `/api/projects` endpoints require a Clerk session token:

```http
Authorization: Bearer <clerk-session-token>
```

The authentication dependency lives in `server/routes/auth.py`. Project reads
and mutations are scoped to the authenticated Clerk user.

## Endpoint Summary

| Method | Path | Purpose | Success |
| --- | --- | --- | --- |
| `GET` | `/health` | Check whether FastAPI is running | `200` |
| `GET` | `/api/projects` | List the current user's projects | `200` |
| `POST` | `/api/projects` | Create a project | `201` |
| `GET` | `/api/projects/{project_id}` | Load one owned project | `200` |
| `PATCH` | `/api/projects/{project_id}` | Rename a project | `200` |
| `DELETE` | `/api/projects/{project_id}` | Delete a project | `204` |
| `GET` | `/api/projects/{project_id}/canvas` | Load the saved canvas | `200` or `204` |
| `PUT` | `/api/projects/{project_id}/canvas` | Save the complete canvas | `200` |
| `POST` | `/api/projects/{project_id}/ai/design` | Create and enqueue an AI design run | `202` |
| `POST` | `/api/projects/{project_id}/ai/spec` | Create and enqueue an AI Markdown spec run | `202` |
| `GET` | `/api/projects/{project_id}/ai/runs/{run_id}` | Read AI run progress or result | `200` |
| `GET` | `/api/projects/{project_id}/files/{file_id}/download` | Download an owned generated Markdown file | `200` |

## Health

### `GET /health`

This endpoint is public.

```json
{
  "status": "healthy"
}
```

## Projects

A project response has this shape:

```json
{
  "id": 12,
  "ownerId": "user_123",
  "name": "Payments Platform",
  "description": null,
  "status": "DRAFT",
  "canvasJsonPath": null,
  "createdAt": "2026-09-17T12:00:00Z",
  "updatedAt": "2026-09-17T12:00:00Z"
}
```

### `GET /api/projects`

Returns all projects owned by the current user, newest first. The response is an
array of project objects and is marked `Cache-Control: no-store`.

### `POST /api/projects`

Request body:

```json
{
  "name": "Payments Platform"
}
```

The body and name are optional. A missing or empty name creates an
`Untitled Project`.

### `GET /api/projects/{project_id}`

Returns one owned project. Returns `404` when it does not exist or is not
accessible through the owner-scoped query.

### `PATCH /api/projects/{project_id}`

Request body:

```json
{
  "name": "Renamed Project"
}
```

Returns `404` when the project does not exist and `403` when it belongs to a
different user.

### `DELETE /api/projects/{project_id}`

Deletes the project and returns no response body. Returns `404` when it does
not exist and `403` when it belongs to a different user.

## Canvas

Canvas snapshots are stored in Vercel Blob. PostgreSQL stores the project and
its blob path. A revision is the blob ETag used for optimistic concurrency.

### `GET /api/projects/{project_id}/canvas`

Returns `204` when the project has never saved a canvas. Otherwise:

```json
{
  "nodes": [],
  "edges": [],
  "revision": "blob-etag"
}
```

Possible errors are `404` for an inaccessible project or missing saved blob,
and `502` when blob storage is unavailable.

### `PUT /api/projects/{project_id}/canvas`

The request contains the complete current canvas and the revision previously
returned by the server:

```json
{
  "nodes": [],
  "edges": [],
  "revision": "previous-blob-etag"
}
```

Use `null` for the first save. A stale revision returns `409`; the frontend
keeps local changes dirty and shows a revision-conflict state instead of
silently overwriting or reconciling the server version. A successful response
contains the blob path and new revision:

```json
{
  "canvasJsonPath": "https://.../canvas/12.json",
  "revision": "new-blob-etag"
}
```

## AI Runs

### `POST /api/projects/{project_id}/ai/design`

Request body:

```json
{
  "message": "Design a scalable notification service"
}
```

The request generates a new complete canvas proposal from the prompt. It does
not include an existing canvas or canvas revision. A successful submission
returns:

```json
{
  "run_id": "1c0cb1aa-9975-43fd-a975-1c0c8f1ee621",
  "status": "PENDING"
}
```

The service verifies project ownership and creates one new `PENDING` `AIRun`
for each request. The route waits for that database commit, then enqueues
`generate_canvas` with only the run ID. This endpoint does not perform replay
deduplication, active-run admission checks, or input canvas revision checks.

`AIRun` does not store an idempotency key or request hash; every accepted
request is a separate run.

The frontend does not call this endpoint yet. The worker atomically claims the
run, exposes `preparing` and `generation` stages, calls Gemini, and persists a
validated proposal or safe failure. Generated proposals remain in `AIRun` and
are not automatically applied to the project's saved canvas.

The future model response contract is defined and validated separately from the
HTTP submission response. It supports `generated`, `unsupported`, and
`needs_clarification` outcomes. See `docs/ai-canvas-output.md` for the exact
React Flow node and edge format.

### `GET /api/projects/{project_id}/ai/runs/{run_id}`

Returns an owned run's stored status and progress:

```json
{
  "run_id": "1c0cb1aa-9975-43fd-a975-1c0c8f1ee621",
  "kind": "DESIGN",
  "status": "RUNNING",
  "stage": "generation",
  "result": null,
  "error": null
}
```

`result` contains the stored canvas proposal only for successful `DESIGN` runs.
For successful `SPEC` runs it contains a generated file reference:

```json
{
  "file_id": "7ab30c22-9f82-47a1-b016-8a03c77463f4",
  "filename": "architecture-spec.md"
}
```

The private blob URL is never returned. `error` contains the safe stored `code`
and `message` only for `FAILED` runs. Pending, running, and cancelled responses
expose neither field.

An unsupported request fails with `OUT_OF_SCOPE`; a request needing more detail
fails with `NEEDS_CLARIFICATION`. Provider and execution failures use stable,
safe codes and messages. `result_canvas_revision` remains null because the
worker does not save the generated proposal to Vercel Blob.

The endpoint returns `404` for inaccessible projects, missing runs, and runs
belonging to a different project. It is database-read-only and always sends
`Cache-Control: no-store`.

Redis delivery failure can leave a committed run `PENDING`, and worker
interruption after claim can leave it `RUNNING`. Automatic recovery is not
implemented yet.

### `POST /api/projects/{project_id}/ai/spec`

Request body:

```json
{
  "expected_canvas_revision": "blob-etag-from-get-canvas",
  "instruction": "Focus on the API and data model"
}
```

`instruction` is optional and limited to 1,000 characters. The route verifies
project ownership, loads the saved canvas from the server-side project blob
path, and compares the saved ETag with `expected_canvas_revision`. A mismatch
returns `409` so a pending autosave or another edit cannot silently change the
input. Missing saved canvas returns `404`; invalid or empty AI canvas input
returns `422`.

On success the route creates a `PENDING` `SPEC` run with the saved canvas
snapshot and revision, commits it, and enqueues `generate_spec` with job ID
`spec-run:{run_id}`. It returns promptly:

```json
{
  "run_id": "1c0cb1aa-9975-43fd-a975-1c0c8f1ee621",
  "status": "PENDING"
}
```

If Redis enqueueing fails, the run is marked `FAILED` with a safe queue error
and the request returns `502`.

### `GET /api/projects/{project_id}/files/{file_id}/download`

Downloads a generated Markdown file as an attachment:

```http
Content-Type: text/markdown; charset=utf-8
Content-Disposition: attachment; filename="architecture-spec.md"
Cache-Control: no-store
```

The route verifies project ownership and looks up the file by both project and
file ID. Missing, guessed, or cross-project file IDs return `404`.

## Backend Responsibilities

| Folder | Responsibility |
| --- | --- |
| `server/routes` | HTTP validation, dependencies, status codes, error mapping |
| `server/schema` | Request and response models |
| `server/service` | Business rules, transactions, and storage operations |
| `server/model` | Database tables and relationships |
| `server/workers` | ARQ job functions and worker configuration |
| `server/utils` | Shared settings and Redis configuration |

## Adding an Endpoint

1. Add request and response models under `server/schema`.
2. Put business logic under `server/service`.
3. Add a thin handler under `server/routes` using the existing auth and database
   dependencies.
4. Register a new router in `server/main.py` when necessary.
5. Add endpoint tests under `server/tests`.
6. Update this document and the progress tracker.
