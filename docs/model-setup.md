# Gemini SDK

The backend has Google's official `google-genai` Python SDK installed and
locked as a dependency. It is available for the future model integration.

No Gemini client, prompt, model request, response parsing, retry policy, or
worker integration is implemented yet.

The editor-aware context and validated response format are prepared in
`server/service/ai_context_service.py` and `server/schema/ai_canvas_schema.py`.
They will be passed to the SDK when model invocation is implemented.

Install the locked backend dependencies from `server` with:

```powershell
uv sync
```
