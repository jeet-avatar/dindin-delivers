# Phase 32: Build/Procurement Process Documented + Shown Symmetrically (Make AND Buy) — Research

**Researched:** 2026-05-11
**Domain:** Turion Satellite frontend (vanilla HTML/JS) + small Express/Postgres backend addition
**Confidence:** HIGH (all findings from reading the actual source — frontend HTML, backend routes, schema, migrations)

> No CONTEXT.md exists for this phase yet. The ROADMAP Phase-32 entry is the de-facto scope. Requirements (from ROADMAP): `MakeBuyDecisionUI`, `MakeProcessUI`, `BuyProcessUI`, `ProcessConsistency`.

---

<phase_requirements>
## Phase Requirements

| ID | Description (from ROADMAP) | Research Support |
|----|----------------------------|------------------|
| `MakeBuyDecisionUI` | The make/buy DECISION (decision, rationale, decided_by, decided_at — latest non-superseded from `make_buy_decisions`) shown consistently on every part page | `GET /api/make-buy-decisions/:satId/:partDefId` already returns the current non-superseded row + `decided_by_name` (§D2). Today it's surfaced ONLY on `cost-detail.html` (`renderDecisionPanel`). `part.html`'s "Make/Buy detail" panel and `instance.html` show only `default_make_buy` from the part definition + a synthetic "MAKE/BUY" badge — NOT the actual decision row, rationale, or signer (§A, §C). Fix = fetch this endpoint on part.html + instance.html and render a small decision sub-panel. |
| `MakeProcessUI` | MAKE parts: manufacturing workflow + work order(s) + build steps (number, type, torque, est duration, result pass/fail/rework, sign-off + signer) + materials required + labor cost breakdown — grouped as "the build process" | All present today on `part.html` (workflow visualizer, "Build process" panel from `representative_build_steps`, "Materials required" panel, "Cost breakdown" panel) and `instance.html` (work-orders + inline build-steps in the "Manufacturing / Procurement" panel). Backend `GET /api/parts/:id/process` already returns `representative_build_steps`, `materials_required`, `cost_breakdown`, `work_orders_total`, `completed_builds`, `avg_duration_hrs` (§A, §D1). Gap: the MAKE side is RICH; the BUY side is THIN — see `BuyProcessUI`. |
| `BuyProcessUI` | BUY parts: the FULL procurement chain rendered with the SAME prominence — decision → procurement request → vendor order → PO → invoiced → unit cost. (Note: `rfqs` table is EMPTY — see §D3.) | Today, BUY parts on `part.html` get: a "Make/Buy detail" panel showing preferred vendor only, the same "Recent orders" table (which lumps vendor_orders + procurement_requests as rows), and the cost panel from `/api/buy-costs`. There is NO dedicated, prominent "procurement chain" section to mirror the MAKE "Build process" panel; the BUY workflow visualizer has phantom steps (`RFQ`, `Receiving`, `Acceptance`) with no data behind them. `instance.html` (commit 29260a0) IS better — it has a make/buy-aware panel that renders procurement_requests + vendor_orders for BUY parts — but it doesn't show the buy_costs quoted/PO/invoiced numbers inline, and it doesn't show the decision row. Backend `recent_orders` CTE already surfaces vendor_orders (qty, status, lead_weeks, po_number) + procurement_requests (material_description, estimated_cost_usd, status) but NOT `buy_costs` (quoted_unit_cost_usd, nre_cost_usd, po_value_usd, invoiced_value_usd) — that's the one backend SELECT addition the phase may need (§D1, §D4). |
| `ProcessConsistency` | `part.html` / `instance.html` / `work-order.html` / `cost-detail.html` all consistent — same heading style, same row/card components, latest-non-superseded decision used everywhere | `work-order.html` is fine as-is (build-step sign-off page). `cost-detail.html` is the only page using the real decision endpoint + has solid `renderBuySheet` (RFQ→quote→PO→invoiced rows already). The work is to bring `part.html` + `instance.html` up to that level: real decision row, prominent symmetric build/procurement section. |
</phase_requirements>

---

## Summary

The Turion satellite frontend already has **all the MAKE-path machinery** — a manufacturing workflow visualizer, a "Build process" panel rendering representative build steps with pass/fail/rework + sign-off, a "Materials required" panel, a labor cost breakdown — on `part.html`, and a make/buy-aware "Manufacturing / Procurement" panel on `instance.html` that renders work orders + inline build steps. The BUY path is the weak side: on `part.html` BUY parts get a thin "preferred vendor" panel + the same generic "Recent orders" table (which mixes vendor_orders and procurement_requests as undifferentiated rows) + a cost panel — there is **no dedicated, prominent "procurement chain" section** to mirror the MAKE "Build process" panel, and the BUY workflow visualizer has phantom steps (`RFQ`, `Receiving`, `Acceptance`) with no backing data. `instance.html` (commit 29260a0) is closer — it has a real make/buy-aware panel that renders procurement_requests + vendor_orders for BUY parts — but it doesn't surface the `buy_costs` quoted/PO/invoiced numbers inline and it doesn't show the decision row at all.

The **make/buy DECISION** (`make_buy_decisions`: decision, rationale, decided_by, decided_at, latest non-superseded) is currently surfaced **only on `cost-detail.html`** via `renderDecisionPanel`. `part.html`'s "Make/Buy detail" and `instance.html` show only the part definition's `default_make_buy` plus a synthetic badge — not the actual recorded decision, its rationale, or who signed it. The backend endpoint to fetch it (`GET /api/make-buy-decisions/:satId/:partDefId`) already exists and returns the non-superseded row with `decided_by_name`.

One important data-shape fact: **the `rfqs` table exists but is completely empty** — no migration ever inserts RFQ rows, and the `buy_costs` rows seeded by migrations 013/019 set `rfq_id` and `vendor_id` to NULL. So "RFQ" is NOT a separate entity in this dataset; the quote concept lives inline on `buy_costs` (`quoted_unit_cost_usd`, `nre_cost_usd`). The realistic BUY chain to surface is: **decision → procurement_request → vendor_order → buy_costs(quoted / PO / invoiced)**. The plan should NOT design around RFQ rows that don't exist.

