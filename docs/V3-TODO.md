# clawSW v3 — to-do list

**Status:** local working list (not a committed ship plan)  
**Written:** 2026-08-13  
**Source:** post–PR #9 repo audit (public site + ERP/docs vs code)  
**Principle:** The ERP and marketing *shell* are built. v3 is honesty, content, and ship-readiness — not another module.

Do **not** start a new ERP feature until P0 is done.

---

## Sequence (do in this order)

1. Catalogue cleanup (P0)
2. Front-door IA + brand (P0)
3. Close the demo leak (P0)
4. Merge PR #9 / `main` as default *(this session)*
5. Real ops data + Tally sandbox (P1)
6. Docs, RBAC honesty, repo hygiene (P1–P2)

---

## P0 — Must not ship to a factory buyer

### 1. Catalogue scrub (`website/data/products.json` + scrape pipeline)

- [ ] Strip Elementor **lorem ipsum** from product summary/body (SI-2409B is all-lorem; many others append the same Latin block).
- [ ] Remove the universal **“Each MJ270 is delivered as a commissioned…”** boiler (170 / 171 products).
- [ ] Remove **phone-as-feature** (`Call +919414039793`) from 161 / 171 products. That number is not even in `company.phones`.
- [ ] Fix **SIP-3820** (homepage “New launches”):
  - [ ] Wrong copy (PUR hot-melt lamination line)
  - [ ] Wrong hero (`DOUBLE-SIDE-PLANER-150x150.jpg`)
  - [ ] Features = only the phone
  - [ ] Gallery includes WPForms `submit-spin.svg` alt `"Loading"`
- [ ] Drop Woo / form junk from galleries (`submit-spin.svg`, `woocommerce-placeholder-*`, `lazy.svg`).
- [ ] Prefer full-size images over **150×150 thumbs** stretched to 16:10.
- [ ] Fix shipped name typos:
  - [ ] Horixontal → Horizontal
  - [ ] Finger Jpointing → Finger Jointing
  - [ ] Spindle Moduler → Spindle Moulder
  - [ ] Hydrauli Clamp → Hydraulic Clamp
  - [ ] Wire Brush Snder / Sender → Sander
  - [ ] Cnc / Co2 title-case
- [ ] Deduplicate veneer category (`veneer-line-machinery` + `veneer-machinery`).
- [ ] Fix Edge Banding `count: 0` while ~10 edge banders exist (subcategory slugs never attached).
- [ ] Fix cross-wired listings (e.g. `hydraulic-hot-press-model-hp-1325-3-copy` titled *Round End Tenoner*).
- [ ] Stop treating `seasoning-chamber` / `cart-conveyor-finishing-line` as industries.
- [ ] Stop committing unused `website/data/site.json` (~1.4 MB / 18k-line scrape dump). Runtime uses split JSON.
- [ ] Teach `scraper/build_site_data.py` these filters so the next crawl does not re-pollute.

### 2. Front door looks like a machinery company

**Nav (desktop header today):** Machinery · 3D Explorer · Workbench · Floor Plan · Spares · Services · About · **Staff** · Book a Demo

- [ ] Primary nav: **Machinery · Services · About · Contact · Book a Demo**.
- [ ] Move 3D Explorer / Workbench / Floor Plan under machine pages or a “Workshop” overflow — not the main bar.
- [ ] Staff login: **footer only** (keep `/login` `noindex`).
- [ ] Put Contact, Industries, Gallery where buyers expect them (Contact missing from desktop nav).
- [ ] Add favicon + Open Graph image + `metadataBase` + sitemap + robots + custom `not-found.tsx`.
- [ ] Fix founded-2001 stat: **25 years**, not “28+”.
- [ ] Unify brand spelling: **Sanjay Wood Tech** (story currently says “Sanjay Woodtech”; logo lockup is `SanjayWoodTech`).
- [ ] Deduplicate services (12 overlapping scraped tiles; “realproduction”; Architecture ×3; Floor Compliance twice).
- [ ] Park **DIRACERP** off the SWT services grid (different product).
- [ ] Testimonials: drop FAQ-as-quote (“Absolutely. We can provide customized quotations…”). Attach real names/factories or remove the section.
- [ ] Gallery: replace WhatsApp / UUID alts with real captions.
- [ ] Industries: remove ChatGPT / Woo placeholder alts (`"ChatGPT Image Jul 2, 2026…"`).
- [ ] Footer: real Facebook page URL (not `facebook.com/share/…`); add Instagram already in `company.json`.
- [ ] Honour `?industry=` on `/book-demo` (`IndustryMatcher` sets it; `BookingForm` ignores it).
- [ ] Machinery `?cat=` chips should stay in sync with the URL.

