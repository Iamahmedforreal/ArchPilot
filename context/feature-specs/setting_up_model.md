## IMPLEMENTATION Setting up the model 

- Install the official Python SDK: google-genai.
- Use its async API in the ARQ worker.
- Add backend settings:

GEMINI_API_KEY=<secret>
GEMINI_MODEL=<GemiNI MODEL>
GEMINI_TIMEOUT_SECONDS=120
GEMINI_MAX_OUTPUT_TOKENS=6000



- Keep the API key exclusively on the backend.
- Configure an explicit request timeout.
- Set the ARQ job timeout longer than the model timeout.
- Return a safe configuration error if the key is missing.
- Do not add automatic retries or model fallback.