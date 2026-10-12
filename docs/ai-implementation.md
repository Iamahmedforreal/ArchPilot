# AI Implementation Status

The product requirements for iterative AI canvas editing are defined in
`context/feature-specs/ai_implemetion.md`. This document records the current
implementation boundary so the API, worker, frontend, and progress tracker
remain consistent.

## Implemented

- `POST /api/projects/{project_id}/ai/design` authenticates the owner, creates
  an `AIRun` with the expected saved-canvas revision, persists the user's
  instruction, and enqueues the existing ARQ `generate_canvas` job.
- The worker claims runs atomically, locks the project while loading one saved
  Blob snapshot, verifies its revision, prepares the supported component
  registry and editing rules, calls Gemini with the snapshot as context,
  validates the graph, and stores the proposal on the run.
- Generated proposals are not automatically written to the saved canvas. The
  frontend applies a proposal explicitly, then the existing revision-aware
  canvas save flow persists it.
- AI conversations are persisted in `ai_messages`. The project messages
  endpoint returns the user instruction and the stored assistant explanation in
  chronological order.
- The AI sidebar restores project conversations, hides starter prompts after
  the first accepted message, and protects message loading from stale-request
  overwrites.
- Design and spec jobs use Redis/ARQ, bounded model retries, safe failure
  states, and owner-scoped status polling.
- Unsaved frontend canvas changes are flushed through the normal revision-aware
  save flow before a design request is submitted. A save conflict prevents the
  request from being created.

## Remaining hardening from the iterative-editing specification

The core iterative flow is implemented. Remaining hardening work is:

- preserve existing node IDs, unrelated nodes, and unrelated edges through
  provider-level evaluation and broader integration tests for add, move, remove,
  and redesign prompts;
- add browser-level coverage for the save-before-submit flow and replacement
  behavior; and
- add recovery for runs stranded by hard process termination.

## Required implementation sequence

1. Extend the design request and run persistence with the expected/base canvas
   revision while keeping the existing design endpoint.
2. Load one saved canvas snapshot in the worker, verify the expected revision,
   and build an editing-aware model context. Do not silently fall back to a new
   design when a saved canvas is unavailable.
3. Update the model instructions and validation tests for complete-canvas
   editing, preserved IDs, preserved unrelated graph data, and valid edge
   endpoints.
4. Flush or explicitly guard unsaved frontend canvas changes before submit,
   send the confirmed revision, and continue using explicit proposal apply plus
   the normal canvas save endpoint.
5. Add endpoint, worker, model-context, revision-conflict, and frontend-flow
   tests from the feature specification.

## Invariants

- Keep one `POST /ai/design` workflow for initial generation and editing.
- Do not add an agent framework, separate edit endpoint, automatic merge, or a
  second background-worker system.
- Generated results remain proposals until the user applies and saves them.
- Every project and run read or mutation remains owner-scoped.
