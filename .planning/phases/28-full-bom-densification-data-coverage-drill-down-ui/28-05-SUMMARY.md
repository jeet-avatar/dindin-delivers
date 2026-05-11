---
phase: 28-full-bom-densification-data-coverage-drill-down-ui
plan: 05
subsystem: ui
tags: [vanilla-js, html, sessionstorage-cache, cross-system-fk, cost-rollup, parent-trail, turion-satellite-frontend]

# Dependency graph
requires:
  - phase: 28-03
    provides: "GET /api/analytics/cost-rollup/instance/:instId?sat=<satId> (decision-aware recursive subtree cost, money JSON strings) + GET /api/satellites/:satId/bom/tree (recursive BOM tree, cycle-guarded)"
  - phase: 28-04
    provides: "window.satelliteRender.renderIntegrationsPanel(inst, opts?) — shared 4-slot cross-system FK panel; bom.html emits instance.html?inst=<id>&id=<id>"
  - phase: turion-satellite-frontend-live
    provides: "satellite/ static pages (satellite-shell.css, satellite-render.js, satellite-api.js, satellite-auth.js), cost-detail.html, instance.html"
provides:
  - "cost-detail.html — existing make/buy/decision sheets + new cross-system integrations panel (4-slot always-show, between decision panel and prev-sat delta)"
  - "instance.html — existing 7-panel gold-standard set + cross-system integrations panel + new subtree cost rollup panel (self/descendants/subtree cost + descendants count + client-side parent-trail running total)"
  - "instance.html now accepts ?inst= query param (in addition to legacy ?id=) so links from bom.html resolve"
  - "window.__bomTreeCacheBust(satId) — sessionStorage cache-bust hook for /bom/tree (exposed by instance.html), called on stage advance/revert"
