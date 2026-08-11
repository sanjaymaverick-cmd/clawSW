# clawSW / Sanjay Wood Tech — Premium UI/UX Design System

**Codename:** Woodline  
**Status:** Approved for implementation (P0 → P1 → P2)  
**Scope:** Public website (`website/`) + staff dashboard (`dashboard/`)  
**Quality bar:** $10k industrial product craft (Linear / Vercel / Stripe density + Biesse-class brand film)

---

## 1. Vision

Transform clawSW from a functional ERP shell + capable marketing site into a **premium industrial platform**:

| Audience | Feeling |
|---|---|
| Factory buyers | “This is a modern machinery partner — I want to explore and plan.” |
| Staff | “Calm, fast, modern ops tool — I see what needs me now.” |

**Principles**

1. **3D earns its keep** — every immersive surface ends in a clear next action.
2. **Continuous craft** — motion feels like one camera, not stacked slides.
3. **Wood + steel** — warm oak gold on deep charcoal; never generic AI purple.
4. **Dual surface, one DNA** — public is cinematic; staff is dense and calm; shared tokens.
5. **Progressive enhancement** — reduced-motion, mobile, 3D optional.

**Non-goals (P0–P1)**

- New backend APIs or auth changes  
- Replacing 3D stack  
- Full CMS for marketing content  

---

## 2. Design system — “Woodline”

### 2.1 Color

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a0b0d` | Page background |
| `--surface` | `#14171c` | Cards |
| `--wood` | `#e0a45a` | Primary accent / links |
| `--wood-2` | `#c77d2e` | Hover / secondary |
| `--red` | `#ef2b3d` | Primary CTA energy |
| `--text` | `#f3f1ec` | Body |
| `--text-muted` | `#a7aeb8` | Secondary |
| **Status** | | |
| `--ok` | `#34d399` | success / active |
| `--warn` | `#fbbf24` | low stock / pending |
| `--info` | `#60a5fa` | synced / in progress |
| `--danger` | `#f87171` | failed / error |

**Staff (dashboard)** reuses the same palette; default **dark-first** with slightly cooler surfaces (`#0c0e12` / `#151922`) for long-session readability.

### 2.2 Typography

| Role | Family | Notes |
|---|---|---|
| Display | Sora | Headlines, stats |
| Body | Inter | UI, tables |
| Mono | ui-monospace | SKUs, IDs |

Scale (clamp-friendly): eyebrow 0.75rem · body 1rem · lead 1.15rem · h1 display clamp(2.1–3.6rem).

### 2.3 Space, radius, elevation

- Space: 8 / 16 / 24 / 40 / 64 / 96  
- Radius: 10 / 16 / 24 / 32 / pill  
- Shadows: sm/md/lg + wood glow ring  
- Max content width public: 1200px; staff main: 1280px  

### 2.4 Motion tokens

| Name | Duration | Easing | Use |
|---|---|---|---|
| micro | 120ms | ease-out | hover, focus |
| ui | 200ms | cubic-bezier(0.16,1,0.3,1) | panels, tabs |
| page | 400ms | same | route/section |
| cinematic | 800ms+ | spring-soft | hero, 3D reveals |

`prefers-reduced-motion: reduce` → disable parallax, autoplay loops, spring overshoot; keep opacity fades ≤200ms.

### 2.5 Component inventory

Button · Input · Select · Badge · Card · Table · Drawer · Toast · Tabs · Sidebar · EmptyState · Skeleton · CommandPalette (P1) · WorkshopDock · StatTile · PipelineStepper · AttentionCard  

**States:** default / hover / focus-visible / active / disabled / loading / error  

---

## 3. Public website experience

### 3.1 Interaction principles

- Sticky glass header after scroll  
- Magnetic primary CTAs (subtle scale)  
- Scroll-reveal with `rise` + optional spring  
- 3D pages: mode switcher Explore / Specs / Book  

### 3.2 Engagement loops (reasons to stay)

| # | Loop | Entry | 30s path | Persist | Metric | Sales handoff |
|---|---|---|---|---|---|---|
| 1 | Industry matcher | Home / Industries | Pick industry → machine set | sessionStorage shortlist | completions | Book demo prefilled |
| 2 | Capacity calculator | Machinery / Services | Inputs → shortlist | localStorage | calc_used | WhatsApp + demo |
| 3 | Floor plan challenge | Floor planner | Load demo layout → tweak → score | layout JSON | layouts_saved | Share + book |
| 4 | Spares finder | Catalog | Search machine → cart | cart local | order_start | Confirm order |
| 5 | Demo from 3D | Product explorer | Explore → Request demo | query params | demo_from_3d | Booking form |

P0 ships **Workshop dock** (persistent next-step rail) as the spine for these loops; calculators/matchers are P1.

### 3.3 Workshop dock (P0)

Fixed bottom/floating rail on public pages (not login):

