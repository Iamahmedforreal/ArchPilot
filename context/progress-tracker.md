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

## In Progress

- None.

## Next Up

- Add canvas persistence after starter template imports are complete.

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
