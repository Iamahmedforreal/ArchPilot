# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes — do not layer workarounds.
- Do not mix unrelated concerns in one component or route.
- Respect the system boundaries defined in `architecture-context.md`.

## JavaScript

- Avoid implicit `any`-like patterns — validate and shape data explicitly instead of trusting whatever comes in.
- Validate unknown external input (API responses, user input) at system boundaries before trusting it.
- Use JSDoc type annotations or PropTypes for component contracts where type safety matters (e.g. node/edge shapes on the canvas).
- Keep object shapes for canvas nodes/edges consistent everywhere they're used — the schema must match between user-created content and imported templates.

## React

- Keep components focused on rendering; push data fetching and business logic into hooks or API calls.
- Add real-time/interactive state (canvas dragging, live updates) only where it's actually needed — not throughout the whole component tree.
- Keep canvas, sidebar, and dialog components separate — do not mix canvas rendering logic with unrelated UI.

## Styling

- Use CSS custom property tokens defined in `globals.css` — no raw Tailwind color classes like `zinc-*` or hardcoded hex values.
- Reference tokens through their Tailwind utility names: `bg-base`, `text-copy-primary`, `border-surface-border`, `text-brand`, etc.
- Maintain the border radius scale: `rounded-xl` for small elements, `rounded-2xl` for cards, `rounded-3xl` for modals.

## API (FastAPI)

- Validate and parse request input using Pydantic models before any logic runs.
- Enforce auth (Clerk) and project ownership checks before any mutation.
- Return consistent, predictable response shapes.
- Keep route handlers thin — push complexity into shared modules or background tasks.
- Long-running work (AI generation) belongs in background tasks via Trigger.dev, not in request handlers.

## Data and Storage

- Project metadata, ownership, and task run records belong in PostgreSQL via SQLAlchemy.
- Canvas snapshots and generated specs belong in Vercel Blob; the database stores only the blob path reference (`canvasJsonPath`, `filePath`).
- Do not store large generated content (canvas JSON, Markdown specs) directly in the database.
- Task run records are first-class relational data — treat ownership as verified before any task is triggered.

## File Organization

- `lib/` — shared infrastructure: database client (SQLAlchemy), auth helpers, utilities.
- `trigger/` — all durable background tasks and AI workflows.
- `components/` — UI composition only; no business logic.
- `app/api/` — route handlers for auth, triggering, and persistence.
- Name files after the responsibility they contain, not the technology.