affects: [28-06, drill-down-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sessionStorage per-satellite cache for heavy read endpoints (key `bom-tree:<satId>`, 5-min TTL, JSON {ts,data}); mutation handlers bust via a window-exposed hook"
    - "Client-side ancestor-chain walk over a recursive tree response (findParentChain) to compute a parent-trail running total — no second backend endpoint (locked decision #5)"
    - "Additive UI insertion: full-width placeholder div outside an existing 2-col grid rather than restructuring the grid, when 'between A and B' is physically impossible in the current layout"
    - "Dual query-param acceptance (?inst= || ?id=) for backward-compatible link migration"

key-files:
  created: []
  modified:
    - /Users/jeet/turion-space-demo/satellite/cost-detail.html
    - /Users/jeet/turion-space-demo/satellite/instance.html

key-decisions:
  - "instance.html integrations panel placed as a full-width row immediately after the spec-sheet/cost 2-col grid (and before the new subtree rollup) — the plan said 'between spec sheet and cost panel' but those two live in a `grid-template-columns:1fr 1fr` .info-grid, so a literal interleave would have required restructuring the grid (the plan forbids touching existing panels). Full-width-after-grid is the cleanest purely-additive option and keeps the integrations + subtree rollup visually grouped right after the cost area."
  - "instance.html now reads `r.getQueryParam('inst') || r.getQueryParam('id')` — one line changed (the only non-addition in the diff). Plan 28-04's bom.html links emit BOTH `?inst=` and `?id=`, and the plan's must_haves expect instance.html to accept `?inst=`; the legacy `?id=` path still works."
  - "Used `inst.id || instId` for the cost-rollup endpoint path — `instId` is the query-param value, `inst.id` the fetched object's id; either resolves."
  - "Used existing CSS classes only — `.panel`, `.panel-header`, `.subtitle`, `.skeleton`, `.cost-row`, `.cost-row-label`, `.cost-row-value`, `.cost-total` (the plan's example used `.muted` which does not exist on either page — substituted `.subtitle`). No new classes added to satellite-shell.css (owned by no plan after 28-05)."
  - "`window.__bomTreeCacheBust` is defined inside the subtree-rollup IIFE before its first `await`, so it's set synchronously and is available by the time the (later-wired) stage advance/revert buttons can fire."

patterns-established:
  - "Pattern: sessionStorage.getItem -> JSON.parse {ts,data} -> TTL check -> fall through to fetch -> writeCache; wrap every storage call in try/catch (private-mode / quota)"
  - "Pattern: best-effort secondary fetch (parent-trail) inside its own try/catch so the primary render (subtree rollup) still completes on failure"

requirements-completed: [CrossSystem, CostRollup]

# Metrics
duration: 9min
completed: 2026-05-11
---

# Phase 28 Plan 05: Drill-down UI — integrations panel + subtree cost rollup Summary

**`cost-detail.html` and `instance.html` now surface the four `part_instances` cross-system FK columns (`sales_order_id` / `ns_invoice_id` / `arena_doc_id` / `mes_work_order_id`) via the shared `window.satelliteRender.renderIntegrationsPanel(inst)` 4-slot always-show panel (empty FK → "—", deep-links to `turionspace.zietra.com`); `instance.html` additionally gets a new subtree cost rollup panel (`self_cost` · `descendants_cost` · `subtree_cost` · `descendants_count` from `GET /api/analytics/cost-rollup/instance/:instId`, money-precise) plus a parent-trail running total computed client-side by walking `GET /api/satellites/:satId/bom/tree` — that tree fetch is sessionStorage-cached per satellite (`bom-tree:<satId>`, 5-min TTL) with `window.__bomTreeCacheBust(satId)` busting it on stage advance/revert. Both pages stay vanilla HTML; all changes are purely additive (one line of `instance.html` changed: `?inst=` is now accepted alongside `?id=`).**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-05-11T05:34:29Z
- **Completed:** 2026-05-11
- **Tasks:** 2
- **Files modified:** 2 (`satellite/cost-detail.html`, `satellite/instance.html`)

## Line-count deltas

| File | Before | After | Δ | Notes |
| --- | --- | --- | --- | --- |
| `satellite/cost-detail.html` | 331 (commit `1360908`) | 340 | +9 | 100% additions — 1 placeholder div + 4-line render block + 2 comment lines + blank lines |
| `satellite/instance.html` | 458 (commit `42552aa`) | 570 | +112 (+113 ins / −1 del) | the single deletion is `const instId = r.getQueryParam('id');` replaced by `const instId = r.getQueryParam('inst') \|\| r.getQueryParam('id');` |

## Insertion locations

**cost-detail.html** — `<div id="integrationsPanel"></div>` inserted in the body between `<div id="decisionPanelContainer"></div>` and the "Make cost sheet" `.panel` (which precedes the buy sheet and then `<div id="prevSatDeltaContainer"></div>`), so the rendered panel sits below the decision panel and above the prev-sat delta block. Render call (`r.renderIntegrationsPanel(inst)`) placed in the IIFE right after `pageTitle`/`pageSubtitle` are set (where `inst` is already resolved from `GET /api/satellites/:satId/instances/:partInstId`).

**instance.html** — order (existing panels unchanged, NEW marked):
1. hero CAD strip + parent-assembly breadcrumb
2. spec-sheet panel | cost panel (the existing `.info-grid` 2-col row — untouched)
3. **`<div id="integrationsPanel"></div>` (NEW)** — full-width row immediately after `.info-grid`
4. **subtree cost rollup `.panel` (NEW)** — `#subtreeRollupPanel` / `#subtreeMeta`
5. lifecycle timeline + stage actions (existing `.panel` with `#header`/`#stageTagWrap`)
6. BOM children gallery (existing)
7. work orders with inline build steps (existing)
8. sibling instances (existing)

JS: integrations render call placed right after the `inst` fetch (Stage 1). The subtree-rollup IIFE placed immediately after that. The stage advance/revert handler (`doStageAction`) got one line added: `if (typeof window.__bomTreeCacheBust === 'function') window.__bomTreeCacheBust(satId);` after the POST succeeds.

## Sample rendering output

### Integrations panel (both pages — shared helper, illustrative `inst`)

For `inst = { sales_order_id:'SO-2026-00417', ns_invoice_id:'INV-88231', arena_doc_id:null, mes_work_order_id:'WO-MES-0093', cross_links_updated_at:'2026-05-09T12:00:00Z' }`:

```html
<div class="panel" style="margin-bottom:18px;">
  <div class="panel-header">
    <span><strong>Cross-system links</strong></span>
    <span class="subtitle">updated 2026-05-09</span>
  </div>
  <div style="padding:6px 4px;">
    <div ...><span ...>Salesforce SO</span><span ...><a href="https://turionspace.zietra.com/sales/account/SO-2026-00417" target="_blank" rel="noopener" class="mono">SO-2026-00417 <span class="subtitle">↗</span></a></span></div>
    <div ...><span ...>NetSuite invoice</span><span ...><a href="https://turionspace.zietra.com/finance/invoice/INV-88231" ...>INV-88231 ↗</a></span></div>
    <div ...><span ...>Arena doc</span><span ...><span class="subtitle">—</span></span></div>
    <div ...><span ...>MES work order</span><span ...><a href="https://turionspace.zietra.com/manufacturing/work-order/WO-MES-0093" ...>WO-MES-0093 ↗</a></span></div>
  </div>
</div>
```

(IDs >18 chars are truncated with `…`; `cross_links_updated_at` null → header reads `never synced`.)

### Subtree cost rollup panel (instance.html — illustrative rollup + parent trail)

For `rollup = { self_cost_usd:"1000.00", descendants_cost_usd:"380.50", subtree_cost_usd:"1380.50", descendants_count:2 }` and an ancestor chain `TUR-STR-0001 ▸ EPS-PCDU-ASSY` (this instance = `EPS-PCDU-HARNESS-INT`):

```html
<div class="panel" style="margin-bottom:18px;">
  <div class="panel-header"><strong>Subtree cost rollup</strong><span class="subtitle" id="subtreeMeta">2 descendants</span></div>
  <div id="subtreeRollupPanel" style="padding:6px 12px;">
    <div class="cost-row"><span class="cost-row-label">This instance (self)</span><span class="cost-row-value">$1,000</span></div>
    <div class="cost-row"><span class="cost-row-label">Descendants</span><span class="cost-row-value">$381 <span class="subtitle">across 2</span></span></div>
    <div class="cost-row cost-total"><span class="cost-row-label">Subtree total</span><span class="cost-row-value">$1,381</span></div>
    <div class="cost-row" style="border-top:1px dotted var(--border-2); margin-top:8px; padding-top:8px;">
      <span class="cost-row-label">Parent trail</span>
      <span class="cost-row-value" style="font-size:11px; color:var(--text-3); text-align:right;">TUR-STR-0001 ▸ EPS-PCDU-ASSY ▸ <strong>EPS-PCDU-HARNESS-INT</strong></span>
    </div>
  </div>
</div>
```

If `/bom/tree` is unavailable the parent-trail row is simply omitted (the rest renders). If `/cost-rollup/instance/:instId` 404s (current prod Lambda — backend deploy is Plan 28-06) the panel shows `Subtree cost data unavailable — HTTP 404` and `#subtreeMeta` reads `unavailable` — no crash.

## Task Commits

1. **Task 1: cross-system integrations panel on cost-detail.html** — `fc150ef` (feat)
2. **Task 2: integrations panel + subtree cost rollup on instance.html** — `75a933b` (feat)

**Plan metadata:** _(see final docs commit in this repo's `.planning/`)_

## Files Created/Modified
- `satellite/cost-detail.html` — added `<div id="integrationsPanel"></div>` between decision panel and make/buy sheets; added `r.renderIntegrationsPanel(inst)` render call after page title is set. +9 lines, all additions.
- `satellite/instance.html` — accepts `?inst=` query param; added `<div id="integrationsPanel"></div>` (full-width, after the spec/cost grid); added `#subtreeRollupPanel`/`#subtreeMeta` panel; added `r.renderIntegrationsPanel(inst)` call; added the `loadSubtreeRollup()` IIFE (cost-rollup fetch + sessionStorage-cached `/bom/tree` walk + `findParentChain` + `window.__bomTreeCacheBust`); added cache-bust call inside `doStageAction`.

## Decisions Made

See `key-decisions` in frontmatter. Most consequential: (1) the integrations panel on instance.html is a full-width row after the spec/cost grid (a literal interleave is impossible in the existing 2-col `.info-grid` without restructuring it, which the plan forbids); (2) `instance.html` now reads `?inst= || ?id=` (the only non-addition line in the whole diff) so links from bom.html (Plan 28-04) resolve; (3) `.muted` from the plan's example was substituted with the existing `.subtitle` class.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `instance.html` integrations panel placed full-width after the spec/cost grid, not literally between them**
- **Found during:** Task 2
- **Issue:** The plan's must_have / Step 2 said to insert the integrations panel "between the existing spec sheet and cost panel". But on instance.html the spec-sheet `.panel` and the cost `.panel` are the two children of `<div class="info-grid">` with `grid-template-columns:1fr 1fr` — there is no DOM position "between" them that isn't also inside the grid (a 3rd grid child would push the cost panel onto a wrapped row and break the 2-col layout). The plan also forbids touching the existing panels.
- **Fix:** Inserted `<div id="integrationsPanel"></div>` as a full-width row immediately after the `.info-grid` closes (and before the new subtree-rollup panel), keeping the integrations + subtree-rollup pair visually grouped right after the cost area. The shared helper's panel renders full-width as designed.
- **Files modified:** `satellite/instance.html`
- **Verification:** `grep -c "renderIntegrationsPanel" satellite/instance.html` → 1; `git diff` shows the `.info-grid` block byte-for-byte unchanged; inline JS parses clean.
- **Committed in:** `75a933b` (Task 2 commit)

**2. [Rule 3 - Blocking] `instance.html` reads `?inst= || ?id=`; the plan/example used `.muted` (non-existent) — substituted `.subtitle`**
- **Found during:** Task 2
- **Issue:** (a) The plan's must_haves expect `instance.html?inst=` to work (Plan 28-04's bom.html links carry `?inst=`), but the existing `instance.html` line 176 read only `getQueryParam('id')`. (b) The plan's Step-3 example JS used `class="muted"` for de-emphasised text, but neither `instance.html` nor `satellite-shell.css` defines a `.muted` class — the equivalent is `.subtitle`.
- **Fix:** Changed `const instId = r.getQueryParam('id');` → `const instId = r.getQueryParam('inst') || r.getQueryParam('id');` (one line — the only non-addition in the diff; legacy `?id=` callers unaffected). Replaced `class="muted"` with `class="subtitle"` everywhere in the new subtree-rollup JS. Also replaced the plan example's bare `esc(...)` with `r.escapeHtml(...)` (the actual exported helper) and the plan example's literal `→` separator with the page's existing `▸` glyph for visual consistency with the parent-assembly breadcrumb.
- **Files modified:** `satellite/instance.html`
- **Verification:** `node --check` on the extracted inline JS passes; `grep -c "muted" satellite/instance.html` → 0; `grep -c "getQueryParam('inst')" satellite/instance.html` → 1.
- **Committed in:** `75a933b` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking layout/API reconciliations between the plan's illustrative text and the actual codebase). No scope creep — both deliverables match the plan's `must_haves` truths (integrations panel on both pages with 4-slot always-show + "—" placeholders; subtree rollup with self/descendants/subtree/count + client-side parent-trail; sessionStorage-cached `/bom/tree` with `__bomTreeCacheBust`; no second backend endpoint; vanilla HTML; existing panels untouched; all rendering data-driven, zero hardcoded vendor/subsystem/status values).

## Issues Encountered

- **`node --check` over an `awk`-extracted `<script>` block** (the plan's Step-4/5 lint command) over-captures the `<script src=…>` tags too, so `node --check` chokes on the literal `<`. Worked around the same way Plan 28-04 did: a small Python regex grabs only the inline `<script>…</script>` body before linting — that parses clean for both pages.
- **No live browser verification.** `GET /api/analytics/cost-rollup/instance/:instId` and `GET /api/satellites/:satId/bom/tree` are not yet deployed to the Lambda (Plan 28-03 left those routes committed-but-not-live; Plan 28-06 owns the backend redeploy + the S3/CloudFront frontend deploy). Against the currently-live Lambda both new panels degrade gracefully — the integrations panel still renders (its data is on the already-deployed `GET /instances/:id` response), and the subtree-rollup panel shows "Subtree cost data unavailable — HTTP 404" rather than crashing. Static structural checks + `node --check` only. Full visual verification belongs to Plan 28-06's post-deploy step.

## User Setup Required

None — no external service configuration. Both files are committed locally on `turion-space-demo` `main`; deploy (S3 sync + CloudFront invalidate) is Plan 28-06. `deploy-frontend.sh` was deliberately NOT run.

## Next Phase Readiness

- **Plan 28-06** must: (1) ensure the `turion-satellite` backend Lambda has the Plan 28-03 routes (`GET /api/satellites/:satId/bom/tree`, `GET /api/analytics/cost-rollup/instance/:instId`) deployed — they're committed-but-not-live; (2) `cd /Users/jeet/turion-space-demo && git push origin main` then `./deploy-frontend.sh` (S3 sync + CF invalidate `/*`); (3) verify: `cost-detail.html?sat=<SAT-003-id>&part_inst=<inst-id>` shows the 4-slot integrations panel; `instance.html?sat=<SAT-003-id>&inst=<inst-id>` (and the legacy `?id=` form) shows the integrations panel + a populated subtree cost rollup with a parent-trail running total; `bom.html` rows click through to `instance.html` and resolve via the new `?inst=` param.
- The `.planning/` (this repo) and `turion-space-demo` repos are separate — Plan 28-06's deploy task operates on `turion-space-demo`.
- No blockers.

---
*Phase: 28-full-bom-densification-data-coverage-drill-down-ui*
*Completed: 2026-05-11*

## Self-Check: PASSED

- FOUND: /Users/jeet/turion-space-demo/satellite/cost-detail.html
- FOUND: /Users/jeet/turion-space-demo/satellite/instance.html
- FOUND: .planning/phases/28-full-bom-densification-data-coverage-drill-down-ui/28-05-SUMMARY.md
- FOUND commit: fc150ef (Task 1 — integrations panel on cost-detail.html)
- FOUND commit: 75a933b (Task 2 — integrations panel + subtree cost rollup on instance.html)
- VERIFIED: `renderIntegrationsPanel` referenced in both cost-detail.html (1) and instance.html (1)
- VERIFIED: inline JS of both pages passes `node --check`
