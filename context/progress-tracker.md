# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Implementation

## Current Goal

- None.

## Completed

- Design system foundation installed and configured in `cleint_side`.
- Added shadcn/ui Button, Card, Dialog, Input, Tabs, Textarea, and ScrollArea.
- Installed `lucide-react` and verified the requested UI primitives import successfully.
- Added editor navbar, project sidebar, and reusable editor dialog pattern modules.
- Installed `@clerk/ui`.
- Wrapped the React root with `ClerkProvider` using Clerk's dark theme.
- Added sign-in and sign-up pages with minimal two-panel desktop layouts and form-only mobile layouts.
- Added auth route redirects and default route protection.
- Added Clerk `UserButton` to the editor navbar.
- Added root `proxy.ts` route policy file.
- Added editor home content with a wired `New Project` action.
- Added create, rename, and delete project dialogs using mock project data.
- Added sidebar project actions for owned mock projects.
- Added mobile sidebar backdrop scrim for outside-tap close.
- Added SQLAlchemy Base and Project model with Clerk owner ID, optional description, project status enum, canvas blob path, timestamps, and requested indexes.
- Added Alembic migration setup and applied project table migrations to PostgreSQL.
- Added backend project API routes for list, create, rename, and delete.
- Added service-layer project logic with default project naming and owner checks for mutations.
- Added editor workspace shell access checks, AccessDenied state, project-title navbar context, canvas placeholder, and AI sidebar placeholder.
- Added React Flow canvas foundation with a bottom shape panel, draggable shape payloads, drop-to-node creation, and a basic custom node renderer.
- Added proper node shape rendering for CSS and SVG shapes plus a cursor-attached shape drag preview.
- Added selected-node resizing and inline centered label editing for canvas nodes.
- Added selected-node color toolbar with predefined background and paired text-color swatches.
- Added starter templates with lightweight previews and canvas replace/import flow.
- Added the AI sidebar shell with AI Architect chat UI, starter prompt chips, and Specs tab placeholder.
- Refined the AI sidebar into a narrower full-height assistant drawer with right-aligned prompt chips and a pinned composer.
- Compacted the AI sidebar's controls and empty state so its core UI fits shorter editor viewports without scrolling.
- Moved the AI assistant into a separate desktop workspace column and refit the diagram when it opens.
- Restored the AI assistant starter prompts and message area with a flex-safe scroll container.
- Rebuilt the AI sidebar as a compact canvas overlay with an independently scrolling conversation area and pinned composer.
- Removed AI-sidebar-driven React Flow fitting so opening and closing the panel leaves the canvas viewport unchanged.
- Added debounced canvas autosave and initial empty-canvas loading through authenticated FastAPI routes backed by Vercel Blob.
- Added canvas autosave optimistic concurrency with Blob ETag revisions, required PUT revisions, and `409 Conflict` handling for stale writes.
- Replaced the bottom canvas shape panel with architecture component icons, serializable component drag payloads, and backward-compatible legacy shape rendering.
- Compacted the architecture component palette to five centered primary actions with the remaining components behind a more menu.
- Updated starter templates and template previews to use architecture component icon nodes.
- Removed the project access helper route dependency and reduced canvas save project lookup duplication while preserving owner-scoped queries.
- Added explicit canvas loading lifecycle so saved canvases hydrate before empty prompts or autosave can run.
- Redesigned the AI assistant as a compact 360px desktop panel with mobile bottom-sheet behavior while preserving existing assistant functionality.
- Removed the first AI persistence pass so the AI backend can be rebuilt from the current specs.
- Simplified AI chat schemas to message request, message response, and AI run response contracts.
- Set the AI run model response contract to return generated canvas nodes and edges for the current AI route scope.
- Added AI run persistence models with a reversible Alembic migration for asynchronous canvas generation jobs.
- Added the authenticated AI run acceptance route with idempotency handling, active-run admission control, and canvas revision checks.
- Redesigned AI run persistence to the minimal `AIRun` model: project-derived ownership, scoped idempotency, active-run indexes, explanation/error/result revision fields, and no outbox, lease, cancellation, or snapshot storage columns.
- Redesigned the AI run submission route as a thin `routes/ai_route.py` endpoint backed by service-owned submission logic and added a `server/tests` endpoint test home with coverage for this route.
- Added shared ARQ/Redis configuration, FastAPI pool startup and shutdown handling, a Redis development service, and a placeholder `generate_canvas` worker with explicit timeout and concurrency limits.
- Documented separate Redis, FastAPI, worker, and manual job-enqueue commands in `server/README.md`.
- Added an extensible `docs/` developer guide covering the repository map, backend endpoints, frontend routes, API access, canvas persistence, and current implementation limits.
- Connected newly committed AI runs to ARQ with deterministic job IDs, replay-safe enqueueing, safe Redis delivery errors, and a worker that loads runs using its own database session.
- Added focused AI queue and worker tests plus background-job developer documentation.
- Simplified AI submission to `POST /api/projects/{project_id}/ai/design`: each request writes one owned-project `AIRun`, commits it, and then enqueues only its run ID.
- Removed `AIRun` idempotency keys, request hashes, and the scoped unique constraint, with a reversible migration matching the simplified design route.
- Added the authenticated AI run status endpoint with owner-scoped lookup, no-store responses, safe failure details, and successful canvas proposal retrieval.
- Extended `AIRun` with `CANCELLED`, a safe progress stage, and JSONB proposal storage through migration `20260918_0005`.
- Simplified AI design submission to prompt-only generation with no input canvas revision or base revision stored on `AIRun`.
- Installed and locked the official Google Gen AI SDK for future model integration; no model call is wired yet.
- Added strict editor-compatible AI canvas output schemas and prompt context preparation with registry metadata, layout rules, outcome handling, graph integrity validation, and a valid example.
- Made Gemini credentials optional at backend startup, normalized blank keys to `None`, and added an explicit credential guard for the future model-request boundary.
- Added one async structured Gemini design call with fixed ArchPilot instructions, editor context, validated canvas output, safe provider errors, and worker-shutdown client cleanup.
- Added concurrency-safe AI run claiming, persisted preparing/generation progress, guarded proposal completion, non-generated outcome mapping, and safe execution-failure persistence.
- Connected the AI sidebar to authenticated design submission and sequential run-status polling with stage-aware progress, bounded connection backoff, stale-workflow cancellation, and terminal-state handling.
- Added defensive frontend proposal checks plus one-action canvas replacement that preserves generated graph data, creates one undo entry, clears selection, fits the viewport, and saves through the existing revision-aware autosave flow.
- Protected existing and newly edited canvas work by auto-applying only to an unchanged empty canvas and requiring an explicit `Replace canvas` action otherwise.
- Fixed AI sidebar submissions being silently blocked by a canvas-readiness race; send actions now enter the workflow and display a clear loading-state message when the editor is not ready.
- Added a flattened Gemini-compatible provider schema with all required canvas fields while preserving the complete Pydantic contract after generation, disabled unused automatic function calling, and mapped provider capacity failures separately.
- Added same-run Gemini capacity retries in the worker with three total attempts and bounded 2/4-second exponential backoff; frontend POST submission remains single-shot.
- Added an AI generation incident guide documenting the frontend submission race, SDK literal failure, AFC warning, provider schema rejection, permissive intermediate schema, capacity failure, and their fixes.
- Added cancellation-safe worker state transitions: shielded cleanup returns retryable ARQ attempts to `PENDING`, fails the final attempt, preserves externally `CANCELLED` runs, and always propagates cancellation.
- Centralized Gemini retry timing and expanded the ARQ job timeout to cover three request timeouts, 2/4-second backoffs, and the existing 60-second persistence margin.