**Primary recommendation:** Frontend-heavy phase. (1) On `part.html` + `instance.html`, fetch `GET /api/make-buy-decisions/:satId/:partDefId` and render a small "Decision" sub-panel (decision · rationale · decided_by_name · decided_at) above the build/procurement content. (2) On `part.html`, replace the thin BUY treatment with a prominent "Procurement chain" panel (mirror of the "Build process" panel) showing procurement_request → vendor_order → PO → invoiced, using the buy-costs data; fix the BUY workflow visualizer's phantom steps. (3) On `instance.html`, add the buy_costs quoted/PO/invoiced numbers inline to the existing make/buy-aware panel. (4) ONE small backend change: extend `GET /api/parts/:id/process` `recent_orders` to also pull `buy_costs` rows (quoted/nre/po_value/invoiced) so the part page doesn't need a second round-trip — then `./build-and-push.sh` redeploy. (5) Cleanup: remove the `[3d-wd]` watchdog from `part.html` + `instance.html` and `debugInfo()` + `frameCount` from `satellite-3d.js`. NO DB migration, NO new page.

---

## User Constraints

No CONTEXT.md exists. Constraints inferred from the ROADMAP Phase-32 entry + project conventions (treat as defaults the planner can override after `/gsd:discuss-phase 32`):

- **No DB migration** — `rfqs`, `buy_costs`, `make_buy_decisions`, `make_costs`, `vendor_orders`, `procurement_requests`, `build_steps`, `work_orders` all already exist (Phase 24/26/28 seeded them). Note `rfqs` is empty.
- **No new page** — extend the existing `part.html` / `instance.html` panels.
- **No change to the 3D viewer's mechanics** — the only viewer-related change is removing the `debugInfo()`/`frameCount`/`[3d-wd]` diagnostics.
- **Phase-29 button audit must stay at 0 violations** — any new `onclick` must be `addEventListener`, not inline. (`audit-satellite-buttons.mjs` allowlist already permits `event.preventDefault()` and `event.stopPropagation()`; nothing else.)
- **Don't break:** the 3D viewer, the 2D SVG fallback, the BOM-children gallery, the integrations panel, the sub-parts gallery, the parent-trail, the sibling instances, the lifecycle timeline, the cost rollup panel.
- **Deploy:** `cd /Users/jeet/turion-space-demo && bash deploy-frontend.sh` with the **F6 pre-flight** (git-stash dirty `*.html` WIP outside `satellite/` — `about-this-demo.html` / `agent-sales-cash.html` / `dashboard-cio.html` — and `mv` the untracked `.superpowers/` aside before the `aws s3 sync . --delete`, restore both after; poll CloudFront `E37R9PT8IL44L2` invalidation to `Completed`). Backend (if touched): `cd /Users/jeet/turion-satellite && ./build-and-push.sh`.

---

## Current State — Detailed Findings

### A. What `part.html` shows today (lines cited from `/Users/jeet/turion-space-demo/satellite/part.html`)

