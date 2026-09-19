# Gemini Model Call

The backend has Google's official `google-genai` Python SDK installed and
locked as a dependency. `server/service/ai_model_service.py` makes one async
structured generation attempt at a time for each non-terminal AI run.

`GOOGLE_GEMINI_API_KEY` is optional during backend startup. Missing and
whitespace-only values normalize to `None`, so importing backend modules does
not require Gemini credentials. The model-request boundary rejects a missing
key or `GEMINI_MODEL` with the safe `MODEL_NOT_CONFIGURED` error.

The service sends fixed ArchPilot rules and editor metadata as the system
instruction, while the user's prompt is sent separately as content. It requests
`application/json` with a small Gemini-compatible response schema, disables SDK
retries, applies the configured timeout and token limit, and validates the
returned graph against the complete Pydantic canvas schema before returning it
to the worker. The worker then persists the canvas proposal or safe failure in
`AIRun` using a status-guarded update.

The provider schema is flattened and keeps every required node and edge field
while avoiding Google SDK and Gemini endpoint restrictions around non-string
literals, converted `additionalProperties`, and schema references. Pydantic
remains authoritative for registry combinations, graph references, exact edge
values, dimensions, and limits. Automatic function calling is disabled because
canvas generation does not expose tools. Provider `503` capacity responses are
stored as `MODEL_PROVIDER_BUSY` so they can be distinguished from other API
failures.

Safety blocks, empty or truncated output, timeouts, rate limits, invalid canvas
data, and provider failures become safe error codes. Provider details,
credentials, and reasoning output are never returned. The shared SDK client is
closed by the ARQ worker shutdown hook.

The worker retries `MODEL_PROVIDER_BUSY` twice with bounded exponential
backoff: 2 seconds and then 4 seconds. All attempts belong to the same `AIRun`
and ARQ job. No retry repeats the HTTP submission or creates another run.
The ARQ job timeout covers all three possible request timeouts, both backoffs,
and a 60-second persistence margin. With the default 120-second request timeout,
the complete job timeout is 426 seconds.

Install the locked backend dependencies from `server` with:

```powershell
uv sync
```
