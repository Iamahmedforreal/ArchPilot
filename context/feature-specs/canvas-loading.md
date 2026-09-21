## Feature spec: Load saved canvas before showing the editor

## Problem

Opening /editor/:projectId mounts EditorCanvas with empty nodes and edges. The empty-workspace prompt appears before useCanvasAutosave finishes requesting the saved canvas. The saved diagram then pops into view. The fetch also starts after the project request, obtains a Clerk token again, and reads a private Vercel Blob through FastAPI.

## Goal

Show the saved diagram as the editor's initial editable state, or show the empty-workspace prompt only after the server confirms there is no saved canvas. Prevent an unloaded, failed, or outdated canvas request from overwriting saved work.

## Scope

Update the React editor load lifecycle and autosave guard. Keep existing GET and PUT canvas endpoints, revision checks, project ownership checks, and private Blob storage. Measure latency before considering storage migration.

## Required behavior

On route entry, set canvas load state to loading for that projectId. Obtain the Clerk token once and reuse it for initial project and canvas requests. Start the two requests concurrently when they have no data dependency. Project information and canvas each have their own result and error handling.

While canvas is loading, render a stable canvas-sized loading surface. Do not render the empty-workspace prompt or enable autosave. Do not treat an uninitialized nodes array as an empty saved document.

On GET /api/projects/{project_id}/canvas success with a snapshot, initialize nodes, edges, viewport if persisted, and revision. Establish this snapshot as the clean autosave baseline, then set load state to ready and enable editing and autosave. A saved document with zero nodes is still a valid loaded document.

On HTTP 204, initialize an empty canvas and the server-defined initial revision, establish the clean baseline, then set ready. Only now may the empty-workspace prompt appear. Confirm the initial revision contract with the existing PUT endpoint; do not guess a revision that the backend will reject.

On fetch, authorization, malformed response, or storage error, set error. Show a retry action and preserve any current unsaved editor state. Never turn a failed read into an empty canvas or issue a PUT of the initial empty arrays.

On project ID change or editor unmount, cancel in-flight requests where possible and invalidate their results with a request generation keyed to the project ID. A late response from project A cannot initialize project B. Clean up timers and listeners.

Autosave begins only after successful initialization. Hydration itself must not mark the canvas dirty. Subsequent user edits schedule saves using the initialized revision. A save response may show Saved only if it acknowledges the latest local edit generation. Existing 409 conflict behavior must continue to preserve unsaved work.

UI states

State

Canvas display

Empty prompt

Autosave

loading

Stable loading surface

Hidden

Disabled

ready, zero nodes

Empty editor

Visible

Enabled for later edits

ready, nodes present

Saved diagram

Hidden

Enabled for later edits

error

Error and retry; retain local edits if present

Hidden

Disabled until load/recovery is resolved

Implementation notes

Keep load state separate from nodes.length. Make initial load an explicit editor lifecycle; useCanvasAutosave should not independently hydrate after it starts watching an empty editor. Extract a shared loader or have the autosave hook expose loading/ready/error, initial revision, and an initialization barrier.

Fetch the canvas through the authenticated backend. canvasJsonPath in the project response is a pointer, not the document; its presence alone cannot initialize React Flow.

Avoid an extra getToken() by passing the entry token or a shared authenticated request function. Do not assume Promise.all alone handles partial failures: report a canvas read failure distinctly from a project metadata failure.

Measure token time, project request time, canvas request time, backend database lookup, private Blob read, payload size, and React render time. Optimize the largest measured cost in a separate change.

Acceptance criteria

Reopening a project with saved nodes shows a loading surface followed by the saved diagram; the empty-workspace prompt never flashes.

A project whose canvas endpoint returns 204 shows the empty prompt only after the response.

No canvas PUT occurs during initial loading or hydration, including in React development Strict Mode.

A failed canvas GET shows retry and performs no empty-snapshot save.

Rapid A → B navigation never shows A's nodes in B or saves A's content to B.

An edit made while a prior save is in flight remains dirty until its own revision is acknowledged.

Existing ownership, 404/502, and 409 behaviors remain intact.

Entry-load timings can distinguish UI flash from actual network and storage delay.