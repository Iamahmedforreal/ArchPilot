# Testing

The project overview is covered by one frontend test module per feature unit:

- `src/tests/auth-projects.test.js` checks auth-route recognition and the project list/create/rename/delete API boundary.
- `src/tests/canvas.test.js` checks empty snapshot loading and revision-aware canvas saving.
- `src/tests/starter-system-designs.test.js` checks every starter template has renderable nodes and connected edges.
- `src/tests/ai-generation.test.js` checks valid AI graph acceptance and invalid edge rejection.
- `src/tests/spec-generation.test.js` checks spec submission, run polling, and Markdown download.

Backend boundaries have matching focused modules where server behavior exists:

- `server/tests/test_authentication_projects.py`
- `server/tests/test_canvas.py`
- `server/tests/test_ai_architecture_generation.py`
- `server/tests/test_spec_generation.py`
- `server/tests/test_ai_rate_limit.py` checks token-bucket capacity, refill,
  independent users, concurrent access, Redis failure handling, and protected
  endpoint scope.

Existing backend tests remain in place and continue to cover the deeper worker,
schema, retry, persistence, and spec-generation cases.

Run frontend tests from the repository root:

```text
npm test
```

Run backend tests from `server`:

```text
uv run python -m unittest discover -s tests -p "test_*.py"
```

Each test is intentionally small: it checks the behavior named by the project
overview without starting the browser, React Flow, Clerk, Redis, or blob storage.
