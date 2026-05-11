---
phase: 30-interactive-webgl-3d-part-viewer
plan: 02
subsystem: ui
tags: [three.js, webgl, import-map, dynamic-import, satellite-cad, part-viewer, bom-deeplink]

# Dependency graph
requires:
  - phase: 30-interactive-webgl-3d-part-viewer
    plan: 01
    provides: "satellite/satellite-3d.js — mount3DViewer(containerEl, partData, opts) → { controls, dispose() } | null; isWebGLAvailable(); chooseTemplate3D / buildPartMesh / etc."
provides:
  - "part.html — interactive Three.js viewer in .cad-frame (default 3D, WebGL permitting), 2D/3D toggle chip to the existing isometric SVG (kept as the 2D drawing / fallback), auto-rotate checkbox, ?view= query-param handling"
  - "instance.html — same viewer in the ~320px .cad-frame, 2D/3D toggle, auto-rotate; hero SVG + Phase-27 callouts kept as the 2D / fallback view"
  - "bom.html — per-row '🧊 3D' deep-link badge → part.html?id=<part_definition_id>&sat=<satId>&view=3d (SVG thumbnails / tree recursion / instHref unchanged)"
affects: [30-03-deploy]

# Tech tracking
tech-stack:
  added: []   # Three.js 0.184.0 already declared in Plan 30-01; this plan only adds the per-page <script type="importmap"> that points the consuming pages at jsDelivr
  patterns:
    - "import map in <head> (before ANY <script>, classic or module) maps bare 'three' / 'three/addons/' (trailing slash mandatory) to jsDelivr; the classic inline page script then does `await import('/satellite/satellite-3d.js')` AFTER its data fetch — no bundler/build step, no <script type=module src=...>"
    - "graceful 3D layer over an existing SVG: a `.cad-frame.mode-3d` class shows `#viewer3d` and hides `> svg.frame-svg`; the chip is only revealed when isWebGLAvailable() AND mount3DViewer returned non-null; on pagehide → handle.dispose()"
    - "cross-system deep-link from a list view: a list row links to the detail page with a `&view=3d` mode flag rather than embedding a (165-node) canvas in the list"

key-files:
  created: []
  modified:
    - /Users/jeet/turion-space-demo/satellite/part.html
    - /Users/jeet/turion-space-demo/satellite/instance.html
    - /Users/jeet/turion-space-demo/satellite/bom.html
    - /Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs   # deviation: allowlist event.stopPropagation()

key-decisions:
  - "Mount the 3D viewer ONCE when the page loads in 3D mode (not lazily on first toggle): #viewer3d is made visible (frame.classList.add('mode-3d')) BEFORE mount3DViewer so the renderer is sized from real clientWidth/clientHeight; the ResizeObserver inside mount3DViewer corrects size on any later show/hide. If mount returns null (WebGL context creation failed), the .mode-3d class is removed and no chip is shown — the SVG stays."
  - "The 2D/3D toggle keeps the viewer mounted when flipping back to 2D (just toggles the .mode-3d class) — re-mounting per toggle would re-allocate a WebGL context each time; dispose() runs once on pagehide."
  - "bom.html '3D' badge is rendered as a SIBLING <span class=row-badges><a class=badge …></span> AFTER the .row-link <a> — a nested <a>-in-<a> is invalid HTML and browsers auto-close the outer anchor. onclick=\"event.stopPropagation()\" stops the click bubbling to the <summary> (which would toggle the <details>) while still letting the <a>'s own navigation happen."
  - "instance.html passes its existing `part` object (GET /api/parts/:partDefId, fetched in the Stage-2 Promise.all) as partData — it already carries part_number / subsystem_code / default_make_buy / specifications, exactly what mount3DViewer needs; no extra fetch."
  - "Both pages: ?view=2d forces SVG-only (no chip, no mount); ?view=3d or no param → 3D-on-load when WebGL available — per the locked Phase-30 decision (default = 3D)."

requirements-completed: [ThreeJSViewer, OrbitControls, WebGLFallback]

# Metrics
duration: 4min
completed: 2026-05-11
---

# Phase 30 Plan 02: part.html / instance.html / bom.html 3D-viewer integration Summary

