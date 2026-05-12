# Phase 33: End-to-end satellite-build flow — sales order → delivery, guided wizard + wire all pages — Research

**Researched:** 2026-05-11
**Domain:** Vanilla HTML/JS frontend wiring + Express/Lambda backend additions (Postgres) on the Turion satellite demo
**Confidence:** HIGH (codebase fully inspected; no external libs needed)

> No CONTEXT.md exists yet for Phase 33 — `/gsd:discuss-phase 33` was not run. The roadmap requirements (`SalesOrderWizard, SatelliteSpawn, LifecycleWiring, NoDeadEnds, E2EFlowVerified`) drive the scope below. The planner should treat the recommendations here as defaults to confirm with the user during planning, not locked decisions.

---

<phase_requirements>
## Phase Requirements

| ID | Description (from ROADMAP) | Research support |
|----|---------------------------|------------------|
| SalesOrderWizard | A "New satellite program" wizard in `/satellite/` that creates a sales order, persisting to the DB and tying into the Phase-25 cross-system sync where it makes sense | §C (where the SO lives), §D (backend route: `POST /api/satellites` + an optional `POST /api/integration/seed-program` or extend `sync-sales-order`), §E (wizard page `program-new.html`) |
| SatelliteSpawn | The wizard spawns the satellite + its BOM + initial part instances + lifecycle-stage-0 events | §B (the chain), §D (a "spawn from template" route/function that copies SAT-003's BOM-line structure — see migration 012 pattern), §F (likely a small migration adding a stored function OR a route that does it in app code) |
| LifecycleWiring | Audit the whole chain and add a clear "next step" link on every page | §A (page inventory + dead ends), §E (proposed link graph + breadcrumb/progress indicator) |
| NoDeadEnds | Every page gets a "next step" so a user never gets stuck | §A (dead-end table), §E |
| E2EFlowVerified | The whole procedure is walkable, verified end-to-end | §E (the happy-path walk), Pitfalls §(headless UAT), §("audit must stay 0 violations") |
</phase_requirements>

---

## Summary

The Turion satellite app (`turionspace.zietra.com/satellite/`) is a vanilla HTML/JS frontend (no bundler) over an Express-on-Lambda API (`rjydekliee.execute-api.us-east-1.amazonaws.com`, ES256 JWT via Supabase JWKS) backed by Postgres schema `turion_satellite`. It already has 11 pages and a deep data model (165 part_definitions, ~261 instances on SAT-003/Cygnus, full BOM tree depth 4, work orders, build steps, lifecycle stage events, make/buy decisions, costs, procurement). What it does **not** have: (1) any UI entry point to start a *new* satellite — `satellites` rows are seed-only; there is **no `POST /api/satellites`** route; (2) any `sales_orders` table in `turion_satellite` (the `sales_order_id` FK columns added by migration 008 point at `turion.sales_orders` in the legacy ERP schema, populated only by the cron-shaped `POST /api/integration/sync-sales-order`); (3) a coherent "next step" through-line — most pages link sideways via the nav strip and down via drill-downs, but several are dead ends (work-order.html, cost-detail.html, kanban.html, instance.html's later panels).

The phase is therefore two things glued together: **(A) a "New satellite program" wizard** — a new page `/satellite/program-new.html` that captures program/customer/sales-order details, then calls a new backend route that (i) inserts a row representing the sales order, (ii) inserts a `satellites` row, (iii) clones a top-level BOM template (the standard bus → 8 subsystem ASSY parts → their existing component children, mirroring SAT-003's structure built by migration 012) as `part_instances` + `bom_lines` on the new satellite, (iv) emits one stage-0 (`drawing`) `part_stage_events` row per instance, then redirects to `sat.html?id=<new>`; and **(B) a wiring pass** — add an explicit "Next step ▸" affordance to every existing page so a user can walk constellation → satellite → parts/BOM → part → instance → lifecycle → work order → build steps → cost rollup → "program complete" without ever landing somewhere with no forward action, plus a persistent breadcrumb/progress strip showing where you are in the lifecycle.

**Primary recommendation:** Put the sales order **inside `turion_satellite`** — add a small migration `020_add_sales_orders_and_program_seed.sql` that (1) creates `turion_satellite.sales_orders` (id UUID, so_number TEXT, customer_name TEXT, program_name TEXT, contract_value_usd NUMERIC, status TEXT, source_data JSONB, created_at) and adds a nullable `sales_order_id UUID REFERENCES turion_satellite.sales_orders(id)` to `satellites` (the existing TEXT `part_instances.sales_order_id` → `turion.sales_orders` stays untouched for the legacy-sync path), and (2) ships a `turion_satellite.spawn_satellite_program(...)` plpgsql function that does the satellite+BOM-clone+stage-0-events transactionally (template = whatever SAT-003 currently has — recursive copy of its `part_instances` + `bom_lines`). Then add `POST /api/satellites` (thin wrapper calling the function) and `POST /api/sales-orders`. Frontend: one new wizard page + a shared "next step" helper in `satellite-render.js` consumed by every page. Optionally fire `POST /api/integration/sync-sales-order` afterward so the new SO also gets a `turion.*` shadow (low priority — that legacy table is in the other backend's domain; safer to skip and keep the SO purely in `turion_satellite`).

---

## A. Current-state inventory — pages, what they do, where the dead ends are

### Satellite app pages (`/Users/jeet/turion-space-demo/satellite/*.html`)

| Page | Shows | Lets you do | Links to | Dead-end? |
|------|-------|-------------|----------|-----------|
| `index.html` (served at `/satellite/`) | Constellation: KPI strip (in orbit / build / test / planned) + a card per `satellite` from `GET /api/satellites` | Click a card → `sat.html` | nav strip (parts/WO/BOM/kanban/cost) + `sat.html?id=` | **NO entry to create a new satellite** (says "Contact your administrator to seed the constellation" when empty) — this is the first thing the wizard fixes |
| `sat.html` | One satellite: header, big SVG bus diagram with clickable subsystem hotspots, a drawer that lists the subsystem's parts (`GET /api/parts?subsystem=`), per-part link to `part.html` | "+ Add part instance to <sat>" modal (`POST /api/satellites/:satId/instances`); jump to kanban/BOM/WO for this sat | `part.html?id=&sat=`, `kanban.html?sat=`, `bom.html?sat=`, `work-orders.html?sat=` | Mild: no "open the BOM tree / start building" CTA front-and-center — the buttons exist but it's not a guided next step |
| `parts.html` | Part-definition catalog table (filterable by `?subsystem=` / `?search=`), `GET /api/parts` | Click a row → `part.html` | `part.html?id=` | **No "create a part definition"** (probably out of scope per §F — wizard seeds parts from a template, not ad-hoc); otherwise fine |
| `part.html` (1243 lines — the big one) | One part_definition: 3D viewer (Three.js, Phase 30/31) + SVG fallback, specs, make/buy panel + cost CTAs, build process panel (`GET /api/parts/:id/process`), list of instances of this part across satellites | Place a vendor order (links to part page CTAs), open cost-detail, open the representative work order, drill to an instance | `parts.html`, `cost.html` / `cost-detail.html?sat=&part_inst=`, `work-order.html?id=`, `instance.html?id=&sat=`, `bom.html?id=&sat=&view=3d`, `sat.html?id=` | OK — rich, lots of forward links |
| `instance.html` (899 lines) | One part_instance: 3D viewer, lifecycle timeline (`part_stage_events`), parent-path breadcrumb (`GET /api/satellites/:satId/bom`), sub-parts gallery, manufacturing/procurement panel, integrations panel (cross-system FKs), work-orders for this instance | **Advance / revert lifecycle stage** (`POST /api/satellites/:satId/instances/:instId/advance` & `/revert`); drill into children; jump to part page / cost-detail / work-order | `part.html?id=`, `instance.html?id=` (children & siblings), `cost-detail.html`, `work-order.html?id=`, `#procPanelAnchor` | **Partial dead end**: once you've advanced through all stages there's no "the part is done → go back to the satellite / mark the program complete" link. Also no "open this instance's work order(s)" if none exist yet (only a "place a vendor order on the part page" hint). |
| `bom.html` | Recursive BOM tree for `?sat=`, each node has a 🧊3D badge and a "open instance #" link; "+ Add BOM line" modal (Phase 29-02) | Add a BOM line (`POST /api/satellites/:satId/bom`); expand/collapse; drill to instances/parts | `sat.html?id=`, `instance.html?inst=&id=&sat=`, `part.html?id=&sat=&view=3d` | OK as a hub, but no "everything is wired → start work orders" next step |
| `work-orders.html` | WO list for `?sat=` (`GET /api/satellites/:satId/work-orders`) | Click → `work-order.html` | `sat.html?id=`, `work-order.html?id=` | OK list |
| `work-order.html` (168 lines) | One work order: status, bay, technician, its build steps (`GET /api/work-orders/:woId/steps`) | (build-steps page handles add/sign) link back to the instance, link back to work-orders list | `instance.html?sat=&id=`, `work-orders.html?sat=` | **DEAD END once steps are signed** — no "WO complete → next work order / back to satellite / advance the instance's lifecycle stage" link. The PATCH `/api/work-orders/:woId` (set status `complete`) exists in the backend but I did not see a UI control wiring it on this page (the Phase-29 SUMMARY says "PATCH-WO 401-gated=live" but UI may be missing — VERIFY during planning). |
| `kanban.html` | Lifecycle kanban for `?sat=`: columns by stage, cards = instances in that stage | Click a card → `instance.html` | `sat.html?id=`, `instance.html?sat=&id=` | OK as a hub but terminal — no "all instances at final stage → program done" cue |
| `cost.html` | Cost analytics: per-satellite rollup table (`GET /api/analytics/cost-rollup/:satId`) | Click "View →" / nav into a part subsystem | `cost.html?sat=`, `parts.html?subsystem=&sat=` | OK |
| `cost-detail.html` (340 lines) | One instance's cost sheet: template vs actual + variance, integrations side panel (Phase 28) | (edit cost? — read-mostly) | `cost.html`, `cost.html?sat=`, `part.html?id=&sat=` | **DEAD END** — bottom of the page is the variance table; no "next part / back to the BOM / advance lifecycle" link |
| `login.html`, `auth/callback.html` | Magic-link Supabase auth | sign in | `/satellite/` after callback | n/a |
| `3d-test.html` | dev scratch | — | — | n/a, not user-facing |

**Shared modules:** `satellite-config.js` (auto-generated at deploy: SUPABASE_URL, ANON_KEY, `API_BASE='https://rjydekliee.execute-api.us-east-1.amazonaws.com'`), `satellite-auth.js` (Supabase session + `requireSession()`), `satellite-api.js` (`window.satelliteApi.{get,post,patch}` — Bearer-token fetch wrapper, auto-refresh, redirects to login on 401, throws `ApiError`), `satellite-render.js` (exports `escapeHtml, fmtDate, fmtTimeAgo, statusTag, breadcrumb, skeleton, toast, topbarHTML, getQueryParam, renderIntegrationsPanel`), `satellite-3d.js`/`satellite-cad.js`/`cost-render.js` (viewers/renderers). **`breadcrumb(parts)` already exists** — most pages call it; the "progress strip" can be a sibling helper.

### Cross-system / "ERP" pages (repo root, served alongside under `turionspace.zietra.com/...`)

These are the **Phase 25 legacy demo** (Salesforce / NetSuite / Arena / MES) — a *separate* backend (`lo254mvukl.execute-api.us-east-1.amazonaws.com` → Lambda `turion-demo-api` → schema `turion`). Relevant ones:

| Page | Relevance to Phase 33 |
|------|------------------------|
| `sales-new-order.html` | "New Sales Order" form — **on Save POSTs to `/api/netsuite/sales-orders` (the OTHER backend) → writes `turion.sales_orders` + an `audit_log` CREATE entry**. This is the existing "create a sales order" flow, but it's in the ERP demo, not the satellite app, and on a different backend. |
| `workflow-new-so.html`, `workflow-e2e.html` | 16-step / 10-system narrated walkthroughs ("Sales captures the order, Engineering builds the satellite, Finance closes the books") — *storytelling*, not interactive against the satellite backend. They link to `/sales/account`, `/integration/salesforce`, `/sales/orders`, etc. — all ERP pages. |
| `netsuite-customer-so.html`, `sales-new-*.html`, `arena-*.html`, `mes-shop-floor.html`, `dashboard-*.html` | The ERP-side surfaces. Out of scope for wiring (they're a different demo on a different backend); the only touch point is "the satellite-app SO can optionally also be reflected here via `POST /api/integration/sync-sales-order`". |

**Deploy gotcha (PERMANENT, from memory + Phase 29 SUMMARY):** `deploy-frontend.sh` does `aws s3 sync . --delete` — so before deploying you MUST stash/move WIP root HTML (`about-this-demo.html`, `agent-sales-cash.html`, `dashboard-cio.html`) and `mv .superpowers/` aside, restore after. The phase's deploy plan must include this F6 pre-flight.

---

## B. The data lifecycle / chain

`sales_orders` *(does NOT exist in `turion_satellite` today — see §C/§F)*
&nbsp;&nbsp;→ `satellites` (id, name, designation UNIQUE, status ∈ {design,build,test,ship,launch,orbit} default `design`, program_start, launch_date, orbit_params)
&nbsp;&nbsp;&nbsp;&nbsp;→ `part_definitions` (165 rows, **shared across satellites**, part_number UNIQUE, subsystem_id, default_make_buy, specifications JSONB) — *seed-only, no ad-hoc create*
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ `part_instances` (satellite_id × part_definition_id × instance_index, serial_number; + Phase-25 cross-system FK columns `sales_order_id TEXT→turion.sales_orders`, `ns_invoice_id`, `arena_doc_id`, `mes_work_order_id`)
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ `bom_lines` (satellite_id, parent_part_instance_id NULL=root, child_part_instance_id, qty, uom, ref_designator, status ∈ {draft,released,superseded,needs_review})  ← **the BOM tree**
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ `make_buy_decisions` (decision ∈ {make,buy}, rationale, superseded_by) — one "current" per (sat, instance)
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ **make path:** `make_costs` (labor/material/tooling/cleanroom/test; generated `total_cost_usd`) + `work_orders` (status ∈ {open,in_progress,rework,complete}, bay, technician) → `build_steps` (step_number, description, step_type ∈ {build,inspection,test}, `signed_by`, `signed_at`, `result` ∈ {pass,fail,rework})
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ **buy path:** `rfqs` → `buy_costs` (quoted_unit_cost, nre, po_number, po_value, invoiced_value) + `vendor_orders` (vendor, qty, lead weeks, po_number, status ∈ {open,shipped,received,closed}; + `ns_invoice_id`) + `procurement_requests` (material_description, estimated_cost, status ∈ {pending,approved,ordered,received}; + `sales_order_id`) → `receiving_inspections`
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ `part_stage_events` (satellite_id, part_instance_id, stage_id, **direction ∈ {forward,backward}** *(prod uses these, NOT 'advance'/'revert')*, status ∈ {entered,completed,rejected,rework}, actor, ncr_id) ← **lifecycle advancement**, stages = `lifecycle_stages` (codes: `drawing` → `component` → `bom` → `assembly` → `plm_review` → `production`, sequence_order 1..6)
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ also: `drawings`/`drawing_approvals`, `ncrs`/`ecos`/`corrective_actions`, `plm_gates`/`gate_criteria`/`gate_signatures`, `production_travelers`, `quality_docs`, `heritage_registry`, `satellite_summary_metrics`
&nbsp;&nbsp;&nbsp;&nbsp;→ rollup: `cost_rollup_v` view (recursive over `bom_lines`), surfaced by `GET /api/analytics/cost-rollup/:satId` and `.../instance/:instId`
&nbsp;&nbsp;→ **delivery/completion**: there is no explicit "delivered" state beyond `satellites.status` reaching `ship`/`launch`/`orbit` and `plm_gates` being approved. Phase 33 should treat "program complete" = all root-instance lifecycle events at `production` (or PLM gates approved) + `satellites.status` advanced — and add a UI affordance to advance `satellites.status` (there's no route for that today either; `PATCH /api/satellites/:id` does not exist).

### Which steps already have a CREATE/mutate flow in the UI vs. which don't

| Step | UI control today | Backend route |
|------|------------------|---------------|
| Create a satellite | **MISSING** | **MISSING** (`POST /api/satellites` does not exist) |
| Create a part_definition | MISSING (likely out of scope) | MISSING |
| Add a part_instance to a satellite | ✅ sat.html "+ Add part instance" modal | `POST /api/satellites/:satId/instances` |
| Add a BOM line | ✅ bom.html "+ Add BOM line" modal (Phase 29-02) | `POST /api/satellites/:satId/bom` |
| Advance / revert lifecycle stage | ✅ instance.html | `POST /api/satellites/:satId/instances/:instId/advance` & `/revert` (mounted under instances → lifecycle router) |
| Create a work order | ✅ (work-orders flow — `POST /api/satellites/:satId/work-orders`) | `POST /api/satellites/:satId/work-orders` |
| Add / sign a build step | ✅ work-order / build-steps | `POST /api/work-orders/:woId/steps`, `POST /api/work-orders/:woId/steps/:stepId/sign` |
| Complete a work order | ❓ VERIFY (route exists, UI control unconfirmed) | `PATCH /api/work-orders/:woId` |
| Place a vendor order | ✅ part/instance CTAs | `POST /api/satellites/:satId/vendor-orders` |
| Raise a procurement request | ✅ | `POST /api/satellites/:satId/procurement-requests` |
| Save / re-evaluate a make-buy decision | ✅ part.html | `POST /api/make-buy-decisions/:satId/:partDefId` & `/re-evaluate` |
| Create a sales order | **MISSING** in the satellite app (exists in `sales-new-order.html` → ERP backend) | **MISSING** in the satellite backend (`turion` schema has `sales_orders` but only the legacy `turion-demo-api` writes it; satellite backend only *reads* it in `integration.ts`) |
| Spawn satellite-with-BOM from an SO | **MISSING** (closest: `POST /api/integration/sync-sales-order/:soId` body `{satelliteId}` — but that requires the satellite to already exist *and* the legacy `turion.sales_orders` row to have a `source_data.lineItems` array, which the seeded ones don't) | partial — see `sync-sales-order` |
| Advance `satellites.status` (build→test→ship→…) | MISSING | MISSING |

---

## C. "Creating the sales order" — where it should live + what it spawns

**Two candidate homes:**

1. **`turion.sales_orders`** (the legacy ERP schema). Pros: the existing `sales-new-order.html` already writes it; `integration.ts sync-sales-order` already knows how to fan it out into `part_instances`. Cons: that table is owned by the *other* backend (`turion-demo-api`); the satellite backend would be writing into a foreign team's schema; the `id` is TEXT (string keys); `sync-sales-order` only fans out *existing matching part_definitions* and needs a `source_data.lineItems` array — it does **not** create a satellite, does **not** seed a BOM hierarchy, and the seeded legacy SOs have no `lineItems`. So reusing it would mean (a) writing `turion.sales_orders` rows with a carefully-shaped `source_data.lineItems`, (b) still needing new code to create the satellite + BOM. Net: not worth it.

2. **`turion_satellite.sales_orders`** (NEW table in the satellite app's own schema). Pros: self-contained, UUID PK consistent with the rest of the schema, no cross-team coupling, the wizard's "spawn" logic lives entirely in `turion_satellite`. Cons: a small migration. **This is the recommendation.**

**What `POST /api/integration/sync-sales-order` actually does** (read in full): given `:salesOrderId` (a `turion.sales_orders` id) + body `{satelliteId}`, it (1) 404s if the SO row isn't found; (2) reads `so.source_data.lineItems` (defensive `Array.isArray` — legacy SOs have none → clean `{matches:0, reason:'no_line_items'}`); (3) extracts `partNumber|part_number|itemId|item` from each line; (4) matches against `turion_satellite.part_definitions` by **exact case-sensitive `part_number`**; (5) for each match, either creates a new `part_instances` row on (satelliteId, partDef) with `sales_order_id` set, or links the existing one; (6) writes an `audit_log` `sync_sales_order` entry; all in one `BEGIN/COMMIT`. It is **API-only by design, no UI** (documented at the top of `integration.ts`). It does **not** create the satellite and does **not** build a BOM hierarchy (no parent/child wiring).

**Recommendation — the "New satellite program" wizard (in `/satellite/program-new.html`):**

- **Step 1 — Program / customer / sales order:** form fields → `name` (satellite name, e.g. "Lyra"), `designation` (e.g. "SAT-005" — must be UNIQUE; suggest auto-next), customer name, program name, contract value (USD), optional notes. On submit → `POST /api/sales-orders` (new route) writes a `turion_satellite.sales_orders` row, returns its id.
- **Step 2 — Spawn satellite + BOM:** `POST /api/satellites` body `{name, designation, sales_order_id, program_start, status:'design', template:'standard-bus'}` → calls `turion_satellite.spawn_satellite_program(...)` which: inserts the `satellites` row; recursively copies SAT-003's BOM (all `part_instances` for SAT-003 → new instances on the new satellite with `instance_index` preserved, then all `bom_lines` rewired to the new instances) — **template = "whatever SAT-003 has right now"** so it stays in sync as densification phases land; inserts one `part_stage_events` row per new instance at stage `drawing`, direction `forward`, status `entered`, actor = the calling user. Returns the new satellite id + counts.
  - *Alternative simpler template:* copy only the standard bus root + 8 subsystem ASSY parts + their direct component children (not the full depth-4 tree) — a "skeleton". Recommend the **full SAT-003 copy** because the demo's value is showing a richly-populated satellite; a skeleton would land the user on a sparse `sat.html`. Decide with the user.
- **Step 3 — Done:** redirect to `sat.html?id=<new>`; a one-time toast "Program created — N parts, M BOM lines seeded. Next: open the BOM tree ▸".
- **Optional Step 1b (low priority, can defer):** also `POST /api/integration/sync-sales-order` so the new SO gets a `turion.*` shadow — *skip it*; that legacy table belongs to the other backend and the new `turion_satellite.sales_orders` is self-sufficient.

**Minimal backend to spawn:** a **plpgsql function `turion_satellite.spawn_satellite_program(p_name TEXT, p_designation TEXT, p_sales_order_id UUID, p_actor UUID, p_template TEXT) RETURNS UUID`** is cleanest (single transaction, schema-qualified, mirrors how migration 012 does the BOM wiring in SQL). The Express route is then ~15 lines. Migration `020` ships both the table and the function. Idempotency: the function is *not* idempotent (each call makes a new satellite) — that's correct; the *migration* (CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION) is.

---

## D. Backend gaps (in `/Users/jeet/turion-satellite/backend/`)

`app.ts` mounts: `/api/health`, `/api/files/presign`, `/api/satellites` (→ nested `:satId/instances`, `:satId/work-orders`, `:satId/bom`, `:satId/vendor-orders`, `:satId/procurement-requests`), `/api/parts`, `/api/subsystems`, `/api/lifecycle-stages`, `/api/vendors`, `/api/work-orders/:woId/steps`, `/api/work-orders`, `/api/labor-rates`, `/api/fx-rates`, `/api/make-costs`, `/api/buy-costs`, `/api/make-buy-decisions`, `/api/analytics/cost-rollup`, `/api/integration`. (Note: `lifecycle.ts` is mounted *under* `instances.ts` as `router.use('/:instId', lifecycleRouter)` — so `POST .../instances/:instId/advance` etc.)

**`satellites.ts`:** has `GET /` (list with instance_count) and `GET /:id` (with stage_summary). **No `POST /`, no `PATCH /:id`.**

**Missing routes Phase 33 needs:**
1. `POST /api/satellites` — create a satellite (calls `spawn_satellite_program`). **Add to `satellites.ts`.** Must `requireAuth`.
2. `PATCH /api/satellites/:id` — advance `satellites.status` (build→test→ship→launch→orbit). Optional but supports the "program complete" affordance. **Add to `satellites.ts`.**
3. `POST /api/sales-orders` (+ `GET /api/sales-orders`, `GET /api/sales-orders/:id`) — new router `routes/sales-orders.ts`, mounted in `app.ts`. The audit-button-scanner derives its allowlist from `app.ts`'s mount tree + each router's `router.{get,post,...}` — so the new mount + routes are auto-allowlisted; **the wizard's `satelliteApi.post('/api/sales-orders', …)` will pass the audit only after the route is added.**
4. *(Optional)* `POST /api/integration/seed-program` — if you'd rather keep the spawn logic in `integration.ts` next to `sync-sales-order` than add `POST /api/satellites`. Either placement is fine; `POST /api/satellites` is more RESTful.

**Migration files to study for the seeding pattern:**
- `008_add_cross_system_fks.sql` — adds the 6 TEXT cross-schema FK columns (`part_instances.sales_order_id` → `turion.sales_orders(id)`, etc., all `ON DELETE SET NULL`) + partial indexes. Phase 33's new `turion_satellite.sales_orders` is **separate** from this; do not repurpose the TEXT column.
- `014_seed_cross_system_fks.sql` — seeds *demo* cross-system FK values on SAT-003 instances. Not directly reused; shows the audit_log pattern.
- `012_densify_instances_and_bom.sql` — **the template to mirror.** It's procedural SQL: `INSERT INTO part_instances ... WHERE NOT EXISTS (satellite_id, part_definition_id, instance_index)` then `INSERT INTO bom_lines ... WHERE NOT EXISTS (parent, child)`, wiring STR-ASSY (root) → 8 subsystem ASSY children → each ASSY → its component children → some L3 sub-children. The `spawn_satellite_program` function should do the *generic* version: `INSERT INTO part_instances (satellite_id, part_definition_id, instance_index, serial_number, notes) SELECT $new_sat, part_definition_id, instance_index, NULL, notes FROM part_instances WHERE satellite_id = $sat003 RETURNING ...` then rewire `bom_lines` by joining old→new instance ids on `part_definition_id + instance_index`. (Plus stage-0 events.)
- `018_bom_densification_mid_tier_subcomponents.sql`, `016_pcdu_3d_drawing_and_subcomponents.sql` — the deeper densification; relevant only as "this is what SAT-003 looks like now → that's the template".

**Deploy:** any backend change → `cd /Users/jeet/turion-satellite && ./build-and-push.sh` (ECR + Lambda `turion-satellite-api`, arm64). Migration `020` must be applied to prod Postgres first (`psql $DATABASE_URL -f migrations/020_…` — strip `?schema=` from the secret-manager URL, per prior phases). Idempotency double-apply proof required (the deploy plan in prior phases always does `INSERT 0 0` re-apply check — here it'd be "CREATE TABLE IF NOT EXISTS → no-op, CREATE OR REPLACE FUNCTION → no-op, the demo `spawn_satellite_program` call is run once").

---

## E. The "next step" wiring — proposed link graph + breadcrumb/progress indicator

### The happy-path walk (what a Turion engineer does, in order)

`/satellite/` (constellation) → **"+ New satellite program"** → `program-new.html` (wizard) → `sat.html?id=<new>` → **"Open the BOM tree ▸"** → `bom.html?sat=` (review/extend the tree, the parts are at stage `drawing`) → **"Start the lifecycle ▸"** → click a node → `instance.html?id=&sat=` → **advance through stages** `drawing→component→bom→assembly→plm_review→production`; when a part needs build → **"Open / create a work order ▸"** → `work-order.html?id=` → **add + sign build steps** → **"Mark work order complete ▸"** (`PATCH /api/work-orders/:woId`) → back to `instance.html` **"Advance lifecycle stage ▸"** → … → when all parts at `production`: `sat.html` shows **"All parts built — advance program to TEST ▸"** (`PATCH /api/satellites/:id` status) → … → `ship`/`launch`/`orbit` → **"Program complete — view cost rollup ▸"** → `cost.html?sat=`. Procurement side-trip: `instance.html` make-buy=buy → **"Place vendor order ▸"** → vendor-orders flow → **"Back to the instance ▸"**.

### Per-page "Next step ▸" links to add (the link graph)

| Page | Add "Next step ▸" pointing to |
|------|-------------------------------|
| `index.html` (constellation) | If 0 satellites: prominent **"+ New satellite program"** hero CTA → `program-new.html`. Always: a smaller "+ New program" button in the nav strip / header. |
| `program-new.html` (NEW) | On success → auto-redirect to `sat.html?id=<new>` |
| `sat.html` | If BOM not yet reviewed: **"Open the BOM tree ▸"** → `bom.html?sat=`. If all parts at `production`: **"Advance program to <next status> ▸"** (PATCH). Else: **"Continue building — open Kanban ▸"** → `kanban.html?sat=`. |
| `bom.html` | **"Start the lifecycle — open Kanban ▸"** → `kanban.html?sat=` (and per-node the existing "open instance" already serves as drill-down) |
| `kanban.html` | (cards already drill to instances) — add **"Back to satellite ▸"** + if every card is in the final column: **"All parts built — back to satellite to advance the program ▸"** → `sat.html?id=` |
| `instance.html` | After "advance stage": if more stages left, the advance button *is* the next step. If at final stage: **"This part is done — back to the satellite ▸"** → `sat.html?id=`. If make-buy=make and no WO: **"Open / create a work order ▸"** → `work-order.html` (or work-orders list to create). Currently it only hints "place a vendor order on the part page" — add the make-path equivalent. |
| `work-order.html` | **"Mark this work order complete ▸"** (PATCH, when all steps signed pass) → on success **"Back to the instance to advance its lifecycle stage ▸"** → `instance.html?id=&sat=`. Also **"Next open work order ▸"** if the satellite has more. |
| `work-orders.html` | (list already links to each WO) — add **"+ New work order"** if not present; **"Back to satellite ▸"** |
| `part.html` | (already rich) — ensure a **"View instances on this satellite ▸"** / **"Back to the BOM tree ▸"** link when `?sat=` is present |
| `cost.html` | **"Back to satellite ▸"** + per-row "View →" (exists) |
| `cost-detail.html` | **"Back to the BOM tree ▸"** → `bom.html?sat=` + **"Back to the part ▸"** (exists) + **"Next part in the BOM ▸"** (optional — needs the BOM order) |

### Persistent breadcrumb / progress indicator — **YES, add one**

`satellite-render.js` already has `breadcrumb(parts)` (used by sat/bom/instance/work-order/cost-detail). Add a sibling **`programProgress(satStatus, stageSummary)`** helper that renders a horizontal strip of the 6 lifecycle stages (`drawing → component → bom → assembly → plm_review → production`) with the current "majority stage" highlighted, plus the `satellites.status` chip — render it on `sat.html`, `bom.html`, `instance.html`, `kanban.html`, `cost.html`. It's a small, self-contained DOM helper (no new lib), reads data the pages already fetch (`GET /api/satellites/:id` returns `stage_summary`). This is the cheapest way to make the whole thing feel "walkable".

### Audit constraint (HARD)

The Phase-29 button audit (`turion-satellite/backend/scripts/audit-satellite-buttons.mjs`) must stay at **0 violations**: every new `onclick=` must instead be `addEventListener` (the modals in sat.html already do this; bom.html's Phase-29 modal does too) — **prefer `addEventListener` for all new interactivity**; every new `satelliteApi.get/post/patch('/api/…')` path must resolve against a route mounted in `app.ts` — so **add the backend routes before/with the frontend that calls them**. Run the audit from both repos as a verification step (Phase 29-03 did "61 routes / 0 violations / exit 0").

---

## F. What's NOT needed / out of scope

- **A big schema rework — NO.** Only a *small* migration `020_add_sales_orders_and_program_seed.sql`: `CREATE TABLE turion_satellite.sales_orders (...)`, `ALTER TABLE satellites ADD COLUMN sales_order_id UUID REFERENCES turion_satellite.sales_orders(id)`, and `CREATE OR REPLACE FUNCTION turion_satellite.spawn_satellite_program(...)`. (The `part_instances.sales_order_id TEXT → turion.sales_orders` column from migration 008 is **left untouched** — it's the legacy-sync path.)
- **Rebuilding existing pages — NO.** Only add "Next step ▸" links + the progress strip + (where missing) a "complete work order" / "advance program status" control. Don't restyle, don't refactor the 3D viewer / drawings / make-buy panels (Phases 27-32) — only add forward links from them.
- **A "create part definition" UI — probably NO** (the wizard seeds parts from the SAT-003 template; ad-hoc part-def creation isn't part of the "build a satellite" walk). Confirm with the user; if wanted, it's a separate small route.
- **Touching the ERP-side pages (`sales-new-*.html`, `arena-*.html`, `netsuite-*.html`, `dashboard-*.html`, `mes-shop-floor.html`) — NO.** Different demo, different backend (`lo254mvukl`). The only cross-touch is the *optional, deprioritized* `POST /api/integration/sync-sales-order` shadow.
- **Wiring `sync-ns-invoice` / `sync-arena-doc` / `sync-mes-work-order` into the UI — NO.** They're documented API-only batch backfills (Phase 25-02 / 29-02 decision); leave them.
- **A real "delivered" lifecycle state / DD-250 / revenue recognition — NO** (that's the ERP demo's territory). "Program complete" = lifecycle events at `production` + `satellites.status` advanced; surface it in the UI, don't model new tables.

---

## Architecture patterns (for the planner)

- **Frontend page = static HTML + inline `<script>` IIFE** that: loads `satellite-config.js` → `supabase-js` UMD → `satellite-auth.js` → `satellite-api.js` → `satellite-render.js`, then `(async()=>{ const session = await window.satelliteAuth.requireSession(); document.getElementById('topbar').innerHTML = window.satelliteRender.topbarHTML(session.user.email); … })()`. The wizard page follows this exact skeleton.
- **API calls:** `await window.satelliteApi.post('/api/sales-orders', {…})` / `.get(...)` / `.patch(...)` — they throw `ApiError` (`.status`, `.message`); catch and render inline (`#someErr`) or `window.satelliteRender.toast(...)`. Never bare `fetch` (the wrapper handles Bearer token + 401 refresh + login redirect).
- **Modals:** existing pattern = inject a `.modal-backdrop` div, validate fields *client-side first*, then the API call, then `r.toast(...)` + `location.reload()` / redirect on success. The wizard can be a multi-step modal *or* a full page — recommend a **full page** (`program-new.html`) since it's the marquee flow and has 3 steps.
- **Backend route:** `router.post('/', requireAuth, async (req,res) => { … try { … res.status(201).json(...) } catch(err){ console.error(...); res.status(500).json({error:'Failed to …'}) } })` — match the hardened pattern (no `err.message` leak). For the spawn: open a `pool.connect()` client, `BEGIN`, call `spawn_satellite_program`, `audit_log` insert, `COMMIT` (mirrors `integration.ts`). Schema-qualify everything (`turion_satellite.…`) — pgbouncer transaction mode strips `search_path`.
- **Migration:** `SET search_path TO turion_satellite, public;` at top; `DO $$ BEGIN IF current_database() NOT IN ('postgres') THEN RAISE EXCEPTION …; END IF; END $$;` sanity guard; `CREATE TABLE IF NOT EXISTS` / `CREATE OR REPLACE FUNCTION` for idempotency; comment every column.

### Anti-patterns to avoid
- **`onclick="…"` attributes** → audit violation. Use `addEventListener`.
- **Calling a `/api/…` path that isn't mounted** → audit violation. Add the route first.
- **Writing into `turion.*` from the satellite backend** beyond what `integration.ts` already does — keep the new SO in `turion_satellite`.
- **Deploying the frontend without the F6 pre-flight** (stash WIP root HTML + `mv .superpowers/`) — `aws s3 sync . --delete` will publish or delete files you didn't mean to.
- **Making `spawn_satellite_program` idempotent** — it shouldn't be (each call = a new satellite); the *migration* is.

---

## Common Pitfalls

### Pitfall 1: The audit scanner fails closed on the new wizard's API calls
**What goes wrong:** wizard ships calling `POST /api/sales-orders` / `POST /api/satellites`; if those routes aren't in `app.ts`'s mount tree yet, `audit-satellite-buttons.mjs` flags `missing-endpoint` and the deploy gate fails.
**Avoid:** land the backend routes (+ `app.ts` mount) in the same wave as — or before — the frontend wizard. Run the audit locally from both repos before pushing.

### Pitfall 2: `designation` UNIQUE collision on satellite create
**What goes wrong:** `satellites.designation` is `UNIQUE NOT NULL`; if the wizard lets the user type "SAT-003" the INSERT throws.
**Avoid:** server-side, compute the next free `SAT-00N` (or accept the user's and 409 on conflict with a clear message); the wizard should pre-fill the suggested next designation.

### Pitfall 3: BOM clone leaves dangling `parent_part_instance_id`
**What goes wrong:** copying `bom_lines` naïvely copies the *old* satellite's instance UUIDs as parent/child → the new satellite's tree points at SAT-003's instances.
**Avoid:** the function must build an old→new instance id map (join on `part_definition_id + instance_index`, both UNIQUE within a satellite) and rewrite *both* `parent_part_instance_id` and `child_part_instance_id`. Root lines have `parent_part_instance_id IS NULL` — preserve the NULL.

### Pitfall 4: Headless UAT can't do the live magic-link walk
**What goes wrong:** "E2EFlowVerified" implies a browser walk; the agent environment has no browser and the demo's allowlisted email isn't available, and the Lambda verifies ES256 via JWKS (no synthetic-JWT path).
**Avoid:** follow the Phase 27-32 precedent — verify via DB-direct queries (the new `sales_orders` row exists, the new `satellites` row exists with N `part_instances` + M `bom_lines` + N stage-0 `part_stage_events`, all rewired correctly) + HTTP 401-gate probes on the new routes (route alive) vs. 404 on a bogus path + curl-checks that the new HTML/JS is live. A follow-up human browser session can re-walk it.

### Pitfall 5: `part_stage_events.direction` is `forward`/`backward`, not `advance`/`revert`
**What goes wrong:** seeding stage-0 events with `direction='advance'` violates the CHECK constraint.
**Avoid:** use `direction='forward'`, `status='entered'` for the seeded stage-0 rows (matches what `lifecycle.ts`'s advance does in prod, per the Phase 29 SUMMARY note).

---

## Open Questions

1. **Full SAT-003 clone vs. skeleton template for the spawned satellite?** — *What we know:* SAT-003/Cygnus has 261 instances / 241 bom_lines / depth 4. *Unclear:* whether the user wants every new program to start that rich, or start as a sparse skeleton (root bus + 8 ASSY + direct children) the user then fleshes out. *Recommendation:* full clone (demo value) — but flag for the discuss step.
2. **Should the new SO also write a `turion.sales_orders` shadow via `sync-sales-order`?** — *Recommendation:* no (cross-team coupling, the legacy table is the other backend's). Confirm.
3. **Is there a UI control wiring `PATCH /api/work-orders/:woId` (complete a WO) on `work-order.html` today?** — Phase 29 SUMMARY says "PATCH-WO 401-gated=live" (route works) but I didn't see the UI control. *Action:* the planner should have the executor grep `work-order.html` for it; if absent, adding it is part of "NoDeadEnds".
4. **`PATCH /api/satellites/:id` for status advancement — in scope?** — Needed for the "program complete → advance to TEST/SHIP" affordance. *Recommendation:* yes, small route, include it.
5. **Wizard as a full page or a multi-step modal?** — *Recommendation:* full page `program-new.html` (3 steps, marquee flow). Confirm.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `/Users/jeet/turion-satellite/backend/src/app.ts` — mounted routes
- `/Users/jeet/turion-satellite/backend/src/routes/{satellites,instances,parts,bom,work-orders,build-steps,lifecycle,lifecycle-stages,integration,make-buy-decisions,vendor-orders,procurement-requests,cost-rollup,subsystems}.ts` — every route's verbs (`grep router.{get,post,patch}`); `integration.ts` + `satellites.ts` + `instances.ts` POST bodies read in full
- `/Users/jeet/turion-satellite/migrations/001_create_turion_satellite_schema.sql` (full schema), `008_add_cross_system_fks.sql` (full), `012_densify_instances_and_bom.sql` (header — the BOM-seeding pattern); migration list 001-019
- `/Users/jeet/turion-satellite/backend/scripts/seed.ts` — lifecycle_stages codes, satellites seed, subsystems
- `/Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs` (header) — the 0-violations audit rules
- `/Users/jeet/turion-space-demo/satellite/*.html` (index, sat, parts, part, instance, bom, work-orders, work-order, kanban, cost, cost-detail — `grep` for links + structure; index.html read in full), `satellite-config.js` (full), `satellite-api.js` (full), `satellite-render.js` (exported helpers)
- `/Users/jeet/turion-space-demo/{sales-new-order,workflow-new-so,workflow-e2e,.pages-list}.html` — the ERP-side "create a sales order" flow
- `/Users/jeet/doordash-p2p/.planning/ROADMAP.md` — Phase 33 entry + Phase 25-32 context; Phase 29-03 SUMMARY (deploy/audit/UAT precedent)
- `~/.claude/projects/.../memory/MEMORY.md` — Turion deploy commands, repo locations, UUIDs, F6 pre-flight rule

### Secondary (MEDIUM)
- Phase 25-02 / 29-02 `integration.ts` JSDoc — "sync-* are API-only by design, no UI"

### Tertiary (LOW / to verify during planning)
- Whether `work-order.html` has a "complete WO" control today (Open Q3)
- Exact column set the user wants on `turion_satellite.sales_orders` (proposed in §C is a guess)

---

## Metadata

**Confidence breakdown:**
- Page inventory & dead ends: HIGH — every page inspected
- Backend gaps (no `POST /api/satellites`, no `sales_orders` table): HIGH — verified by reading the route files & migrations
- Recommended approach (new `turion_satellite.sales_orders` + `spawn_satellite_program` function + `POST /api/satellites` + wizard page + "next step" wiring): MEDIUM-HIGH — clean fit with the codebase's patterns, but no CONTEXT.md to confirm user intent on the open questions
- Pitfalls: HIGH — drawn from constraints visible in the schema/audit/deploy scripts

**Research date:** 2026-05-11
**Valid until:** ~2026-06-10 (stable codebase; re-check if Phases 30-32 land further migrations or new routes)
