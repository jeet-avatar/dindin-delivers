# Phase 29: UI workflow E2E UAT + fixes — Research

**Researched:** 2026-05-10
**Domain:** Vanilla HTML/JS frontend ↔ Express/Lambda backend wiring audit (Turion satellite production system)
**Confidence:** HIGH (every page + every backend route read directly from source; no library guessing)

## Summary

The Turion satellite frontend is **12 HTML pages** of vanilla JS (no framework, no build step) in `/Users/jeet/turion-space-demo/satellite/`, plus 5 shared JS/CSS modules. It talks to an Express app (`/Users/jeet/turion-satellite/backend/src/app.ts`) deployed as a Lambda behind APIGW `rjydekliee.execute-api.us-east-1.amazonaws.com`. Auth is Supabase magic-link on the frontend; the backend verifies Supabase JWTs via `requireAuth` middleware on every route.

The good news for Phase 29: **every interactive control I traced calls a real backend endpoint, every mutation persists, and every mutation refreshes the UI** (most via `location.reload()`, build-step sign via in-place refetch). There are **zero dead `onclick` handlers** (no references to undefined functions) and **zero buttons calling non-existent endpoints**. The system is in much better shape than "make every button work" implies — this phase is primarily a *verification* pass (prove it on the live site as the demo user) plus a small set of **polish/consistency fixes**: pages that read URL params nobody passes, two backend routes with no UI surface (`bom.ts POST` create-BOM-line, `integration.ts` 4 cross-system sync endpoints), one cross-page navigation that doesn't pre-filter, and one stale-data risk where `bom.html` doesn't bust its sibling pages' caches.

**Primary recommendation:** Treat Phase 29 as 3 plans — (1) **automated button/endpoint audit script** that statically diffs every `onclick`/`addEventListener`/`satelliteApi.{get,post,patch}` call against `app.ts` route mounts and fails CI on a mismatch; (2) **polish fixes** (the concrete list in "What Needs Fixing"); (3) **live UAT** as the demo user against `https://turionspace.zietra.com/satellite/` walking the 6 primary flows, with curl-level persistence proof on SAT-003 (Cygnus, `24587565-b15b-42ce-b590-87ecf9b6bb99`).

## User Constraints

No `CONTEXT.md` exists for Phase 29 yet (run `/gsd:discuss-phase 29` if scope needs locking). The ROADMAP goal and the user directive in the spawn prompt are the only constraints:

- **ROADMAP goal:** "Every interactive button across the 11 satellite pages persists to backend and reflects on reload. Audit constellation, satellite, part, instance, work-order, bom, kanban, cost, cost-detail, sub-parts pages. Verify stage advance/revert, place-order modal, sign build step, create WO, edit BOM line, etc. Catch and fix dead buttons + missing endpoints. Ship final user-acceptance verification: launch a fresh browser session as the demo user, exercise every primary flow, prove backend persistence."
- **ROADMAP requirements tags:** `E2E_UAT`, `ButtonAudit`, `EndpointCoverage`, `PersistenceVerify` — these are roadmap-only labels; there is no `REQUIREMENTS.md` block for Phase 29.
- **User directive (spawn prompt):** "I need a fully functional system not just the demo. Zero dead buttons. Every interaction persists + reflects on reload."

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| `ButtonAudit` | Every interactive element on every page either calls a real backend endpoint or is a pure-client UI affordance (filter, toggle, scroll) with documented intent | Section A (page inventory) + Section B (button→endpoint map) below — already enumerated; planner can turn the table into a checklist + a static-analysis script |
| `EndpointCoverage` | No button references a non-existent endpoint; surface the backend routes that currently have NO UI (decide: wire them or document as API-only) | Section B "Endpoints with no UI caller" — `POST /api/satellites/:satId/bom` and the 4 `/api/integration/sync-*` routes |
| `PersistenceVerify` | Each mutating interaction (stage advance/revert, place-order, sign step, create WO, save decision, re-evaluate, create instance) writes to Postgres and the change survives a reload | Section C (persistence verification) — all 8 mutations traced to a real `INSERT`/`UPDATE`; UAT step proves it with curl + reload |
| `E2E_UAT` | Fresh browser session as the demo user walks all 6 primary flows successfully on the live site | Section E "How to run the final UAT pass" — flow checklist + demo-user note + curl persistence harness |
</phase_requirements>

---

## Section A — Page Inventory

**Location:** `/Users/jeet/turion-space-demo/satellite/`. The "shells" directory (`/Users/jeet/turion-space-demo/shells/`) is **NOT part of the satellite app** — it's the separate Turion ERP-demo chrome (Salesforce/NetSuite/Arena/MES mockups). Phase 29 scope is the `satellite/` pages only; the cross-system links in `satellite-render.js` deep-link *out* to `https://turionspace.zietra.com/sales/...`, `/finance/...`, `/records/...`, `/manufacturing/...` (those are the shells pages — out of scope for this phase, treat as external links).

