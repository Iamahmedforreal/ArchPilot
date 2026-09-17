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
| `src/hooks/use-project-actions.js` | Project list cache and create/rename/delete workflows |
| `src/hooks/use-canvas-autosave.js` | Debounced canvas saves and `409` conflict reconciliation |
| `src/components/editor/editor-canvas.jsx` | React Flow nodes, edges, editing, history, templates, and palette |
| `src/components/editor/project-sidebar.jsx` | Project navigation |
| `src/components/editor/project-dialogs.jsx` | Create, rename, and delete dialogs |
| `src/components/editor/ai-sidebar.jsx` | AI and specs interface; currently uses mock responses |
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

The AI run endpoint does not yet have a frontend client function.

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

## AI Sidebar Status

The AI sidebar is currently visual only. Submitting a prompt adds a local user
message and a timed mock assistant response. It does not yet call
`POST /api/projects/{project_id}/ai/runs`, poll run status, or apply a generated
canvas.

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

