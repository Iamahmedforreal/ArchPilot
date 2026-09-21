## Implement server/service/ai_model_service.py using google-genai.

Expose:
async generate_design(context)

Requirements:
- Make one async Gemini generation call.
- Use GEMINI_MODEL from settings.
- Put fixed ArchPilot rules in system_instruction.
- Send the user's prompt separately as content.
- Include our actual canvas format, supported node types,
  shapes, and icon keys in the application context.

Keep the existing architecture-only instructions and outcomes:
generated, unsupported, needs_clarification.

Request structured JSON:
- response_mime_type = "application/json"
- Supply the response schema using the installed SDK's supported
  structured-output configuration.

Response:
{
  "outcome": "generated",
  "explanation": "Brief explanation.",
  "canvas": {
    "nodes": [...],
    "edges": [...]
  }
}

- Parse and validate the response using our Pydantic schemas.
- Validate unique IDs, edge endpoints, coordinates, and supported icons.
- Handle safety blocks, empty responses, truncation, timeouts,
  rate limits, and provider errors.
- Return safe errors to the worker.
- Never expose reasoning output or credentials.
- Close SDK resources during worker shutdown.
- No tools, browsing, agent loop, or additional planning calls.

Check the current official Gemini documentation and installed SDK
before implementing the exact call and configuration syntax.