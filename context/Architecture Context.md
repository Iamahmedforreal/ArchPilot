# Architecture Context

## Stack

| Role             | Technology              | Purpose                                  |
| ---------------- | ------------------------ | ----------------------------------------- |
| Framework        | React.js + JavaScript   | Frontend application                      |
| UI               | Tailwind CSS             | Styling and responsive UI                 |
| Auth             | Clerk                    | User identity and route protection        |
| Backend          | FastAPI + Python         | REST API and business logic               |
| Database         | SQLAlchemy + PostgreSQL  | Projects, specs, and task runs            |
| Canvas           | React Flow               | Interactive architecture canvas           |
| Background tasks | Trigger.dev              | Durable AI generation workflows           |
| Artifact storage | Vercel Blob              | Canvas snapshots and generated artifacts  |


## System Boundaries

- `app/api` — Authenticated request handlers: input validation, ownership checks, task triggering, and persistence.
- `trigger` — Long-running background jobs: AI design generation and spec generation.
- `lib` — Shared infrastructure: database client, access control helpers, and utilities.
- `components` — UI composition: canvas surfaces, sidebars, dialogs, and interactive elements.
- `data` — Legacy local directory. Not used for new artifacts.

## Storage Model

- **Database**: metadata, ownership, and task run records.
- **Vercel Blob**: generated artifacts — canvas snapshots at `canvas/{projectId}.json` and specs at `specs/{projectId}/{specId}.md`.
- Project records, spec records, and task run records belong in PostgreSQL.
- Canvas content and Markdown output are stored in and retrieved from Vercel Blob.
- The blob URL is stored in the database (`canvasJsonPath`, `filePath`) as the reference to the artifact.

## Auth Model

- Every project has a single owner (Clerk user ID).
- Only authenticated users can access protected routes.
- Only the owner can access or mutate their project resources.


## Starter System Designs

- Prebuilt templates are static canvas snapshots stored in the codebase.
- Templates are loaded into the active canvas when a user imports one.
- Import can occur on canvas creation or from within the editor at any time.
- Template data follows the same node/edge schema as user-created canvas content.
- Templates do not require a separate database record; they are resolved by template ID at import time.

## AI Generation Model

### Design Generation

- Input: user prompt, project context, and current canvas state.
- Execution: durable background task via Trigger.dev.
- Output: structured node and edge updates written into the canvas.

### Spec Generation

- Input: current canvas graph and project context.
- Execution: durable background task via Trigger.dev.
- Output: Markdown technical spec saved to Vercel Blob and linked to the project in the database.

## Invariants

1. Request handlers do not run long-lived AI work — that belongs in background tasks.
2. Metadata and large generated artifacts are stored in separate layers.
3. Auth and ownership are enforced at every mutation boundary.
4. Client components are used only where browser interactivity or real-time canvas state requires them.
5. The canvas schema must remain consistent between user-created content and imported templates.