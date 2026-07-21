# clawSW — Build Plan & Architecture Blueprint

Pet project ERP + customer website, built self-hosted on your own mini PC/server.
Goal: role-based internal ERP (inventory, service, invoicing via Tally) + a public
website that feeds orders/leads into the same inventory, all under your control.

---

## 1. Guiding Constraints (from our discussion)

- **Data stays local.** No third-party cloud DB. Server lives on your premises.
- **Tally stays the accounting/invoicing system of record.** clawSW does NOT
  reinvent GST/ledger accounting — it syncs with Tally via API/XML.
- **Scale:** ~20–40 users max. No need for Kubernetes/microservice complexity —
  a single well-structured monolith is the right call here, not overkill.
- **AI chat layer is optional and isolated.** Any query that hits the Claude
  API (cloud) must go through a clearly marked boundary — never send raw
  customer/financial rows to it unless explicitly allowed per query.
- **Roles are hard-enforced at the API layer**, not just hidden in the UI.

---

## 2. High-Level Architecture

```
                        ┌─────────────────────────┐
                        │   Public Website (Next)  │
                        │  spares/tools catalog,   │
                        │  brochures, demo booking │
                        └───────────┬─────────────┘
                                    │ REST/GraphQL (read + order-create)
                                    ▼
                        ┌─────────────────────────┐
                        │      clawSW API          │
                        │   (FastAPI, Python)      │
                        │  - auth & RBAC           │
                        │  - inventory service     │
                        │  - service/job service   │
                        │  - orders/leads service   │
                        │  - Tally sync service     │
                        │  - AI-query gateway       │
                        └───┬───────────┬──────────┘
                            │           │
                 ┌──────────▼──┐   ┌────▼─────────┐
                 │ PostgreSQL   │   │  Tally Prime │
                 │ (local, on   │   │  (XML/API,   │
                 │  your SSD)   │   │  same LAN)   │
                 └──────────────┘   └──────────────┘
                            │
                 ┌──────────▼──────────┐
                 │  Internal Dashboard  │
                 │  (React, role-based) │
                 │  CEO / Manager /     │
                 │  Accountant / Tech   │
                 └──────────────────────┘

        Optional, isolated:
        ┌─────────────────────────────────────────┐
        │  AI Chat Assistant (per-query, opt-in)    │
        │  clawSW API → sanitized query → Claude API│
        └─────────────────────────────────────────┘
```

**Why this shape:** one Postgres database, one API service, two frontends
(internal dashboard + public site) talking to the same API. Tally is treated
as an external system you sync with, not something you rebuild.

---

## 3. Tech Stack (concrete, for Claude Code)

| Layer | Choice | Why |
|---|---|---|
| Database | PostgreSQL | Local, robust, row-level permissions possible |
| Backend API | Python + FastAPI | Fast to build, great for Claude Code to scaffold, easy RBAC middleware |
| Internal dashboard | React + Vite + Tailwind | Matches role-based views cleanly |
| Public website | Next.js | SEO for "reach more customers", SSR product pages |
| Auth | JWT + role claims, bcrypt passwords | Simple, self-hosted, no external auth vendor |
| Tally bridge | Python service hitting Tally's XML/HTTP gateway | Tally supports ODBC/XML import-export locally |
| File/image storage | Local disk, organized by entity ID | No cloud storage dependency |
| AI chat (optional) | Isolated microservice, calls Claude API only with pre-filtered payload | Keeps sensitive rows out of the LLM call by default |
| Deployment | Docker Compose on your mini PC | One `docker compose up`, everything local |

---

## 4. Roles & Permission Matrix

| Role | Inventory | Invoicing/Tally view | Service jobs | Reports | Website module | Admin |
|---|---|---|---|---|---|---|
| Owner/CEO | full | full (read) | full | full | read/write | full |
| Manager | read/write | read | full | department | read/write | no |
| Accountant | read (deduct on invoice) | full | no | financial only | read | no |
| Service Manager | read | no | full | service only | no | no |
| Technician | read (own assigned items) | no | own jobs only | no | no | no |
| Warehouse/Inventory Mgr | full | no | no | stock only | read | no |

Website module (added in Phase 4): machinery/projects content, incoming
website orders (confirming an order deducts stock), and demo bookings.
Owner and Manager manage it; Accountant and Warehouse see incoming orders
read-only.

Enforcement: every API route checks `role` + `resource` + `action` against a
permissions table (not hardcoded if/else) so you can adjust access later
without touching code — this becomes a `permissions` table in the schema below.

---

## 5. Database Schema (core tables)

