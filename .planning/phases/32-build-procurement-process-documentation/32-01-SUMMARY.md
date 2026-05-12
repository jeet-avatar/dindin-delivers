---
phase: 32-build-procurement-process-documentation
plan: 01
subsystem: ui
tags: [vanilla-js, turion-satellite, part-page, make-buy, procurement, 3d-viewer]

# Dependency graph
requires:
  - phase: 26-full-demo-data-densification
    provides: make_buy_decisions / buy_costs / vendor_orders / procurement_requests seeded for every part on SAT-003
  - phase: 24-cost-first-class
    provides: GET /api/make-buy-decisions/:satId/:partDefId, GET /api/buy-costs/:satId/:partDefId, costRender.renderBuySheet/formatMoney
provides:
  - part.html "Realization" section with the recorded make/buy decision card (decision · rationale · decided_by_name · decided_at · re_evaluate note)
  - part.html top-level "Procurement chain" panel for BUY parts (PR cards → VO cards → PO/invoiced) with the same prominence as the MAKE "Build process" panel
  - part.html BUY workflow visualizer with real steps (Decision → Quote → Purchase request → Vendor order → PO issued → Invoiced) and no phantom RFQ/Receiving/Acceptance
  - part.html cleanup — temporary [3d-wd] debugInfo watchdog removed
