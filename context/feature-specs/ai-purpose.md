Implement Pydantic schemas for AI canvas generation.

Inspect and reuse the existing canvas node and edge schemas wherever possible.

Submission request:
- message: required non-blank string, maximum 8,000 characters.

Submission response:
- run_id: UUID.
- status: PENDING, RUNNING, SUCCEEDED, or FAILED.

Model response:
- outcome: `generated`, `unsupported`, or `needs_clarification`.
- explanation: short text describing the generated design.
- canvas: complete resulting canvas containing nodes and edges when generated;
  null for unsupported or needs-clarification outcomes.
- Use the actual node types, shapes, icons, and fields supported by the editor.

Run status response:
- run_id.
- status.
- safe error_code and error_message when failed.
- explanation and resulting canvas revision when successful.
- created_at, started_at, completed_at.

Reject unsupported fields.
Set configurable limits on canvas size and label lengths.

The model returns the entire resulting canvas.
The request does not include a canvas revision or existing canvas snapshot.
Do not create add/update/remove operation schemas.
Do not implement model calls or routes yet.
