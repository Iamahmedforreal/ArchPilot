# AI Canvas Output

The AI canvas contract is defined in `server/schema/ai_canvas_schema.py`. It
uses the serialized React Flow format already rendered by the editor.

## Outcomes

Every model response has an `outcome`, an `explanation`, and a `canvas`:

- `generated`: `canvas` is required.
- `unsupported`: `canvas` must be `null`.
- `needs_clarification`: `canvas` must be `null`.

```json
{
  "outcome": "generated",
  "explanation": "A web application calls an API backed by PostgreSQL.",
  "canvas": {
    "nodes": [],
    "edges": []
  }
}
```

Generated canvases require at least one node and support up to 50 nodes and 100
edges. IDs must be unique, every edge endpoint must reference a node in the same
canvas, and coordinates must be finite and within the configured bounds.

## Editor Format

Nodes use `type: "canvasNode"`. The editor renders this as its fixed rounded
architecture card, so generated nodes do not include a separate shape field.
Node data contains:

- `label`
- `componentType`
- `iconKey`
- `color` and matching `textColor`
- `size.width` and `size.height`

The schema accepts the 14 component/icon pairs registered by the frontend.
Icon values are registry keys such as `server`, `database`, and `queue`; they
are not React components or image URLs.

Edges use `smoothstep`, the editor's four `top`, `right`, `bottom`, and `left`
handles, the standard muted stroke, and a closed-arrow marker.

## Context Preparation

`server/service/ai_context_service.py` exposes `prepare_design_context(run)`.
It returns the run instruction, supported node and edge values, component/icon
meanings, layout rules, the response JSON schema, and a small valid example.
For an existing project it also receives the exact saved canvas snapshot and
marks the context as `editing`. The application instructions require a complete
updated canvas, retained node IDs, preserved unrelated nodes and edges, and
preserved positions unless the user's instruction requests movement or a
redesign. An empty project uses `initial` context with no current canvas.

The Gemini model service uses this context and response schema for one
structured generation call. For a generated outcome, the worker stores only
the serialized `canvas` object in `AIRun.proposal_json`; it stores non-generated
outcomes as safe failures.
