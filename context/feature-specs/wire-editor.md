Wire the editor home sidebar and dialogs to the real project API.

### Data Fetching

The editor home page is a server component.

Fetch owned projects server-side using the existing project data helper and pass the owned project list to the sidebar.

No client-side fetching for initial load.

### `useProjectActions`

Create a hook in `hooks/` that manages dialog state and project mutations.

**Create**

- manage create dialog state
- manage project name input
- call `POST /api/projects`
- navigate to the new workspace

The project ID and room ID should stay aligned.

**Rename**

- store target project id + current name
- call `PATCH /api/projects/[id]`
- refresh on success

**Delete**

- store target project
- call `DELETE /api/projects/[id]`
- redirect to `/editor` if deleting the active workspace
- otherwise keep the local owned-project list current

### Wiring

Connect the hook to the sidebar and dialogs.

- rename dialog pre-fills current name
- delete dialog shows project name

### Check When Done

- sidebar uses real project data
- create navigates to workspace
- rename updates correctly
- delete refreshes or redirects correctly
- `npm run build` passes
