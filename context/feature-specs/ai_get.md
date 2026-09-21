Implement a GET endpoint so the frontend can check an AI run's
progress and retrieve its result.

Use the existing FastAPI router, SQLAlchemy AIRun model,
authentication dependency, and project ownership helper.

## Endpoint

GET /api/projects/{project_id}/ai/runs/{run_id}

- project_id: use the existing project ID type.
- run_id: UUID.

## Behavior

1. Authenticate using get_current_user_id.
2. Verify project ownership; return 404 if inaccessible.
3. Query AIRun using both run_id and project_id.
4. Return 404 if no matching run exists.
5. Return HTTP 200 with the run's stored progress and result.
6. Set Cache-Control: no-store.

This endpoint only reads database state.
It must not enqueue jobs, execute tasks, or change run status.

## Response Schema

Create AIRunStatusResponse with:

- run_id: UUID
- status: PENDING, RUNNING, SUCCEEDED, FAILED, or CANCELLED
- stage: nullable string
- result: nullable canvas result, mapped from proposal_json
- error: nullable object containing safe code and message

Return result only when status is SUCCEEDED.
Return error only when status is FAILED.
Do not expose internal exception details, request hashes,


## Structure

- Keep the route thin.
- Put database lookup logic in the existing AI run service.
- Put the response schema in the existing AI schema module.
- Reuse existing conventions and helpers.

## Check When Done

- The owner can retrieve a run's status.
- A completed run returns its stored result.
- A failed run returns a error code and massage from Airun
- Missing projects and runs return 404.
- Another user's project returns 404.
- A run belonging to a different project returns 404.
- Responses include Cache-Control: no-store.

## Scope

Do not implement frontend polling yet.
The client will later poll this endpoint and stop when status is
SUCCEEDED, FAILED, or CANCELLED.