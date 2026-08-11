# Plan: Integrate SW Blueprint Ideas into clawSW CEO Dashboard

**Source:** [sanjaymaverick-cmd/SW](https://github.com/sanjaymaverick-cmd/SW) (interactive ERP blueprint)  
**Target:** Owner CEO Dashboard (`dashboard/src/CeoDashboard.tsx` + `GET /reports/ceo`)  
**Principle:** Prefer **local, free** intelligence over paid models. Cloud AI (`/ai-query`) stays optional.  
**Status:** Waves A–E implemented in codebase (2026-08). Use CEO Dashboard as owner to verify.

### Shipped summary

| Wave | Delivered |
|---|---|
| A | `formatInr`, morning brief, attention feed, local AI Command Center |
| B | `warehouses.kind` + `assigned_user_id`, van stock split on CEO |
| C | `receivable_snapshots` + inferred AR from aged website orders |
| D | `import_containers`, operational `projects`, Imports/Projects tabs |
| E | Machine passports + rule-based risk, service city map on CEO |

---

## Goals

1. Match the SW “one screen for the owner” feel using **live** clawSW data.
2. Ship high-value UX first (items 1–4) with **no schema break**.
3. Grow domain modules (5–8) with migrations, RBAC, and then CEO surfaces.
4. Keep demos pretty (9) and long-horizon product (10) without blocking ops.

## Non-goals

- Replacing Tally as system of record for GST/ledgers.
- Shipping mock AR/containers as if they were real accounting.
- Requiring Anthropic or any paid LLM.

## Current baseline (already in clawSW)

| Capability | Where |
|---|---|
| CEO snapshot API | `GET /reports/ceo` (owner / `admin:read`) |
| Financial + ops KPIs, risks, predictions, insights | `CeoDashboard.tsx` |
| Optional cloud AI | `POST /ai-query` (503 if no key) |
| Inventory, service, website orders, Tally bridge | Existing modules |

---

## Wave overview

| Wave | Items | Theme | Est. effort | Backend schema? |
|---|---|---|---|---|
| **A** | 1, 2, 3, 4 | CEO UX from existing data | 2–4 days | No |
| **B** | 5 | Van / multi-location stock | 1–1.5 weeks | Yes (light) |
| **C** | 6 | Receivables aging via Tally | 1–2 weeks | Yes (sync-derived) |
| **D** | 7, 8 | Imports + turnkey projects | 3–5 weeks | Yes (new modules) |
| **E** | 9, 10 | Map polish + machine passport | 2–4 weeks | Partial |

```
Wave A ──► Wave B ──► Wave C
              │
              └──► Wave D ──► Wave E
```

Waves B and C can overlap after A. D depends on inventory maturity (B helps). E depends on service + machinery history (partially exists).

---

## Wave A — CEO command center (items 1–4)

**Outcome:** Owner opens CEO Dashboard and gets morning brief, one attention feed, Indian money formatting, and a **free local Q&A** panel. No paid API.

### Item 3 — Better money UX (₹L / ₹Cr)

**Do first** (shared helper used by 1, 2, 4).

| Task | Detail |
|---|---|
| Add `formatInr(n)` | `dashboard/src/lib/money.ts` — Cr / L / full `en-IN` |
| Apply | All CEO tiles, pipeline, GMV, predictions, attention amounts |
| Optional API | Keep raw numbers in JSON; format only in UI |

**Acceptance:** Values ≥ 1L show as `₹x.xL`; ≥ 1Cr as `₹x.xxCr`; smaller as full rupees.

---

### Item 2 — Morning briefing strip

| Task | Detail |
|---|---|
| UI card top of `CeoDashboard` | “Morning briefing” / “Today’s brief” |
| Content from `CeoSnapshot` | Health score; top 3 risks by severity; pipeline ₹; open jobs; pending orders; Tally reachable |
| Refresh | Same 60s poll as CEO data; timestamp “as of …” |
| Optional API field | `briefing: { bullets: string[] }` computed in `_ceo_insights` or client-side only |

**Prefer client-side first** to avoid API churn; promote to API if mobile/owner brief endpoint is needed later.

**Acceptance:** On load, owner sees 4–6 bullets without scrolling past the fold on desktop.

---

### Item 4 — Unified attention inbox

| Task | Detail |
|---|---|
| Build feed items from snapshot | Map risks + operational counts into one list |
| Item shape | `{ id, severity, category, title, detail, hrefTab? }` |
| Categories | `inventory` · `service` · `website` · `finance` (Tally fail) |
| Actions | Click → `onNavigate('inventory' \| 'service' \| 'website' \| 'invoicing')` |
| Dedup | Prefer existing `risks[]`; add synthetic rows only if count > 0 and not already in risks |

**Sources (live today):**

| Signal | Source |
|---|---|
| Low stock | `operational.low_stock_skus` / risks |
| Open service | `open_service_jobs + in_progress_jobs` |
| Pending website orders | `website_orders_pending` + pipeline value |
| Failed Tally | `tally.failed_push_count` |

**Acceptance:** Single “Needs attention” panel replaces scattered mini-cards for the same signals (keep KPI tiles).

---

### Item 1 — Local AI Command Center (no paid API)

Port SW `askMockAI` pattern onto **live** aggregates.

| Layer | Work |
|---|---|
| **Engine** | `dashboard/src/lib/ceoLocalAi.ts` (or `api/app/ceo_local_ai.py` if you want server-side reuse) |
| **Intents** | Keyword → answer builder (see table below) |
| **UI** | Panel on CEO page: chips, free-text input, chat-style log |
| **Cloud** | Keep existing Anthropic buttons as “Cloud brief (optional)” secondary; default is local |

**Intent map (v1):**

| Keywords (examples) | Answer from |
|---|---|
| stock, inventory, reorder, low, sku | low_stock_skus, risks inventory |
| service, job, backlog, technician | open/in_progress jobs, completion rate |
| order, website, pipeline, pending | pipeline_value, pending counts |
| tally, sync, invoice bridge | tally.* |
| health, risk, brief, morning, today | health_score + top risks + pipeline |
| revenue, gmv, sales, money | website_gmv_*, billed_parts_value |
| demo, booking, lead | demo_bookings_* |
| predict, outlook, forecast | predictions[] |

**Rules:**

- Answers are **templates + numbers**, not free-form LLM (unless cloud opt-in).
- No PII: only aggregates already on `CeoSnapshot`.
- Unknown query → list suggested chips (SW pattern).

**Suggested chips (v1):**

1. What’s the morning brief?  
2. What’s low stock?  
3. How is the service backlog?  
4. What’s in the order pipeline?  
5. Is Tally healthy?  
6. What’s the GMV outlook?

**Acceptance:**

- Works with empty `ANTHROPIC_API_KEY`.
- Each chip returns a structured title + body using live data after refresh.
- Cloud AI remains available only if configured; never required.

**PR breakdown (Wave A):**

| PR | Scope |
|---|---|
| A1 | `formatInr` + apply on CEO |
| A2 | Morning briefing strip + attention feed |
| A3 | Local AI engine + Command Center UI |

---

## Wave B — Van / multi-location stock (item 5)

**Outcome:** Stock can live in **main warehouses** and **van / technician bins**; CEO and inventory show both; service parts can come from van.

### Data model

Prefer **warehouse kinds** over a parallel stock system:

```text
warehouses
  + kind TEXT  -- 'main' | 'van' | 'branch'  (default 'main')
  + assigned_user_id UUID NULL FK users  -- for van → technician
```

Existing `stock_levels (item_id, warehouse_id, quantity)` already multi-location.

**Migration:** Alembic add columns; seed one demo van warehouse if `SEED_DEMO_DATA`.

### API / RBAC

| Endpoint / change | Notes |
|---|---|
| List warehouses | Include `kind`, `assigned_user_id` |
| Stock list | Optional `?kind=van` filter; expose warehouse kind on rows |
| Adjust / transfer | Unchanged; transfer main ↔ van is the workflow |
| Reports CEO | Optional: `stock_main_value`, `stock_van_value`, vans with low spares |

### UI

| Surface | Change |
|---|---|
| Inventory | Columns / badges: Main vs Van; filter by kind |
| Service job “Use part” | Prefer assigned tech’s van warehouse when set |
| CEO | KPI or attention: “Van spares below reorder” |

**Acceptance:** Create van warehouse, transfer stock to it, see split on inventory; CEO can surface van low-stock if any.

**PR breakdown:** B1 migration + API; B2 inventory UI; B3 service + CEO hooks.

---

## Wave C — Receivables / aging (item 6)

**Outcome:** CEO sees **AR aging** from real Tally-linked data — not mock invoices.

### Preconditions

- Tally XML bridge push of confirmed website orders works in sandbox.
- Payment pull (`from_tally` / `payment_received`) is trusted enough for demos.

### Approach (aligned with blueprint)

Tally remains SoR. clawSW stores **sync-derived** AR snapshots, not a full ledger.

**Option C1 (recommended MVP):**

```text
receivable_snapshots
  id, party_ref, party_name, amount, due_date, days_overdue,
  status,  -- 'overdue' | 'upcoming' | 'paid'
  source,  -- 'tally_receipt' | 'manual' | 'inferred_order'
  entity_type, entity_id,  -- e.g. website_order
  captured_at
```

- Worker or `/tally/pull-payments` enriches rows.
- Until receipts exist: **inferred** aging from confirmed/synced website orders older than N days (flagged `inferred_order` so CEO knows quality).

**Option C2 (later):** Full invoice import from Tally sales vouchers (heavier mapping).

### CEO surface

- Tile: “Overdue receivables” (₹L/Cr).
- Table or attention items: top overdue parties (aggregate names only if from Tally; avoid leaking website PII to local AI unless owner-only UI).
- Local AI intent: `overdue`, `receivable`, `payment`, `collect`.

### RBAC

- `invoices:read` for detail; CEO already has it.
- Local AI uses aggregates only for export to any cloud path.

**Acceptance:** Owner sees aging buckets (0–30 / 31–60 / 60+) with clear “inferred vs Tally” labels; accountant Invoicing tab can list same data.

**PR breakdown:** C1 schema + pull mapping; C2 CEO/finance UI; C3 local AI intents.

---

## Wave D — Containers & turnkey projects (items 7–8)

**Outcome:** Import pipeline and project margins are first-class modules; CEO shows pipeline health and margin risk.

### Item 7 — Containers & import tracking

**New tables (sketch):**

```text
import_containers
  id, code, origin, port, supplier, eta_port, status,
  -- On Water | At Port | Customs Hold | Cleared | Delivered
  milestone, value_inr, delay_days, machine_count, notes, created_at

import_container_lines (optional)
  container_id, item_id NULL, machinery_id NULL, qty, description
```

**Module:** Staff routes under Inventory or new **Imports** tab (`imports:read/write` — grant owner, manager, warehouse).

**CEO:** Counts delayed/customs hold; value at risk; attention feed items.

**Local AI intents:** container, import, shipment, customs, port.

### Item 8 — Turnkey projects + margin

**New tables (sketch):**

```text
projects
  id, code, customer_name, city, stage,
  -- Quote | Split Fulfilment | Container Tracking | Delivery & Install | Closed
  boq_value, margin_pct, target_install, status, created_at

project_lines
  project_id, source ('stock'|'import'), item_id NULL, machinery_id NULL,
  qty, unit_cost, unit_price

project_containers
  project_id, container_id  -- link imports to project margin
```

**Module:** **Projects** tab (owner, manager, service_manager read).

**CEO:** Active project count; lowest margin project; BOQ pipeline ₹; stage funnel.

**Note:** Distinct from public `completed_projects` (marketing gallery). Keep gallery; add operational `projects`.

**Acceptance:**

- Create project + link container + compute/display margin.
- CEO shows project pipeline summary without opening Projects tab.
- Demo seed populates 2–3 projects + 1–2 containers when `SEED_DEMO_DATA`.

**PR breakdown:** D1 containers schema+API+UI; D2 projects schema+API+UI; D3 CEO + local AI + seed.

---

## Wave E — Service map & predictive maintenance (items 9–10)

### Item 9 — Service map

**MVP (no GIS vendor):**

- Aggregate open jobs / techs by **city** (add optional `city` on service_jobs or parse from customer notes later).
- Simple SVG or CSS map (SW-style illustrative Jodhpur/Jaipur) **or** list-by-city cards if geo is weak.
- CEO: optional collapsible “Service footprint” with counts per city + link to Service.

**Not required for production ops** — mark as demo/enhancement.

### Item 10 — Predictive maintenance / QR machine passport

**Align with existing blueprint:**

- `machinery.qr_code` → public brochure page (partially there).
- Extend **machine passport** (owner/service): install date, warranty, service history count, parts consumed (from `job_parts_used` + `machine_id`).

**Predictive (rule-based first, free):**

```text
risk_score = f(age_days, open_job_count, parts_value_12m, avg_days_between_jobs)
```

- No ML cloud required.
- CEO: “Machines with elevated service risk” top 5.
- Full ML only if/when history volume justifies it.

**PR breakdown:** E1 passport UI + history API; E2 rule-based risk; E3 optional map.

---

## Cross-cutting concerns

### RBAC matrix additions

| Resource | owner | manager | accountant | service_mgr | tech | warehouse |
|---|---|---|---|---|---|---|
| `imports` | rw | rw | r | — | — | rw |
| `projects` | rw | rw | r | r | — | r |
| `receivables` (or under invoices) | r | r | rw | — | — | — |

CEO endpoint stays `admin:read` (owner); sections appear only when data exists.

### Local AI vs cloud AI

```
User question
    │
    ├─► Local intent engine (default) ──► template from aggregates / module reads
    │
    └─► Optional “Cloud brief” ──► POST /ai-query (only if key set)
```

Never send raw AR party rows or customer PII to cloud without existing sanitizer rules.

### Demo seed

Extend `seed_demo.py` per wave:

- B: van warehouse + stock  
- C: inferred receivables from old orders  
- D: containers + projects  
- E: machinery service history density  

### Testing

| Wave | Tests |
|---|---|
| A | Unit: intent matching; component smoke for CEO |
| B | API: transfer to van; stock by kind |
| C | Aging buckets; RBAC accountant vs tech |
| D | Container status transitions; project margin calc |
| E | Passport aggregates; risk score monotonicity |

### Docs / agent notes

- Update `docs/BLUEPRINT.md` phases for imports/projects/receivables.
- Short note in `AGENTS.md`: CEO local AI is default; cloud optional.
- Keep `docs/DESIGN-UI-UX-UPGRADE.md` Woodline tokens for new panels.

---

## Delivery timeline (1 eng + AI assist)

| Week | Deliverable |
|---|---|
| 1 | Wave A complete (1–4) on production CEO dashboard |
| 2 | Wave B van stock end-to-end |
| 3–4 | Wave C receivables MVP (inferred + Tally enrich) |
| 5–7 | Wave D containers module |
| 7–9 | Wave D turnkey projects + CEO surfaces |
| 10+ | Wave E passport + map as capacity allows |

Adjust if Tally sandbox access is delayed (hold C full fidelity; keep inferred AR).

---

## Success metrics

| Metric | Target |
|---|---|
| Owner can brief without cloud AI | 100% of morning questions answered by local intents |
| Time to “what needs me” | < 5s after login (attention + brief) |
| Van fulfilment | Tech can consume parts from assigned van |
| AR visibility | Overdue ₹ visible with source label |
| Import risk | Delayed containers appear on CEO attention |
| Project margin | Lowest-margin active project visible to owner |

---

## Open decisions (confirm before Wave B+)

1. **Warehouse kind vs separate `vans` table** — plan assumes `warehouses.kind`.  
2. **Inferred AR before Tally** — yes for demos, always labeled.  
3. **Projects vs completed_projects naming** — operational `projects` vs marketing gallery.  
4. **Imports tab vs submenu under Inventory** — recommend top-level **Imports** for CEO storytelling.  
5. **Map cities** — hardcode Jodhpur/Jaipur first vs free-text city field.

---

## Implementation order (checklist)

### Wave A
- [ ] `formatInr` helper + CEO application  
- [ ] Morning briefing strip  
- [ ] Unified attention inbox  
- [ ] `ceoLocalAi` intents + suggested chips UI  
- [ ] Downgrade cloud AI to optional secondary  

### Wave B
- [ ] Migration `warehouses.kind`, `assigned_user_id`  
- [ ] API + inventory filters  
- [ ] Service default van warehouse  
- [ ] CEO van low-stock signal  

### Wave C
- [ ] `receivable_snapshots` + Tally/infer pipeline  
- [ ] CEO aging tiles + table  
- [ ] Local AI receivables intents  

### Wave D
- [ ] Containers CRUD + statuses  
- [ ] Projects + lines + container link  
- [ ] CEO import/project summaries  
- [ ] Demo seed  

### Wave E
- [ ] Machine passport + history  
- [ ] Rule-based maintenance risk  
- [ ] Optional service map  

---

## Next step after plan approval

Start **Wave A / PR A1** (`formatInr` + morning brief + attention + local AI Command Center) on the live CEO dashboard — no migrations, ships fastest owner value, no paid API.
