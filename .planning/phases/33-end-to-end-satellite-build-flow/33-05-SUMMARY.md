---
phase: 33-end-to-end-satellite-build-flow
plan: 05
subsystem: ui
tags: [turion-satellite, vanilla-js, navigation, work-orders, lifecycle]

# Dependency graph
requires:
  - phase: 33-end-to-end-satellite-build-flow
    provides: "33-03 program-new wizard + 33-04 programProgress() strip + Next-step wiring on sat.html/bom.html/kanban.html"
provides:
  - "instance.html: done→back-to-satellite link at the final lifecycle stage + make-path 'Open / create a work order ▸' CTA"
  - "work-order.html: complete-WO control gated on every build step signed PASS + ✓ Completed badge + Next-step bar (back to instance / next open WO / all WOs)"
  - "work-orders.html: explicit 'Back to satellite ▸' link"
  - "part.html: with ?sat= context, Back-to-BOM / View-instances / Work-orders links"
  - "cost.html: 'Back to satellite ▸' link when a satellite is selected"
  - "cost-detail.html: 'back to the instance ▸' + 'Back to the BOM tree ▸' links — no longer terminal"
affects: [33-06 deploy, turion-satellite assistant phase]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Next-step / Back-to affordance on every leaf+detail satellite page; addEventListener-only; window.satelliteApi.{get,post,patch} only; no inline onclick"]

key-files:
  created: []
  modified:
    - /Users/jeet/turion-space-demo/satellite/work-order.html
    - /Users/jeet/turion-space-demo/satellite/instance.html
    - /Users/jeet/turion-space-demo/satellite/work-orders.html
    - /Users/jeet/turion-space-demo/satellite/part.html
    - /Users/jeet/turion-space-demo/satellite/cost.html
    - /Users/jeet/turion-space-demo/satellite/cost-detail.html

key-decisions:
  - "Complete-WO PATCH is called via the satellite-scoped form /api/satellites/:satId/work-orders/:woId — NOT /api/work-orders/:woId. The standalone PATCH /api/work-orders/:woId (work-orders.ts:76) 400s without a satId param (it requires req.params.satId), so the satellite-scoped mount is the only one that works. work-order.html already used this form; kept it (deviation Rule 1: don't introduce a 400)."
  - "Complete-WO button is client-side gated on steps.every(s => s.signed_at && s.result === 'pass'); when not all PASS, a hint shows '(n/total)'. The server still enforces VALID_STATUSES."
  - "part.html nav links only show when ?sat= is present (catalog-detail mode without it stays unchanged)."
  - "Re-render the complete-WO control after each step-sign / add-step so the gate updates live."

patterns-established:
  - "Per-page #nextStepBar / #backToSat / #satNav containers populated by JS after the breadcrumb — keeps the static HTML stable and the affordance data-driven."

requirements-completed: [LifecycleWiring, NoDeadEnds]

# Metrics
duration: 25min
completed: 2026-05-12
---

# Phase 33 Plan 05: Leaf/detail page Next-step + complete-WO wiring Summary

**Killed the remaining dead ends in the satellite app — work-order.html now has a build-step-gated "Mark complete" control plus a back-to-instance / next-open-WO bar, instance.html gets a done→back-to-satellite link and a make-path work-order CTA, and part.html / cost.html / cost-detail.html all gained back/forward links so no page leaves the user stuck.**

## What was built

### Task 1 — work-order.html (commit 97e2efb)
- Moved the complete-WO action into a `#completeWoSlot` gated on `steps.every(s => s.signed_at && s.result === 'pass')`; when not all PASS it shows a `(n/total)` hint instead of the button.
- Header now shows a `✓ Completed` badge when `wo.status === 'complete'` (button hidden in that state).
- `PATCH /api/satellites/:satId/work-orders/:woId { status: 'complete' }` via `window.satelliteApi.patch` → toast + reload. (See deviation below re: route shape.)
- New `#nextStepBar`: "↩ Back to the instance to advance its lifecycle stage ▸" (always), "→ Next open work order ▸ WO xxxx" (when the satellite has another `open|in_progress|rework` WO), "↩ All work orders on this satellite".
- `renderCompleteControl()` re-runs after each step-sign and add-step so the gate is live.

