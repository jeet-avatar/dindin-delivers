---
phase: 32-build-procurement-process-documentation
plan: 02
subsystem: turion-satellite-frontend
tags: [instance-html, make-buy-decision, buy-costs, procurement, cleanup]
requires:
  - "GET /api/make-buy-decisions/:satId/:partDefId (existing — make-buy-decisions.ts)"
  - "GET /api/buy-costs/:satId/:partDefId?part_inst=<uuid> (existing — buy-costs.ts, returns {template, actual})"
provides:
  - "instance.html Manufacturing/Procurement panel: recorded make/buy Decision card (tag · rationale · decided_by_name · decided_at · re_evaluate note)"
  - "instance.html BUY branch: authoritative buy_costs numbers (quoted unit cost / NRE / PO number / PO value / invoiced) in a 'Purchase order & invoice' card"
affects:
  - "/Users/jeet/turion-space-demo/satellite/instance.html"
tech-stack:
  added: []
  patterns: ["safeGet 404→null wrapper (cost-detail.html idiom)", "effMakeBuy = decision || /process make_buy || part.default_make_buy", "addEventListener-only clicks (no inline onclick)"]
key-files:
  created: []
  modified: ["/Users/jeet/turion-space-demo/satellite/instance.html"]
decisions:
  - "Built a small inline Decision card + a small inline buy_costs cost-row card rather than reusing costRender.renderDecisionPanel (a heavy editable form) / costRender.renderBuySheet (a full data table + variance grid) — both are too heavy for a compact panel sub-card; the plan explicitly allowed an inline alternative. instance.html does NOT load cost-render.js, so this also avoided adding a new <script> dependency."
  - "Used the existing usd()/inline money formatter (Number(...).toLocaleString) rather than costRender.formatMoney — Number() handles the JSON-string decimals the backend returns; no new dependency."
  - "Renamed the safeGet parameter from `path` to `apiPath` — the Phase-29 button audit's resolveIdentifierPaths() is whole-file-text-scoped (not lexically scoped), so a bare `path` parameter collided with the pre-existing `const path = []` parent-trail array and produced an `unparseable-path` violation. apiPath is unique in the file."
  - "Kept the spec-sheet make/buy badge (#specMeta) sourced from part.default_make_buy — it's the part-definition default in the spec-sheet context, distinct from the per-satellite recorded decision shown in the panel; not a conflicting indication."
  - "Per the locked decision, the heuristic per-unit cost_breakdown panel and the instance_index>1 'tracked on instance #1' hints were left untouched."
metrics:
  duration: ~25min
  completed: 2026-05-11
---

# Phase 32 Plan 02: instance.html Make/Buy Decision Card + buy_costs PO/Invoiced Numbers Summary

instance.html's commit-29260a0 "Manufacturing / Procurement" panel now leads with the recorded make/buy **Decision** (MAKE/BUY tag · rationale · "decided by {name} on {date}" · amber re-evaluate note linking to the cost sheet), fetched from `GET /api/make-buy-decisions/:satId/:partDefId` with 404 treated as "not yet recorded"; `effMakeBuy` (the make-vs-buy branch key) now prefers that recorded decision over `/process`'s `make_buy` and the part default. BUY instances additionally show a "Purchase order & invoice" card — quoted unit cost / NRE / PO number / PO value / invoiced — fetched from `GET /api/buy-costs/:satId/:partDefId?part_inst=<instId>` ({template, actual}; renders the actual row, falls back to the template with a "no actuals yet" note, or a friendly empty state when neither exists) — placed after the existing 📋 Purchase request + 📦 Vendor order cards, with a link to `cost-detail.html?sat=…&part_inst=…`. The temporary `[3d-wd]` `viewerHandle.debugInfo` setInterval watchdog (dead since the 178aff1 viewer-size fix) was removed; the `requestAnimationFrame(() => viewerHandle.resize())` call in `set3D()` stays. FRONTEND-ONLY.

## What changed

### Task 1 — Decision card at the top of the Manufacturing/Procurement panel
- Added an `async function safeGet(apiPath)` 404→null wrapper (cost-detail.html idiom).
- Fetch `GET /api/make-buy-decisions/${satId}/${inst.part_definition_id}` guarded by `if (satId && inst.part_definition_id)`; 404 → `decision = null`.
- `const effMakeBuy = (decision && decision.decision) || (processData && processData.make_buy) || part.default_make_buy || null;` — replaces the prior `(processData && processData.make_buy) || part.default_make_buy` everywhere the panel keys on make-vs-buy (panel title, woList-vs-PR/VO branch, BOM-children empty state, cost panel).
- After both panel branches build `woEl.innerHTML`, a Decision card is prepended via `woEl.insertAdjacentHTML('afterbegin', decCardHTML)`:
  - `decision` present → `badge-make`/`badge-buy` tag ("MAKE — internal build" / "BUY — vendor-supplied") + a `tag-warn` chip if `decision_status` isn't `approved` + `r.escapeHtml(decision.rationale)` + a muted `decided by {decided_by_name} on {fmtDate(decided_at)}` line + (if `re_evaluate === true` or `decision_status === 're_evaluate'`) an amber `⚠ Underlying costs have changed since this decision — review the cost sheet` note linking `cost-detail.html?sat=…&part_inst=…`.
  - `decision` null → `Make/buy decision not yet recorded for this satellite.` + the `effMakeBuy` default chip when available.
