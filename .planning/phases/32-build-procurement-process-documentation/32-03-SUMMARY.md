---
phase: 32-build-procurement-process-documentation
plan: 03
subsystem: turion-satellite-frontend
tags: [cleanup, consistency, 3d-viewer, work-orders]
requires: []
provides:
  - "satellite-3d.js viewer handle with the dead debugInfo()/frameCount diagnostics removed (resize/deselect/selectChild/dispose unchanged)"
  - "work-order.html build-step sign-offs showing signed_by_name instead of a UUID slice"
affects:
  - "/Users/jeet/turion-space-demo/satellite/satellite-3d.js"
  - "/Users/jeet/turion-space-demo/satellite/work-order.html"
tech-stack:
  added: []
  patterns: ["null-safe display field with UUID-slice fallback", "dead-diagnostics removal post-fix"]
key-files:
  created: []
  modified:
    - "/Users/jeet/turion-space-demo/satellite/satellite-3d.js"
    - "/Users/jeet/turion-space-demo/satellite/work-order.html"
decisions:
  - "Kept an 8-char slice of signed_by as the fallback (after signed_by_name, before '—') per the plan's implementation note — null-safe degrade if a row lacks the joined name."
metrics:
  duration: ~15m
  completed: 2026-05-11
  tasks: 2
  files: 2
  commits: 2
---

# Phase 32 Plan 03: satellite-3d.js diagnostics removal + work-order.html signer-name Summary

