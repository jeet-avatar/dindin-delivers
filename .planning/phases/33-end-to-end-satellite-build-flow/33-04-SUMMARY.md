---
phase: 33-end-to-end-satellite-build-flow
plan: 04
subsystem: turion-satellite-frontend
tags: [vanilla-js, lifecycle-wiring, no-dead-ends, progress-strip]
requires:
  - "PATCH /api/satellites/:id mounted (Phase 33-02)"
  - "GET /api/satellites/:id returns stage_summary (existing)"
provides:
  - "window.satelliteRender.programProgress(currentStage, satStatus) — 6-stage lifecycle strip + status chip"
  - "window.satelliteRender.majorityStage(stageSummary) — picks the dominant lifecycle stage"
  - "sat.html: progress strip + context-aware 'Next step ▸' CTA incl. advance-program-status (PATCH)"
  - "bom.html: progress strip + 'Start the lifecycle — open Kanban ▸' CTA"
  - "kanban.html: progress strip + 'Back to satellite ▸' / 'all parts built' CTA"
affects:
  - "Phase 33-05 (instance.html / work-order.html etc. — sibling 'Next step' wiring; consumes the same programProgress() helper)"
  - "Phase 33-06 (frontend deploy of /satellite/* — picks up these 4 files)"
tech-stack:
  added: []
  patterns:
    - "Self-contained HTML-string render helper with inline dark-theme styles (mirrors breadcrumb()/renderIntegrationsPanel())"
    - "Context-aware 'Next step ▸' block: navigation via <a href>, the one mutation (PATCH status) via addEventListener + window.satelliteApi.patch — zero new onclick"
    - "Derive the 'majority stage' from data the page already fetches (GET /api/satellites/:id stage_summary on sat/bom; instances[].stage_code on kanban) — no extra round-trips"
key-files:
  created: []
  modified:
    - /Users/jeet/turion-space-demo/satellite/satellite-render.js
    - /Users/jeet/turion-space-demo/satellite/sat.html
    - /Users/jeet/turion-space-demo/satellite/bom.html
    - /Users/jeet/turion-space-demo/satellite/kanban.html
decisions:
  - "programProgress() returns an HTML string (consumed via el.innerHTML = r.programProgress(...)) to match how breadcrumb() is already used across pages."
  - "Styling lives as inline styles inside the helper / page markup (no satellite-shell.css change) — matches the codebase's established per-component pattern (Phase 30/31 HUD CSS is also page-local) and keeps the helper self-contained."
  - "'All root instances at the final stage' is approximated as 'every instance in stage_summary is at production' — stage_summary is the aggregate the API returns; a root-only count would need a new endpoint, out of scope here. 'BOM not worked' = every instance still at drawing."
  - "PATCH call written as window.satelliteApi.patch('/api/satellites/' + eSat, {status}) (string concat, not template literal) so it matches the plan's key-link grep pattern and the audit scanner's literal-path matcher."
  - "Next-status order taken from RESEARCH §B: [design, build, test, ship, launch, orbit]; orbit is terminal → CTA points to cost.html?sat= instead of a PATCH."
metrics:
  duration: ~25m
  completed: 2026-05-12
---

# Phase 33 Plan 04: Hub-page lifecycle wiring (progress strip + Next-step CTAs) Summary

Added the shared `programProgress(currentStage, satStatus)` helper to `satellite-render.js` — a self-contained HTML-string strip of the 6 part-lifecycle stages (`drawing → component → bom → assembly → plm_review → production`) with the current/majority stage highlighted (done/current/pending states) plus the `satellites.status` chip — and a companion `majorityStage(stageSummary)` convenience helper. Wired the strip + a context-aware "Next step ▸" block onto the three hub pages so the constellation → satellite → BOM → Kanban → instances walk never dead-ends: `sat.html` shows "Open the BOM tree ▸" (BOM not worked) / "Continue building — open Kanban ▸" (mid-build) / "Advance program to `<next status>` ▸" via `PATCH /api/satellites/:id` (all parts built) / "View cost rollup ▸" (terminal status); `bom.html` shows "Start the lifecycle — open Kanban ▸"; `kanban.html` shows "Back to satellite ▸" and, when every card is in the production column, "All parts built — back to the satellite to advance the program ▸". No new `onclick`; the one mutation goes through `window.satelliteApi.patch`; button audit 0 violations / 66 routes / 64 satelliteApi calls. Phases 27–32 features on these pages (bus SVG, subsystem drawer, add-instance modal; BOM tree, 3D badges, add-BOM-line modal; kanban columns/filters) untouched.

## Tasks Completed

| Task | Name | Commit (turion-space-demo) | Files |
| ---- | ---- | -------------------------- | ----- |
| 1 | Add programProgress() + majorityStage() to satellite-render.js | `ea32ebb` | `satellite/satellite-render.js` |
| 2 | Wire sat.html — progress strip + Next-step CTA + advance-program-status (PATCH) | `f3d469d` | `satellite/sat.html` |
| 3 | Wire bom.html + kanban.html — progress strip + Next-step CTAs; button audit | `f29bf35` | `satellite/bom.html`, `satellite/kanban.html` |