| # | Page | Purpose | Interactive elements |
|---|------|---------|----------------------|
| 1 | `index.html` (served at `/satellite/`) | Constellation overview — KPI strip + satellite cards | • Each satellite card = `<a href>` to `sat.html?id=` (pure nav) • "Retry" button on load-error (`onclick="location.reload()"`) • topbar "Sign out" (`onclick="window.satelliteAuth.signOut()"`) |
| 2 | `login.html` | Magic-link sign-in | • `#loginForm` submit → `satelliteAuth.signInWithMagicLink(email, redirectTo)` (Supabase) • "Use a different email" → `onclick="location.reload()"` |
| 3 | `auth/callback.html` | Magic-link landing (Supabase `detectSessionInUrl`) — **not read in this pass**; flagged as low-risk (Supabase handles it). Confirm during UAT. | (Supabase auto-redirect) |
| 4 | `sat.html` | Single satellite — clickable subsystem SVG diagram + drill-down drawer | • 8 `<g class="subsystem" data-subsystem-code="…">` regions — `addEventListener('click')` → `loadSubsystem(code)` (fetch + render parts list; pure read) • Header buttons: "Kanban" / "BOM tree" / "Work orders" — `<a>` with `href` set in JS to `?sat=` (pure nav) • In drawer: each part = `<a href>` to `part.html?id=&sat=` • `#addInstanceBtn` → `openAddInstanceModal(code, partList)` — **modal with `#modalSubmit` → POST `/api/satellites/:satId/instances`** |
| 5 | `parts.html` | Parts catalog — filter + paginated table | • `#subFilter` `<select>` change → `load()` (pure read) • `#searchInput` Enter / `#searchBtn` click → `load()` • `#prevBtn` / `#nextBtn` → page nav (pure read) • Each row `onclick="location.href='part.html?id='"` (pure nav) |
| 6 | `part.html` | Part definition detail — CAD viewer + workflow + cost + materials + orders + instances + sub-parts | • `#toggleCallouts` (CAD labels on/off) — `addEventListener` toggles `.callouts-hidden` class (pure client) • Workflow step circles — `data-scroll-to` `addEventListener` → `scrollIntoView` (pure client) • `#orderBtn` ("📦 Order from vendor" / "📋 Request material") → `openOrderModal(mb)` — **modal with `#submitOrder` → POST `/api/satellites/:satId/vendor-orders` OR POST `/api/satellites/:satId/procurement-requests`** • Sub-part tiles = `<a href>` to `part.html?id=&sat=` • Process build-step rows = `<a href>` to `work-order.html?id=` (pure nav) • Orders table rows = `onclick="location.href='instance.html'"` (pure nav) • Instances tables rows = `onclick="location.href='instance.html'"` (pure nav) • CAD callout `<a xlink:href>` (rendered by `satelliteCad.renderCalloutsOnSvg`) → `part.html?id=&sat=` (pure nav) |
| 7 | `instance.html` | Part-instance detail — hero CAD + spec + cost + cross-system links + subtree rollup + lifecycle timeline + BOM children + work orders + siblings | • `#advBtn` "↪ Advance to {stage}" → `doStageAction('advance')` — `prompt()` for reason → **POST `/api/satellites/:satId/instances/:instId/advance`** → `location.reload()` • `#revBtn` "↩ Revert to {stage}" → `doStageAction('revert')` — **POST `/api/satellites/:satId/instances/:instId/revert`** → `location.reload()` • Parent-path links = `<a>` to `instance.html?sat=&id=` (pure nav) • BOM-children tiles = `<a href>` to `instance.html?sat=&id=` (pure nav) • Work-order cards = `<a href>` to `work-order.html?id=` (pure nav) • Sibling cards = `<a href>` to `instance.html?sat=&id=` (pure nav) • Cross-system link rows = `<a target="_blank">` to `turionspace.zietra.com/sales|finance|records|manufacturing/...` (external nav — out of scope) |
| 8 | `work-order.html` | Single work order — build-step sign-off + WO metadata | • `#completeBtn` "↪ Mark complete" → `confirm()` → **PATCH `/api/satellites/:satId/work-orders/:woId` `{status:'complete'}`** → `location.reload()` • `#addStepBtn` "+ Add step" → `prompt()` → **POST `/api/work-orders/:woId/steps` `{description, step_type:'build'}`** → refetch+rerender • Per-step `[data-sign]` buttons "✓ PASS / ✗ FAIL / REWORK" (only on first unsigned step) → `confirm()` → **POST `/api/work-orders/:woId/steps/:stepId/sign` `{result}`** → refetch+rerender • Instance card "→ Open instance" `<a href>` (pure nav) |
| 9 | `work-orders.html` | WO list for a satellite | • `#newWoBtn` "+ New work order" → opens `#newWoModal` → `#modalSave` → **POST `/api/satellites/:satId/work-orders` `{part_instance_id}`** → `location.reload()` • Each row `onclick="location.href='work-order.html?id='"` (pure nav) |
| 10 | `bom.html` | Recursive BOM tree (`<details>/<summary>`) | • `#expandAll` / `#collapseAll` → toggle `details.open` on all nodes (pure client) • Each row `<a class="row-link" href>` to `instance.html?inst=&id=&sat=` (pure nav) |
| 11 | `kanban.html` | Lifecycle kanban — cards grouped by stage | • `#subFilter` `<select>` change → `render()` (pure client filter) • `#searchInput` input → `render()` (pure client filter) • Each card = `<a class="card" href>` to `instance.html?sat=&id=` (pure nav) |
| 12 | `cost.html` | Cost analytics — constellation rollup / per-sat rollup by subsystem | • `#satSel` `<select>` change → `syncNav()` + `render()` (pure read; also rewrites nav `<a href>` to carry `?sat=`) • Constellation-rollup rows `onclick="document.getElementById('satSel').value=…;dispatchEvent('change')"` (re-render in place) • Per-subsystem rollup rows: "View parts →" `<a href>` to `parts.html?subsystem=&sat=` (pure nav) |
| 13 | `cost-detail.html` | Per-part-instance cost sheet — make/buy sheets + make-vs-buy decision + cross-system links + history | • `#decisionForm` radios + `#rationaleInput` → `validateDecisionForm()` (pure client; gates `#saveDecisionBtn` on `rationale.length >= 20`) • `#saveDecisionBtn` "Save/Update decision" → **POST `/api/make-buy-decisions/:satId/:partDefId` `{decision, rationale, decision_status:'approved', part_instance_id}`** → `location.reload()` • `#reEvalBtn` "↻ Re-evaluate" (only when decision exists + approved) → `confirm()` → **POST `/api/make-buy-decisions/:satId/:partDefId/re-evaluate` `{}`** → `location.reload()` • History `<details>` `toggle` → lazy-loads `/api/make-costs/.../history` + `/api/buy-costs/.../history` (pure read) • Prev-sat-delta `<details>` (pure client, content pre-rendered) • "← back to part definition" `<a href>` (pure nav) |

**Shared modules (no UI of their own, but every page depends on them):**

| File | Role |
|------|------|
| `satellite-config.js` | `window.SATELLITE_CONFIG` — Supabase URL/anon key + `API_BASE`. **Auto-generated at deploy time, gitignored** (`scripts/generate-satellite-config.sh` pulls from Secrets Manager). |
| `satellite-auth.js` | `window.satelliteAuth` — Supabase client, `getSession`/`refreshSession`/`requireSession`/`signInWithMagicLink`/`signOut`. |
| `satellite-api.js` | `window.satelliteApi` — authed fetch wrapper. `get/post/patch`. On 401: refresh once, else redirect to `login.html`. Throws `ApiError {status, message}`. |
| `satellite-cad.js` | `window.satelliteCad` — `loadPartCad` / `loadSubsystemCad` (in-memory LRU cache, max 50) / `renderCalloutsOnSvg` (overlays BOM-child callout `<a>` on a parent silhouette). |
| `satellite-render.js` | `window.satelliteRender` — `escapeHtml`, `fmtDate`, `fmtTimeAgo`, `statusTag`, `breadcrumb`, `skeleton`, `toast`, `topbarHTML`, `getQueryParam`, `renderIntegrationsPanel` (4-slot cross-system links). |
| `cost-render.js` | `window.costRender` (+ `module.exports` for Vitest) — `formatMoney`, `formatPct`, `trafficLight(Badge)`, `escapeHtml`, `renderTotalsCard`, `renderRollupRow`, `renderPrevSatDelta`, `renderMakeSheet`, `renderBuySheet`, `renderDecisionPanel`. |

