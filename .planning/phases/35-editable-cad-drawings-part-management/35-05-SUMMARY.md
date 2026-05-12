---
phase: 35-editable-cad-drawings-part-management
plan: 05
subsystem: turion-satellite-frontend
tags: [cad, svg-editor, frontend, part-management]
requires: ["35-04", "35-02", "35-03"]
provides:
  - "part.html: 'edit drawing' control → window.svgEditor.open(drawing_svg, {onSave→PATCH /api/parts/:id/drawing, onRevert→POST .../regenerate, onCancel}); on save/revert re-renders #cadCenter (no reload)"
  - "part.html: 'revert to generated' standalone chip + ?edit=drawing deep-link auto-open"
  - "part.html: '🚫 This part is retired' banner + Restore button + disabled editor chips when retired_at is set"
  - "instance.html: 'edit this part's drawing' chip → part.html?id=<partDefId>&edit=drawing[&sat=…]; '🚫 retired part' badge"
affects: ["35-06 (also edits part.html/parts.html/bom.html — left clear seams: renderDrawingSvg() helper, currentDrawingSvg, the editor IIFE)", "35-07 (deploy)"]
tech-stack:
  added: []
  patterns: ["no-bundler plain <script> include for svg-editor.js", "host-page wires svgEditor onSave/onRevert callbacks to satelliteApi", "addEventListener-only (zero inline onclick) — button audit stays 0"]
key-files:
  created: []
  modified:
    - /Users/jeet/turion-space-demo/satellite/part.html
    - /Users/jeet/turion-space-demo/satellite/instance.html
decisions:
  - "Edit/Revert chips positioned bottom-left of .cad-frame (CSS in part.html) to clear the existing top-right labels chip and top-left view-toggle/rotate chips"
  - "The editable SVG is the part's own drawing_svg only — a subsystem-silhouette fallback is display-only; the editor opens on currentDrawingSvg (initialised from drawing.drawing_svg, updated on save/regenerate), never on the fallback"
  - "Refactored the inline drawing-injection block into a reusable renderDrawingSvg(svgStr) that re-injects into #cadCenter — used by the initial render AND by onSave/onRevert, so no page reload is needed (mirrors part.html's existing translate/scale wrapping-<g> approach)"
  - "Retired parts: editor chips stay visible but disabled (page is read-only); part.html shows a banner + Restore, instance.html shows a 🚫 badge + disabled chip"
  - "instance.html only deep-links into the editor (the drawing belongs to the part definition, not the instance) — no editor mounted on instance.html itself"
metrics:
  duration: ~25m
  tasks: 2
  files: 2
  completed: 2026-05-12
---

# Phase 35 Plan 05: Wire the drawing editor into part.html / instance.html — Summary

The user-facing half of requirement DrawingEditor: an "edit drawing" control on `part.html`'s 2D `.cad-frame` that opens `window.svgEditor` (the modal from 35-04), saves via `PATCH /api/parts/:id/drawing` and re-renders the on-page drawing without a reload; a "revert to generated" affordance backed by `POST /api/parts/:id/drawing/regenerate`; a retired-part banner; a `?edit=drawing` deep-link; and a launch point from `instance.html`.

## What shipped

### Task 1 — `satellite/part.html` (commit `d8ea47a`)
- Added `<script src="/satellite/svg-editor.js"></script>` (after `satellite-cad.js`, before `satellite-render.js`).
- Added two `.cad-toggle` chips inside `#cadFrame`: `#editDrawingBtn` ("✎ edit drawing") and `#revertDrawingBtn` ("↻ revert to generated"), both `display:none` initially; new CSS in part.html's `<style>` positions them `bottom:10px; left:10px / left:135px` (clear of the existing top-right labels chip and the top-left view/rotate chips).
- **Refactored** the inline drawing-injection block (was lines ~367–387) into a reusable `renderDrawingSvg(svgStr)` function that strips layout attrs from the source `<svg>`, keeps the presentation attrs on a wrapping `<g transform="translate(-140,-140) scale(4.7)">`, and injects into `#cadCenter` — exactly the markup the page already produced. Added `let currentDrawingSvg = drawing.drawing_svg || null;` (the editable source; a subsystem-silhouette fallback is display-only and never offered to the editor). Initial render now calls `renderDrawingSvg(svg)`.
- **Retired banner**: `const isRetired = !!part.retired_at;` (GET /api/parts/:id surfaces `retired_at` per 35-03 — not filtered). When set, `createElement` + `textContent` build a `#retiredBanner` ("🚫 This part is retired (retired <fmtDate>).") inserted just below `#crumb`, with a `#restorePartBtn` → `confirm` → `satelliteApi.post('/api/parts/'+partId+'/restore', {})` → toast → `location.reload()`.
- **Editor wiring** (`wireDrawingEditor()` IIFE, all `addEventListener`):
  - If retired → chips shown but `disabled`; return.
  - `#editDrawingBtn` click → `openEditor()`: `ensure2DMode()` (drop `.mode-3d` if the page is in 3D so the result is visible), then `window.svgEditor.open(currentDrawingSvg || startSvg, { onSave, onRevert, onCancel })`:
    - `onSave(newSvg)` → `satelliteApi.patch('/api/parts/'+partId+'/drawing', { drawing_svg: newSvg })` → `currentDrawingSvg = newSvg` → `renderDrawingSvg(newSvg)` → `toast('Drawing saved (rev N)')`; on failure `toast(...,'error')` + rethrow.
    - `onRevert()` → `doRevert()`: `confirm` → `satelliteApi.post('/api/parts/'+partId+'/drawing/regenerate', {})` → update `currentDrawingSvg` + `renderDrawingSvg(res.drawing_svg)` → `toast('Reverted to generated drawing (rev N)')` → returns `res.drawing_svg` to the editor (so it re-loads the regenerated SVG into the canvas).
    - `onCancel` → no-op.
  - `#revertDrawingBtn` click → `doRevert()` (revert without opening the editor).
  - `?edit=drawing` deep-link → `setTimeout(openEditor, 0)` after the page is ready.
