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
| `GET` | `/api/projects/{project_id}/ai/runs/{run_id}` | Read AI run progress or result | `200` |

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
reloads the latest canvas and reconciles local changes. A successful response
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

The frontend does not call this endpoint yet. The worker currently loads and
logs the run but does not call a model or change run status.

The future model response contract is defined and validated separately from the
HTTP submission response. It supports `generated`, `unsupported`, and
`needs_clarification` outcomes. See `docs/ai-canvas-output.md` for the exact
React Flow node and edge format.

### `GET /api/projects/{project_id}/ai/runs/{run_id}`

Returns an owned run's stored status and progress:

```json
{
  "run_id": "1c0cb1aa-9975-43fd-a975-1c0c8f1ee621",
  "status": "RUNNING",
  "stage": "generation",
  "result": null,
  "error": null
}
```

`result` contains the stored canvas proposal only for `SUCCEEDED` runs. `error`
contains the safe stored `code` and `message` only for `FAILED` runs. Pending,
running, and cancelled responses expose neither field.

The endpoint returns `404` for inaccessible projects, missing runs, and runs
belonging to a different project. It is database-read-only and always sends
`Cache-Control: no-store`.

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