---

## Section B — Button → Endpoint Mapping

### Every mutating control, mapped to its backend route (all VERIFIED present in `app.ts` mount tree + the route file)

| Page · control | Frontend call | Backend route | Mounted in | Refreshes UI? |
|----------------|---------------|---------------|------------|---------------|
| `sat.html` · Add part instance modal `#modalSubmit` | `POST /api/satellites/:satId/instances` `{part_definition_id, serial_number, notes}` | `instances.ts:46` `router.post('/')` | `app.ts:28` → `satellites.ts:52` `router.use('/:satId/instances', instancesRouter)` | ✅ removes modal, re-runs `loadSubsystem(code)` |
| `part.html` · Place vendor order modal `#submitOrder` (buy) | `POST /api/satellites/:satId/vendor-orders` `{part_instance_id, vendor_id, qty, quoted_lead_weeks, po_number}` | `vendor-orders.ts:33` `router.post('/')` | `satellites.ts:55` `router.use('/:satId/vendor-orders', vendorOrdersRouter)` | ✅ `location.reload()` after 600ms |
| `part.html` · Request material modal `#submitOrder` (make) | `POST /api/satellites/:satId/procurement-requests` `{part_instance_id, material_description, estimated_cost_usd}` | `procurement-requests.ts:31` `router.post('/')` | `satellites.ts:56` `router.use('/:satId/procurement-requests', procurementRequestsRouter)` | ✅ `location.reload()` after 600ms |
| `instance.html` · `#advBtn` | `POST /api/satellites/:satId/instances/:instId/advance` `{reason}` | `lifecycle.ts:38` `router.post('/advance')` | `instances.ts:115` `router.use('/:instId', lifecycleRouter)` → full path `/api/satellites/:satId/instances/:instId/advance` | ✅ `__bomTreeCacheBust(satId)` then `location.reload()` |
| `instance.html` · `#revBtn` | `POST /api/satellites/:satId/instances/:instId/revert` `{reason}` | `lifecycle.ts:77` `router.post('/revert')` | same as above | ✅ same |
| `work-order.html` · `#completeBtn` | `PATCH /api/satellites/:satId/work-orders/:woId` `{status:'complete'}` | `work-orders.ts:76` `router.patch('/:woId')` | `satellites.ts:53` `router.use('/:satId/work-orders', workOrdersRouter)`. **NOTE: a 2nd mount at `app.ts:35` `app.use('/api/work-orders', workOrders)` exposes the *unscoped* `GET /:woId` (no `:satId`) used by the page-load fetch — the PATCH path correctly uses the scoped form.** | ✅ `location.reload()` |
| `work-order.html` · `#addStepBtn` | `POST /api/work-orders/:woId/steps` `{description, step_type:'build'}` | `build-steps.ts:31` `router.post('/')` | `app.ts:34` `app.use('/api/work-orders/:woId/steps', buildSteps)` AND `work-orders.ts:142` `router.use('/:woId/steps', buildStepsRouter)` | ✅ refetch `GET /api/work-orders/:woId/steps` + `renderSteps()` |
| `work-order.html` · per-step `[data-sign]` PASS/FAIL/REWORK | `POST /api/work-orders/:woId/steps/:stepId/sign` `{result}` | `build-steps.ts:73` `router.post('/:stepId/sign')` | same as above | ✅ refetch + `renderSteps()` |
| `work-orders.html` · `#newWoBtn` modal `#modalSave` | `POST /api/satellites/:satId/work-orders` `{part_instance_id}` | `work-orders.ts:39` `router.post('/')` | `satellites.ts:53` | ✅ `location.reload()` |
| `cost-detail.html` · `#saveDecisionBtn` | `POST /api/make-buy-decisions/:satId/:partDefId` `{decision, rationale, decision_status:'approved', part_instance_id}` | `make-buy-decisions.ts:91` `router.post('/:satId/:partDefId')` | `app.ts:41` `app.use('/api/make-buy-decisions', makeBuyDecisionsRouter)` | ✅ `location.reload()` |
| `cost-detail.html` · `#reEvalBtn` | `POST /api/make-buy-decisions/:satId/:partDefId/re-evaluate` `{}` | `make-buy-decisions.ts:183` `router.post('/:satId/:partDefId/re-evaluate')` | same | ✅ `location.reload()` |

### Every read-only API call (pages render from these on load — all VERIFIED present)

`GET /api/satellites` · `GET /api/satellites/:id` · `GET /api/satellites/:satId/instances` · `GET /api/satellites/:satId/instances/:instId` · `GET /api/satellites/:satId/work-orders` · `GET /api/satellites/:satId/bom` · `GET /api/satellites/:satId/bom/tree` · `GET /api/parts` (with `?subsystem=&search=&page=&limit=`) · `GET /api/parts/:id` · `GET /api/parts/:id/drawing` · `GET /api/parts/:id/process` · `GET /api/parts/:partDefId/children?sat=` · `GET /api/subsystems` · `GET /api/lifecycle-stages` · `GET /api/vendors` · `GET /api/work-orders/:woId` · `GET /api/work-orders/:woId/steps` · `GET /api/make-costs/:satId/:partDefId?part_inst=` · `GET /api/make-costs/:satId/:partDefId/history?part_inst=` · `GET /api/buy-costs/:satId/:partDefId?part_inst=` · `GET /api/buy-costs/:satId/:partDefId/history?part_inst=` · `GET /api/make-buy-decisions/:satId/:partDefId` · `GET /api/analytics/cost-rollup/:satId` · `GET /api/analytics/cost-rollup/instance/:instId?sat=`

### Dead buttons / missing endpoints — FINDINGS

**Dead `onclick` handlers (reference undefined functions):** ❌ **NONE FOUND.** Every `onclick=` attribute references `location.reload()`, `location.href=…`, `document.getElementById(…).remove()`, `window.satelliteAuth.signOut()`, or `dispatchEvent(new Event('change'))` — all defined/built-in.

**Buttons that call endpoints that don't exist:** ❌ **NONE FOUND.** Every `satelliteApi.{get,post,patch}` path resolves to a real route in `app.ts`'s mount tree (table above).