## In Progress

- None.

## Next Up

- Add explicit recovery for runs stranded `PENDING` after enqueue failure or `RUNNING` after worker interruption.
- Expand endpoint tests across project and canvas routes.
- Add a frontend test runner and automated coverage for AI polling, stale responses, replacement history, and autosave interaction.

## Open Questions

- None.

## Architecture Decisions

- Add decisions that affect the system design or data model.

## Session Notes

- shadcn/ui has been initialized in `cleint_side` with the Vite/Radix Nova preset; generated UI components live in `cleint_side/src/components/ui/`.
- App-level CSS now maps the generated shadcn tokens to the dark technical workspace palette from `context/ui-context.md`.
- Verification passed: `npm run lint` and `npm run build`.
- Editor chrome verification passed: `npm run lint` and `npm run build`.
- Removed the Shared section from the project sidebar.
- Auth verification passed: `npm run lint` and `npm run build`.
- Project dialogs and editor home verification passed: `npm run lint` and `npm run build`.
- Project model verification passed: `uv run python -m compileall model migrations main.py utils`, `uv run alembic upgrade head`, PostgreSQL schema inspection, and `npm run build`.
- Project API verification passed: backend compile check, OpenAPI route check, endpoint smoke test for `401`/`403`/owner flows, and `npm run build`.
- AI sidebar assistant drawer verification passed: `npm run lint` and `npm run build`.
- AI sidebar compact-layout verification passed: `npm run lint`.
- AI sidebar overlay redesign verification passed: `npm run lint` and `npm run build`.
- Canvas autosave verification passed: `npm run lint`, `npm run build`, backend compile, and OpenAPI route registration for canvas `GET`/`PUT`.
- Canvas autosave concurrency verification passed: `npm run lint`, `npm run build`, backend compile, and OpenAPI route registration for revision-aware canvas `GET`/`PUT`.
- Architecture component icon palette verification passed: `npm run lint` and `npm run build`.
- Compact architecture palette verification passed: `npm run lint` and `npm run build`.
- Architecture starter template verification passed: `npm run lint` and `npm run build`.
- Project access query cleanup verification passed: backend compile and OpenAPI project route registration.
- Canvas loading lifecycle verification passed: `npm run lint` and `npm run build`.
- AI assistant panel redesign verification passed: `npm run lint` and `npm run build`.
- AI persistence reset verification passed: removed AI models/migrations, downgraded Alembic to `20260904_0002`, and backend compile passed.
- AI chat schema simplification verification passed: backend schema compile and import checks passed.
- AI canvas response schema verification passed: backend schema compile and validation checks passed.
- AI run persistence verification passed: backend compile, SQLAlchemy mapper configuration, Alembic head check, `alembic upgrade head`, and PostgreSQL schema inspection.
- AI run acceptance route verification passed: backend compile, SQLAlchemy mapper configuration, and OpenAPI route/header registration check.
- Minimal AI run persistence redesign verification passed: backend compile, SQLAlchemy mapper configuration, and PostgreSQL offline DDL compile.
- AI run route redesign verification passed: backend compile, OpenAPI route/header registration, and `python -m unittest tests.test_ai_run_route`.
- ARQ/Redis setup verification passed: backend compile, focused ARQ unit tests, ARQ CLI import, Docker Compose configuration validation, Redis `PING`, and a live enqueue/worker handoff that completed and logged the submitted run ID.
- Moved the project-managed Redis host port to configurable `REDIS_PORT` with a `6380` default, avoiding collisions with existing services on `6379`; container-to-container Redis remains on port `6379`.
- Codebase documentation added and checked against the current FastAPI routes and root React application structure.
- AI run enqueue verification passed: backend compile, eight focused route/helper/worker tests, OpenAPI route validation, and ARQ worker startup against the shared Redis configuration.
- Simplified AI design route verification passed: route/service tests confirm write-before-enqueue ordering, ownership rejection, and committed pending-run persistence.
- AI run idempotency removal verification passed: model and service compile, focused tests pass, and Alembic `20260918_0004` upgrades the database schema without the removed columns.
- AI run status verification passed: eleven focused tests cover ownership, missing and cross-project runs, no-store headers, result/error gating, and the read-only status response; migration `20260918_0005` applied successfully.
- AI design revision verification passed: thirteen focused tests cover matching and stale revisions, canvas lookup failures, write-before-enqueue ordering, ownership, and run status responses.
- Prompt-only AI submission verification passed: four focused tests cover request validation, ownership rejection, write-before-enqueue ordering, and revision-free persistence; migration `20260918_0006` passed downgrade/upgrade and is applied at head.
- Google Gen AI SDK installation verification passed: the dependency imports successfully and `uv.lock` is synchronized; model invocation remains intentionally unimplemented.
- AI canvas output verification passed: eight focused tests cover the valid example, context registry, outcome rules, unique IDs, edge endpoints, finite coordinates, editor resize limits, and component/icon consistency.
- Gemini configuration verification passed: five focused tests cover missing, blank, trimmed, rejected, and accepted API-key states.
- Gemini model-call verification passed: eight focused tests cover one-call structured configuration, graph validation, safety blocks, empty and truncated output, timeout and provider mapping, rate limits, and SDK client shutdown.
- AI worker persistence verification passed: nine focused tests cover atomic claims, duplicate delivery, successful proposal storage and GET exposure, unsupported and clarification outcomes, safe model failures, skipped runs, guarded completion, completion-write failures, and cancellation propagation.
- Frontend AI workflow verification passed: `npm run lint` and `npm run build`; the project currently has no frontend test runner, so automated browser workflow tests remain follow-up work.
- AI sidebar connection fix verification passed: the Vite proxy reaches the backend AI route, and final `npm run lint` and `npm run build` checks pass.
- Gemini schema compatibility verification passed: a saved prompt reaches the provider with the flattened full-field schema, strict edge constant tests pass, and all twelve current backend worker/schema tests pass. The current external failure was confirmed as Gemini `503 UNAVAILABLE` due to temporary model demand.
- Gemini retry verification passed: focused tests cover success after retries, bounded exhaustion, and immediate propagation of non-retryable model errors.
- Worker cancellation verification passed: focused tests cover retryable `PENDING` reset, final-attempt failure, guarded `RUNNING` predicates, and cancellation propagation.
- Shared retry-budget verification passed: default and configured request timeout calculations plus ARQ worker integration are covered by focused tests.
- Gemini invalid-response diagnostics now log sanitized validation paths and the model instruction explicitly covers registry pairing and fixed edge values; raw model output remains private and clients retain the safe generic error.
