---
phase: 29-ui-workflow-e2e-uat-fixes
plan: 02
subsystem: ui
tags: [turion-satellite, bom, modal, vanilla-js, express, integration-sync, endpoint-coverage, button-audit]

# Dependency graph
requires:
  - phase: 28-full-bom-densification-data-coverage-drill-down-ui
    provides: "bom.html recursive <details> tree powered by GET /api/satellites/:satId/bom/tree"
  - phase: 25-cross-system-sync (25-02)
    provides: "the 4 POST /api/integration/sync-* batch-backfill routes documented here"
provides:
  - "bom.html '+ Add BOM line' modal -> POST /api/satellites/:satId/bom (existing route, zero backend change)"
  - "integration.ts JSDoc block documenting the 4 sync-* routes as API-only / no-UI-by-design (satisfies EndpointCoverage)"
affects: [29-03, phase-29-uat, button-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Add-row modal via document.body.insertAdjacentHTML('beforeend', '<div class=\"modal-backdrop\" id=\"...\">...')  then #modalSave click handler -> satelliteApi.post -> toast + location.reload (mirrors work-orders.html / sat.html)"
    - "Picker options sourced by flattening an already-fetched tree response (dedup by id) instead of an extra API fetch"

key-files:
  created: []
  modified:
    - /Users/jeet/turion-space-demo/satellite/bom.html
    - /Users/jeet/turion-satellite/backend/src/routes/integration.ts

key-decisions:
  - "F1 is add-only — no edit-qty PATCH route was added; the modal reuses the existing POST /api/satellites/:satId/bom (bom.ts:156). Zero backend change."
  - "POST body field names used (read from bom.ts, NOT guessed): child_part_instance_id, parent_part_instance_id, qty, ref_designator. There is NO `quantity` field (it's `qty`) and NO `reference_designator` field (it's `ref_designator`). `uom` is intentionally omitted from the modal so the backend stores its default 'EA'."
  - "Parent picker is REQUIRED in the modal (must-have: 'both pickers populated') even though bom.ts treats parent_part_instance_id as OPTIONAL (omitting it = NULL = a legitimate root-level line). Documented in code; a future iteration could add a '— (none / root-level line)' option to expose the NULL-parent capability."
  - "Instance pickers are populated from the already-fetched /bom/tree response (flattened, deduped by instance_id) — no extra API call. Option label format: `<part_number> #<instance_index> — <subsystem_code> (SN <serial_number>)` with the subsystem/SN parts elided when null."
  - "The 4 /api/integration/sync-* routes are documented as API-only batch backfills (no 'Sync now' button) rather than wired to UI — they are cron/admin-shaped, not per-user. Satisfies EndpointCoverage's 'wire or document'."

patterns-established:
  - "BOM-line modal idiom in bom.html: #addBomLineBtn (shown only when ?sat= present AND >=1 instance) -> openAddBomLineModal() -> client-side validate (child set, parent set, parent != child, qty whole >= 1) -> POST -> toast + location.reload; ApiError -> inline #bomLineErr, modal stays open"
  - "Avoid a stray `*/` inside a JSDoc /** */ block — a path literal like `28-*/deferred-items.md` terminates the comment early; rephrase to plain prose"

requirements-completed: [ButtonAudit, EndpointCoverage]

# Metrics
duration: ~20min
completed: 2026-05-11
---

# Phase 29 Plan 02: "+ Add BOM line" modal + integration-sync route documentation Summary

**Added a vanilla-JS "+ Add BOM line" modal to `bom.html` that POSTs to the existing `POST /api/satellites/:satId/bom` (zero backend change), and documented the four `/api/integration/sync-*` batch-backfill routes as API-only / no-UI-by-design in `integration.ts` — closing the Phase 29 ROADMAP "edit BOM line" gap and the EndpointCoverage requirement.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-05-11T06:04:21Z
- **Completed:** 2026-05-11T06:06:29Z (timestamps drifted; effective working time ~20 min)
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- `bom.html` now has a `#addBomLineBtn` in the BOM tree controls (shown only when `?sat=` is present and there is ≥1 instance to pick) that opens an `openAddBomLineModal()` dialog: parent-instance picker, child-instance picker, qty number input, optional reference-designator text input, inline error div — following the `work-orders.html` modal idiom verbatim.
- `#modalSave` validates client-side BEFORE calling the API (child set, parent set, parent ≠ child, qty a whole integer ≥ 1; inline error + `return` on any failure), then `await window.satelliteApi.post(`/api/satellites/${encodeURIComponent(satId)}/bom`, { child_part_instance_id, parent_part_instance_id, qty, ref_designator })` and `r.toast('BOM line added')` + `setTimeout(() => location.reload(), 600)` on success / `e.message` in `#bomLineErr` (modal stays open) on `ApiError`.
- Instance pickers are populated by flattening the already-fetched `/bom/tree` response (deduped by `instance_id`, sorted by part_number then instance_index) — no extra API fetch — with human-readable option labels built via `r.escapeHtml`.
- `integration.ts` carries a JSDoc block above the router declaration documenting the four `POST /api/integration/sync-*` routes (`/sync-sales-order/:salesOrderId`, `/sync-ns-invoice/:invoiceId`, `/sync-arena-doc`, `/sync-mes-work-order`) as API-only batch backfills — Phase 25-02 cross-system FK population from the legacy `turion` schema — with no "Sync now" button by design; the decision is attributed to Phase 29's EndpointCoverage requirement.
- Zero backend route added; `integration.ts` change is comment-only; `tsc --noEmit` clean; `node --check` on the extracted `bom.html` inline script passes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the "+ Add BOM line" modal to bom.html** — `3aa14e2` (feat) — in `github.com/jeet-avatar/turion-space-demo`
2. **Task 2: Document the /api/integration/sync-* routes as API-only** — `8b25a30` (feat) — in `github.com/jeet-avatar/turion-satellite`

**Plan metadata:** (this SUMMARY + STATE/ROADMAP) committed in `github.com/jeet-avatar/doordash-p2p` (`.planning/` hub) — see final commit below.

## Files Created/Modified
- `/Users/jeet/turion-space-demo/satellite/bom.html` — added a `#addBomLineBtn` to `.tree-controls` + `openAddBomLineModal()` (parent/child instance pickers, qty input, optional ref input, inline error) wired to `POST /api/satellites/:satId/bom`; +126 lines, plus a 5-line `<style>` block for the modal form fields. The recursive `<details>` tree, `#expandAll`/`#collapseAll`, row links, and the `?sat=` guard are untouched.
- `/Users/jeet/turion-satellite/backend/src/routes/integration.ts` — +27 lines: a JSDoc block above `const router = Router()` documenting the 4 `sync-*` routes as API-only batch backfills with no UI surface by design. Comment-only; no route/signature/auth change.

## API contract used (verified by reading `bom.ts`, not guessed)

`POST /api/satellites/:satId/bom` — handler at `turion-satellite/backend/src/routes/bom.ts:156` destructures:

| Field | Required? | Notes |
|-------|-----------|-------|
| `child_part_instance_id` | **REQUIRED** | Must be a `part_instances` row on this `:satId` (handler 404s otherwise). |
| `qty` | **REQUIRED** | Must be `> 0` (handler 400s otherwise). The modal sends `Number(...)`; client-side enforces a whole integer ≥ 1. |
| `parent_part_instance_id` | OPTIONAL (backend) | `NULL` ⇒ a root-level line. If given, must be on this `:satId`. **The modal makes it required as a UX simplification.** |
| `uom` | OPTIONAL | Backend defaults to `'EA'`. **Not exposed in the modal** — left unset. |
| `ref_designator` | OPTIONAL | Free text. Modal sends it only when non-empty. |

INSERT columns (handler): `satellite_id, parent_part_instance_id, child_part_instance_id, qty, uom, ref_designator`. **There is NO `quantity` field and NO `reference_designator` field** — the names are `qty` and `ref_designator`. The handler does no cycle check on POST (the cycle guard lives on the `/bom/tree` SELECT side, `c_pi.id <> ALL(t.path)`); the only server-side rejections beyond the required-field checks are "child/parent instance not found in this satellite".

## Modal validation rules (client-side, before any API call)

1. `bomChild` set → else "Pick a child instance."
2. `bomParent` set → else "Pick a parent instance."  *(modal-imposed; backend allows blank for a root line)*
3. `bomParent !== bomChild` → else "Parent and child must be different instances."
4. `Number(bomQty)` is an integer ≥ 1 → else "Quantity must be a whole number ≥ 1."

On any failure: set `#bomLineErr` text and `return` (no API call). On backend `ApiError`: show `e.message` in `#bomLineErr`, keep modal open, re-enable `#modalSave`.

## Instance-picker option-label format

`<part_number> #<instance_index> — <subsystem_code> (SN <serial_number>)` — the ` — <subsystem_code>` part is elided when `subsystem_code` is null; the ` (SN ...)` part is elided when `serial_number` is null. Options are sorted by `part_number` (case-insensitive) then `instance_index`, deduped by `instance_id` (a part instance can appear under multiple parents in a many-to-many BOM). Source = the already-fetched `GET /api/satellites/:satId/bom/tree` response (`tree.roots` walked recursively) — no extra fetch.

## integration.ts comment block (F2)

A single `/** ... */` block placed immediately above `const router = Router()` (so it precedes all four `sync-*` route definitions). Content: the four routes are batch-backfill operations populating cross-system FK columns (`sales_order_id`, `ns_invoice_id`, `arena_doc_id`, `mes_work_order_id`) on `turion_satellite.part_instances` / `vendor_orders` from the legacy `turion` schema; intentionally NO "Sync now" button in the satellite frontend (pages only *display* the FKs via `renderIntegrationsPanel`); invoke from cron/admin or curl with a Bearer JWT; decision attributed to Phase 29 EndpointCoverage ("surface backend routes with no UI → wire or document" — chose: document, since these are cron-shaped); plus a note that `ns_invoice_id` is NULL on all SAT-003 instances today (Phase 26-04 never wired NetSuite invoices).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] JSDoc comment terminated early by a `*/`-containing path literal**
- **Found during:** Task 2 (first `tsc --noEmit` after adding the comment)
- **Issue:** The planned comment text referenced `.planning/phases/28-*/deferred-items.md` verbatim. Inside a `/** ... */` block, `28-*/` contains `*/`, which closed the JSDoc comment prematurely → `tsc` errors `TS1127 Invalid character`, `TS1005 ; expected`, `TS1161 Unterminated regular expression literal` at that line.
- **Fix:** Rephrased that line to "see the Phase 28 deferred-items.md note #2" (no `*/`). Also swapped the en-dash/arrow glyphs in two prose lines for ASCII (`->`, `--`) for consistency — not strictly required (Unicode is legal in TS comments) but tidier. `tsc --noEmit` then exits 0.
- **Files modified:** `/Users/jeet/turion-satellite/backend/src/routes/integration.ts`
- **Commit:** `8b25a30`

