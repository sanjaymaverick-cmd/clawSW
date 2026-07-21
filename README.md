# clawSW

Self-hosted ERP + public customer website for a machinery sales & service
business. Runs entirely on local hardware (mini PC/server) — no third-party
cloud database. Tally Prime remains the accounting/invoicing system of record;
clawSW syncs with it over its local XML/HTTP gateway.

## What it covers

- **Inventory** — items (spares/tools), warehouses, stock levels, stock moves
- **Service module** — service jobs, parts used, technician assignment
- **Role-based internal dashboard** — CEO, Manager, Accountant, Service
  Manager, Technician, Warehouse views, enforced at the API layer via a
  permissions table
- **Public website** — spares/tools catalog, machinery brochures, completed
  projects gallery, order flow and demo bookings feeding the same inventory
- **Tally sync** — sales voucher push + payment status pull, isolated so a
  Tally outage never blocks operations
- **Audit log** — automatic logging of all sensitive writes
- **Optional AI query layer** — isolated, opt-in, sanitized before any
  Claude API call

## Architecture & build plan

The full blueprint — architecture diagram, tech stack, roles/permission
matrix, database schema, integration points, and phased build plan — lives in
[docs/BLUEPRINT.md](docs/BLUEPRINT.md). Treat it as the source of truth for
every build session.

## Tech stack (planned)

| Layer | Choice |
|---|---|
| Database | PostgreSQL |
| Backend API | Python + FastAPI |
| Internal dashboard | React + Vite + Tailwind |
| Public website | Next.js |
| Auth | JWT + role claims, bcrypt |
| Tally bridge | Python worker → Tally XML/HTTP gateway |
| Deployment | Docker Compose, fully local |

## Build phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Scaffolding: Docker Compose, auth, users/roles/permissions | **done** |
| 1 | Inventory core | **done** |
| 2 | Service module | **done** |
| 3 | Role dashboards | **done** |
| 4 | Public website | **done** |
| 5 | Tally sync | not started |
| 6 | Audit + hardening | not started |
| 7 | AI query layer (optional) | not started |

## Running it

```bash
cp .env.example .env   # then edit: set real passwords + JWT secret
docker compose up --build
```

- Internal dashboard: http://localhost:8080 — sign in with the
  `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env` (an owner account is
  seeded on first startup)
- Public website: http://localhost:3000
- API docs (OpenAPI): http://localhost:8000/docs

Postgres is not exposed to the host network; data persists in `./pgdata`.

### Repo layout

```
api/        FastAPI backend — auth, RBAC (permissions table), users admin
dashboard/  React + Vite + Tailwind internal dashboard
website/    Next.js public site — catalog, brochures, projects, demo booking
docs/       BLUEPRINT.md — architecture & build plan (source of truth)
```

### Development without Docker

```bash
# API (needs a local Postgres, or set DATABASE_URL to sqlite for a quick try)
cd api && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload        # http://localhost:8000
.venv/bin/python -m pytest                     # run the test suite

# Database migrations (Alembic) — run automatically on API startup.
# After changing models in api/app/models.py, generate a migration:
#   cd api && .venv/bin/alembic revision --autogenerate -m "describe change"
# The test suite fails if models drift from migrations (test_migrations.py).

# Dashboard (proxies /api to localhost:8000)
cd dashboard && npm install && npm run dev     # http://localhost:5173

# Website
cd website && npm install && npm run dev       # http://localhost:3000
```

## Working on this repo with Claude Code

Feed each session `docs/BLUEPRINT.md` plus **one phase at a time**. Start with:
"Here's the blueprint, build Phase X only, matching this schema exactly."