affects: [instance.html make/buy panel (Plan 32-02), satellite-3d.js debugInfo removal (Plan 32-03), 32-04 deploy + audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "safeGet(path) 404→null wrapper reused on part.html (lifted from cost-detail.html) for the decisions endpoint"
    - "effMakeBuy = decision?.decision || process.make_buy || part.default_make_buy — recorded per-satellite decision wins"
    - "buyCostData hoisted to outer scope so the Procurement chain panel + workflow visualizer reuse the single /api/buy-costs fetch (no new endpoint, no re-round-trip)"

key-files:
  created: []
  modified:
    - /Users/jeet/turion-space-demo/satellite/part.html

key-decisions:
  - "Frontend-only — reuse the existing /api/buy-costs fetch; no backend route change, no Lambda redeploy"
  - "BUY parts hide the thin MAKE 'Build process' + 'Materials required' panels; the new 'Procurement chain' panel carries the BUY narrative with equal prominence"
  - "PO/invoiced rendered via costRender.renderBuySheet (consistency with cost-detail.html); the inline decision card mirrors renderDecisionPanel rather than reusing it (renderDecisionPanel is an edit form, not a read-only card)"
  - "re_evaluate note links to cost-detail.html when the decision row carries part_instance_id, else falls back to cost.html?sat="

patterns-established:
  - "Realization section: <div class=panel><div class=panel-header><strong>Realization</strong> <span class=subtitle>…</span></div>…</div> — make and buy use the same section chrome"
  - "BUY workflow currentIdx = highest done index across [decision, buy_costs.quoted, any PR, any VO, VO.po_number||buy_costs.po_value, buy_costs.invoiced]"

requirements-completed: [MakeBuyDecisionUI, MakeProcessUI, BuyProcessUI, ProcessConsistency]

# Metrics
duration: 50min
completed: 2026-05-12
---

# Phase 32 Plan 01: part.html — Make/Buy Decision Card + Symmetric BUY Procurement Panel Summary

**part.html now documents how a part is realized with make and buy given equal weight — a "Realization" section headed by the recorded make/buy decision (rationale, signer, date, re-evaluate note), a top-level "Procurement chain" panel for BUY parts that mirrors the MAKE "Build process" panel, a BUY workflow visualizer with real data-driven steps, and the temporary [3d-wd] watchdog removed.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-05-12T03:12:48Z
- **Completed:** 2026-05-12T03:55:00Z (approx)
- **Tasks:** 3 of 3
- **Files modified:** 1

## Accomplishments

### Task 1 — Make/buy decision card under a "Realization" section
- Added `safeGet(path)` (404→null) and a `GET /api/make-buy-decisions/${satId}/${partId}` fetch, wired only when `?sat=` is present; 404 treated as "undecided" (no error toast).
- Computed `effMakeBuy = (decision && decision.decision) || process.make_buy || part.default_make_buy` and aliased the page-wide `mb` to it, so the workflow visualizer, the Make/Buy detail panel, the cost panel and the materials toggle all branch off the recorded decision when present.
- New `#realizationPanel` (`<div class="panel"><div class="panel-header"><strong>Realization</strong> <span class="subtitle">how this part is built or procured</span></div>…</div>`) with a `renderRealization()` that renders:
  - decision present → `MAKE — internal build` / `BUY — vendor-supplied` tag (+ `decision_status` chip) · `escapeHtml(rationale)` · `decided by {decided_by_name} on {fmtDate(decided_at)}` · if `re_evaluate`, an amber note linking to the cost data.
  - decision null but `?sat=` present → "Make/buy decision not yet recorded for this satellite" (+ the part-default chip).
  - `?sat=` absent → "Open this part from a satellite to see the recorded make/buy decision …" (+ the part-default chip).
- Removed the hard-coded `Decision: MAKE — internal build` / `Decision: BUY — vendor-supplied` rows from the "Make/Buy detail" side-panel; that panel now carries only avg build time / completed builds (make) or preferred vendor name/country/ITAR (buy).

### Task 2 — Symmetric BUY "Procurement chain" panel + fixed BUY workflow visualizer
- New top-level `#procurementPanel` (`.panel`, hidden by default, shown only when `mb === 'buy'`) with `renderProcurement(buyCostData)`:
  - hides the MAKE "Build process" + "Materials required" panels for buy parts.
  - purchase-request card(s) from `process.recent_orders` filtered `kind === 'procurement_request'` — material_description, est cost (`costRender.formatMoney`), status, requested date, sat/serial context.
  - vendor-order card(s) filtered `kind === 'vendor_order'` — vendor_name, qty, PO number, lead weeks, status, created date, plus the preferred vendor's country + an `ITAR-OK` chip.
  - PO/invoiced via `costRender.renderBuySheet(buyCostData)` (RFQ quoted unit cost, NRE, quote total, PO value, invoiced value rows + variances); friendly empty state when no `?sat=` / no buy_costs.
  - whole-panel empty state when zero PRs AND zero VOs AND no buy_costs.
- `buyCostData` hoisted to the IIFE scope; `renderCostFirstClass` now assigns it from the existing `/api/buy-costs` fetch and re-calls `renderProcurement` + `renderWorkflow` so the Quote/PO/Invoiced steps and the cost rows light up once the fetch resolves — no new endpoint, no extra round-trip.
- `renderWorkflow` rewritten for BUY: step list is now `Decision · Quote · Purchase request · Vendor order · PO issued · Invoiced`; `currentIdx` = the highest "done" index across `[!!decision, buy_costs.quoted_unit_cost_usd present, any procurement_request, any vendor_order, any VO.po_number || buy_costs.po_value_usd present, buy_costs.invoiced_value_usd present]`. BUY step pills scroll to `#realizationPanel` (Decision) and `#procurementPanel` (the rest). The MAKE step list is unchanged. No inline `onclick` introduced.

### Task 3 — Remove the [3d-wd] watchdog
- Deleted the entire "TEMP diagnostic + self-heal watchdog" `if (typeof viewerHandle.debugInfo === 'function') { … setInterval(…'[3d-wd]'…) }` block.
- Left untouched: `requestAnimationFrame(() => viewerHandle.resize())` in `set3D()`, the importmap, `#autoRotateChk`, the `?view=` toggle, the `mode-3d` toggle, and the SVG fallback.

## Verification

- `node --check` on the extracted inline `<script>` → **SYNTAX OK**
- `grep` on part.html: `make-buy-decisions` ×1, `safeGet` ×2, `re_evaluate` ×1, `effMakeBuy` ×2 (carried via `mb` thereafter), `Procurement chain` ×3, `PO issued` ×2, `Purchase request` ×4, `Realization` ×4, `renderBuySheet|formatMoney` ×11
- `grep` for removed text: `RFQ · PO · Vendor build` → 0, `Receiving` → 0, `3d-wd` → 0, `debugInfo` → 0; `viewerHandle.resize` still ×2
- `onclick=` count unchanged at 4 (pre-existing modal close + recent-orders/instance row navigation — no new ones)
- `cd /Users/jeet/turion-satellite/backend && node scripts/audit-satellite-buttons.mjs` → **violations: 0** (routes 61, onclick handlers 16, satelliteApi calls 60)

## Deviations from Plan

None — plan executed as written. Two minor refinements within scope:
- The re_evaluate note links to `cost-detail.html?sat=&part_inst=` only when the decision row carries `part_instance_id`; otherwise it falls back to `cost.html?sat=` (cost-detail.html hard-requires `part_inst`). Plan left the exact link shape to the implementer.
- All three tasks landed in one commit (`f3195a5`) because they edit interleaved regions of the same single file; splitting via partial staging would have risked a broken intermediate state.

## Notes / Follow-ups (out of scope)

- Backend `recent_orders` still doesn't carry `buy_costs` PO/invoiced numbers — not needed since part.html already fetches `/api/buy-costs` separately and we reuse that payload. Research Open Question 1 resolved in favor of frontend-only.
- `representative_build_steps` from `/process` still lacks `signed_by` — the part-page build steps don't show the signer (instance.html does, via `/api/work-orders/:woId/steps`). Left to a future backend pass.
- Deploy is owned by Plan 32-04 (`deploy-frontend.sh` with the F6 pre-flight) — NOT done here.

## Self-Check: PASSED

- FOUND: /Users/jeet/doordash-p2p/.planning/phases/32-build-procurement-process-documentation/32-01-SUMMARY.md
- FOUND: commit f3195a5 (turion-space-demo) — satellite/part.html, 239 insertions