- The **3D viewer is untouched** — `mount3DViewer` re-derives from `dimensions_mm` and never parses `drawing_svg`; the 2D/3D toggle, `#viewToggle`, `#viewer3d`, `#autoRotateChk`, the Phase-31 `.cad-hud`/`#hudBack`, and the Phase-27 callouts toggle all still work.
- 4 pre-existing `onclick=` in part.html (none added); inline script (`node --check` on the extracted block) parses; `audit-satellite-buttons.mjs` → `routes:74, onclick:16, satelliteApi:70, violations:0` (the 3 new calls — PATCH `/api/parts/:id/drawing`, POST `.../drawing/regenerate`, POST `.../restore` — all resolve against the mounted `parts` router).

### Task 2 — `satellite/instance.html` (commit `d84eff9`)
- Added a `#editDrawingBtn` `.cad-toggle` chip inside `#cadFrame` ("✎ edit this part's drawing", inline-positioned bottom-left, `display:none` initially).
- After the header/breadcrumb render:
  - **Retired badge**: `if (inst.retired_at)` (GET /api/satellites/:satId/instances/:instId surfaces `pd.retired_at` per 35-03 — not filtered) → `#stageTagWrap.insertAdjacentHTML('afterbegin', '<span class="tag tag-danger" title="…">🚫 retired part</span> ')`.
  - **Editor deep-link** (`wireEditDrawingLink()` IIFE): if no `inst.part_definition_id` → bail; else show the chip; if retired → chip shown but `disabled` with an explanatory title; else `addEventListener('click', () => window.location.href = '/satellite/part.html?id='+partDefId+'&edit=drawing'+(satId?'&sat='+satId:''))`.
- Existing instance.html content untouched (the make/buy panels, the Phase-32 decision/realization card, the Phase-33 next-step CTAs, the 3D viewer, sibling instances, subtree rollup).
- 0 `onclick=` in instance.html; inline script parses; audit `violations:0`.

## Deviations from Plan

None — plan executed exactly as written. (Both commits in `turion-space-demo`, `git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar"`, named-file adds only — the repo's pre-existing dirty WIP in `about-this-demo.html` / `backend/*` / `.superpowers/` was left untouched. NOT pushed, no deploy — 35-07 owns push + Lambda redeploy + `deploy-frontend.sh` + CloudFront invalidation.)

Minor implementation notes (within the plan's "follow the plan's exact details" latitude): the Edit/Revert chips were positioned bottom-left via new CSS in part.html (the plan said "alongside the existing `.cad-frame` controls" — top-right is occupied by the labels chip, top-left by view/rotate, so bottom-left was the clean spot); the drawing-injection logic was factored into a `renderDrawingSvg()` helper rather than duplicating the inline block (the plan explicitly said "if `part.html` already has a `renderDrawing(svg)` helper, call that instead" — it didn't, so one was extracted).

## NOT done (owned by other plans)
- `git push` + `./build-and-push.sh` + `./deploy-frontend.sh` + CloudFront invalidation + curl smoke + Phase 27–34 regression — 35-07.
- The part-management UI (extended Add-BOM modal + create-part sub-form on `bom.html`, Edit-part + Retire/Restore on `part.html`, retire control on `parts.html`, delete control on `bom.html` tree rows) — 35-06. 35-06 also edits `part.html`; clear seams left: `renderDrawingSvg(svgStr)` helper, the `currentDrawingSvg` var, the `wireDrawingEditor()` IIFE, the `#retiredBanner`/`#restorePartBtn` (35-06's "Retire" control on part.html would sit in `#partActions`, separate from this banner).
- Visual/functional sign-off — deferred to the W6 headless-substitute checkpoint (per Phases 27–34); this plan's verification was the button audit + inline-script `node --check` + grep.

## Self-Check: PASSED
- `/Users/jeet/turion-space-demo/satellite/part.html` — modified; `grep "svgEditor.open\|editDrawingBtn\|revertDrawingBtn\|retiredBanner\|renderDrawingSvg\|svg-editor.js"` → FOUND
- `/Users/jeet/turion-space-demo/satellite/instance.html` — modified; `grep "edit=drawing\|editDrawingBtn\|retired part"` → FOUND
- `grep -c "onclick=" satellite/part.html` → 4 (unchanged); `satellite/instance.html` → 0 (unchanged)
- `node --check` on the extracted inline `<script>` of both pages → OK
- `node /Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs` → `violations: 0`, exit 0
- commits `d8ea47a` (part.html), `d84eff9` (instance.html) — FOUND on turion-space-demo main (`jeet-avatar <jm@techcloudpro.com>`)