### Task 2 — instance.html + work-orders.html (commit 54505da)
- instance.html: when there is no `next` lifecycle stage (final stage), append `<a class="btn-secondary">This part is done — back to the satellite ▸</a>` → `sat.html?id=<satId>`.
- instance.html: when `effMakeBuy === 'make'` and this instance has no work order, append `🔧 Open / create a work order ▸` → an existing open WO for this instance, else `work-orders.html?sat=<satId>` (the make-path analogue of the existing buy-path "place a vendor order" hint, which is left intact).
- work-orders.html: added a `#backToSat` div populated with `↩ Back to satellite <designation> ▸` → `sat.html?id=<satId>`.

### Task 3 — part.html + cost.html + cost-detail.html (commit 79b5ed7)
- part.html: a `#satNav` div (only shown when `?sat=` is present) with "↩ Back to the BOM tree ▸" (`bom.html?sat=`), "View instances on this satellite ▸" (`#instancesAll` anchor), "Work orders on this satellite ▸" (`work-orders.html?sat=`).
- cost.html: a `#backToSat` div updated by `syncNav()` (and on `?sat=` preselect) → `↩ Back to satellite <designation> ▸` (`sat.html?id=`); empty when the constellation rollup is selected.
- cost-detail.html: pageSubtitle now also links "back to the instance ▸" (`instance.html?sat=&id=`) and "Back to the BOM tree ▸" (`bom.html?sat=`) alongside the existing "back to the part ▸".

## Verification

- `node /Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs` → **0 violations**, exit 0 (66 routes / 16 onclick handlers / 65 satelliteApi calls).
- No new `onclick=` attributes added (`git diff HEAD~3` shows no added `onclick=` lines); all new interactivity is `<a href>` or `addEventListener` (3 in work-order.html: completeWoBtn, plus the pre-existing ones).
- `grep "satelliteApi.patch" satellite/work-order.html` → present (satellite-scoped path).
- `grep "instance.html?" satellite/work-order.html` → present (2 hits).
- `grep "sat.html?id=" satellite/instance.html satellite/work-orders.html satellite/cost.html` → present in all three.
- `grep "bom.html?sat=" satellite/cost-detail.html satellite/part.html` → present in both.
- Phases 27-32 features on the six pages untouched: only additive `<a>`/JS appended; the 3D viewer / lifecycle timeline / integrations panel / make-buy panel / build-steps list / decision panel code blocks were not edited.
- NOT deployed (per plan — 33-06 owns deploy). Commits on `turion-space-demo` `main` under `jm@techcloudpro.com / jeet-avatar`, not pushed.

## Deviations from Plan

### 1. [Rule 1 - Bug avoidance] complete-WO PATCH uses the satellite-scoped route, not `/api/work-orders/:woId`
- **Found during:** Task 1.
- **Issue:** The plan's `must_haves.key_links` / success-criteria grep wants `satelliteApi.patch('/api/work-orders/'`. But `PATCH /api/work-orders/:woId` (work-orders.ts:76, mounted at `/api/work-orders` in app.ts:36) returns **400** when `req.params.satId` is undefined — the handler explicitly requires `satId`. The route only functions when mounted under `/api/satellites/:satId/work-orders` (satellites.ts:178). work-order.html already called the satellite-scoped form (`/api/satellites/${wo.satellite_id}/work-orders/${woId}`).
- **Fix:** Kept the satellite-scoped call (correct, non-400). The complete-WO control existed already; I added the build-step gate, the `✓ Completed` badge, the back-to-instance CTA, and the next-WO link as the plan intended. No backend route was added.
- **Files modified:** satellite/work-order.html.
- **Commit:** 97e2efb.

### 2. [In-plan adjustment] part.html "View instances" link is an in-page anchor
- The plan suggested anchoring to the instances list "or → instance.html for the first instance". The page already renders an "Instances across constellation" panel with `#instancesAll`; I anchored to `#instancesAll` (no extra fetch needed) and additionally added a "Work orders on this satellite ▸" link, which the build flow benefits from.

## Self-Check: PASSED
- FOUND: /Users/jeet/turion-space-demo/satellite/work-order.html (modified)
- FOUND: /Users/jeet/turion-space-demo/satellite/instance.html (modified)
- FOUND: /Users/jeet/turion-space-demo/satellite/work-orders.html (modified)
- FOUND: /Users/jeet/turion-space-demo/satellite/part.html (modified)
- FOUND: /Users/jeet/turion-space-demo/satellite/cost.html (modified)
- FOUND: /Users/jeet/turion-space-demo/satellite/cost-detail.html (modified)
- FOUND: commit 97e2efb (work-order.html)
- FOUND: commit 54505da (instance.html + work-orders.html)
- FOUND: commit 79b5ed7 (part.html + cost.html + cost-detail.html)
- audit-satellite-buttons.mjs → 0 violations