| Panel | Lines | What it renders | Make vs Buy |
|-------|-------|-----------------|-------------|
| **Manufacturing workflow** visualizer | 95-105 (markup), 515-598 (JS `renderWorkflow`) | Step pills with current-position highlight. MAKE steps: `Drawing · Materials · Build steps · QA · Done` (currentIdx derived from completed_builds / work_orders / materials / instances). BUY steps: `Drawing · RFQ · PO · Vendor build · Receiving · Acceptance` — but `RFQ`, `Receiving`, `Acceptance` are **phantom** (currentIdx only ever reaches "Vendor build" because the only signal checked is `recent_orders` vendor_order statuses `open/shipped/received/closed`; `rfqs` is empty so RFQ never lights; there's no "receiving_inspections" check). Step pills are click-to-scroll to a target panel. | Make-aware ✓ / Buy-aware but with dead steps ✗ |
| **Make / Buy detail** panel | 176-181 (markup), 480-504 (JS) | `mb = process.make_buy ?? part.default_make_buy`. MAKE: a `<table>` with "Decision: MAKE — internal build" (a hard-coded label, NOT the `make_buy_decisions` row), Avg build time, Completed builds. BUY: "Decision: BUY — vendor-supplied" (hard-coded), preferred vendor name/country/ITAR-compliant. NEITHER shows rationale, decided_by, or decided_at. | Both, but **no real decision data** ✗ |
| **Production stats** | 184-191, 506-512 | 4 stat tiles: Instances / On satellites / Work orders / Build steps. | Make-leaning (the counts are meaningful for make; for buy they're mostly 0). |
| **Cost breakdown** (per unit) | 193-198, 600-749 (`renderCostFirstClass`) | Fetches `/api/make-costs` (make) or `/api/buy-costs` (buy) for the first instance on the sat. MAKE: Labor / Material / Tooling+Cleanroom+Test / Total. BUY: Quoted unit cost / PO value / Invoiced / Total invoiced. Links to `cost-detail.html`. Falls back to friendly empty state. | Symmetric ✓ (this is the one panel that's already good) |
| **Sub-parts gallery** | 203-210, 908-944 | BOM-children tiles with SVG thumbnails. Only shown when `children.length > 0`. | N/A (BOM structure) |
| **Build process** panel | 212-221 (markup), 783-825 (JS) | `process.representative_build_steps` → step rows: step_number circle (green pass / red fail / amber rework / grey pending), `step_type` tag, description, `torque_spec`, `~Nh` est duration, "QA inspection required" flag, PASS/FAIL/REWORK badge, linked to the representative WO. Empty state: "No build process recorded yet". | **MAKE only** — for BUY parts this just shows the empty state (no symmetric counterpart). |
| **Materials required** panel | 223-229, 751-781 | `process.materials_required` (aggregated from `procurement_requests` on this part's instances): material, avg cost, times requested, statuses. `display:none` unless `mb === 'make'`. | **MAKE only** (panel is `display:none` for BUY). |
| **Recent orders** panel | 231-239, 827-861 | `process.recent_orders` table — mixes `vendor_order` rows (kind tag, when, sat·S/N, vendor + PO, qty/lead, status) and `procurement_request` rows (kind tag, when, sat·S/N, material desc, est cost, status). Same table, undifferentiated. | Both, but it's a generic dump — not a "this is the procurement chain" presentation. |
| **Instances across constellation** | 241-250, 863-906 | Per-sat tables of this part's instances. | N/A |

**Key gap on `part.html`:** the BUY side has no panel with the visual prominence of "Build process". It has the cost panel (good) but the procurement-chain narrative (decision → request → order → PO → invoiced) is scattered across "Make/Buy detail" + "Recent orders" + "Cost breakdown" with no clear story, while the workflow visualizer promises an "RFQ → PO → Receiving → Acceptance" chain that doesn't materialize.

### B. What `instance.html` shows today (lines from `/Users/jeet/turion-space-demo/satellite/instance.html`)

| Panel | Lines | What it renders | Make vs Buy |
|-------|-------|-----------------|-------------|
| Hero CAD strip + 3D viewer + HUD | 132-157, 379-516 | Per-part SVG/3D, dimension HUD. **Contains the `[3d-wd]` watchdog at 493-508.** | N/A |
| Spec sheet | 164-169, 547-570 | Part number, description, subsystem, preferred vendor (+ITAR-OK tag), mass, dims, material, op temp, vendor PN, tolerance, flight heritage. | Buy-leaning (vendor PN) but shown for all. |
| Cost panel (per unit) | 170-176, 584-612 | From `processData.cost_breakdown`. BUY: Sourcing (vendor) / Material-or-unit cost / PO number / Lead time / Total. MAKE: Sourcing / Labor hours / Labor rate / Labor cost / Material cost / Total. | Symmetric ✓ — but pulls from `/process`'s heuristic `cost_breakdown`, NOT from `buy_costs` (so no quoted/invoiced split). |
| Integrations panel | 178-179, 250 | `r.renderIntegrationsPanel(inst)` — Salesforce/NetSuite/Arena/MES FK slots. | N/A |
| Subtree cost rollup | 181-190, 258-341 | `/api/analytics/cost-rollup/instance/:id` + parent trail from `/bom/tree`. | N/A |
| Lifecycle timeline + actions | 192-202, 614-653 | Stage circles, advance/revert. | N/A |
| BOM children gallery | 204-208, 655-703 | Child tiles. **Make/buy-aware empty state** (commit 29260a0): BUY → "Procured component … the procurement chain (purchase request → vendor order → PO → invoice) is shown in the Manufacturing / Procurement panel below"; MAKE → "Single-piece part … Build steps … in the Manufacturing / Procurement panel below". | Make/buy-aware ✓ |
| **Manufacturing / Procurement** panel | 210-214 (markup `#procPanelAnchor` / `#procPanelTitle` / `#woMeta` / `#woList`), 705-813 (JS) | **The 29260a0 panel.** MAKE: title "Manufacturing — build process", lists work orders (WO-xxxxxxxx, bay, started_at, status tag, active highlight) + inline build steps for the active WO (step circle pass/fail/pending, description, step_type · est duration · torque · "signed by Name"). BUY: title "Procurement — vendor-supplied", lists procurement_request cards ("📋 Purchase request" + status tag + material desc + est cost + date) and vendor_order cards ("📦 Vendor order — VendorName" + status tag + qty + PO + lead wk + date), with a header line "Procurement chain for this instance: purchase request → vendor order → PO → invoice." Both have an instance#1-redirect hint for `instance_index > 1`. | **This is the best symmetric panel in the app** — but it's missing: (a) the make_buy_decision row + rationale; (b) the buy_costs quoted/PO_value/invoiced numbers (the VO card shows PO *number* + lead but not PO *value* or invoiced value — those live in `buy_costs`, not `vendor_orders`). |
| Sibling instances | 216-220, 815-833 | Other instances of same partDef on this sat. | N/A |

### C. The make/buy DECISION (`make_buy_decisions`)

- **Schema** (`001_create_turion_satellite_schema.sql:176-185`): `id, satellite_id, part_instance_id, decision ('make'|'buy'), rationale (NOT NULL), decided_by → team_members, decided_at, superseded_by`. Migration 004 added a `decision_status` column and a partial unique index `uq_make_buy_decisions_current WHERE superseded_by IS NULL` and a `part_definition_id` column (per-partDef×sat granularity per CONTEXT decision #9 — see `make-buy-decisions.ts` comments and migration 004).
- **Seeded by** migrations 013 (Block 1) and 019 (Block 1) — one approved row per part_definition × SAT-003 with `rationale ≥ 20 chars`, `decision_status='approved'`. So **every part on SAT-003 has a real decision row.**
- **Where it's shown today:** ONLY `cost-detail.html` → `cr.renderDecisionPanel(decisionRow, makeTotalForDecision, lowestBuyQuote, satId, partDefId, partInstId)` (cost-render.js). It fetches `GET /api/make-buy-decisions/:satId/:partDefId` which returns the non-superseded row + `decided_by_name` + a derived `re_evaluate` boolean.
- **Where it's MISSING:** `part.html` "Make/Buy detail" shows a hard-coded "MAKE — internal build" / "BUY — vendor-supplied" label, NOT the row. `instance.html` shows only a `badge-make`/`badge-buy` chip from `part.default_make_buy`. **Both should fetch the decision endpoint and show decision · rationale · decided_by_name · decided_at.** The endpoint needs `satId` (present on both pages from the `?sat=` query param) + `partDefId` (`partId` on part.html; `inst.part_definition_id` on instance.html).
- **Stale-decision risk:** `part.html`/`instance.html` currently never even read the decision table, so they can't be "stale" — but once they do, they MUST use the `superseded_by IS NULL` row (the endpoint already does this) and should prefer the live decision over `part.default_make_buy` when they disagree (the `default_make_buy` is the part-definition default; the per-sat decision is authoritative for that satellite).

### D. Backend data availability

#### D1. `GET /api/parts/:id/process` — `/Users/jeet/turion-satellite/backend/src/routes/parts.ts:80-283`

Returns (all already available): `part_id, part_number, description, subsystem_code, subsystem_label, make_buy (= pd.default_make_buy), itar_flag, preferred_vendor {name, country, itar_compliant}, instances_total, satellites_with_instances, work_orders_total, build_steps_total, completed_builds, avg_duration_hrs, representative_wo_id, representative_build_steps[] (id, step_number, description, step_type, torque_spec, estimated_duration_hrs, inspection_required, result, signed_at — note: NOT signed_by/signed_by_name here, unlike the /work-orders/:id/steps endpoint), recent_orders[] (see below), cost_breakdown {labor_hrs_per_unit, labor_rate_usd_per_hr, labor_cost_per_unit_usd, material_cost_per_unit_usd, total_cost_per_unit_usd, currency, basis, confidence}, materials_required[] (material_description, avg_cost_usd, request_count, statuses[]) — only populated for make parts`.

`recent_orders` CTE (lines 218-252): UNION of
- `vendor_orders` rows: `kind='vendor_order', id, created_at, satellite_designation, instance_index, serial_number, vendor_name, qty, status, lead_weeks (= quoted_lead_weeks), po_number, material_description=NULL, estimated_cost_usd=NULL, satellite_id, part_instance_id`
- `procurement_requests` rows: `kind='procurement_request', id, created_at (= requested_at), satellite_designation, instance_index, serial_number, vendor_name=NULL, qty=NULL, status, lead_weeks=NULL, po_number=NULL, material_description, estimated_cost_usd, satellite_id, part_instance_id`

ORDER BY created_at DESC LIMIT 20. **NOT included: `buy_costs` rows (quoted_unit_cost_usd, nre_cost_usd, po_value_usd, invoiced_value_usd) and `rfqs` rows.**

#### D2. `GET /api/make-buy-decisions/:satId/:partDefId` — `make-buy-decisions.ts:16-65`

Returns the non-superseded row: `id, satellite_id, part_definition_id, part_instance_id, decision, decision_status, rationale, decided_by, decided_at, superseded_by, decided_by_name (= team_members.full_name)` + derived `re_evaluate` boolean. **404 when not yet decided** (frontend must treat 404 as "no decision yet", not an error — `cost-detail.html`'s `safeGet` already does this). Also `GET .../:satId/:partDefId/history` and `POST` (record) and `POST .../re-evaluate`.

#### D3. `rfqs` table — EMPTY

`001:213-224`: columns `id, vendor_id, part_definition_id, satellite_id, issued_at, response_due (DATE), quoted_unit_cost_usd, nre_cost_usd, awarded (BOOLEAN), created_by`. **No migration ever inserts rows into `rfqs`.** 013/019 Block 5 comments say "full RFQ→quoted→PO→invoiced lifecycle" but they actually populate `buy_costs.quoted_unit_cost_usd / nre_cost_usd / po_number / po_value_usd / invoiced_value_usd` with `rfq_id` and `vendor_id` **left NULL**. So: there is no RFQ entity to render. The "RFQ/quote" concept = the `quoted_unit_cost_usd` + `nre_cost_usd` columns on `buy_costs`. **Do not design the BUY UI around RFQ rows.** If the planner wants an "RFQ" line in the chain, label it from `buy_costs` (e.g. "Quote: $X unit + $Y NRE") — `cost-render.js`'s `renderBuySheet` already does exactly this ("RFQ quoted unit cost", "NRE" rows).

#### D4. `buy_costs` table — `001:226-242`

`id, satellite_id, part_instance_id, vendor_id, rfq_id, quoted_unit_cost_usd, nre_cost_usd, po_number, po_value_usd, invoiced_value_usd, version, notes, created_by, created_at, superseded_by`. Migration 004 added `part_definition_id`, `ordered_qty`, `vendor_order_id`, `currency_code`, `as_of_date`, the `chk_buy_costs_template_or_actual` constraint, and the `buy_costs_current` + `buy_costs_variance` views. Template rows = `part_definition_id` only; actual rows = `(satellite_id, part_instance_id)`. Seeded for every buy part_def (template) + every buy part_instance#1 on SAT-003 (actual, with quoted + PO + invoiced ≈ quoted×qty×1.03). Already exposed via `GET /api/buy-costs/:satId/:partDefId` (returns `{template, actual}`).

#### D5. `work_orders` / `build_steps` / `vendor_orders` / `procurement_requests` schemas

- `work_orders` (`001:463-472`): `id, satellite_id, part_instance_id, assembly_bay_id, assigned_technician_id, status (open|in_progress|rework|complete), started_at, completed_at`. `GET /api/satellites/:satId/work-orders` and `GET /api/work-orders/:id` (the latter exposes `bay_name`, `cleanroom_class`, `part_number`, `description`).
- `build_steps` (`001:474-487`): `id, work_order_id, step_number, description, step_type (build|inspection|test), torque_spec, inspection_required, estimated_duration_hrs, signed_by → team_members, signed_at, result (pass|fail|rework), step_result_data JSONB`. `GET /api/work-orders/:woId/steps` — and that endpoint resolves `signed_by_name` (used by instance.html); the `/process` endpoint's `representative_build_steps` does NOT include `signed_by` or `signed_by_name` (a small omission the planner could fix in the same backend pass if it wants the part-page build steps to show the signer).
- `vendor_orders` (`001:545-557` + mig 004 `ns_invoice_id`, `cross_links_updated_at`): `id, vendor_id, part_instance_id, satellite_id, qty (NOT NULL), quoted_lead_weeks, actual_lead_weeks, po_number, status (open|shipped|received|closed), rfq_id, created_at`. **No unit price** — pricing is via `buy_costs`. So a vendor-order card alone cannot show PO *value* or invoiced value; you need the joined `buy_costs` row.
- `procurement_requests` (`001:563-572`): `id, part_instance_id, satellite_id, material_description (NOT NULL), estimated_cost_usd, requested_by → team_members, requested_at, status (pending|approved|ordered|received)`.

#### D6. Route mounting — `/Users/jeet/turion-satellite/backend/src/app.ts`

Mounted: `/api/health, /api/files/presign, /api/satellites, /api/parts, /api/subsystems, /api/lifecycle-stages, /api/vendors, /api/work-orders/:woId/steps, /api/work-orders, /api/labor-rates, /api/fx-rates, /api/make-costs, /api/buy-costs, /api/make-buy-decisions, /api/analytics/cost-rollup, /api/integration`. The route files `procurement-requests.ts` and `vendor-orders.ts` exist but are mounted ONLY under the satellites router (`satellites.ts:53-56`: `/:satId/work-orders`, `/:satId/vendor-orders`, `/:satId/procurement-requests`). There is **NO** `GET /api/parts/:id/procurement` or similar — the procurement chain is only reachable today via `/api/parts/:id/process`'s `recent_orders` (which lacks buy_costs) or per-instance via the satellites-scoped endpoints + `/api/buy-costs`.

### E. The temporary `[3d-wd]` diagnostics to remove (cleanup task)

- `part.html` lines ~444-462: the `if (typeof viewerHandle.debugInfo === 'function') { ... setInterval ... [3d-wd] ... }` block (the "TEMP diagnostic + self-heal watchdog" comment). Remove the whole block.
- `instance.html` lines ~493-508: the equivalent `[3d-wd]` watchdog block. Remove.
- `satellite-3d.js`: `let frameCount = 0;` (line ~644), `frameCount++;` in `tick()` (line ~666), and the entire `debugInfo: () => { ... }` method in the returned handle (lines ~679-696). The `resize: () => resize()` and `deselect`/`selectChild`/`dispose` stay; `resize` is still used by the 2D→3D toggle re-measure. Note: the 178aff1 fix (definite `#viewer3d { height }` + `overflow:hidden`, `renderer.setSize` without `,false`) is the real fix — these diagnostics are dead weight now.
- ⚠️ The `resize()` call wired in part.html/instance.html `set3D()` (`requestAnimationFrame(() => viewerHandle.resize())`) is NOT a diagnostic — keep it. Only the `debugInfo`/`[3d-wd]` setInterval is going away.

---

## Architecture Patterns (this codebase)

### Page idiom (all `/satellite/*.html`)
- Plain HTML + a single inline `<script>` IIFE: `const r = window.satelliteRender; const session = await window.satelliteAuth.requireSession(); document.getElementById('topbar').innerHTML = r.topbarHTML(session.user.email);` then `r.getQueryParam(...)`, `Promise.all([...])` data fetches via `window.satelliteApi.get(...)`, then DOM-build with template literals + `r.escapeHtml(...)`.
- Shared helpers: `window.satelliteRender` (`escapeHtml`, `breadcrumb`, `statusTag`, `fmtDate`, `topbarHTML`, `toast`, `getQueryParam`, `renderIntegrationsPanel`), `window.satelliteApi` (`get`/`post`/`patch` — throws an error object with `.status` and `.message`), `window.satelliteCad` (`loadPartCad`, `loadSubsystemCad`, `renderCalloutsOnSvg`), `window.costRender` (`formatMoney`, `escapeHtml`, `renderMakeSheet`, `renderBuySheet`, `renderDecisionPanel`, `renderPrevSatDelta`).
- CSS: page-owned `<style>` in `<head>` for page-specific bits (the established Phase-30/31 pattern — e.g. `#viewer3d`, `.cad-hud`, `.cost-row`); shared bits in `satellite-shell.css`. **Do not add per-page selectors to `satellite-shell.css`** unless they're genuinely shared (Plan 28-04/28-05 precedent).
- 404 handling: `safeGet` wrapper (`cost-detail.html`) or `.catch(() => [])` (instance.html's `partChildren`) — treat 404 as "no data yet", not error. The make-buy-decisions endpoint 404s when undecided.

### Symmetric panel design (the concrete proposal)
Build a **"Build / Procurement" section** (one heading, one component family) that branches on the effective make/buy:

- **MAKE** (`decision.decision === 'make'` or, if no decision, `part.default_make_buy === 'make'`):
  1. **Decision** sub-card: `MAKE — internal build` tag · rationale (the `make_buy_decisions.rationale`) · "decided by {decided_by_name} on {fmtDate(decided_at)}" · (if `re_evaluate`, an amber "underlying costs changed since this decision" note linking to `cost-detail.html`).
  2. **Manufacturing workflow** strip (the existing visualizer — keep, it's fine for make).
  3. **Work order(s)** — list (status, bay, started/completed). On `part.html` this is the representative WO link; on `instance.html` it's `myWos`.
  4. **Build steps** — the existing step-row rendering (step_number circle pass/fail/rework/pending, step_type tag, description, torque_spec, est duration, inspection-required flag, sign-off + signer). (Backend: add `signed_by`/`signed_by_name` to `/process`'s `representative_build_steps` if you want the signer on the part page.)
  5. **Materials required** — the existing aggregated table (make only).
  6. **Labor cost breakdown** — the existing `/api/make-costs` panel (Labor / Material / Tooling+Cleanroom+Test / Total) with a link to the full cost sheet.

- **BUY** (`decision.decision === 'buy'` or `part.default_make_buy === 'buy'`):
  1. **Decision** sub-card: `BUY — vendor-supplied` tag · rationale · "decided by {name} on {date}" · re_evaluate note. (Same component as the MAKE decision card.)
  2. **Procurement chain** strip — a horizontal stepper mirroring the MAKE workflow visualizer but with REAL steps backed by data: `Decision → Quote → Purchase request → Vendor order → PO issued → Invoiced`. Light each step from: decision exists → `buy_costs.quoted_unit_cost_usd` present → any `procurement_request` exists → any `vendor_order` exists → `vendor_order.po_number` (or `buy_costs.po_value_usd`) present → `buy_costs.invoiced_value_usd` present. **Delete the phantom `RFQ` / `Receiving` / `Acceptance` steps** (no data behind them). Don't pretend `rfqs` has rows.
  3. **Purchase request(s)** — card(s): material_description, estimated_cost_usd, status, requested date. (From `recent_orders` `procurement_request` rows / per-instance.)
  4. **Vendor order(s)** — card(s): vendor name, country, ITAR-compliant, qty, po_number, quoted_lead_weeks, status, created date.
  5. **PO + Invoiced** — from the joined `buy_costs` row: `po_number`, `po_value_usd`, `invoiced_value_usd`, `quoted_unit_cost_usd`, `nre_cost_usd`. (This is the data `recent_orders` doesn't currently carry — see the backend addition below. `cost-render.js`'s `renderBuySheet` already renders these as rows; consider reusing/extracting it.)
  6. **Vendor cost panel** — the existing `/api/buy-costs` panel (Quoted unit cost / PO value / Invoiced / Total invoiced) with a link to the full cost sheet. (Already present on `part.html`; symmetric with the MAKE labor breakdown.)

Same heading style (`<div class="panel"><div class="panel-header"><strong>…</strong> <span class="subtitle">…</span></div>…</div>`), same card components (`step-row` / `step-circle` for steps; the existing `padding:10px;background:var(--bg-3);border-radius:4px` cards for the procurement chain; `data` tables for cost). Same prominence = the BUY procurement section is a top-level `.panel` on `part.html` exactly like "Build process" is, not buried inside "Recent orders".

### Backend addition (the ONE backend change, if the planner wants part.html to be one round-trip)
Extend `GET /api/parts/:id/process`'s `recent_orders` CTE to also UNION a `buy_costs` block — OR add a `buy_costs` sub-array to the response. Cleanest: add a `buy_cost` object to the response (the actual buy_costs_current row for the first instance on the most-relevant sat — or, since `/process` is sat-agnostic, leave the per-sat buy_cost to the existing `/api/buy-costs/:satId/:partDefId` call the part page already makes in `renderCostFirstClass`, and just enrich `recent_orders`'s `vendor_order` rows with the matching `buy_costs` row's `po_value_usd` / `invoiced_value_usd` via a `LEFT JOIN turion_satellite.buy_costs_current bc ON bc.part_instance_id = vo.part_instance_id AND bc.satellite_id = vo.satellite_id`). Either way it's a small SELECT change + `./build-and-push.sh`. **Alternative: do it entirely frontend-side** — `part.html` already calls `/api/buy-costs/:satId/:partDefId` in `renderCostFirstClass`; reuse that response in the new procurement panel and skip the backend change. The planner should pick: (a) frontend-only (no backend, no Lambda redeploy — simplest, recommended unless the part page needs buy_costs without a `?sat=`) or (b) one small `recent_orders` LEFT JOIN + redeploy. Don't add a brand-new endpoint — there's no need.

### Anti-patterns to avoid
- **Designing the BUY UI around `rfqs` rows** — the table is empty. Use `buy_costs.quoted_unit_cost_usd`/`nre_cost_usd` for the "quote" concept.
- **Inline `onclick`** — the Phase-29 audit fails on it. Use `addEventListener`. (The audit allowlist permits `event.preventDefault()` and `event.stopPropagation()` only.)
- **Adding per-page CSS to `satellite-shell.css`** — keep page-specific styles in the page's `<head>` `<style>` (Phase 30/31 precedent).
- **A second backend endpoint for the procurement chain** — `/process` + `/buy-costs` already cover it; at most extend `recent_orders`.
- **Breaking the 3D viewer when removing `debugInfo`** — `resize` stays (still used by the toggle); only `debugInfo`/`frameCount`/the `[3d-wd]` setInterval go.
- **Touching `instance_index > 1` panels** — those legitimately show "tracked on instance #1" hints (migrations 013/019 only backfill instance #1); don't try to "fix" the empty panels there.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Rendering RFQ→quote→PO→invoiced rows for a buy part | A new buy-cost table renderer | `window.costRender.renderBuySheet(response)` (cost-render.js) — already renders "RFQ quoted unit cost", "NRE", PO, invoiced rows | Consistency with `cost-detail.html`; one source of truth for money formatting |
| The make/buy decision card | A new decision-panel | `window.costRender.renderDecisionPanel(...)` — already on `cost-detail.html` (or extract a lighter read-only variant) | Same look as the cost-detail page; already handles the 404/undecided case |
| Money formatting | `'$' + n.toLocaleString(...)` ad hoc (part.html does this in 3 places) | `window.costRender.formatMoney(strOrNum, currencyCode)` | Handles JSON-string decimals from the backend, currency codes, nulls→'—' |
| Status pills | hand-rolled `<span>` | `r.statusTag(status)` | Already used everywhere |
| Date formatting | `new Date(x).toLocaleDateString()` | `r.fmtDate(x)` | Consistent + null-safe |
| HTML escaping | none / `innerText` juggling | `r.escapeHtml(s)` (or `cr.escapeHtml`) | Already the convention; XSS-safe |
| Integrations panel | re-render the 4 FK slots | `r.renderIntegrationsPanel(inst)` | Shared helper (Plan 28-04) |
| 404 handling on a fetch that may be undecided | `try/catch` inline | the `safeGet` pattern (cost-detail.html) or `.catch(() => null)` | The decisions endpoint 404s when undecided — must not surface as an error toast |

---

## Common Pitfalls

### Pitfall 1: Assuming `rfqs` has data
**What goes wrong:** You add an "RFQ" panel/step that's always empty, or you `JOIN rfqs` and get zero rows.
**Why:** The schema has the table (`001:213-224`) and 013/019 *comments* mention "RFQ lifecycle", but no migration inserts `rfqs` rows; `buy_costs.rfq_id`/`vendor_id` are NULL.
**Avoid:** Treat the "quote" as `buy_costs.quoted_unit_cost_usd` + `nre_cost_usd`. If you want an "RFQ"-labelled step, light it from those columns.
**Warning sign:** A "Quote/RFQ" panel that says "—" for every part.

### Pitfall 2: `part.html` has no `?sat=` in some entry paths
**What goes wrong:** `GET /api/make-buy-decisions/:satId/:partDefId` and `/api/buy-costs/:satId/:partDefId` both need `satId`. `part.html` is sometimes opened without `?sat=` (from `parts.html`). `renderCostFirstClass` already handles this (shows "Open this part from a satellite to see its cost sheet").
**Avoid:** The new decision card + buy procurement panel must degrade gracefully when `satId` is absent (show `part.default_make_buy` + "open from a satellite for the recorded decision and procurement detail"). Don't crash.
**Warning sign:** A blank panel or a thrown error when `part.html?id=...` is opened with no `&sat=`.

### Pitfall 3: `representative_build_steps` lacks `signed_by`/`signed_by_name`
**What goes wrong:** You try to show "signed by {name}" on the part page's build steps and get `undefined`.
**Why:** `/process`'s `representative_build_steps` SELECT (`parts.ts:140-146`) doesn't select `signed_by`; only `/api/work-orders/:woId/steps` resolves `signed_by_name`.
**Avoid:** Either don't show the signer on the part page (instance.html shows it via the per-WO steps endpoint), or add `bs.signed_by` + a `team_members` join to the `/process` SELECT in the same backend pass (small).
**Warning sign:** "signed by undefined" in the part page build steps.

### Pitfall 4: Removing `debugInfo` but leaving the `resize` call dangling
**What goes wrong:** You remove `resize: () => resize()` from the handle along with `debugInfo`, and the 2D→3D toggle's `viewerHandle.resize()` call (part.html/instance.html `set3D`) becomes a no-op → blank-on-toggle regression.
**Avoid:** Only remove `debugInfo`, `frameCount` (decl + increment), and the page-side `[3d-wd]` setInterval blocks. `resize`, `deselect`, `selectChild`, `dispose`, `controls` all stay.
**Warning sign:** `viewerHandle.resize is not a function` in the console after toggling 2D→3D.

### Pitfall 5: F6 deploy pre-flight skipped → `aws s3 sync . --delete` carries WIP ERP HTMLs / `.superpowers/`
**What goes wrong:** `deploy-frontend.sh` does `aws s3 sync . --delete` over the whole repo with `--include "*.html"`; uncommitted WIP HTMLs outside `satellite/` and the untracked `.superpowers/` (which contains `*.html`) get pushed to S3.
**Avoid:** Before `deploy-frontend.sh`: `git stash` the dirty `*.html` outside `satellite/` (`about-this-demo.html`, `agent-sales-cash.html`, `dashboard-cio.html`), `mv .superpowers /tmp/`, deploy, then restore both. Poll CloudFront `E37R9PT8IL44L2` invalidation to `Status=Completed`. (Reaffirmed in STATE.md repeatedly — Phases 27-31.)
**Warning sign:** `about-this-demo.html` appearing on `turionspace.zietra.com`.

### Pitfall 6: Phase-29 button audit regression from a new inline `onclick`
**What goes wrong:** You add `onclick="location.href=..."` (part.html's "Recent orders" rows already do this — lines 845, 896) for a new card and `npm run audit-buttons` fails.
**Why:** The audit (`turion-satellite/backend/scripts/audit-satellite-buttons.mjs`, wired as a Vitest case) flags inline `onclick` except the allowlisted `event.preventDefault()`/`event.stopPropagation()`.
**Avoid:** Wire clicks via `addEventListener` after `innerHTML` assignment (the workflow-visualizer pattern in part.html `renderWorkflow` is the model — `wfEl.querySelectorAll('[data-...]').forEach(el => el.addEventListener('click', ...))`). Note: the pre-existing inline `onclick`s in part.html's Recent-orders table are presumably already allowlisted or the audit is already passing — DON'T add NEW ones; if you rework that table, convert to `addEventListener`.
**Warning sign:** `audit-buttons` Vitest case fails / `0 violations` becomes `N violations`.

---

## Code Examples (from this codebase — patterns to reuse)

### Fetch the decision row, treat 404 as "undecided" (from cost-detail.html)
```js
async function safeGet(path) {
  try { return { data: await window.satelliteApi.get(path), error: null }; }
  catch (e) { return { data: null, error: e }; }
}
const decRes = await safeGet(`/api/make-buy-decisions/${encodeURIComponent(satId)}/${encodeURIComponent(partDefId)}`);
const decision = (decRes.error && decRes.error.status === 404) ? null : (decRes.data || null);
// decision = { decision:'make'|'buy', rationale, decided_by_name, decided_at, decision_status, re_evaluate, ... } | null
```

### Wire clicks without inline onclick (from part.html renderWorkflow — audit-safe)
```js
el.innerHTML = rows.map(x => `<div data-go="${x.id}">…</div>`).join('');
el.querySelectorAll('[data-go]').forEach(node => {
  node.addEventListener('click', () => { location.href = `/satellite/instance.html?...&id=${node.getAttribute('data-go')}`; });
});
```

### Reuse cost-render's buy sheet for the PO/invoiced rows
```js
// part.html already does: costData = await window.satelliteApi.get(`/api/buy-costs/${satId}/${partId}?part_inst=${partInstId}`)
// → reuse in the new procurement panel:
procPanel.innerHTML = window.costRender.renderBuySheet(costData /* {template, actual} */);
// renderBuySheet already emits: "RFQ quoted unit cost", "NRE", PO value, invoiced rows + both variances
```

### The make/buy-aware branch (from instance.html — the 29260a0 pattern, extend it)
```js
const effMakeBuy = decision?.decision || (processData && processData.make_buy) || part.default_make_buy || null;
if (effMakeBuy === 'buy') { /* render: decision card → procurement stepper → PR cards → VO cards → PO/invoiced (buy_costs) → vendor cost panel */ }
else { /* render: decision card → workflow strip → WO list → build steps → materials → labor cost panel */ }
```

---

## State of the Art (this app's recent evolution)

| Old | Current | When | Impact |
|-----|---------|------|--------|
| `part.html` "Make/Buy detail" hard-codes "MAKE/BUY" labels | (still the case — Phase 32 fixes it) | — | Phase 32 wires the real `make_buy_decisions` row |
| BUY parts on `instance.html` showed "No work orders" | make/buy-aware panel: PR + VO cards for buy parts | commit 29260a0 | Phase 32 extends it with buy_costs PO/invoiced + the decision row |
| `cost.html` cost panel used a hand-rolled `materials_required` aggregation + hard-coded $150/hr | first-class `/api/make-costs` + `/api/buy-costs` ({template, actual}) with SCD-2 versioning | Phase 24 | Phase 32 reuses these (don't re-derive cost) |
| 3D viewer "displays once then blank" | fixed by definite `#viewer3d{height}` + `overflow:hidden` + `setSize` without `,false` | commit 178aff1 | Phase 32 removes the now-redundant `[3d-wd]` watchdog + `debugInfo` |
| Per-row "view in 3D" deep-links on bom.html | shipped | Plan 30-02 / commit c5ff68c | (unrelated, just context) |

**Deprecated / dead now:** the `[3d-wd]` console watchdog (part.html/instance.html) and `debugInfo()`/`frameCount` (satellite-3d.js) — added in commit 8179277 to chase the size-blowup, made redundant by 178aff1. The `rfqs` table is effectively vestigial (schema present, never populated).

---

## Open Questions

1. **Backend change: yes or no?**
   - Known: `recent_orders` lacks `buy_costs` (PO value / invoiced). `part.html` already fetches `/api/buy-costs/:satId/:partDefId` separately in `renderCostFirstClass`.
   - Unclear: whether the planner wants the new BUY procurement panel to be one round-trip (→ extend `recent_orders` + redeploy) or is fine reusing the existing `/api/buy-costs` call (→ frontend-only, no redeploy).
   - Recommendation: **frontend-only** unless a strong reason emerges — fewer moving parts, no Lambda redeploy. If they do extend `recent_orders`, also add `bs.signed_by`/`team_members` join to `representative_build_steps` in the same pass (so the part-page build steps can show the signer, matching instance.html).

2. **Should `instance.html`'s cost panel switch from `/process`'s heuristic `cost_breakdown` to `/api/buy-costs`?**
   - Known: instance.html's BUY cost panel shows `cb.material_cost_per_unit_usd`/`total_cost_per_unit_usd` from the heuristic, not the real `buy_costs` quoted/invoiced.
   - Unclear: scope — is "fix the cost panel" in Phase 32 or is the procurement-chain panel (which WILL show real buy_costs) enough?
   - Recommendation: leave the cost panel as-is (it's the "per unit estimate" view; the new procurement panel carries the authoritative buy_costs numbers). If discuss-phase wants it changed, it's a 10-line swap.

3. **`work-order.html` — any change needed?**
   - Known: it's the build-step sign-off page; `signed_by` shows the first 8 chars of the UUID (`(s.signed_by || '').slice(0,8)`), not the name — because `/api/work-orders/:woId/steps` *does* return `signed_by_name` (instance.html uses it) but work-order.html doesn't.
   - Recommendation: optional polish — swap `(s.signed_by||'').slice(0,8)` → `r.escapeHtml(s.signed_by_name || '—')` in work-order.html for consistency. Low priority; fold into the consistency task if cheap.

4. **Does the BUY workflow visualizer stay or get replaced?**
   - Known: it has phantom `RFQ`/`Receiving`/`Acceptance` steps.
   - Recommendation: keep the visualizer component, fix the BUY step list to `Decision → Quote → Purchase request → Vendor order → PO issued → Invoiced` with real currentIdx logic (decision → buy_costs.quoted present → any PR → any VO → VO.po_number/buy_costs.po_value → buy_costs.invoiced). Drop the dead steps.

---

## Sources

### Primary (HIGH confidence — read directly)
- `/Users/jeet/turion-space-demo/satellite/part.html` (1094 lines — workflow visualizer, Make/Buy detail, Build process, Materials, Recent orders, cost panels, 3D viewer + `[3d-wd]` block)
- `/Users/jeet/turion-space-demo/satellite/instance.html` (837 lines — Manufacturing/Procurement panel @705-813, BOM-children make/buy-aware empty state @655-703, cost panel, `[3d-wd]` block @493-508)
- `/Users/jeet/turion-space-demo/satellite/work-order.html` (168 lines — build steps + sign-off)
- `/Users/jeet/turion-space-demo/satellite/cost-detail.html` (340 lines — make/buy cost sheets, decision panel via `renderDecisionPanel`, integrations panel)
- `/Users/jeet/turion-space-demo/satellite/cost-render.js` (`renderBuySheet` already emits RFQ-quote/NRE/PO/invoiced rows; `renderDecisionPanel`, `renderMakeSheet`, `formatMoney`, `escapeHtml`)
- `/Users/jeet/turion-space-demo/satellite/satellite-3d.js` (`debugInfo`/`frameCount` @644-696, `resize`/`deselect`/`selectChild`/`dispose`)
- `/Users/jeet/turion-satellite/backend/src/routes/parts.ts` (`GET /:id/process` @80-283 — `recent_orders` CTE @218-252 lacks `buy_costs`/`rfqs`; `representative_build_steps` @140-146 lacks `signed_by`)
- `/Users/jeet/turion-satellite/backend/src/routes/make-buy-decisions.ts` (`GET /:satId/:partDefId` @16-65 returns non-superseded row + `decided_by_name` + `re_evaluate`; 404 when undecided)
- `/Users/jeet/turion-satellite/backend/src/routes/buy-costs.ts` (`GET /:satId/:partDefId` returns `{template, actual}` from `buy_costs_current`/`buy_costs_variance`)
- `/Users/jeet/turion-satellite/backend/src/app.ts` (route mounts — `procurement-requests.ts`/`vendor-orders.ts` mounted only under `/api/satellites/...`; no `/api/parts/:id/procurement`)
- `/Users/jeet/turion-satellite/migrations/001_create_turion_satellite_schema.sql` (schema: `make_buy_decisions` @176-185, `make_costs` @187-211, `rfqs` @213-224, `buy_costs` @226-242, `work_orders` @463-472, `build_steps` @474-487, `vendor_orders` @545-557, `procurement_requests` @563-572)
- `/Users/jeet/turion-satellite/migrations/013_densify_decisions_manufacturing_procurement.sql` + `019_backfill_data_coverage_for_phase28_parts.sql` (Block 1 = one approved decision per part_def×SAT-003; Block 5 = `buy_costs` template + actual with quoted/PO/invoiced, `rfq_id`/`vendor_id` NULL; `grep` confirms NO `INSERT INTO rfqs` anywhere in `migrations/`)
- `/Users/jeet/doordash-p2p/.planning/ROADMAP.md` (Phase 32 entry @508+), `/Users/jeet/doordash-p2p/.planning/STATE.md` (F6 pre-flight, Phase 27-31 precedents, audit-buttons rule, instance_index=1 backfill caveat)

### Secondary / Tertiary
- None — no web research needed; everything is in-repo.

---

## Metadata

**Confidence breakdown:**
- Current-state inventory (what's shown where): HIGH — read every relevant HTML/JS file end to end.
- Backend data availability (endpoints, schema, what `recent_orders` carries): HIGH — read the route handlers + schema + migrations directly; `grep` confirmed `rfqs` is never populated.
- Symmetric-design proposal: HIGH on what data exists; the exact panel layout is a recommendation the planner/discuss-phase can refine.
- The "frontend-only vs one backend SELECT" choice: MEDIUM — both are viable; recommendation leans frontend-only but discuss-phase should confirm.

**Research date:** 2026-05-11
**Valid until:** ~2026-06-10 (stable codebase; the only thing that could change is someone seeding `rfqs` or touching `/process` — re-check `parts.ts` if so).