### 3. Stop 3D / AR from lying

- [ ] Do not present `saw-blade.glb` as Beam Saw BS-2700 (header, explorer, floor-planner AR).
- [ ] Do not show customers the AR **dev instruction** (`ViewInARButton` “Place a simplified GLB/USDZ under /public/models/ar/…”).
- [ ] Fix 3D slugs with no catalogue PDP → 404 on “Specs & enquiry”:
  - [ ] `/machinery/wide-belt-sander`
  - [ ] `/machinery/four-side-moulder-model-mb4016d`
- [ ] Stop fuzzy `getMachineByProductSlug` attaching the wrong placeholder (any `four-side-moulder-*` → MB4016D).
- [ ] Remove public copy: **“Lusion-level interaction”**, **“Zustand state”**, “Drop sample kit”, floor-planner `mode select · place: beam-saw-bs-2700`.
- [ ] Either ship real simplified meshes or label placeholders honestly (“Preview geometry — not this model”).

### 4. Close the demo leak

- [ ] `docker-compose.yml`: `SHOW_DEMO_LOGINS` default **false** (today `:-true`).
- [ ] `website/Dockerfile`: `ARG NEXT_PUBLIC_SHOW_DEMO_LOGINS=false`.
- [ ] Keep demo emails only in `docs/TEST_LOGINS.md`, never on `/login` unless the flag is explicit.
- [ ] Confirm production `.env` has `SEED_DEMO_DATA=false` and `SHOW_DEMO_LOGINS=false`.
- [ ] Local `.env` still uses `demo-password` / `local-dev-jwt-secret-…` — fine on the mini PC; **never** copy that file to a public host.

### 5. Legal / India B2B hygiene

- [ ] Privacy + terms (and refund if you take online spare orders).
- [ ] GSTIN / CIN on contact or footer if you sell from the site.
- [ ] `/catalog` copy (“Genuine OEM-grade parts / Stocked in India”) must not run on **demo ERP SKUs**.

---

## P1 — After the public site is honest

### 6. Real ops data (not another module)

- [ ] Import real SKUs / stock (Excel or Tally). Turn off `SEED_DEMO_DATA` on any box a customer or staff will trust.
- [ ] Host product photos **locally** (or a CDN you control). Today every image is hotlinked to `sanjaywoodtech.com/wp-content/`. WP down = blank catalogue.
- [ ] Tally **sandbox company** on the LAN — worker is real XML, never validated. README Phase 5 “done” oversells this.
- [ ] Do not sell “in stock and ready” until stock is real.

### 7. CEO / staff honesty

- [ ] Stop header copy **“Real-time business performance”** while numbers are demo seed.
- [ ] Label receivables `inferred_order` vs Tally (pull does **not** write `receivable_snapshots`).
- [ ] Downgrade “Predictions” to “run-rate sketch”.
- [ ] Label import ₹ / project margins as **typed seed** until `project_lines` exist.
- [ ] Resolve contradiction: dashboard still says **“Financial (pre-Tally placeholder)”** while README marks Phase 5 done.
- [ ] “Local AI Command Center” is keyword templates — keep it, drop the AI oversell.

### 8. Docs that tell the truth