**Plumbed the Plan 30-01 `mount3DViewer` module into the three live satellite pages without a bundler/build step: `part.html` and `instance.html` now get a real interactive Three.js canvas inside their `.cad-frame` (default 3D when WebGL is available) with a 2D/3D toggle chip back to the existing isometric SVG (kept as the "2D drawing" / WebGL-fallback view), an auto-rotate checkbox, and `?view=` handling; `bom.html` keeps its SVG thumbnails and gains a per-row "🧊 3D" deep-link to `part.html?id=<part_definition_id>&sat=<satId>&view=3d`. Three.js 0.184.0 is resolved via a jsDelivr `<script type="importmap">` in `<head>` of each consuming page and a dynamic `await import('/satellite/satellite-3d.js')` from the existing classic inline scripts.**

## Performance
- **Duration:** ~4 min
- **Started:** 2026-05-11T20:21:12Z
- **Completed:** 2026-05-11T20:25:09Z
- **Tasks:** 3
- **Files modified:** 4 (3 satellite pages + 1 audit-script allowlist tweak — deviation)

## Accomplishments

### Task 1 — part.html
- `<head>`: added `<script type="importmap">` mapping `three` → `https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.min.js` and `three/addons/` → `https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/` — placed BEFORE `</head>` (and therefore before the `satellite-config.js` script tag and every other `<script>`). Trailing slash on the addon key preserved.
- `<style>`: `#viewer3d { width:100%; min-height:520px; display:none; position:relative; }`, `#viewer3d canvas { display:block; width:100%; height:100%; }`, `.cad-frame.mode-3d #viewer3d { display:block; }`, `.cad-frame.mode-3d > svg.frame-svg { display:none; }`, `.view-toggle { position:absolute; top:10px; left:10px; z-index:6; }`, `.rotate-chip { position:absolute; top:10px; left:140px; z-index:6; display:none; … }`, `.cad-frame.mode-3d .rotate-chip { display:inline-flex; }`. The view + rotate chips sit on the LEFT so they don't collide with `#toggleCallouts` (which is `.cad-toggle`, top-right).
- `.cad-frame`: after `#toggleCallouts`, added `<button id="viewToggle" class="cad-toggle view-toggle" style="display:none;">view: 3D</button>`, `<label class="rotate-chip"><input type="checkbox" id="autoRotateChk"> auto-rotate</label>`, `<div id="viewer3d"></div>`. The existing `<svg class="frame-svg">…<g id="cadCenter">…</svg>` is untouched.
- Inline classic `(async () => { … })()`: AFTER the SVG injection + Phase-27 `renderCalloutsOnSvg` + the labels-toggle wiring, a 3D-mount block runs: `const want3D = (r.getQueryParam('view') || '3d') !== '2d';` → if `want3D && m.isWebGLAvailable()` then `frame.classList.add('mode-3d')` (so `#viewer3d` has real dimensions), `viewerHandle = m.mount3DViewer(document.getElementById('viewer3d'), part, { autoRotate: false })`; if non-null → wire the auto-rotate checkbox to `viewerHandle.controls.autoRotate`, show the chip, wire the toggle (`set3D` flips the `.mode-3d` class — viewer stays mounted), `pagehide → viewerHandle.dispose()`; if null → `frame.classList.remove('mode-3d')` (SVG stays, no chip). Wrapped in `try/catch` (warns; SVG fallback already in place).