```sql
-- USERS & ACCESS
users (
  id UUID PK, name, email UNIQUE, password_hash,
  role_id FK -> roles.id, active BOOLEAN, created_at
)
roles (
  id UUID PK, name UNIQUE  -- 'owner','manager','accountant','service_manager','technician','warehouse'
)
permissions (
  id UUID PK, role_id FK, resource TEXT, action TEXT  -- e.g. resource='invoices', action='read'
)

-- INVENTORY
items (
  id UUID PK, sku UNIQUE, name, category, unit,
  price NUMERIC, reorder_level INT, is_spare BOOLEAN, is_tool BOOLEAN,
  description TEXT, image_path TEXT
)
warehouses ( id UUID PK, name, location )
stock_levels (
  id UUID PK, item_id FK, warehouse_id FK, quantity NUMERIC,
  UNIQUE(item_id, warehouse_id)
)
stock_moves (
  id UUID PK, item_id FK, warehouse_id FK, quantity NUMERIC,
  move_type TEXT,  -- 'in','out','transfer','service_use'
  reference_type TEXT, reference_id UUID,  -- links to invoice/job/order
  created_by FK -> users.id, created_at
)

-- SERVICE MODULE
service_jobs (
  id UUID PK, customer_name, machine_id FK -> machinery.id NULLABLE,
  assigned_technician_id FK -> users.id,
  status TEXT,  -- 'open','in_progress','completed','billed'
  description TEXT, created_at, completed_at
)
job_parts_used (
  id UUID PK, job_id FK, item_id FK, quantity NUMERIC
)

-- MACHINERY CATALOG (for website + service history)
machinery (
  id UUID PK, name, brochure_path, category, qr_code TEXT UNIQUE
)
completed_projects (
  id UUID PK, title, description, image_paths TEXT[], client_name, date_completed
)

-- WEBSITE / E-COMMERCE (public-facing, but same inventory)
website_orders (
  id UUID PK, customer_name, email, phone,
  status TEXT,  -- 'pending','confirmed','synced_to_tally'
  created_at
)
website_order_items (
  id UUID PK, order_id FK, item_id FK, quantity NUMERIC, price_at_order NUMERIC
)
demo_bookings (
  id UUID PK, customer_name, email, phone, machinery_id FK, preferred_date, status
)

-- TALLY SYNC
tally_sync_log (
  id UUID PK, direction TEXT,  -- 'to_tally','from_tally'
  entity_type TEXT, entity_id UUID, status TEXT, error_message TEXT, synced_at
)

-- AUDIT (critical for your "overzealous employee" concern)
audit_log (
  id UUID PK, user_id FK, action TEXT, resource TEXT, resource_id UUID,
  ip_address TEXT, payload_snapshot JSONB, created_at
)
```

**Note on audit_log:** every write to `stock_moves`, `service_jobs`,
`website_orders`, and `users` should insert here automatically (DB trigger or
API middleware). This is your actual defense against internal data misuse —
more valuable than any AI feature.

---

## 6. Integration Points

**Tally bridge**
- Tally exposes a local XML-over-HTTP gateway (usually `localhost:9000`) once
  "Enable ODBC/XML Server" is turned on in Tally config.
- Build a small sync worker: on `website_orders.status = 'confirmed'` or
  manual invoice trigger, push a sales voucher XML to Tally; poll Tally
  periodically for payment status to pull back into `tally_sync_log`.
- Keep this as its own service so a Tally outage never blocks inventory/service ops.

**Website ↔ Inventory**
- Public site reads `items` (price, stock availability) via a read-only API
  scoped to `is_spare`/`is_tool` fields — never expose internal cost/margin fields.
- Orders write to `website_orders` + `website_order_items`, then a background
  job decrements `stock_levels` and logs a `stock_move` with
  `reference_type='website_order'`.

**QR codes**
- `machinery.qr_code` links to a public page showing that machine's brochure,
  service history (internal only), and a "book service" form → creates a
  `service_jobs` row.

**AI chat (optional, later phase)**
- Build as a separate `/ai-query` endpoint that: (1) determines what tables
  the question touches, (2) pulls only the minimum aggregated data needed,
  (3) sends that summarized context + question to Claude API, never raw
  customer PII unless the user is CEO/owner and explicitly requests it.

---

## 7. Build Phases (for Claude Code sessions)

**Phase 0 — Scaffolding**
- Docker Compose: Postgres + FastAPI + React dashboard + Next.js site, all
  networked locally.
- Auth: users/roles/permissions tables, login, JWT middleware.

**Phase 1 — Inventory core**
- Items, warehouses, stock_levels, stock_moves CRUD + role-gated endpoints.
- Basic internal dashboard: inventory table, stock adjust form.

**Phase 2 — Service module**
- service_jobs, job_parts_used, technician assignment, status flow.
- Technician view (mobile-friendly): only their assigned jobs.

**Phase 3 — Role dashboards**
- CEO dashboard: aggregated view across all modules.
- Manager/Accountant/Warehouse views scoped per permissions table.

**Phase 4 — Public website**
- Product/spares catalog page, machinery brochures, completed projects gallery.
- Order flow → `website_orders`, demo booking form.

**Phase 5 — Tally sync**
- Build the XML bridge worker, test with a handful of real invoices in a Tally
  sandbox company file before pointing at production data.

**Phase 6 — Audit + hardening**
- Wire up audit_log triggers, test the "can a technician see accountant data"
  scenario directly, encrypt backups, set up a basic backup cron to a second
  local disk.

**Phase 7 (optional) — AI query layer**
- Only after core is stable. Build the sanitization boundary first, then the
  Claude API call.

---

## 8. What to hand Claude Code, session by session

Feed it this file plus one phase at a time — don't ask it to build everything
at once. Start each session with: "Here's the blueprint (attached), build
Phase X only, matching this schema exactly."