- [ ] README phase table: Phase 5 = **implemented, not sandbox-validated**. Phase 10 = **rehearsal config**, not production.
- [ ] Align BLUEPRINT footer (“Phases 8–10 are next”) with README (“0–10 done”).
- [ ] Update BLUEPRINT §4 RBAC to match `PERMISSION_MATRIX` (or implement the missing cells — see P2).
- [ ] `docs/TEST_LOGINS.md` tab matrix: add Imports / Projects.
- [ ] CEO plan checklists are still `[ ]` while prose says A–E shipped — tick what is actually live, defer the rest.

---

## P2 — Later / do not block the front door

### 9. RBAC cells `seed.py` already calls “later-phase”

- [ ] Technician inventory: blueprint says *own assigned items*; code is full `inventory:read`.
- [ ] Accountant deduct-on-invoice: stock only drops on website confirm / inventory adjust.
- [ ] Manager reports: *department* — actually gets stock + service + financial.
- [ ] Public QR brochure + “book service” → `service_jobs` (blueprint §6) — not on the website.

### 10. Repo / process hygiene

- [ ] `.gitignore`: `scraper/output/`, `scraper/output_full/`, `lusion-vibe-site/`, `lusion-vibe-site.zip`, `website/screenshots/`, `.claude/`.
- [ ] Do **not** commit `pgdata/`, `backups/`, `.env`, `dashboard/dist/`, `node_modules/`.
- [ ] GitHub Issues board is empty despite `docs/agents/issue-tracker.md` — file P0 items as issues if you want agents to pick them up.
- [ ] `CONTEXT.md` + `docs/adr/` do not exist; create only when a real decision is locked (domain skill).
- [ ] Close or triage stale **PR #2** (ECC bundle).
- [ ] Overview tab on the dashboard is a permission-badge dump — hide or finish.

### 11. Polish (not blockers)

- [ ] Homepage `why_us` 4th card duplicates “Pan India service”; icon mapping is off.
- [ ] Mixed Tailwind on `/products/[id]` vs custom CSS elsewhere.
- [ ] Hero3D: branded still fallback if WebGL dies (today charcoal gradient).
- [ ] Skip-to-content; hamburger `aria-controls`; decorative img alts.
- [ ] GraphQL in BLUEPRINT diagram — API is REST only (doc fix).

---

## Observations (kept for context — not extra work)

### What is already solid

- Phases 0–4, 6–7, 8–9 substantially implemented: auth, inventory, service, website orders, audit listener, AI sanitizer, demo seed, login lockout.
- Tally client is real XML/HTTP, isolated so a dead gateway cannot take the shop down.
- CEO waves A–B real; C–E are thin (inferred AR, header CRUD, city cards not a map).
- Public chrome is Sanjay Wood Tech, not clawSW (except demo emails + token keys).
- Real HQ, phones, emails; login `robots: noindex`.
- Hero3D payload cut to 1024 WebP + 1K HDRI (~3.4 MB) on PR #9.
- Casino/spam URLs filtered from the scrape.

### Discrepancies worth remembering

| Claim | Reality |
|---|---|
| README Phase 4 website **done** | Shell exists; content is a dirty WP scrape |
| README Phase 5 Tally **done** | Client exists; no sandbox invoices |
| README Phase 8 demo seed **done** | True — and still the only inventory |
| CEO plan: waves A–E implemented | A–B yes; C inferred; D no lines; E no map |
| Default GitHub branch (pre this session) | Feature branch, not `main` |
| Agents.md: issues + CONTEXT + ADRs | None present |

### Do not do in v3

- Another ERP module (Imports v2, project lines, map) while Finger Jointing still shows a planer photo.
- Committing Lusion / Scenicone dumps into this repo.
- Selling 3D “inspect this machine” without a real mesh.
- Putting `SEED_DEMO_DATA=true` on an internet-reachable box.

---

## Done this session

- [x] Audit public site + ERP/docs vs code.
- [x] Hero3D WebP/1K + `HomeHero` committed and pushed to PR #9 (`7cf0e76`).
- [x] Merge PR #9 into `main` (`603b0ca`) and set GitHub default branch to `main`.