### Notes / not deviations

- **Plan 29-01's audit script (`turion-space-demo/scripts/audit-satellite-buttons.mjs`) is not present yet** — 29-01 runs in parallel in Wave 1 and had not committed at the time this plan executed. The plan's verification line "the audit reports 0 violations" is therefore deferred to 29-01's own run (or Plan 29-03's UAT). By inspection, the new `bom.html` will pass the audit: the only new `satelliteApi.post` call is `'/api/satellites/${satId}/bom'`, which normalizes to `POST /api/satellites/:X/bom` and matches the real `bom.ts POST /` route mounted at `/api/satellites/:satId/bom`; the two new `onclick` attributes are `document.getElementById('bomLineModal').remove()`, which is on the audit's allowlist.
- `window.__bomTreeCacheBust` is defined on `instance.html`, not `bom.html` — `bom.html` fetches `/bom/tree` directly (no sessionStorage cache of its own), so `location.reload()` always re-renders fresh. The modal still calls `window.__bomTreeCacheBust(satId)` guarded by `typeof ... === 'function'` so the shared cache is busted if the helper happens to be present.

## Verification

- [x] `node --check` on the extracted `bom.html` inline `<script>` → no syntax errors (Python-regex extraction, not awk).
- [x] `grep -n "API-ONLY by design" /Users/jeet/turion-satellite/backend/src/routes/integration.ts` → found at line 30.
- [x] `cd /Users/jeet/turion-satellite/backend && npx tsc --noEmit` → exit 0.
- [x] POST body field names in `bom.html` (`child_part_instance_id`, `parent_part_instance_id`, `qty`, `ref_designator`) match `bom.ts`'s `POST /` destructure exactly — no `quantity`, no `reference_designator`.
- [x] No new backend route; `integration.ts` change is comment-only (`git diff --stat` → 27 insertions, 0 deletions, 0 logic lines).
- [x] `bom.html` recursive tree, `#expandAll`/`#collapseAll`, row links, `?sat=` guard unchanged (diff is purely additive).
- [ ] Live persistence proof of an actual Add-BOM-line submission → owned by Plan 29-03's UAT (this plan ships code only); deploy is also Plan 29-03.

## Self-Check: PASSED

- FOUND: `.planning/phases/29-ui-workflow-e2e-uat-fixes/29-02-SUMMARY.md`
- FOUND: `/Users/jeet/turion-space-demo/satellite/bom.html` (contains `satelliteApi.post`)
- FOUND: `/Users/jeet/turion-satellite/backend/src/routes/integration.ts` (contains `API-ONLY`)
- FOUND: commit `3aa14e2` in `turion-space-demo` (Task 1)
- FOUND: commit `8b25a30` in `turion-satellite` (Task 2)
