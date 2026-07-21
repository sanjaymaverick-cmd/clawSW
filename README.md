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
| 0 | Scaffolding: Docker Compose, auth, users/roles/permissions | not started |
| 1 | Inventory core | not started |
| 2 | Service module | not started |
| 3 | Role dashboards | not started |
| 4 | Public website | not started |
| 5 | Tally sync | not started |
| 6 | Audit + hardening | not started |
| 7 | AI query layer (optional) | not started |

## Working on this repo with Claude Code

Feed each session `docs/BLUEPRINT.md` plus **one phase at a time**. Start with:
"Here's the blueprint, build Phase X only, matching this schema exactly."