### Task 2 — instance.html
- Same `<head>` import map block.
- Same `<style>` rules but `#viewer3d { min-height:320px; }` (matching this page's `.cad-frame`). instance.html has no `#toggleCallouts`, so the view chip sits at `top:10px; left:10px`.
- `.cad-frame`: BEFORE the `<svg class="frame-svg">`, added the same `#viewToggle` chip + `#autoRotateChk` + `<div id="viewer3d">`. Hero `<svg>` + `<g id="cadCenter">` untouched.
- Inline classic script: AFTER the hero-CAD SVG inject `try/catch`, the same 3D-mount block — passing the already-fetched **`part`** object (`GET /api/parts/:partDefId`, from the Stage-2 `Promise.all`) as `partData`. `want3D = (r.getQueryParam('view') || '3d') !== '2d'`. `?inst=` / `?id=` handling unchanged.

### Task 3 — bom.html
- In `renderNodeClean(node)`: `const view3dHref = node.part_definition_id ? \`part.html?id=${encodeURIComponent(node.part_definition_id)}&sat=${encodeURIComponent(satId)}&view=3d\` : '';` and `const view3dBadge = view3dHref ? \`<a class="badge" href="${view3dHref}" title="Open … in interactive 3D" onclick="event.stopPropagation();">🧊 3D</a>\` : '';`
- The `view3dBadge` is appended as a SIBLING after the `.row-link` `<a>`: `…</a><span class="row-badges">${view3dBadge}</span>` — NOT inside the row-link anchor (nested `<a>` is invalid HTML). `event.stopPropagation()` keeps a click on the 3D badge from bubbling to the `<summary>` and toggling the `<details>`.
- Falsy `part_definition_id` → no badge emitted (no `part.html?id=undefined`). SVG thumbnails (`PLACEHOLDER_SVG`, `row-thumb`), tree recursion, `?sat=` handling, and `instHref` are all unchanged.

## Task Commits

| Task | Commit (`github.com/jeet-avatar/turion-space-demo`, `main`) | Type |
|---|---|---|
| 1 — part.html (import map + #viewer3d + 2D/3D toggle + auto-rotate + ?view=) | `d54d673` | feat |
| 2 — instance.html (import map + #viewer3d ~320px + 2D/3D toggle + auto-rotate) | `281e253` | feat |
| 3 — bom.html (per-row "🧊 3D" deep-link in renderNodeClean) | `c5ff68c` | feat |

Plus, in `github.com/jeet-avatar/turion-satellite`, `main`:

| Deviation | Commit | Type |
|---|---|---|
| Allowlist `event.stopPropagation()` in `backend/scripts/audit-satellite-buttons.mjs` | `b36691a` | chore |

**Plan metadata:** committed in `doordash-p2p` (this SUMMARY + STATE/ROADMAP/REQUIREMENTS).

## Files Modified
- `/Users/jeet/turion-space-demo/satellite/part.html` (+63 lines) — import map in `<head>`, `#viewer3d` + `#viewToggle` + `#autoRotateChk` in `.cad-frame`, `.cad-frame.mode-3d` CSS, dynamic-import 3D-mount block in the inline script.
- `/Users/jeet/turion-space-demo/satellite/instance.html` (+64 lines) — same, with `min-height:320px` and `part` (the GET /api/parts/:partDefId object) as `partData`.
- `/Users/jeet/turion-space-demo/satellite/bom.html` (+12 / −1 lines) — per-row "🧊 3D" deep-link badge in `renderNodeClean`.
- `/Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs` (+1 line) — deviation; allowlist `event.stopPropagation()`.

## Verification
- `grep -c 'type="importmap"' part.html` → `1`; `grep -n` confirms it precedes `</head>` (line 10) and the `satellite-config.js` `<script>` (line 225). Same for `instance.html` (importmap line 10, `</head>` 100, config 202).
- `grep -c 'cdn.jsdelivr.net/npm/three@0.184.0'` → `2` on each (the `three` mapping + the `three/addons/` mapping).
- `grep -c 'satellite-3d.js'` → `2` on each; `grep -c 'viewer3d'` → `6` on each; `grep -c 'mode-3d'` → `7` on each; `grep -c 'mount3DViewer'` / `'isWebGLAvailable'` / `'autoRotate'` / `"getQueryParam('view')"` all ≥ 1; `grep -c 'frame-svg'` → `3` (SVG kept); `part.html`: `grep -c 'renderCalloutsOnSvg'` → `3` (Phase-27 callouts intact); `instance.html`: `grep -c "getQueryParam('inst')"` → `1` (unchanged), placeholder `/* the part-def object */` → `0`.
- `bom.html`: `grep -c 'view=3d'` → `1`; `grep -c 'part.html?id='` → `2`; `grep -c 'part_definition_id'` → `3`; `grep -c 'event.stopPropagation'` → `2`; `grep -c 'instance.html?inst='` → `1` (unchanged); `row-thumb` / `PLACEHOLDER_SVG` / `drawing_svg` → `7` (thumbnails untouched).
- All three pages' inline `<script>` bodies extracted (Python regex, stripping `<script src=…>` tags) → `node --check /tmp/_part.html.js` / `_instance.html.js` / `_bom.html.js` all PASS (the `await import()` is top-level-await inside an async IIFE, syntactically fine).
- `cd /Users/jeet/turion-satellite/backend && node scripts/audit-satellite-buttons.mjs` → `routes: 61 · onclick handlers scanned: 16 · satelliteApi calls scanned: 57 · violations: 0` (exit 0).
- `/bom/tree` exposes `part_definition_id` — confirmed in `turion-satellite/backend/src/routes/bom.ts` (interface line 47; roots `SELECT pi.part_definition_id` line 75; children `SELECT c_pi.part_definition_id` line 104).
- Visual confirmation of the rendered viewer on the live pages is deferred to Plan 30-03's human-verify checkpoint (this execution environment is headless / no browser/WebGL). The wiring was verified statically: importmap precedes all scripts, the dynamic `import()` resolves the bare `'three'` specifier via the page's import map, `mount3DViewer` is called with a real `partData` after the data fetch, and the SVG fallback path is intact (the SVG is only hidden via `.cad-frame.mode-3d`, never deleted).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `onclick="event.stopPropagation()"` tripped the Phase-29 button audit's "dead-onclick" check**
- **Found during:** Task 3 (running the post-task `audit-satellite-buttons.mjs` verification).
- **Issue:** `backend/scripts/audit-satellite-buttons.mjs` allowlists `event.preventDefault()` but not `event.stopPropagation()`, so the new bom.html 3D-badge `onclick="event.stopPropagation()"` was reported as 1 violation (exit 1) — and the plan's `<verify>` requires the audit to report 0 violations.
- **Fix:** Added `/^event\.stopPropagation\(\s*\)$/` to `ONCLICK_BUILTIN_PATTERNS` (same class of safe, no-arg built-in handler as the already-allowlisted `event.preventDefault()`). Re-ran the audit → 0 violations.
- **Files modified:** `/Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs`
- **Commit:** `b36691a` (`turion-satellite`, `main`)

### Minor notes (no code change required)
- **Mount-once vs. lazy-mount:** the plan's example pseudo-code mounted the viewer lazily on first 3D-toggle. I instead mount once at page load (when in 3D mode) AFTER setting `.mode-3d` so `#viewer3d` has real dimensions, and `set3D` thereafter only flips the class (the viewer's `ResizeObserver` handles any later show/hide; `dispose()` still runs once on `pagehide`). Behaviour identical for the user; slightly cleaner lifecycle.
- **bom.html 3D badge placement:** the plan suggested appending the `<a class="badge">` into the `badges` array, but `badges` is rendered inside `<a class="row-link">…<span class="row-badges">${badges}</span></a>` — an `<a>` inside an `<a>` is invalid HTML (browsers auto-close the outer anchor). I render the 3D badge as a sibling `<span class="row-badges"><a class="badge">…</a></span>` AFTER the `.row-link` anchor instead; the `.tree-summary`/`.tree-leaf-row` flex row keeps it on the same line at the end. `event.stopPropagation()` (as the plan asked) prevents the `<summary>` toggle on click.
- **instance.html part-def variable name:** it's `part` (`const … = window.satelliteApi.get(\`/api/parts/${inst.part_definition_id}\`)` in the Stage-2 `Promise.all`); the plan's `/* the part-def object */` placeholder was replaced with `part`.

## Authentication Gates
None.

## Issues Encountered
None beyond the audit-allowlist deviation above.

## Next Phase Readiness
- Plan 30-03 owns deploy + the human visual-verify checkpoint (`/satellite/3d-test.html`, `part.html?...&view=3d`, `instance.html?...&view=3d`, `bom.html?sat=...` → "🧊 3D" badge → 3D-mode part page). NOT deployed by this plan.
- Reminder for 30-03: `turion-space-demo/deploy-frontend.sh` does `aws s3 sync . --delete` — run the Phase-29 F6 pre-flight (stash the unrelated dirty ERP-demo HTML + `mv` aside `.superpowers/`) before that deploy. The repo currently has unrelated dirty files (`about-this-demo.html`, `agent-sales-cash.html`, `backend/dist/*`, `dashboard-cio.html`, `backend/node_modules/.package-lock.json`, untracked `.superpowers/`) — leave those for the 30-03 pre-flight to handle.

---
*Phase: 30-interactive-webgl-3d-part-viewer*
*Completed: 2026-05-11*

## Self-Check: PASSED

- FOUND: /Users/jeet/turion-space-demo/satellite/part.html
- FOUND: /Users/jeet/turion-space-demo/satellite/instance.html
- FOUND: /Users/jeet/turion-space-demo/satellite/bom.html
- FOUND: /Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs
- FOUND: /Users/jeet/doordash-p2p/.planning/phases/30-interactive-webgl-3d-part-viewer/30-02-SUMMARY.md
- FOUND commit: d54d673 (Task 1 — part.html)
- FOUND commit: 281e253 (Task 2 — instance.html)
- FOUND commit: c5ff68c (Task 3 — bom.html)
- FOUND commit: b36691a (deviation — turion-satellite audit allowlist)