**Endpoints that exist but no UI calls them** (the `EndpointCoverage` gap to decide on):
1. `POST /api/satellites/:satId/bom` (`bom.ts:156`) — create a BOM line manually. The ROADMAP goal explicitly says "verify … edit BOM line, etc." but **there is no edit-BOM-line UI** — `bom.html` is read-only (`<details>` tree + nav links). **Decision needed:** either (a) add a minimal "+ Add BOM line" / "edit qty" affordance on `bom.html` (or on `instance.html`'s "BOM children" panel), or (b) document it as API-only and update the ROADMAP wording. Recommend **(a)** given the "fully functional system" directive — a small modal mirroring the existing `work-orders.html`/`sat.html` modal pattern.
2. `POST /api/integration/sync-sales-order/:salesOrderId`, `POST /api/integration/sync-ns-invoice/:invoiceId`, `POST /api/integration/sync-arena-doc`, `POST /api/integration/sync-mes-work-order` (`integration.ts:37,153,241,329`, Phase 25-02) — these populate the 4 cross-system FK columns shown by `renderIntegrationsPanel`. **No UI triggers them.** The integrations panel only *displays* the FKs (and `ns_invoice_id` is NULL on every SAT-003 instance per the Phase 28 deferred-items doc). **Decision needed:** either (a) add a "Sync now" button to the cross-system-links panel (`satellite-render.js renderIntegrationsPanel`) that POSTs the appropriate sync route, or (b) document as admin/cron-only. Recommend **(b)** — these are batch backfill endpoints, not per-user actions; document and move on. (If (a) is wanted, note the panel currently has no `satId`/`instId` in scope inside the helper — it'd need params threaded through.)
3. `GET /api/parts/:id/process` returns `cost_breakdown` (a computed estimate). `instance.html` consumes it (line 411) for the small cost panel; `part.html` does NOT (it uses `/api/make-costs`/`/api/buy-costs` per Phase 24 CONTEXT decision #3). Not a gap — just noting the dual cost-source pattern so the planner doesn't "fix" one to match the other.

**Buttons that mutate state but don't refresh the UI after:** ❌ **NONE FOUND.** All 11 mutating controls either `location.reload()` or refetch-and-rerender. ⚠️ One *cross-page* staleness risk: `instance.html` stage advance/revert calls `window.__bomTreeCacheBust(satId)` (clears `sessionStorage['bom-tree:<satId>']`) — but **`bom.html` itself does NOT bust that cache when it loads**, and `bom.html`'s tree is fetched fresh each page-load anyway (no cache read on bom.html), so it's a non-issue *for bom.html*. The cache exists only for `instance.html`'s parent-trail computation. Real risk: if a user advances a stage on `instance.html`, the **kanban page** they navigate to next will show the *new* stage (kanban refetches `instances` on load — fine), but `instance.html`'s own subtree-rollup-panel cache TTL is 5min — acceptable. Net: no fix strictly required, but worth a UAT check.

**Pure-client controls (correctly NOT calling the backend — document as intentional):** `parts.html` `#subFilter`/`#searchInput`/`#searchBtn`/pagination (client-driven `GET /api/parts` query), `kanban.html` `#subFilter`/`#searchInput` (client-side array filter), `part.html` `#toggleCallouts` + workflow `data-scroll-to` circles, `bom.html` `#expandAll`/`#collapseAll`, `cost.html` `#satSel` (re-render), all `<details>` toggles. These are fine — Phase 29 should record them as "intentional client-only" in the audit so they're not flagged as dead.

---

## Section C — Persistence Verification

| Interaction | Persists? | Where it writes | Survives reload? |
|-------------|-----------|-----------------|------------------|
| Stage advance (`instance.html` `#advBtn`) | ✅ YES | `lifecycle.ts:38` → `INSERT INTO part_stage_events (part_instance_id, stage_id, direction='advance', reason, …)` | ✅ — `instance.html` reads `inst.stage_history` from `GET /api/satellites/:satId/instances/:instId` on reload; the new event renders in the timeline + stage tag |
| Stage revert (`instance.html` `#revBtn`) | ✅ YES | `lifecycle.ts:77` → `INSERT INTO part_stage_events (… direction='revert' …)` (returns 400 if no events / already at first stage) | ✅ same |
| Place vendor order (`part.html` buy modal) | ✅ YES | `vendor-orders.ts:33` → `INSERT INTO vendor_orders (...)` | ✅ — `part.html` `location.reload()` → `GET /api/parts/:id/process` returns `recent_orders` including the new vendor_order; renders in "Recent orders" table |
| Request material procurement (`part.html` make modal) | ✅ YES | `procurement-requests.ts:31` → `INSERT INTO procurement_requests (...)` | ✅ — same `recent_orders` path; also surfaces in `process.materials_required` aggregation → "Materials required" panel |
| Sign build step PASS/FAIL/REWORK (`work-order.html`) | ✅ YES | `build-steps.ts:73` → `UPDATE build_steps SET result, signed_by, signed_at=NOW(), step_result_data WHERE id=…` (409 if already signed) | ✅ — page refetches `GET /api/work-orders/:woId/steps` and re-renders; `signed_at` makes the step show PASS/FAIL badge + `signed_by` |
| Add build step (`work-order.html` `#addStepBtn`) | ✅ YES | `build-steps.ts:31` → `INSERT INTO build_steps (...)` | ✅ refetch + rerender |
| Mark work order complete (`work-order.html` `#completeBtn`) | ✅ YES | `work-orders.ts:76` → `UPDATE work_orders SET status='complete', completed_at=NOW() WHERE id=… AND satellite_id=…` | ✅ `location.reload()` → `GET /api/work-orders/:woId` shows `status='complete'`, completeBtn disappears |
| Create work order (`work-orders.html` `#newWoBtn`) | ✅ YES | `work-orders.ts:39` → `INSERT INTO work_orders (satellite_id, part_instance_id, …)` | ✅ `location.reload()` → row appears in `GET /api/satellites/:satId/work-orders` table |
| Create part instance (`sat.html` `#addInstanceBtn`) | ✅ YES | `instances.ts:46` → `INSERT INTO part_instances (… instance_index = MAX+1 …)` | ✅ — `loadSubsystem(code)` re-fetches `GET /api/satellites/:satId/instances`; instance count badge updates |
| Save make-vs-buy decision (`cost-detail.html` `#saveDecisionBtn`) | ✅ YES | `make-buy-decisions.ts:91` → supersede-on-write 3-step txn: `UPDATE … superseded_by=id` (old) → `INSERT … make_buy_decisions (...)` (new) → `UPDATE … superseded_by=<new.id>` (old) → `INSERT audit_log`. All in `BEGIN/COMMIT`. | ✅ `location.reload()` → `GET /api/make-buy-decisions/:satId/:partDefId` returns the new current row; decision panel shows the pill + rationale |
| Re-evaluate decision (`cost-detail.html` `#reEvalBtn`) | ✅ YES | `make-buy-decisions.ts:183` → `UPDATE make_buy_decisions SET decision_status='re_evaluate' WHERE id=<current> AND superseded_by IS NULL` (404 if no current decision) | ✅ `location.reload()` → status pill flips to `re_evaluate`, re-eval banner shows |
| Edit BOM line | ⚠️ **NOT EXPOSED IN UI** — `POST /api/satellites/:satId/bom` (`bom.ts:156`) exists and `INSERT INTO bom_lines (...)`-s correctly, but no page calls it. This is the one "edit BOM line" item from the ROADMAP goal with no UI. See Section B item 1. | n/a until UI added |
| Drawing-approval workflow | ⚠️ **DOES NOT EXIST** — there is no drawing-approval state machine. `GET /api/parts/:id/drawing` returns `{drawing_svg, subsystem_code}` (read-only); drawings are seeded via migrations (Phase 27). The "labels: on/off" toggle on `part.html` is pure-client SVG-overlay visibility. No approval/revision endpoint, no UI. If the demo needs one, that's a *new feature* — out of scope for "fix dead buttons"; flag as a possible follow-up phase. |

**Money-on-the-wire note (for UAT verification):** the backend's `db.ts` installs a `Decimal.prototype.toJSON` shim and parses Postgres `NUMERIC` (OID 1700) as `decimal.js` Decimal — so all money fields arrive as **JSON strings** (e.g. `"12081500.83"`), not numbers. Frontend formatters (`cost-render.js formatMoney`, `instance.html`'s `fmtUSD`) `Number()`-coerce them. When curl-verifying cost data, expect string-typed money.

---

## Section D — Known Issues From Prior Phases

### Phase 27 `deferred-items.md`
- **Uncommitted working-tree changes in `/Users/jeet/turion-space-demo`** at the time: ~10 modified non-satellite files (`about-this-demo.html`, `agent-sales-cash.html`, `dashboard-cio.html`, `backend/dist/*`, `backend/src/routes/agents.ts`, `backend/src/routes/notify.ts`, etc.) — **these belong to the separate Turion ERP-demo backend, NOT the satellite app**, and `deploy-frontend.sh` syncs all root-level `*.html/js/css` to S3 so they'd ride along on any deploy. **Action for Phase 29 deploy step:** before `deploy-frontend.sh`, run `git status` in `turion-space-demo` and either commit/stash unrelated changes or scope the s3 sync. Not a satellite-app bug, but a deploy-hygiene landmine.
- `scripts/seed-demo-data.sql` untracked in `turion-satellite` — Phase 26 leftover, harmless, ignore.

### Phase 28 `deferred-items.md`
- **Multi-instance parts (`instance_index > 1`) lack their own work_orders / procurement_requests** — 11 `make`-part instances + 85 `buy`-part instances on SAT-003 with `instance_index > 1` have no WO/PR (migrations 013/019 only backfill `instance #1`). **UAT impact:** if a tester opens `instance.html` for a `#2`/`#3` instance, the "Work orders" panel shows "No work orders" and `part.html`'s "Make/Buy detail" / "Build process" reflect only instance-1 data. **This is correct-by-design pre-existing data state, NOT a Phase 29 bug** — but the UAT checklist should walk an `instance #1` for the "happy path" and note the `#2+` behavior is expected. (Phase 29 could optionally add a one-line "this instance shares WO/PR with instance #1" hint on `instance.html` when `instance_index > 1` and no WO — small polish, low priority.)
- **`ns_invoice_id` is NULL on every SAT-003 instance** — Phase 26-04 wired `sales_order_id`/`arena_doc_id`/`mes_work_order_id` but not NetSuite invoices. **UAT impact:** the cross-system-links panel always shows "—" for "NetSuite invoice" on every instance. **Expected, not a bug.** If Phase 29 wires a "Sync now" button (Section B item 2) it could populate these; otherwise document.

### Phase 28 SUMMARY-noted gaps (not in deferred-items but relevant)
- Backend Lambda uses ES256/JWKS — there is **no signing private key available** for synthetic JWTs. Phase 28's "200 informational" smoke gate was skipped for this reason; DB-direct verification was authoritative. **Phase 29 UAT must use a real browser session as the demo user** (magic-link login) to get a valid token — you cannot mint one from the CLI. For *write* persistence proof, the practical path is: do the action in the browser, then `psql` the production DB to confirm the row, then reload the page to confirm it renders.

---

## Section E — What Needs Fixing (concrete list) + How to Run the Final UAT

### Concrete fix list (ordered by user-visible impact)

| # | Issue | Page/file | Fix | Priority |
|---|-------|-----------|-----|----------|
| F1 | **No "edit BOM line" UI** — `POST /api/satellites/:satId/bom` has no caller (ROADMAP explicitly mentions it) | `bom.html` (or `instance.html` BOM-children panel) | Add a minimal "+ Add BOM line" modal (parent instance picker + child instance picker + qty + ref-designator) reusing the `work-orders.html`/`sat.html` modal pattern → POST `/api/satellites/:satId/bom` → reload. Optionally an inline "edit qty" too (would need a PATCH route — backend currently only has POST, so scope as add-only unless adding the route). | MEDIUM — explicitly in ROADMAP goal |
| F2 | **4 `/api/integration/sync-*` endpoints have no UI** | `satellite-render.js` `renderIntegrationsPanel` OR document | Either thread `satId`/`instId` into the helper and add a "Sync now ↻" button per FK row that POSTs the relevant sync route + reloads; OR add a one-line `<!-- API-only: synced via batch job -->` comment + note in this doc. **Recommend: document as API-only** (these are batch backfills, not per-user). | LOW |
| F3 | **`cost.html` → "View parts →" links pass `?subsystem=&sat=` but `parts.html` ignores the URL params** — it only reads `#subFilter`'s in-DOM value (defaults to ""). User clicks "View parts" expecting a filtered list, gets the full catalog. | `parts.html` | On load, read `getQueryParam('subsystem')` (and `search`), set `#subFilter.value` / `#searchInput.value` accordingly *before* the first `load()`. (`sat` isn't used by parts.html — fine to ignore, or carry it on row links.) Also `cost-render.js renderRollupRow` builds the same `parts.html?subsystem=` link — both will work once parts.html honors the param. | MEDIUM — visible "broken filter" bug |
| F4 | **`auth/callback.html` not audited** (was not read this pass — flagged low-risk since Supabase `detectSessionInUrl` handles it) | `auth/callback.html` | Read it, confirm it redirects to `/satellite/` (or the page the user came from) after the magic-link exchange, confirm it shows a sensible error on a bad/expired link. | LOW — Supabase does the heavy lifting |
| F5 | **`instance.html` for `instance_index > 1` shows empty WO/Build panels** with no explanation (pre-existing data state per Phase 28 deferred) | `instance.html` | Optional polish: when `inst.instance_index > 1` AND `myWos.length === 0`, render a one-line hint "Work orders for this part are tracked on instance #1" linking to the `#1` sibling (already have `siblings` array). Pure-frontend, no backend change. | LOW |
| F6 | **Deploy-hygiene**: `turion-space-demo` may carry uncommitted non-satellite changes that `deploy-frontend.sh` would sync to S3 | deploy step | In the Phase 29 deploy plan, add a pre-flight: `git -C /Users/jeet/turion-space-demo status --porcelain` — if anything outside `satellite/` is dirty, stop and ask, or scope the `aws s3 sync` to `satellite/` + shared files only. | MEDIUM — prevents shipping unrelated WIP |
| F7 | **Audit script** — there is currently nothing that catches a future dead button | new file e.g. `turion-space-demo/scripts/audit-satellite-buttons.mjs` | Static analysis: parse each `satellite/*.html` for (a) `onclick="..."` attributes → assert the referenced symbol is one of an allowlist (`location.*`, `document.getElementById(...).remove()`, `window.satelliteAuth.*`, `dispatchEvent(...)`) OR a function defined in the same file; (b) every `satelliteApi.\.(get|post|patch)\(\s*[`'"]([^`'"]+)` literal path → normalize `:params`/`${...}` → assert it matches a route registered in `backend/src/app.ts`'s mount tree (parse the `app.use('/api/...', router)` lines + each router file's `router.(get|post|patch)('...')` + nested `router.use('/:x', subRouter)`). Exit non-zero on any miss. Wire into the Phase 29 verify step and ideally CI. | HIGH — this is the "ButtonAudit"/"EndpointCoverage" requirement made permanent |

### How to run the final UAT pass (the `E2E_UAT` requirement)

**Demo user / credentials.** The satellite app uses **Supabase magic-link auth** — there is no password. To get a session you (a human or the agent driving a real browser) enter a work-email on `login.html`, click the link in the inbox, land on `auth/callback.html`. The MEMORY note "magic-link Supabase Auth (frontend)" + the CLAUDE.md confirm this. The Supabase project is `lbpkbpfwdpnwlccmlfxn` (`SUPABASE_URL` in `satellite-config.js`). **There is no synthetic-JWT path** (Lambda verifies ES256 via JWKS, no signing key available — Phase 28 SUMMARY) so the UAT must be a genuine browser session. Use whatever email the project owner has whitelisted in Supabase Auth (ask the user; do not guess).

**Production URLs.** Frontend: `https://turionspace.zietra.com/satellite/`. Backend API: `https://rjydekliee.execute-api.us-east-1.amazonaws.com`. Production DB for persistence proof: the `turion-satellite` Postgres (Supabase Postgres schema `turion_satellite`) — connection string is in AWS Secrets Manager (see MEMORY: "Turion Satellite Plan 2 Core API LIVE" + Phase 28-06 used it). SAT-003 = "Cygnus", UUID `24587565-b15b-42ce-b590-87ecf9b6bb99`.

**Primary flows to exercise (the checklist):**

1. **Constellation → satellite → subsystem → part → instance drill-down** — `/satellite/` → click Cygnus card → `sat.html` → click a subsystem region (e.g. EPS) → drawer lists parts → click a part with instances → `part.html` → "Instances across constellation" → click an `instance #1` row → `instance.html` renders hero CAD + spec + cost + cross-system links + subtree rollup + timeline + BOM children + work orders. **Verify:** no skeletons stuck, no console errors, no "unavailable" panels (other than the documented `ns_invoice_id` "—" and `instance_index>1` empties).
2. **BOM tree** — `bom.html?sat=24587565-...` → tree renders with `node_count`/`root_count`/`max depth` in the header → expand-all / collapse-all work → click any row → lands on `instance.html?inst=&id=&sat=`. Cross-check `max depth` ≥ 4 (Phase 28 raised it).
3. **Lifecycle: advance a stage** — open `instance.html` for an `instance #1` not at the final stage → click "↪ Advance to {stage}" → enter a reason → toast "Stage advanced" → page reloads → new event in the timeline + stage tag. **Persistence proof:** `psql … "SELECT direction, reason, timestamp FROM turion_satellite.part_stage_events WHERE part_instance_id = '<id>' ORDER BY timestamp DESC LIMIT 1;"` shows the row. Then click "↩ Revert to {stage}" → same loop in reverse.
4. **Manufacturing: create WO → add step → sign step → complete WO** — `work-orders.html?sat=24587565-...` → "+ New work order" → pick an instance → reloads with the new row → open it → `work-order.html` → "+ Add step" → enter a description → step appears → click "✓ PASS" on the first unsigned step → confirm → step shows PASS badge + signed-by → "↪ Mark complete" → confirm → page reloads, status = `complete`, completeBtn gone. **Persistence proof:** `SELECT status, completed_at FROM turion_satellite.work_orders WHERE id='<woId>';` and `SELECT result, signed_at, signed_by FROM turion_satellite.build_steps WHERE work_order_id='<woId>';`.
5. **Procurement: place a vendor order (buy part) / request material (make part)** — `part.html` for a `buy` part with ≥1 instance → "📦 Order from vendor" → pick instance + vendor + qty → "Place order" → reloads → row in "Recent orders". Repeat for a `make` part → "📋 Request material" → material description + est cost → "Submit request" → row in "Recent orders" + "Materials required". **Persistence proof:** `SELECT * FROM turion_satellite.vendor_orders WHERE part_instance_id='<id>';` / `SELECT * FROM turion_satellite.procurement_requests WHERE part_instance_id='<id>';`.
6. **Cost: rollup + make-vs-buy decision** — `cost.html` → constellation rollup table → click Cygnus row → per-subsystem rollup + totals card → click "View parts →" (note F3 — currently unfiltered) → `cost-detail.html?sat=&part_inst=` (reach it from `part.html`'s "Enter cost sheet" CTA or "→ View full cost sheet") → make/buy sheets + decision panel → pick "Make" or "Buy" + a ≥20-char rationale → "Save decision" → reloads → decision pill shows → if approved, "↻ Re-evaluate" → confirm → status flips to `re_evaluate` + banner. **Persistence proof:** `SELECT decision, decision_status, rationale, superseded_by FROM turion_satellite.make_buy_decisions WHERE satellite_id='24587565-...' AND part_definition_id='<id>' ORDER BY decided_at DESC;` — exactly one row with `superseded_by IS NULL`; older rows chained.
7. **(Edge) Auth** — sign out from the topbar → redirected to `login.html` → request a magic link → confirm `auth/callback.html` lands you back signed-in. Confirm a deep-link to e.g. `instance.html?...` while signed out redirects to login then (ideally) back.

**Out-of-scope-but-note during UAT:** the cross-system "↗" links on `instance.html`/`cost-detail.html` open `turionspace.zietra.com/sales|finance|records|manufacturing/...` — those are the *separate ERP-demo shells*, not the satellite app. Verify they don't 404 (a Phase 27-style stale-deploy could have broken them) but they're not Phase 29's responsibility to *fix*.

---

## Standard Stack (for the audit script + any new modal)

| Library | Version | Purpose | Why standard here |
|---------|---------|---------|-------------------|
| (none — vanilla JS) | — | All satellite pages are plain `<script>` tags, no bundler | The project is deliberately build-stepless; **do not introduce a bundler/framework**. New modals follow the existing pattern: `document.body.insertAdjacentHTML('beforeend', '<div class="modal-backdrop">…</div>')` + `addEventListener` + `location.reload()` on success. |
| Vitest | (already in `turion-satellite/backend`, used for `cost-render.js` pure-fn tests + backend route tests) | The audit script's unit tests | `cost-render.js` already does `module.exports` for Vitest — same dual-export trick works for any new shared module. |
| Node `fs` + a tiny regex/AST pass | Node 20 (Lambda runtime) | The static button-audit script (`scripts/audit-satellite-buttons.mjs`) | Keep it dependency-free — parse HTML with regex for `onclick=`/`satelliteApi.` literals; parse `app.ts` + route files for `app.use`/`router.use`/`router.{get,post,patch}`. A full HTML parser is overkill. |
| `pg` (`psql` CLI) | — | Persistence proof in the UAT step | Already how Phase 28-06 verified; connection string from AWS Secrets Manager. |

**No `npm install` needed** — everything is in-repo or system CLI.

## Architecture Patterns

### The modal pattern (copy this for F1's "+ Add BOM line")
```js
// Source: existing pattern in work-orders.html / sat.html / part.html
function openModal(/* context */) {
  const html = `
    <div class="modal-backdrop" id="theModal">
      <div class="modal">
        <div class="modal-header"><h2>Title</h2>
          <button class="btn-secondary" onclick="document.getElementById('theModal').remove()">×</button></div>
        <div class="modal-body">
          <label class="section-label" for="x">Field</label>
          <select id="x" required>${options.map(o => `<option value="${r.escapeHtml(o.id)}">${r.escapeHtml(o.label)}</option>`).join('')}</select>
          <div id="modalErr" style="color:var(--red);margin-top:8px;"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="document.getElementById('theModal').remove()">Cancel</button>
          <button class="btn-primary" id="modalSave">Create</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('modalSave').addEventListener('click', async () => {
    const v = document.getElementById('x').value;
    if (!v) { document.getElementById('modalErr').textContent = 'Pick one'; return; }
    try {
      await window.satelliteApi.post(`/api/satellites/${encodeURIComponent(satId)}/bom`, { /* body */ });
      location.reload();
    } catch (e) { document.getElementById('modalErr').textContent = e.message; }
  });
}
```

### The post-mutation refresh pattern (already universal — keep it)
Two flavors, both fine: `location.reload()` (after a 600ms `setTimeout` if a toast was shown — `part.html`, `instance.html`, `cost-detail.html`), or refetch-the-affected-collection-and-rerender (`work-order.html` for steps, `sat.html` for the drawer). The audit script should *not* flag pure-client toggles for "missing refresh" — only flag a control that calls `satelliteApi.post/patch` and then does *neither*.

### Anti-patterns to avoid
- **Don't** add a JS framework / bundler "to make this easier." The pattern is consistent across 12 pages; new code matches it.
- **Don't** invent endpoints in the audit-script allowlist — derive the allowlist *from `app.ts`*, never hand-maintain it.
- **Don't** try to mint a synthetic Supabase JWT for automated UAT — the Lambda verifies ES256 via JWKS and there's no signing key. Real browser session only.
- **Don't** "fix" `instance.html`'s `cost_breakdown` panel to use `/api/make-costs` like `part.html` does — they're intentionally different (Phase 24 CONTEXT decision #3 kept the lightweight estimate on the instance page).

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| "Is this endpoint real?" check | A hand-maintained list of valid routes | A parser that reads `backend/src/app.ts` mount tree + each router file at audit time | The mount tree is the source of truth; a hand list rots the moment someone adds a route |
| Modal / dialog | A new `<dialog>` component or a lib | The existing `.modal-backdrop` / `.modal` pattern (CSS already in `satellite-shell.css`, used 4× already) | Consistency + zero new deps |
| Auth for UAT | A scripted token mint | A real magic-link browser session | Lambda JWKS verification has no synthetic-token bypass |
| Money formatting in new UI | `parseFloat` + `.toFixed` | `window.costRender.formatMoney` (already handles the Decimal-as-string wire format + currency codes) | Money is JSON strings on the wire (`db.ts` Decimal shim) — naïve `parseFloat` loses precision and currency |

## Common Pitfalls

### Pitfall 1: "It's a dead button" when it's an intentional client-only control
**What goes wrong:** flagging `#expandAll`, `#subFilter`, `#toggleCallouts`, workflow `data-scroll-to` circles, `cost.html`'s `#satSel`, all `<details>` toggles as "dead" because they don't hit the backend.
**Avoid:** the audit explicitly classifies controls as `mutating` (calls `satelliteApi.post/patch` → must refresh) / `read` (calls `satelliteApi.get` → must render result) / `client-only` (filter/toggle/scroll/nav → no backend expected). Only `mutating` controls that do neither refresh-form are bugs.

### Pitfall 2: Testing on `instance_index > 1` and concluding the WO panel is broken
**What goes wrong:** opening `instance.html` for a `#2`/`#3` instance, seeing "No work orders" / empty build process, filing a bug.
**Avoid:** this is documented pre-existing data state (Phase 28 deferred-items #1). UAT walks `instance #1` for the happy path. The only legit Phase 29 action here is the optional F5 hint.

### Pitfall 3: `bom.html?sat=` missing → blank-ish page
**What goes wrong:** opening `bom.html` with no `?sat=` param shows the "No satellite in URL" empty-state — looks like a bug.
**Avoid:** that's the intended guard. All entry points (`sat.html` header "BOM tree" button, the `cost.html` nav, the `index.html` → `sat.html` → BOM flow) carry `?sat=`. Audit should confirm every `bom.html` link in the codebase includes `?sat=`. (It does, today.)

### Pitfall 4: Deploying `turion-space-demo` and accidentally shipping unrelated WIP
**What goes wrong:** `deploy-frontend.sh` does `aws s3 sync . s3://turion-demo-static --include "*.html"` from the repo root — any dirty root-level HTML (the ERP-demo pages) ships too.
**Avoid:** F6 — pre-flight `git status` check in the deploy plan; commit/stash or scope the sync.

### Pitfall 5: Expecting numeric money in API responses
**What goes wrong:** `typeof rollup.subtree_cost_usd === 'number'` assertions fail.
**Avoid:** money is a **JSON string** (`db.ts` `Decimal.prototype.toJSON`). `Number()`-coerce before arithmetic; never `===` against a number literal.

## State of the Art

| Old (pre-Phase 28) | Current | When | Impact on Phase 29 |
|--------------------|---------|------|--------------------|
| `instance.html` read `?id=` only | reads `?inst=` OR `?id=` (Plan 28-05) | Phase 28 | `bom.html` rows emit both — fine; audit should allow either |
| No BOM tree page | `bom.html` recursive `<details>` tree + `GET /api/satellites/:satId/bom/tree` | Phase 28 | max depth ≥ 4 on SAT-003 — verify in UAT flow 2 |
| No subtree cost rollup | `instance.html` subtree rollup panel + `GET /api/analytics/cost-rollup/instance/:instId?sat=` | Phase 28 | verify renders (decision-aware: null-decision parts contribute $0 by design) |
| Flat auto-SVGs | per-part isometric drawings (Phase 27) + clickable BOM-child callouts on parent silhouettes | Phase 27 | the `#toggleCallouts` button + `renderCalloutsOnSvg` callout `<a>`s are part of the button audit (they're pure-nav `<a>`s — fine) |
| `make_buy_decisions` plain rows | supersede-on-write versioned chain + `*_current` views | Phase 24 | the decision save is a 3-step txn — UAT persistence query must check `superseded_by IS NULL` count = 1 |

**Deprecated/outdated:** nothing relevant. The system is current as of Phase 28 (2026-05-11).

## Open Questions

1. **F1 scope — add-BOM-line UI: add-only, or add + edit-qty?**
   - What we know: `bom.ts` only has `POST /` (create). No PATCH/DELETE on `bom_lines`.
   - What's unclear: does "edit BOM line" in the ROADMAP goal mean *edit an existing line's qty*, or just *be able to add lines*?
   - Recommendation: scope F1 as **add-only** (one new modal, one existing POST route, zero backend changes). If the user wants edit-qty, that's a follow-up requiring a `PATCH /api/satellites/:satId/bom/:lineId` route — flag it, don't bundle it.

2. **F2 — wire the `/api/integration/sync-*` buttons, or document as API-only?**
   - What we know: 4 POST routes exist (Phase 25-02), populate cross-system FKs, no UI calls them. The integrations panel only displays the FKs. `ns_invoice_id` is NULL everywhere.
   - What's unclear: are these meant to be user-triggered ("Sync now") or batch/cron?
   - Recommendation: **document as API-only** (batch backfill) unless the user says otherwise. If wired, the `renderIntegrationsPanel` helper needs `satId`/`instId` threaded in (it currently takes only `inst` + opts).

3. **Should the audit script run in CI, or just in the Phase 29 verify step?**
   - What we know: there's no CI wired for `turion-space-demo` currently (Phase 27 deferred-items implies ad-hoc deploys); `turion-satellite/backend` has Vitest.
   - Recommendation: ship the script + a Vitest case for it in `turion-satellite/backend` (where Vitest already runs), and a `npm run audit-buttons` script in `turion-space-demo`. Wiring it into a GitHub Action is a nice-to-have, not a blocker.

4. **Does `auth/callback.html` need any work?** — not read this pass. Recommendation: read it in the first plan; if it just does the Supabase exchange + redirect-to-`/satellite/`, no action; if it has a TODO or a hardcoded redirect, fix it (F4).

## Sources

### Primary (HIGH confidence — read directly from source)
- `/Users/jeet/turion-space-demo/satellite/*.html` (12 pages: index, login, sat, parts, part, instance, work-order, work-orders, bom, kanban, cost, cost-detail) — every interactive element + every `satelliteApi` call enumerated
- `/Users/jeet/turion-space-demo/satellite/{satellite-api,satellite-auth,satellite-cad,satellite-render,cost-render,satellite-config}.js` — shared module behavior
- `/Users/jeet/turion-satellite/backend/src/app.ts` — route mount tree (the source of truth for "does this endpoint exist")
- `/Users/jeet/turion-satellite/backend/src/routes/*.ts` (satellites, parts, instances, lifecycle, work-orders, build-steps, vendor-orders, procurement-requests, make-buy-decisions, vendors, bom, cost-rollup, make-costs, buy-costs, integration) — every `router.{get,post,patch,put}` + the SQL each runs
- `/Users/jeet/turion-satellite/backend/src/db.ts` — Decimal-as-JSON-string wire format, `search_path` handling
- `/Users/jeet/turion-space-demo/deploy-frontend.sh` — the S3 sync / CloudFront invalidation deploy
- `/Users/jeet/doordash-p2p/.planning/ROADMAP.md` (Phase 29 entry, line 471) — goal + requirement tags
- `/Users/jeet/doordash-p2p/.planning/phases/27-*/deferred-items.md` and `.../28-*/deferred-items.md` — prior-phase known issues
- `/Users/jeet/doordash-p2p/.planning/phases/28-*/28-06-PLAN.md` (ROADMAP-embedded summary) — Phase 28 final state (165 part_definitions, 261 SAT-003 instances, max_bom_depth=4, ES256/JWKS-no-synthetic-token note)

### Secondary (MEDIUM — project memory, cross-referenced with the above)
- `MEMORY.md`: "Turion Satellite Frontend LIVE (May 10, 2026)", "Turion Satellite Plan 2 Core API LIVE (May 9, 2026)", "Turion Satellite frontend — zero hardcoding" — confirm live URLs, repo locations, the no-hardcoding rule, magic-link auth

### Tertiary (LOW — not verified this pass, flagged)
- `auth/callback.html` — not read; assumed low-risk (Supabase handles the exchange). Read it in Plan 1.
- Live-site behavior at `https://turionspace.zietra.com/satellite/` — not exercised in this research pass (no browser session); the UAT step does that.

## Metadata

**Confidence breakdown:**
- Page inventory + button list: **HIGH** — every page read line-by-line
- Button → endpoint mapping: **HIGH** — every path matched against `app.ts`'s mount tree + the router file
- Persistence verification: **HIGH** — each mutation traced to its `INSERT`/`UPDATE` SQL
- Known prior-phase issues: **HIGH** — read both `deferred-items.md` files verbatim
- "What needs fixing": **HIGH** for F2–F7 (mechanical), **MEDIUM** for F1 (scope question — see Open Question 1)
- UAT mechanics (credentials/URLs): **MEDIUM-HIGH** — URLs/UUID confirmed; the exact whitelisted demo email must be obtained from the user (Supabase magic-link, no password to document)

**Research date:** 2026-05-10
**Valid until:** ~2026-06-10 (30 days — stable; re-check if anyone touches `app.ts` routes or adds pages under `satellite/`)
