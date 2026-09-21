# AI Generation Incident

This document records the failures found while connecting the AI sidebar to
Gemini, how each one was identified, and the implemented fixes.

## 1. Sidebar Submission Appeared Inactive

**Symptom:** Entering a prompt appeared to do nothing, and no `AIRun` row was
created.

**Cause:** The UI allowed interaction based on canvas load state, but the AI
hook could silently reject the submission before the React Flow controller was
ready.

**Fix:** Every send action now enters the workflow. If the project or canvas is
not ready, the sidebar displays a safe status message instead of returning
silently. Successful submissions still issue exactly one POST.

## 2. Google SDK Rejected Non-String Literals

**Symptom:** The worker raised `ValueError: Literal values must be strings`
before contacting Gemini.

**Cause:** The SDK's `response_schema` converter does not support Pydantic
single-value numeric or boolean literals such as `Literal[1.5]` and
`Literal[False]`.

**Fix:** Those fields use Gemini-compatible number and boolean schema types.
Pydantic validators still require `strokeWidth` to be `1.5` and `animated` to
be `false` after generation.

## 3. Automatic Function Calling Warning

**Symptom:** The SDK warned that direct automatic function calling through
`AsyncModels.generate_content` was not recommended.

**Cause:** AFC defaults were active even though canvas generation supplies no
tools.

**Fix:** The model request explicitly disables automatic function calling.

## 4. Provider Rejected the Converted Schema

**Symptom:** Gemini returned `400 INVALID_ARGUMENT` and identified converted
`additional_properties` fields as unknown.

**Cause:** The SDK's OpenAPI-style `response_schema` conversion produced fields
that this Gemini endpoint did not accept.

**Fix:** The request now uses `response_json_schema` with a flattened schema.
It includes every required canvas, node, edge, position, data, style, marker,
and registry enum field without references or unsupported constraints. The
complete Pydantic schema remains authoritative after generation.

An intermediate reduced schema was accepted by Gemini but allowed empty node
and edge objects. That version was replaced by the current full-field flattened
schema.

## 5. Gemini Capacity Failure

**Symptom:** The worker stored `MODEL_PROVIDER_ERROR` after a request reached
Gemini.

**Diagnosis:** A replay of the saved prompt returned provider status
`503 UNAVAILABLE` with a high-demand message. Redis, ARQ, credentials, model
resolution, and schema acceptance were all working.

**Fix:** Provider `503` responses map to `MODEL_PROVIDER_BUSY`. The worker keeps
the same run in `RUNNING/generation` and makes up to three total model attempts:

```text
attempt 1
    -> 503: wait 2 seconds
attempt 2
    -> 503: wait 4 seconds
attempt 3
    -> persist success or the final safe failure
```

Only provider-capacity failures are retried. The frontend never automatically
repeats `POST /api/projects/{project_id}/ai/design`, because each POST creates a
new run.

## 6. Model Returned an Invalid Canvas

**Symptom:** A provider retry completed, but the run failed with
`MODEL_INVALID_RESPONSE`.

**Cause:** Gemini returned JSON, but the result did not satisfy the complete
canvas contract. The provider schema checks structure and basic values, while
Pydantic also checks relationships such as component/icon pairing, supported
color pairs, unique IDs, valid edge endpoints, and outcome/canvas consistency.

**Fix:** The model instruction now states the fixed edge values and registry
pairing rules explicitly. Validation failures also log sanitized Pydantic error
paths internally, without logging the raw model response or changing the safe
message returned to the frontend. Use the first
`Gemini response failed canvas validation` line to identify the exact rejected
field when this error happens again.

## Cancellation During Generation

ARQ can cancel an active coroutine during worker shutdown or job handling. A
plain re-raise previously left its claimed database run in `RUNNING`.

The worker now shields a conditional database transition before propagating
the cancellation. When ARQ has another try available, the run returns to
`PENDING`; on the fifth and final try it becomes `FAILED` with
`GENERATION_INTERRUPTED`. The update only matches `RUNNING`, so an external
`CANCELLED` state is never overwritten. A hard process kill cannot run this
cleanup and still requires future lease-based recovery.

## Reading Worker Output

ARQ's trailing success marker means the job function exited normally. It does
not necessarily mean model generation succeeded. The worker intentionally
handles model errors, persists a safe terminal run status, and then returns
normally to ARQ.

After backend code changes, stop and restart the worker so its process imports
the latest implementation:

```powershell
uv run arq workers.config_worker.WorkerSettings
```
