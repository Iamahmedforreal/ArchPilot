## Create context preparation and canvas response schemas.

First inspect:
- src/components/editor/editor-canvas.jsx
- Custom node and edge components
- Shape and system design icon registries
- src/components/editor/starter-templates.js
- Existing backend canvas schemas

Requirements:
- Define output using our actual serialized React Flow format.
- Use existing node types, required data fields, positions,
  edge types, and connection handles.
- Supply the model with supported icon keys and their meanings.
- Icons are registry keys, not React components or external image URLs.
- Include one small valid canvas example in application instructions.
- Reuse existing schemas where possible.

Create:
prepare_design_context(run)

For now, context contains:
- run.instruction
- Supported node types, shapes, and icon keys
- Canvas format and layout rules

Do not load an existing canvas.
Our current endpoint generates a new design from the prompt only.

Define response:
{
  "outcome": "generated",
  "explanation": "Brief design explanation.",
  "canvas": {
    "nodes": [...],
    "edges": [...]
  }
}

Allowed outcomes:
- generated: canvas required
- unsupported: canvas null
- needs_clarification: canvas null

Validate unique IDs, valid edge endpoints, finite coordinates,
supported values, and reasonable node/edge/text limits.

Generated elements must work with existing movement, deletion,
renaming, resizing where supported, and edge connections.
Interaction callbacks remain in frontend code.