- The existing `#procPanelTitle` ("Manufacturing — build process" / "Procurement — vendor-supplied"), the "Procurement chain for this instance: …" header line, and the WO/PR/VO content are unchanged below the card.

### Task 2 — buy_costs quoted/NRE/PO-value/invoiced on the BUY branch
- Verified the route shape against `buy-costs.ts` + `app.ts`: `GET /api/buy-costs/:satId/:partDefId` with optional `?part_inst=<uuid>` (else first instance by `instance_index`); returns `{ template, actual }`; `app.use('/api/buy-costs', buyCostsRouter)` confirmed.
- For `effMakeBuy === 'buy'` only, fetch `GET /api/buy-costs/${satId}/${inst.part_definition_id}?part_inst=${instId}` via `safeGet` (404 → null).
- In the non-empty BUY branch (after `prRows + voRows`), append a `buyCostsCard`:
  - `actual` (preferred) or `template` present → a `🧾 Purchase order & invoice` card with cost rows: Quoted unit cost, NRE (omitted if null), PO number (omitted if null), PO value, Invoiced — money formatted via `Number(...).toLocaleString` honoring `currency_code` — plus `→ Full cost sheet (template vs actual + variance)` linking `cost-detail.html?sat=…&part_inst=…`. If only the template exists, the header is annotated `(template — no actuals on this satellite yet)`.
  - neither present → `🧾 Purchase order & invoice` card with `No purchase-order / invoice records yet for this instance.` — never `$undefined`, never a crash.
- The heuristic per-unit `cost_breakdown` panel (the "Sourcing / Material-or-unit cost / PO number / Lead time / Total" card sourced from `/process`) and the `instance_index > 1` "tracked on instance #1" hints are untouched.

### Task 3 — remove the `[3d-wd]` watchdog
- Deleted the `if (typeof viewerHandle.debugInfo === 'function') { … setInterval( … '[3d-wd]' … ) }` block (~16 lines) in the hero 3D-mount section.
- Kept: `requestAnimationFrame(() => viewerHandle.resize())` in `set3D()`, the Phase-31 `cad-hud` HUD (`grep -c cad-hud` = 7), `#autoRotateChk`, the importmap, the `?view=` toggle, the `frame-svg` SVG fallback, and the "intentionally NOT disposing on pagehide" comment.

## Verification performed

- Extracted instance.html's inline `<script>` (the final `<script>…</script>` before `</body>`, importmap + `<script src>` excluded) → `node --check` → **SYNTAX OK**.
- `grep -c` on `satellite/instance.html`: `make-buy-decisions` = 2, `safeGet` = 4, `re_evaluate` = 1, `effMakeBuy` = 11, `buy-costs` = 1, `po_value_usd|invoiced_value_usd` = 2, `[3d-wd]` = **0**, `debugInfo` = **0**, `viewerHandle.resize` = 2, `cad-hud` = 7.
- `grep -n "onclick="` → **no inline onclick** (the new Decision card / buy_costs card use plain `<a href>` links + the existing `addEventListener`-wired buttons).
- `cd /Users/jeet/turion-satellite/backend && node scripts/audit-satellite-buttons.mjs` → routes 61, onclick handlers 16, satelliteApi calls 60, **violations: 0** (was 1 `unparseable-path` before the `path`→`apiPath` rename; baseline-without-changes also confirmed 0).
- Cross-checked the new `/api/buy-costs/...` URL param shape (`?part_inst=<uuid>`) against `buy-costs.ts` (`const partInstParam = (req.query.part_inst as string) || null;`) — matches; same shape `cost-detail.html` + `part.html` use.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Phase-29 button audit `unparseable-path` violation from a parameter-name collision**
- **Found during:** Task 1 verification (running `audit-satellite-buttons.mjs`).
- **Issue:** The audit's `resolveIdentifierPaths()` is whole-file-text-scoped, not lexically scoped. The `safeGet(path)` wrapper parameter `path` collided with the pre-existing `const path = []` (parent-trail array) in the same file, so the audit resolved `window.satelliteApi.get(path)` against `path = []` → `unparseable-path` (1 violation; baseline was 0).
- **Fix:** Renamed the `safeGet` parameter `path` → `apiPath` (verified unique in the file).
- **Files modified:** `/Users/jeet/turion-space-demo/satellite/instance.html`
- **Commit:** `d86a0a4`

(Notes that are NOT deviations — choices the plan explicitly permitted: used small inline cards instead of `costRender.renderDecisionPanel`/`renderBuySheet`; used the existing `usd()`-style formatter instead of `costRender.formatMoney`; kept the spec-sheet make/buy badge as the part default.)

## Deploy

NOT deployed — Plan 32-04 owns the F6-preflight `deploy-frontend.sh` deploy. FRONTEND-ONLY (no backend change).

## Commits

- `d86a0a4` — feat(32-02): instance.html make/buy decision card + buy_costs PO/invoiced numbers; drop [3d-wd] watchdog (1 file changed, 81 insertions(+), 19 deletions(-))

## Self-Check: PASSED
- instance.html modified + committed (`d86a0a4`)
- 32-02-SUMMARY.md created
