Implement:
POST /api/projects/{project_id}/ai/design

Keep the route small:
- Use existing authentication.
- Accept a required non-blank `message`.
- Pass the authenticated owner, project ID, and message to the service.
- Enqueue the committed run ID.
- Return the run ID and `PENDING` status with HTTP 202.

Service behavior:
1. Verify project ownership; treat inaccessible projects as not found.
2. Save a new `PENDING` run containing the project ID and instruction.
3. Commit before the route enqueues the run.

Each accepted request creates a separate run. Do not require an idempotency key,
an input canvas revision, or an existing canvas snapshot.
Do not call the model in this route.
