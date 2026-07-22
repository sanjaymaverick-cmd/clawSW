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
| 5 | Tally sync | **done** |
| 6 | Audit + hardening | **done** |
| 7 | AI query layer (optional) | **done** |
| 8 | Mock/demo dataset | **done** |
| 9 | Login rate limiting + website-orders dashboard | **done** |

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

### Tally bridge (Phase 5)

The `tally-bridge` service is a separate worker so a Tally outage never
blocks inventory/service ops. Every `TALLY_SYNC_INTERVAL_SECONDS` it pushes
confirmed website orders to Tally Prime's XML/HTTP gateway as Sales
vouchers (flipping them to `synced_to_tally`) and polls Receipt vouchers to
record payment status in `tally_sync_log`. The dashboard's **Invoicing**
tab (Accountant: full; Owner/Manager: read) shows bridge status, the sync
log, and manual push/pull triggers.

Tally-side setup — do this in a **sandbox company file first** (blueprint
Phase 5) and run a handful of invoices through before pointing at
production data:

1. In Tally: enable **ODBC/XML Server** (gateway defaults to port 9000)
   and set `TALLY_URL` in `.env` to that machine, e.g.
   `http://192.168.1.20:9000`.
2. Create the ledgers named by `TALLY_SALES_LEDGER` and
   `TALLY_PARTY_LEDGER`, and stock items named exactly like your clawSW
   item names.
3. Confirm a website order, then watch the Invoicing tab / `tally_sync_log`
   for the result. Failed pushes stay `confirmed` and are retried each
   cycle; the log row carries Tally's error message.

### Audit log & encrypted backups (Phase 6)

Every write to the sensitive tables — `users`, `stock_moves`,
`service_jobs`, `website_orders` — is recorded in `audit_log`
automatically (action, acting user, client IP, full row snapshot with
password hashes redacted), in the same transaction as the write itself.
Route handlers never log manually, so nothing can be forgotten; writes
without a signed-in user (public website orders, the Tally bridge) are
recorded with no user. The Owner-only **Audit** tab on the dashboard
(and `GET /audit`) shows the trail; the RBAC suite asserts the
blueprint's "can a technician see accountant data" scenario directly
against the API.

The `backup` service is a basic backup cron: every
`BACKUP_INTERVAL_SECONDS` (default daily, plus once at startup) it runs
`pg_dump`, gzips and AES-256-encrypts the dump with `BACKUP_PASSPHRASE`,
and writes it to `BACKUP_DIR` — set that to a mount on a **second local
disk** (e.g. `/mnt/backup-disk/clawsw`) so one disk failure can't take
the database and its backups together. Backups older than
`BACKUP_RETENTION_DAYS` are pruned. Keep a copy of the passphrase off the
machine: without it a backup is unrecoverable. To restore into an empty
database:

```bash
docker compose run --rm backup /scripts/restore.sh /backups/clawsw-<stamp>.sql.gz.enc
```

### Mock/demo dataset (Phase 8)

For rehearsals and demos — not real business data — the API can seed a full
fictional dataset on startup: items (spares + tools), two warehouses with
stock levels, machinery with placeholder brochures + QR codes, service jobs
across every status with parts used, completed projects, website orders
across every status with line items, demo bookings, and **one login per
non-owner role** (manager, accountant, service_manager, technician,
warehouse) so all six role-dashboards can be exercised end-to-end.

It lives in `api/app/seed_demo.py`, separate from the always-on `seed.py`,
and is gated behind `SEED_DEMO_DATA` so it never touches a real deployment:

```bash
SEED_DEMO_DATA=true            # off by default; set only on a demo instance
SEED_DEMO_PASSWORD=demo-password   # shared password for the seeded logins
```

Like `seed.py` it is idempotent, so a demo box can keep the flag set across
reboots without duplicating rows. The real Excel/Tally data migration is a
separate later project, not this fixture.

### Login rate limiting & website orders (Phase 9)

**Login lockout.** `/auth/login` is brute-force protected: after
`LOGIN_MAX_ATTEMPTS` consecutive failures for a given (email, client IP)
pair, that pair is locked out for `LOGIN_LOCKOUT_MINUTES` (defaults 5 /
15). While locked, even the correct password is refused with `429` and a
`Retry-After` header. State lives in the `login_attempts` table (one row
per email+IP) so the lockout survives restarts and is shared across API
workers; a successful login clears the counter. Keying on email **and**
IP means one attacker can't lock the real user out from another address,
while a single host guessing passwords still trips the limit.

**Website-orders dashboard.** The **Website** tab lists incoming website
orders and lets staff confirm pending ones — replacing the earlier
`/docs`-only workaround. Confirming picks a warehouse, deducts stock, and
writes a `website_order` stock move (the existing Phase 4 endpoint).
Visibility follows the `website` permission: Owner/Manager can confirm
(read+write), Accountant/Warehouse see it read-only, and
Service Manager/Technician have no access.

### Repo layout

```
api/        FastAPI backend — auth, RBAC (permissions table), users admin
dashboard/  React + Vite + Tailwind internal dashboard
website/    Next.js public site — catalog, brochures, projects, demo booking
scripts/    encrypted backup cron + restore (Phase 6)
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
