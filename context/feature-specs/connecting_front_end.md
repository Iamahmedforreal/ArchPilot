Connect the existing AI sidebar to backend AI design submission, progress polling, and canvas application.

First inspect:

* `src/App.jsx`
* `src/lib/project-api.js`
* `src/components/editor/ai-sidebar.jsx`
* `src/components/editor/editor-canvas.jsx`
* Custom node components and component/icon registries
* `src/hooks/use-canvas-autosave.js`
* Existing editor history and canvas serialization
* Backend AI submission and run-status response schemas

Preserve the existing theme, fonts, sidebar layout, and editor interactions.

### 1. Add API functions

Follow existing API conventions and Clerk authentication:

* Submit a design:
  `POST /api/projects/{project_id}/ai/design`
  Body: `{ "message": "<user prompt>" }`

* Fetch run progress:
  `GET /api/projects/{project_id}/ai/runs/{run_id}`

Reuse bearer-token handling, base URL configuration, HTTP error mapping, and request cancellation patterns. Never call Gemini directly from the browser.

### 2. Manage the generation workflow

Create a focused hook under `src/hooks/` for submission, polling, progress, and completion.

On submit:

* Require an active saved project and a non-empty prompt.
* Show the user’s prompt in the existing sidebar.
* Immediately show a loading indicator and “Submitting request…”.
* Disable duplicate submission while this sidebar has an active request.
* Submit once, store the returned run ID, and begin polling.

Do not automatically retry POST requests. Each accepted POST creates a separate run.

### 3. Show meaningful progress

Display a compact animated indicator with these messages:

| Backend state                       | Sidebar message                     |
| ----------------------------------- | ----------------------------------- |
| Submitting                          | Submitting request…                 |
| `PENDING`                           | Waiting to start…                   |
| `RUNNING`, stage `preparing`        | Preparing your design…              |
| `RUNNING`, stage `generation`       | Designing your architecture…        |
| `RUNNING`, unknown or missing stage | Working on your design…             |
| `SUCCEEDED`                         | Design ready                        |
| `FAILED`                            | Show the safe backend error message |
| `CANCELLED`                         | Generation cancelled                |

These are application progress messages. Do not fabricate model reasoning, detailed work steps, or percentage completion.

Provide an accessible live status announcement and respect reduced-motion preferences.

### 4. Poll safely

* Poll approximately every 1.5–2 seconds.
* Start each poll after the previous request finishes; do not overlap requests.
* Stop on `SUCCEEDED`, `FAILED`, or `CANCELLED`.
* Cancel requests and timers on unmount, sign-out, or project change.
* Associate every response with its project, run, and workflow generation.
* Ignore stale responses from an earlier workflow.
* Prevent React StrictMode from creating duplicate polling loops or canvas application.

For temporary polling failures, show a connection message and use bounded backoff. Stop on access errors or missing runs.

After a bounded wait, offer “Check status again” for the same run. Do not claim the backend job failed or automatically submit another run.

Do not add a cancel button without a backend cancellation endpoint. Stopping local polling does not cancel the worker.

### 5. Apply the successful canvas

On `SUCCEEDED`, read the complete canvas from the GET response’s `result`.

Perform defensive checks that:

* `result` contains `nodes` and `edges` arrays.
* Nodes use registered types and icon/component keys.
* Required node fields and edge endpoints are usable.

Backend validation remains authoritative; reuse frontend utilities where available rather than duplicating the entire backend schema.

Apply the proposal through one editor action that:

* Replaces nodes and edges together.
* Creates one undoable history entry.
* Clears obsolete selection.
* Preserves the model’s IDs, positions, sizes, data, handles, and edge configuration.
* Fits the viewport after the nodes have mounted.

This endpoint generates a complete new design. Do not merge it into the current canvas or append duplicate elements.

Apply each run at most once, even if polling returns success repeatedly.

### 6. Render icons and preserve editing

Use the existing `canvasNode` renderer and icon registry.

Resolve `data.iconKey` through the registry. Do not invent icon mappings, fetch image URLs, or convert icons into images.

Reattach runtime callbacks through existing frontend mechanisms. Do not expect callbacks in model JSON or include them in saved canvas data.

Generated elements must retain existing movement, deletion, renaming, resizing where supported, and edge connection behavior.

### 7. Protect existing user work

When submission begins, capture the editor’s current local change generation.

If the canvas is empty and has not changed while generation runs, apply the proposal automatically.

If the canvas already contains work, or the user edits it during generation:

* Preserve the current canvas.
* Show “Design ready” with an explicit “Replace canvas” action.
* Apply only when the user selects that action.
* Make replacement undoable.

Keep the canvas editable during generation.

Use local edit tracking, not only the saved revision: unsaved changes also need protection.

### 8. Save through existing autosave

After applying the proposal, use the normal editor state and autosave workflow.

* Keep the current saved canvas revision.
* Let `useCanvasAutosave` save the complete canvas through the existing PUT endpoint.
* Preserve existing `409` reconciliation.
* Do not write to Vercel Blob directly.
* Do not set the revision to null unless the project has never saved a canvas.

Distinguish “Design applied” from successful persistence. Continue showing existing saving and save-error indicators.

### 9. Handle messages and errors

Remove timed mock assistant responses from the active submission flow.

Show safe backend messages for failure or clarification. Preserve the submitted prompt so users can revise it and submit again.

Do not promise a successful design explanation unless the GET API actually exposes it. The current documented success result contains the canvas proposal only.

Keep sidebar messages in local UI state; do not add conversation persistence.

### 10. Verify

Use existing test tooling for the important workflow behavior:

* Submit once and progress through pending/running/success.
* Render returned registry icons correctly.
* Apply a successful run once and support undo.
* Protect existing or newly edited canvas content.
* Ignore responses after project changes.
* Stop polling on terminal states.
* Handle submission, polling, and autosave failures.
* Preserve existing revision-based saving.

Update the frontend guide to describe submission, polling, proposal replacement, and autosave.