`Explore machines · 3D plan · Spares · Book demo`

### 3.4 Page-level upgrades

| Page | Target |
|---|---|
| Home | Stronger dual CTA, path strip “Explore in 60s”, social proof motion |
| Machinery | Filter chips, hover cards, skeletons |
| Product 3D | Mode tabs + sticky CTA |
| Floor planner | Guided empty state + sales demos |
| Catalog | Trust strip, stock badges, polished cart |
| Login | Elevated staff card, demo accounts (dev only) |

---

## 4. Motion / HyperFrames content system

| Piece | Length | Placement | End CTA |
|---|---|---|---|
| Factory film loop | 12–15s | Home hero poster/fallback | Explore machines |
| Beam-saw line explainer | 20–30s | Machinery category / services | Book demo |
| Floor planner promo | 15s | Floor planner intro | Open planner |
| Spares trust | 10s | Catalog header | Browse spares |
| Staff tools teaser | 8s | Login / about (internal) | Staff login |

Doctrine: continuous camera (motion-doctrine), optional mute autoplay + captions, static poster fallback.

**P0:** posters + placement hooks. **P1:** HyperFrames compositions.

---

## 5. Staff dashboard experience

### 5.1 Shell

- **Left sidebar** (collapsible on mobile): logo, nav by permission, public site link  
- **Top bar:** page title context, user chip, role badge, sign out  
- Dark-first Woodline staff theme  
- Attention inbox on Dashboard: pending orders, low stock, open jobs  

### 5.2 Screen targets

| Screen | Upgrade |
|---|---|
| Dashboard | Attention cards + sparklines-ready stat tiles |
| Inventory | Dense tables, low-stock badges, sticky headers |
| Service | Status chips + card grid; optional kanban P1 |
| Website orders | Pipeline stepper pending → confirmed → synced |
| Invoicing | Gateway health strip + log |
| Users / Audit | Drawers P1; clean tables P0 |

### 5.3 Technician mobile

Large status buttons, card-first jobs, minimal chrome (P1 polish).

---

## 6. Competitive audit (summary)

| Area | Weakness today | Fix |
|---|---|---|
| Dashboard | Bootstrap-era slate cards, top tabs only | Sidebar shell, dark theme, attention UI |
| Website header | Fine but no engagement dock | Workshop dock + refined glass |
| Empty states | Sparse text | Illustrated EmptyState + next action |
| Staff tables | Readable, not premium | Sticky head, status system, density |
| Motion | Rise animations exist | Tokenize; path strip; later HyperFrames |
| Cross-surface | clawSW vs SWT naming | SWT Staff everywhere public-facing |

**2-week plan (1 eng + AI)**

| Days | Focus |
|---|---|
| 1–2 | Design tokens both surfaces + dashboard shell |
| 3–4 | Website header/dock/home/login/catalog |
| 5–6 | Dashboard pages (reports, inventory, service, orders) |
| 7–8 | Empty states, pipeline, polish a11y |
| 9–10 | P1: command palette, kanban, calculators, motion clips |

---

## 7. Implementation phases

### P0 — Visual cohesion (this sprint)

**Website:** motion tokens · EmptyState · Workshop dock · header polish · home path strip · catalog trust · login elevation  

**Dashboard:** Woodline dark CSS · sidebar App shell · shared Button/Badge · Dashboard attention · Service status chips · Website orders stepper  

### P1 — Depth

- [x] Command palette (Ctrl/Cmd+K)  
- [x] Inventory SKU/name + type filters  
- [x] Service status chip filters (list columns; full kanban later)  
- [x] Industry matcher on home  
- [x] Toast system (website order confirm)  
- [ ] Capacity calculator  
- [ ] HyperFrames clips  
- [ ] Light mode toggle  
- [ ] Full service kanban board  

### P2 — Delight

Shareable floor layouts · onboarding tours · AI query UI · full design-system Storybook  

---

## 8. Acceptance criteria (P0)

- [x] Shared status colors on public + staff  
- [x] Workshop dock on main public pages  
- [x] Dashboard sidebar + dark shell  
- [x] Dashboard attention cards when data available  
- [x] Website orders show pipeline status UI  
- [x] `prefers-reduced-motion` respected for new motion  
- [x] Auth, `/app` base, RBAC, APIs unchanged  

---

## 9. File map (P0)

```
docs/DESIGN-UI-UX-UPGRADE.md     ← this document
website/app/globals.css          ← tokens + dock + empty
website/app/components/*         ← Header, EmptyState, WorkshopDock
website/app/page.tsx             ← path strip
website/app/login/*              ← elevated card
website/app/catalog/*            ← trust strip
dashboard/src/index.css          ← staff theme
dashboard/src/App.tsx            ← shell
dashboard/src/ui/*               ← shared primitives
dashboard/src/*Page.tsx          ← page polish
```

---

*Next: implement P0, then P1 items one after another.*
