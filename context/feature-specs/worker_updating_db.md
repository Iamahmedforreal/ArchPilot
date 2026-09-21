Extend server/workers/ai_chat_worker.py.

Preserve the registered generate_canvas(ctx, run_id) function.

Requirements:
1. Parse run_id and exit if invalid.
2. Atomically update the matching PENDING run to RUNNING.
   Set started_at and stage="preparing".
   Exit if no run was claimed.
3. Commit and prepare context.
4. Set stage="generation" in a short transaction.
5. Call generate_design outside a database transaction.
6. Set stage="validating" while validating the returned canvas.
7. Save completion in a short transaction.

For generated:
- proposal_json = response.canvas
- explanation = response.explanation
- status = SUCCEEDED
- stage = null
- completed_at = current time
- Clear error fields.

For unsupported or needs_clarification:
- proposal_json = null
- explanation = response.explanation
- status = FAILED
- error_code = OUT_OF_SCOPE or NEEDS_CLARIFICATION
- error_message = response.explanation
- stage = null
- completed_at = current time.

For execution errors:
- Save FAILED with a safe error code/message.
- Log internal details with run_id.

Only finish a run still marked RUNNING.
Do not overwrite a cancelled or deleted run.
Do not treat worker shutdown cancellation as a normal model failure.

Do not save to Vercel Blob.
Leave result_canvas_revision null.
Do not add outbox delivery, leases, or interrupted-run recovery yet.