## Verification / Proof

- `grep -n programProgress satellite/satellite-render.js satellite/sat.html satellite/bom.html satellite/kanban.html` → present in all four (definition + `window.satelliteRender` export in the helper; one consumer call in each page).
- `grep -n "satelliteApi.patch('/api/satellites/" satellite/sat.html` → `await window.satelliteApi.patch('/api/satellites/' + eSat, { status: nextStatus });` inside the `advanceProgramBtn` `addEventListener`.
- `grep -n "kanban.html?sat=" satellite/bom.html` → present ("Start the lifecycle — open Kanban ▸"). `grep -n "sat.html?id=" satellite/kanban.html` → present ("Back to satellite ▸" + the "all parts built" variant).
- `grep -n "onclick=" satellite/sat.html satellite/bom.html satellite/kanban.html` → only the **pre-existing** modal `onclick="document.getElementById('…').remove()"` and the pre-existing bom.html `onclick="event.stopPropagation();"` on the 3D badge — **no new ones**. All new interactivity is `addEventListener` (PATCH button) or `<a href>` (navigation).
- `cd /Users/jeet/turion-satellite/backend && node scripts/audit-satellite-buttons.mjs` → `routes: 66 / onclick handlers scanned: 16 / satelliteApi calls scanned: 64 / violations: 0`, exit 0. (satelliteApi-call count rose 60 → 64: +4 from the new `satelliteApi.patch` on sat.html — bom.html/kanban.html added only `<a href>` links, not API calls.)
- Mental render of `programProgress('bom', 'build')`: `Drawing ✓` `Component ✓` (done/green) → `BOM` (current/orange) → `Assembly` `PLM Review` `Production` (pending/grey) → `Program [build]` status chip. `programProgress(null, 'design')` → all pills pending, `[design]` chip. The `majorityStage` of `[{stage_code:'drawing',count:200}]` → `'drawing'`; of `[]` → `null`.
- Phases 27–32 features untouched: the strip + nextStep `<div>`s were inserted *above* the existing `.panel` markup on each page; no existing selectors, scripts, or modal wiring were edited (diff is purely additive — `git show --stat` per commit: render.js +61 / sat.html +70 / bom.html+kanban.html +40).

## Deviations from Plan

None — plan executed as written. Notes:
- The plan left "where the strip CSS lives" to the codebase's convention; chose inline styles inside the helper/markup (consistent with breadcrumb()/renderIntegrationsPanel() and the page-local Phase-30/31 HUD CSS) → no `satellite-shell.css` change.
- The PATCH call is written with string concatenation (`'/api/satellites/' + eSat`) rather than a template literal so it matches both the plan's `key_links` grep pattern and the audit scanner's literal-path matcher.
- `kanban.html` already fetched `sat` (with `stage_summary`) and `instances` (with `stage_code`), so the strip needed no new fetch there; `bom.html` already fetched `sat` best-effort; `sat.html` already fetched `sat`. Zero new API round-trips on any of the three pages (RESEARCH Pitfall 8 respected).
- No deploy (Phase 33-06 owns `deploy-frontend.sh` + the F6 pre-flight). Commits are in `/Users/jeet/turion-space-demo` (local `main`) only. A parallel agent (33-05) is editing other files in the same repo — only the four files above were `git add`-ed by name.

## Notes for downstream plans

- **33-05** can reuse `window.satelliteRender.programProgress(currentStage, satStatus)` and `majorityStage(stageSummary)` directly on instance.html / work-order.html / cost.html etc. — same call shape, no CSS to import.
- **33-06** deploy must include these four `/satellite/*` files: `satellite-render.js`, `sat.html`, `bom.html`, `kanban.html` (`aws s3 sync` picks them up; remember the F6 WIP-stash pre-flight from RESEARCH §A).
- The "advance program status" affordance on sat.html only appears when **every** instance in `stage_summary` is at `production` and `sat.status` is non-terminal — to demo it without building all parts, the 33-05/33-06 verification can either advance instances or temporarily inspect a satellite that's already in that state (none seeded today; the new wizard-spawned ones start at `drawing`).

## Self-Check: PASSED

- FOUND: `/Users/jeet/turion-space-demo/satellite/satellite-render.js` (contains `programProgress` + export)
- FOUND: `/Users/jeet/turion-space-demo/satellite/sat.html` (contains `progressStrip`, `advanceProgramBtn`, `satelliteApi.patch('/api/satellites/`)
- FOUND: `/Users/jeet/turion-space-demo/satellite/bom.html` (contains `programProgress`, `kanban.html?sat=`)
- FOUND: `/Users/jeet/turion-space-demo/satellite/kanban.html` (contains `programProgress`, `sat.html?id=`)
- FOUND: commits `ea32ebb`, `f3d469d`, `f29bf35` in `/Users/jeet/turion-space-demo` (`git log --oneline | grep "33-04"`)
- VERIFIED: `audit-satellite-buttons.mjs` → 0 violations, exit 0; no new `onclick`; PATCH via `window.satelliteApi.patch`.
