# ArchPilot Codebase Guide

This folder explains the application as it exists today. Keep these pages short
and update them when routes, screens, or major data flows change.

## Start Here

- [Backend API](backend-api.md) - HTTP endpoints, authentication, payloads, and
  the backend files behind each endpoint.
- [Frontend](frontend.md) - browser routes, important components, API access,
  and canvas state flow.
- [Background Jobs](background-jobs.md) - Redis delivery, ARQ worker behavior,
  and current AI job limits.

## Repository Map

```text
src/                    React frontend
  components/           UI and editor components
  hooks/                Reusable state and workflow logic
  lib/                  API client and shared browser utilities

server/                 FastAPI backend
  routes/               HTTP request handling
  schema/               Pydantic request and response shapes
  service/              Business and storage logic
  model/                SQLAlchemy database models
  workers/              ARQ worker functions and worker configuration
  utils/                Settings, database, and Redis configuration
  migrations/           Alembic database migrations

context/                Product specs, architecture notes, and progress tracker
docs/                   Practical developer documentation
```

## Main Request Flow

```text
React component
    -> frontend hook
    -> src/lib/project-api.js
    -> FastAPI route
    -> service function
    -> PostgreSQL or Vercel Blob
```

Authentication is provided by Clerk. The frontend sends a Clerk bearer token,
and protected FastAPI routes resolve it to the current user ID before accessing
project data.

## Keeping These Docs Current

When adding a feature:

1. Add or change the implementation.
2. Update the endpoint table when the HTTP API changes.
3. Update the frontend page when a browser route, component responsibility, or
   client-side data flow changes.
4. Update `context/progress-tracker.md` after meaningful implementation work.
