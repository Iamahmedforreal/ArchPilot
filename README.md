# ArchPilot

ArchPilot is an AI-assisted workspace for designing software systems.

It helps you turn an application idea into an editable architecture canvas,
refine the design with AI, and create a private Markdown specification when
the design is ready.

## What you can do

- Create and manage system design projects.
- Describe an application in plain language.
- Generate an editable architecture canvas with components and connections.
- Ask AI to improve or extend an existing design.
- Answer clarification questions when a request needs more detail.
- Review AI suggestions before applying them to your project.
- Edit the canvas manually.
- Continue conversations inside each project.
- Save and reopen your work.
- Generate a private Markdown specification from a saved design.

ArchPilot is a design and planning tool. It does not deploy infrastructure or
replace engineering review. AI-generated designs should be checked before they
are used for implementation.

## How it works

1. Sign in.
2. Create a project or open an existing one.
3. Describe the system you want to design.
4. Review the generated canvas.
5. Ask for changes or edit the canvas yourself.
6. Apply suggestions when you are satisfied with them.
7. Generate a Markdown specification for the saved design.

AI suggestions remain separate until you choose to apply them. This helps you
review changes without losing work already in the project.

## Project experience

### Projects

Each project is a separate workspace for a system design. Projects can be
created, renamed, opened, and deleted from the editor.

### Design canvas

The canvas shows system components and the connections between them. It is
editable, so you can use AI for a starting point and then adjust the design to
match your own requirements.

### AI design assistant

The assistant can create a new design or make focused changes to an existing
one. When a request is too vague, it asks a limited number of clarification
questions instead of inventing requirements.

### Specifications

ArchPilot can turn a saved canvas into a private Markdown document that can be
downloaded from the project.

## Local setup

### Requirements

- Node.js and npm
- Python 3.12 or newer
- [`uv`](https://docs.astral.sh/uv/)
- Docker Desktop
- Clerk credentials for sign-in
- A Vercel Blob token for saved designs and specifications
- A Google Gemini API key for AI features

### Install

From the project root:

```powershell
npm ci
Set-Location server
uv sync
```

### Configure the backend

Create `server/.env`. This file is ignored by Git. Use your own credentials:

```dotenv
POSTGRES_USER=archpilot
POSTGRES_PASSWORD=change-me
POSTGRES_DB=archpilot
PORT=5433
REDIS_PORT=6380

DATABASE_URL=postgresql+asyncpg://archpilot:change-me@127.0.0.1:5433/archpilot
REDIS_URL=redis://127.0.0.1:6380/0

CLERK_SECRET_KEY=replace-me
CLERK_JWT_KEY=replace-me
CLERK_AUTHORIZED_PARTIES=http://localhost:5173
BLOB_READ_WRITE_TOKEN=replace-me
GOOGLE_GEMINI_API_KEY=replace-me
GEMINI_MODEL=replace-me
```

### Configure the frontend

Create `.env.local` in the project root:

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=replace-me
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_API_PROXY_TARGET=http://127.0.0.1:8000
```

Never commit environment files or place secret keys in prompts, diagrams, or
documentation.

### Start the application

To run the complete application in containers, from the project root run:

```powershell
docker compose up --build
```

This starts the frontend, FastAPI backend, ARQ worker, PostgreSQL, and Redis.
The frontend is available at [http://localhost:5173](http://localhost:5173),
and its Nginx `/api` proxy communicates with the backend container. Compose
uses `database` and `redis` as the internal service hostnames. Set
`POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` in the root `.env` if
you need values other than the defaults.

For host-based development, start the local database and Redis from `server/`:

```powershell
Set-Location server
docker compose up -d
uv run alembic upgrade head
```

Run the backend, worker, and frontend in separate terminals:

```powershell
# Terminal 1, from server/
uv run fastapi dev main.py --host 127.0.0.1 --port 8000
```

```powershell
# Terminal 2, from server/
uv run arq workers.config_worker.WorkerSettings
```

```powershell
# Terminal 3, from the project root
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The API health page is available at
[http://127.0.0.1:8000/health](http://127.0.0.1:8000/health), and the API
reference is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

The background worker must be running for AI design and specification requests.

## Testing

From the project root:

```powershell
npm run lint
npm test
npm run build
```

From `server/`:

```powershell
uv run python -m unittest discover -s tests -p "test_*.py"
```

The automated tests cover project access, canvas saving, AI workflows,
clarification behavior, generated output validation, rate limiting, and worker
behavior. Browser-level testing and live provider testing require separate
environment-backed checks.

## Important notes

- AI output is a suggestion and can be incomplete or incorrect.
- Saved canvas changes use revision checks to help prevent accidental overwrite.
- AI proposals are not applied automatically.
- AI requests require the background worker, Redis, storage, and model settings.
- A production deployment needs its own backup, monitoring, data-retention, and
  secret-rotation policies.
- Review [docs/legal.md](docs/legal.md) before redistribution or commercial use.

## Documentation

| Document | Purpose |
| --- | --- |
| [docs/about.md](docs/about.md) | Short product overview |
| [docs/frontend.md](docs/frontend.md) | Editor behavior and frontend workflows |
| [docs/backend-api.md](docs/backend-api.md) | API requests and responses |
| [docs/background-jobs.md](docs/background-jobs.md) | AI and specification job behavior |
| [docs/model-setup.md](docs/model-setup.md) | Gemini configuration |
| [docs/ai-canvas-output.md](docs/ai-canvas-output.md) | AI canvas output rules |
| [docs/rate-limiting.md](docs/rate-limiting.md) | AI request limits |
| [docs/testing.md](docs/testing.md) | Testing details |
| [docs/ai-implementation.md](docs/ai-implementation.md) | AI implementation status |
| [docs/legal.md](docs/legal.md) | Legal and redistribution notice |

## Project status

ArchPilot currently includes the authenticated project workspace, editable
canvas, AI design and clarification flows, saved conversations, reliable canvas
saving, and private Markdown specification generation.