Removed the now-dead `debugInfo()` / `frameCount` diagnostics from `satellite-3d.js` (added in commit 8179277 to chase the canvas size-blowup, made redundant by 178aff1's real fix and obsolete now that the page-side `[3d-wd]` watchdog is gone from part.html/instance.html in 32-01/32-02), and brought `work-order.html`'s build-step sign-off line into `ProcessConsistency` with instance.html by displaying `signed_by_name` (already returned by `GET /api/work-orders/:woId/steps` via a team_members join) instead of the first 8 chars of the technician UUID. FRONTEND-ONLY, no backend change, no deploy (Plan 32-04 owns deploy).

## What Was Built

### Task 1 — satellite-3d.js: remove debugInfo() + frameCount
- Deleted `let frameCount = 0;` (was just above the `tick` loop).
- Deleted `frameCount++;` from inside `tick()` — `tick()` still does `controls.update()` / `renderer.render(scene, camera)` / `raf = requestAnimationFrame(tick)`, plus the Phase-31 tween-lerp branch, all untouched.
- Deleted the entire `debugInfo: () => { ... }` property (and its trailing comma context) from the object returned by `mount3DViewer`.
- The returned viewer handle still exposes `controls`, `resize: () => resize()`, `deselect`, `selectChild`, `dispose`.
- Untouched: the leaf single-mesh path, the Phase-31 assembly path (`layoutAssemblyChildren`, the radial ring, `raycaster.intersectObjects(childGroups, true)`, the hover/click pointer handlers, the camera fly-to tween, `initialCamPos`/`initialTarget`), the Phase-30/31 size-blowup fix (the `Math.min(4000,...)` / `Math.min(2400,...)` caps, `renderer.setSize(...)` without a `,false` 3rd arg, `renderer.setPixelRatio(Math.min(dpr,2))`), the ResizeObserver, the importmap-resolved `import * as THREE from 'three'` + OrbitControls, and all the exported helpers (`isWebGLAvailable`, `chooseTemplate3D`, `normalizeDims`, `perturbForPartNumber`, `paletteFor3D`, `materialFor`, `buildPartMesh`).
- File diff: `1 file changed, 22 deletions(-)`. Commit `9066e94`.

### Task 2 — work-order.html: signed_by_name on build-step sign-offs
- The build-step row's sign-off line changed from
  `${s.signed_by ? `signed by ${r.escapeHtml((s.signed_by || '').slice(0,8))} · ${r.fmtDate(s.signed_at)}` : ''}`
  to
  `${s.signed_at ? `signed by ${r.escapeHtml(s.signed_by_name || (s.signed_by ? s.signed_by.slice(0,8) : '—'))} · ${r.fmtDate(s.signed_at)}` : ''}`
- Switched the presence-gate from `s.signed_by` to `s.signed_at` (a signed step always has `signed_at`; `signed_by_name` is what we want to show), display goes through `r.escapeHtml`, null-safe to an 8-char `signed_by` slice and then `—`.
- `r.fmtDate(s.signed_at)` rendering unchanged. Untouched: the PASS/FAIL/REWORK badges, the step_number circle, the torque_spec / estimated_duration_hrs fields, the `data-sign` / `data-result` sign-action buttons + their `addEventListener` (no inline `onclick=`), `+ Add step`, the `↪ Mark complete` action, the woMeta / instCard panels, the breadcrumb.
- File diff: `1 file changed, 1 insertion(+), 1 deletion(-)`. Commit `68a7e97`.

## Verification

- `grep -c frameCount satellite-3d.js` → **0**; `grep -c debugInfo satellite-3d.js` → **0**.
- `grep -c "resize:" satellite-3d.js` → **1**; `grep -c "dispose:\|dispose()" satellite-3d.js` → **9**; `grep -c "selectChild\|deselect" satellite-3d.js` → **14**; `grep -c intersectObjects satellite-3d.js` → **1** (Phase-31 picker intact).
- `node --check` on `satellite-3d.js` with the two `import ... from 'three'` lines stripped → **OK** (no dangling comma / brace).
- `grep -c "signed_by_name" work-order.html` → **1**; the new sign-off render goes through `r.escapeHtml`. (`grep -c "signed_by.*slice(0" work-order.html` → 1 — that match is the intentional null-safe fallback, not the old `(s.signed_by || '').slice(0,8)` primary path.)
- `node --check` on work-order.html's extracted inline `<script>` → **WO INLINE OK**.
- `cd /Users/jeet/turion-satellite/backend && node scripts/audit-satellite-buttons.mjs` → 61 routes / 16 onclick / 59 satelliteApi / **1 violation** — that violation is `instance.html` `unparseable-path` (a dynamic template-literal path), introduced by the in-flight 32-02 plan running in parallel, NOT by either file this plan touched. `satellite-3d.js` is JS (not scanned for routes/onclick) and `work-order.html` introduced no new inline onclick and no new API path. This plan adds **0 new violations**.

## Deviations from Plan

None — plan executed exactly as written. (The implementation note in the execution context explicitly specified keeping a `signed_by` slice as the fallback after `signed_by_name`; that is in the code as written, so the residual `signed_by.*slice(0` grep hit of 1 is expected, not a deviation.)

## Notes for Plan 32-04 (deploy)

- This plan committed 2 frontend commits to `turion-space-demo` main (`9066e94`, `68a7e97`) — NOT pushed. 32-04 owns the F-style pre-flight (stash the unrelated dirty ERP-demo HTML + the untracked `.superpowers/`), push, and `deploy-frontend.sh` + CloudFront invalidation.
- Deploy smoke for this plan's surface: `satellite-3d.js` 200 + `grep -c debugInfo` 0 + `grep -c frameCount` 0 + `intersectObjects(childGroups`×1; `work-order.html` 200 + `signed_by_name`×1; post-deploy `audit-satellite-buttons.mjs` should still be the same count as pre-deploy (this plan added nothing to it).
- The `instance.html` `unparseable-path` audit violation is a 32-02 concern, not this plan's — flag it to 32-04's pre-deploy gate if it's still present after 32-02 lands.

## Self-Check: PASSED

- `/Users/jeet/turion-space-demo/satellite/satellite-3d.js` — modified, parses cleanly, no `frameCount`/`debugInfo`. FOUND.
- `/Users/jeet/turion-space-demo/satellite/work-order.html` — modified, `signed_by_name` present, inline script parses. FOUND.
- Commit `9066e94` (satellite-3d.js) — FOUND in `turion-space-demo` git log.
- Commit `68a7e97` (work-order.html) — FOUND in `turion-space-demo` git log.
- `.planning/phases/32-build-procurement-process-documentation/32-03-SUMMARY.md` — FOUND.
