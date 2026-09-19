# Frontend Guide

The frontend is a React and Vite application in the repository root. Source
files live under `src/`.

## Browser Routes

Routing is currently implemented in `src/App.jsx` with the History API rather
than a routing library.

| Path | Purpose | Access |
| --- | --- | --- |
| `/` | Redirect to sign-in or the editor | Public redirect |
| `/sign-in` | Clerk sign-in screen | Public |
| `/sign-up` | Clerk sign-up screen | Public |
| `/editor` | Project selection and new-project state | Signed in |
| `/editor/{project_id}` | Project canvas workspace | Signed in and owner-scoped |

Clerk is configured in `src/main.jsx`. Auth route constants and matching helpers
live in `src/lib/auth-routes.js`.

## Important Files

| File or folder | What it does |
| --- | --- |
| `src/App.jsx` | Auth routing, workspace loading, editor shell, top-level state |
| `src/lib/project-api.js` | All current HTTP calls to the backend |
| `src/lib/ai-canvas.js` | Defensive checks for generated canvas proposals |
| `src/hooks/use-project-actions.js` | Project list cache and create/rename/delete workflows |
| `src/hooks/use-canvas-autosave.js` | Debounced canvas saves and `409` conflict reconciliation |
| `src/hooks/use-ai-design.js` | AI submission, polling, progress, and proposal application |
| `src/components/editor/editor-canvas.jsx` | React Flow nodes, edges, editing, history, templates, and palette |
| `src/components/editor/project-sidebar.jsx` | Project navigation |
| `src/components/editor/project-dialogs.jsx` | Create, rename, and delete dialogs |
| `src/components/editor/ai-sidebar.jsx` | AI prompt, run progress, and proposal replacement UI |
| `src/components/editor/starter-templates.js` | Static starter canvas definitions |
| `src/components/ui` | Shared shadcn/Radix UI primitives |
| `src/index.css` | Theme tokens and global styles |

`src/hooks/use-project-dialogs.js` still contains an older mock project dialog
flow. The active editor uses `useProjectActions` instead.

## API Access

`src/lib/project-api.js` is the frontend boundary for backend calls. It reads
`VITE_API_BASE_URL`, attaches the Clerk bearer token, parses successful JSON,
and turns failed responses into errors containing the HTTP status.

Current client functions:

| Function | Backend endpoint |
| --- | --- |
| `fetchProjects` | `GET /api/projects` |
| `fetchProject` | `GET /api/projects/{project_id}` |
| `createProject` | `POST /api/projects` |
| `renameProject` | `PATCH /api/projects/{project_id}` |
| `deleteProject` | `DELETE /api/projects/{project_id}` |
| `fetchCanvas` | `GET /api/projects/{project_id}/canvas` |
| `saveCanvas` | `PUT /api/projects/{project_id}/canvas` |
| `submitAiDesign` | `POST /api/projects/{project_id}/ai/design` |
| `fetchAiRun` | `GET /api/projects/{project_id}/ai/runs/{run_id}` |

AI requests use the same Clerk bearer token, API base URL, response parsing,
and abort-signal conventions as project and canvas requests. The browser never
calls Gemini directly.

## Workspace Load Flow

When a user opens `/editor/{project_id}`:

1. `App.jsx` requests a Clerk token.
2. Project metadata and canvas data load in parallel.
3. An inaccessible project shows the access-denied view.
4. A missing canvas becomes an empty canvas.
5. A saved canvas hydrates `EditorCanvas` before autosave starts.
6. Canvas changes are saved after an 800 ms debounce.

## Canvas Save Flow

The canvas sends complete `nodes` and `edges`, not small patches. Each save also
sends the last known revision.

```text
Canvas edit
    -> useCanvasAutosave waits 800 ms
    -> saveCanvas sends nodes, edges, revision
    -> backend writes Vercel Blob
    -> frontend stores the new revision
```

If the backend returns `409`, the hook reloads the server canvas, preserves
local changes made after the failed save, and retries through the normal
autosave cycle.

## Project State

`useProjectActions` owns the active project workflows. It caches project lists
per Clerk user in module-level maps, normalizes numeric API IDs into strings for
browser navigation, and updates the cache after create, rename, or delete.

## AI Design Flow

The AI sidebar accepts a prompt only after the owned project and its canvas are
loaded. `useAiDesign` submits once, stores the returned run ID, and polls the
run approximately every 1.75 seconds without overlapping requests. It maps the
backend status and stage to a compact live progress message and stops on
`SUCCEEDED`, `FAILED`, or `CANCELLED`.

Polling requests and timers are cancelled when the project changes or the
editor unmounts. Temporary connection errors use bounded backoff. After two
minutes, local polling pauses and the same run can be checked again without
creating another run.

Successful results are checked against the current editor component registry
and graph references before use. If the canvas was empty and its local edit
generation did not change during the run, the proposal is applied
automatically. Otherwise, the current work remains intact until the user
selects `Replace canvas`.

Applying a proposal replaces nodes and edges together, clears selection, adds
one undo history entry, and fits the resulting graph. The current saved
revision is preserved, so `useCanvasAutosave` persists the replacement through
the normal PUT and `409` reconciliation flow. `Design applied` describes the
local editor action; the navbar continues to show saving, saved, or save-error
state separately.

## Environment Variables

```env
VITE_CLERK_PUBLISHABLE_KEY=...
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The Clerk sign-in, sign-up, and redirect paths can also be overridden with the
`VITE_CLERK_*_URL` variables used in `src/lib/auth-routes.js`.

## Adding a Frontend API Feature

1. Add a focused request function to `src/lib/project-api.js`, or create a new
   API module when the feature is not project-related.
2. Put reusable request state and workflow logic in a hook under `src/hooks`.
3. Keep components focused on rendering and user interaction.
4. Handle loading, empty, error, and access-denied states.
5. Update this document when the browser routes or main data flow changes.
