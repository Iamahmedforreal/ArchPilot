# Gemini SDK

The backend has Google's official `google-genai` Python SDK installed and
locked as a dependency. It is available for the future model integration.

No Gemini client, prompt, model request, response parsing, retry policy, or
worker integration is implemented yet.

`GOOGLE_GEMINI_API_KEY` is optional during backend startup. Missing and
whitespace-only values normalize to `None`, so importing backend modules does
not require Gemini credentials. The future request implementation must call
`require_gemini_api_key()` from `server/service/gemini_config_service.py`
before constructing a Gemini client; the guard rejects absent credentials.

The editor-aware context and validated response format are prepared in
`server/service/ai_context_service.py` and `server/schema/ai_canvas_schema.py`.
They will be passed to the SDK when model invocation is implemented.

Install the locked backend dependencies from `server` with:

```powershell
uv sync
```
