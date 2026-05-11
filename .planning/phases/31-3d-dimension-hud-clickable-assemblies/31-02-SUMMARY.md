---
phase: 31-3d-dimension-hud-clickable-assemblies
plan: 02
subsystem: ui
tags: [threejs, webgl, raycaster, orbitcontrols, turion-space-demo, esm, vanilla-js]

# Dependency graph
requires:
  - phase: 30-interactive-webgl-3d-part-viewer
    provides: "mount3DViewer / buildPartMesh in satellite/satellite-3d.js (renderer + scene + camera + OrbitControls + RAF + ResizeObserver + dispose scaffolding); 8-family chooseTemplate3D dispatch; paletteFor3D"
  - phase: 31-3d-dimension-hud-clickable-assemblies (plan 01)
    provides: "GET /api/parts/:partDefId/children now returns each child's specifications JSONB inline — so the child rows passed to opts.assemblyChildren carry dimensions_mm/material for buildPartMesh"
provides:
  - "mount3DViewer extended with opts.assemblyChildren (non-empty array → renders N child meshes on a self-scaling radial ring instead of the single mesh) + opts.onSelect(childData)/opts.onSelect(null) (+ optional opts.onDeselect)"
  - "layoutAssemblyChildren(children) → { ringRoot, childGroups } — a named, swappable ring-layout helper exported from satellite-3d.js"
  - "THREE.Raycaster picker on renderer.domElement (pointermove/pointerleave/pointerdown/click) using canvas-getBoundingClientRect()-relative NDC, recursive intersectObjects(childGroups, true), hover = emissive save/restore using the child's subsystem palette accent"
  - "Camera fly-to on select: Vector3.lerp in the existing RAF loop with controls.enabled=false during the tween (restored on convergence); viewerHandle.deselect() flies back to the whole-ring framing"
  - "viewerHandle gains deselect() + selectChild(grp) keys (no-ops on the leaf path); dispose() now also removes the pointer listeners + resets the canvas cursor on the assembly path"
affects: [31-03-dimension-hud-and-clickable-assemblies-pages, 31-04-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Branch an existing reusable viewer on an opts flag (isAssembly) — keep the prior path byte-identical inside an `if (!isAssembly)` block; hoist shared bindings (controls, safeR) to function-scoped `let`"
    - "Raycaster picking with canvas-rect-relative NDC (never window.innerWidth/innerHeight; recompute getBoundingClientRect per event, never cache)"
    - "Camera tween via Vector3.lerp in the RAF loop with controls.enabled=false (no tween library); .copy() the exact target at convergence to kill the snap-back"
    - "Hover highlight via emissive save/restore (m.userData._emSaved = {emissive.clone(), emissiveIntensity}); no OutlinePass/EffectComposer/EdgesGeometry"

key-files:
  created: []
  modified:
    - /Users/jeet/turion-space-demo/satellite/satellite-3d.js
    - /Users/jeet/turion-space-demo/satellite/3d-test.html

key-decisions:
  - "No parent envelope box in the assembly viewer (locked decision #2) — the ring of children IS the assembly; the parent name lives in the page-owned HUD (Plan 31-03)"
  - "Per-child uniform normalization (~0.9-unit cube) rather than parent-proportional scaling — a 1.6mm PCB next to a 160mm panel must stay clickable; real mm are carried to the HUD"
  - "layoutAssemblyChildren is a named export (not inlined) so the ring↔grid layout is swappable later; ring radius self-scales with N (max 2.2..6) so children don't overlap"
  - "Page-owned 'back to assembly' button — module only exposes viewerHandle.deselect(); symmetry with the HUD being page-owned"
  - "Use `click` (with a 4px drag-vs-click guard via pointerdown) so an orbit-drag that ends elsewhere never fires a select; OrbitControls' own pointerdown coexists fine"
  - "Did NOT push — Plan 31-04 owns the push + deploy-frontend.sh"

patterns-established:
  - "isAssembly branch: leaf single-mesh block moved verbatim into `if (!isAssembly)` (logic byte-identical, only re-indented; `const safeR/controls` → function-scoped `let`); assembly block builds the ring + picker + tween in the `else`"
  - "intersectObjects(childGroups, true) (recursive) is mandatory — buildPartMesh returns a THREE.Group of meshes; map a deep mesh hit back to its top-level child group via hit.object.userData.childGroup (set on every descendant via g.traverse)"
  - "dispose(): cancelAnimationFrame + ro.disconnect + controls.dispose, then (assembly only) removeEventListener pointermove/pointerleave/pointerdown/click + style.cursor='', then the existing scene.traverse geometry/material/texture disposal (covers the N child groups since they're in the scene graph), then renderer.dispose/forceContextLoss/canvas removal — all unchanged"

requirements-completed: [AssemblyMultiMesh, RaycastPicker]

# Metrics
duration: 18min
completed: 2026-05-11
---

# Phase 31 Plan 02: Multi-Mesh Assembly Viewer Summary

**`mount3DViewer` now renders assembly parts as N clickable child meshes on a self-scaling radial ring (one `buildPartMesh` per BOM child, each independently ~0.9-unit-normalized), with a `THREE.Raycaster` picker on canvas-rect-relative NDC, emissive hover highlight, a `Vector3.lerp` camera fly-to on select, `opts.onSelect(childData)`/`opts.onSelect(null)` callbacks, and a `viewerHandle.deselect()` — the leaf single-mesh path and all other exports are byte-identical.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-05-11
- **Completed:** 2026-05-11
- **Tasks:** 2/2
- **Files modified:** 2 (`satellite/satellite-3d.js`, `satellite/3d-test.html`)

## Accomplishments

- **`layoutAssemblyChildren(children) → { ringRoot, childGroups }`** — new named export near `buildPartMesh`. For each child row: `buildPartMesh(cd)` (returns a `THREE.Group`), independently scale to `childUnit` (~0.9, shrinks when N>10), recenter on own origin, place at `theta = (i/N)·2π` on a ring of radius `Math.max(2.2, Math.min(6, childUnit·N/π))` (N===1 → centered), `g.lookAt(0, y, 0)` (cosmetic), tag `g.userData.childData = cd` + `g.traverse(o => o.userData.childGroup = g)`, push to `childGroups`. No parent envelope box.
- **`mount3DViewer` assembly branch** — `const isAssembly = Array.isArray(opts.assemblyChildren) && opts.assemblyChildren.length > 0`. When false, the EXACT Phase-30 single-mesh block runs (moved verbatim into `if (!isAssembly)`). When true: `layoutAssemblyChildren` → `scene.add(ringRoot)`, widened `GridHelper(12, 24, …)` floor, camera framed off `ringRoot`'s bounding sphere (`camera.position.set(0.8·dist, 0.55·dist, dist)`), `controls.minDistance = safeR·0.4`, `initialCamPos`/`initialTarget` cached.
- **Raycaster picker (RESEARCH Pattern 3)** — `THREE.Raycaster` + `THREE.Vector2`; `ndc(ev)` recomputes `renderer.domElement.getBoundingClientRect()` every call (never cached, never `window.innerWidth/innerHeight`); `pickGroup()` does `intersectObjects(childGroups, true)` and returns `hits[0].object.userData.childGroup`. `setEmissive(group, on)` traverses the group, saves `{emissive.clone(), emissiveIntensity}` to `m.userData._emSaved` on first hover (skips materials with no `emissive` prop), sets `emissive` to `paletteFor3D(childData.subsystem_code).accent` + `emissiveIntensity = 0.5`, restores on un-hover. Cursor toggles `'pointer'` ⇄ `'grab'`.
- **Pointer handlers on `renderer.domElement`** — `pointermove` (re-pick, swap hover highlight, skip the selected group so it stays lit), `pointerleave` (un-light hover unless it's the selected group, reset cursor), `pointerdown` (record `{x,y}` for the drag guard), `click` (ignore if pointer moved >4px since pointerdown → it was an orbit drag; else pick → `selectChild(grp)` or `deselect()`).
- **Select / deselect + camera tween (RESEARCH Pattern 4)** — `selectChild(grp)`: keep it lit, compute world position + bounding-sphere frame distance (`d = r/sin(fov/2)·1.6`), approach from the camera's current direction (`dir = camera.position - controls.target`), set `tween = { camTo, tgtTo }`, `controls.enabled = false`, fire `opts.onSelect(grp.userData.childData)`. `deselect()`: un-light, `tween = { camTo: initialCamPos, tgtTo: initialTarget }`, `controls.enabled = false`, reset cursor, fire `opts.onSelect(null)` (+ `opts.onDeselect()` if provided). In `tick()`: when `tween` is active, `camera.position.lerp(tween.camTo, 0.12)` + `controls.target.lerp(tween.tgtTo, 0.12)`, skip `controls.update()` that frame; on convergence (`distanceTo < 0.01` both) `.copy()` the exact targets, `tween = null`, `controls.enabled = true`.
- **Return value** — always `{ controls, deselect(), selectChild(grp), dispose() }` (leaf `deselect`/`selectChild` are no-ops, so callers can wire a "back to assembly" button unconditionally). `dispose()` adds, on the assembly path only: `removeEventListener` for `pointermove`/`pointerleave`/`pointerdown`/`click` + `style.cursor = ''`, before the existing (unchanged) `scene.traverse` geometry/material/texture disposal (which already covers the N child groups) + `renderer.dispose`/`forceContextLoss`/canvas removal.
- **`3d-test.html`** — added a 10th demo cell exercising the assembly path: `mount3DViewer(el, EPS-ASSY part, { assemblyChildren: [5 hardcoded child rows], onSelect: cd => console.log + toggle a "↩ back" button })` wired to `handle.deselect()`. The existing 9 family cells are untouched.

## Verification

- **Temp-stripped `node --check`** on `satellite-3d.js` (top two `import` lines removed → `/tmp/s3d-check.js`) → exit 0 (clean — no syntax errors in the new code). Same for the `3d-test.html` `<script type="module">` block (with the `import` line stubbed) → exit 0.
- `grep -c "assemblyChildren" satellite-3d.js` → 5 (≥2 ✓); `grep -c "getBoundingClientRect" satellite-3d.js` → 1 (≥1 ✓); `grep -c "window.innerWidth\|window.innerHeight" satellite-3d.js` → 0 ✓
- `grep -c "intersectObjects(childGroups, true)" satellite-3d.js` → 1 (≥1 ✓); `grep -c "removeEventListener" satellite-3d.js` → 4 (≥3 ✓); `grep -c "deselect" satellite-3d.js` → 9 (≥2 ✓); `grep -c "layoutAssemblyChildren" satellite-3d.js` → 4
- `grep -c "@tweenjs\|tween.js\|gsap\|OutlinePass\|EffectComposer\|EdgesGeometry" satellite-3d.js` → 0 ✓ (no tween lib / no post-FX); Three.js stays `0.184.0` via the existing importmap — no new bare specifiers.
- `git diff` shows the leaf single-mesh logic byte-identical (only re-indented inside `if (!isAssembly)`; `const safeR/controls` → function-scoped `let`); `chooseTemplate3D`/`normalizeDims`/`perturbForPartNumber`/`paletteFor3D`/`materialFor`/`isWebGLAvailable`/`buildPartMesh` function bodies — zero diff lines touch them.
- `git -C /Users/jeet/turion-space-demo show --stat HEAD` → only `satellite/satellite-3d.js` + `satellite/3d-test.html` (no ERP HTML, no `backend/*`, no `.superpowers/`). `git log -1 --format='%an <%ae>'` → `jeet-avatar <jm@techcloudpro.com>`. `git log origin/main..HEAD --oneline` → the one commit `7b92727` is local-only (not pushed — Plan 31-04 owns the push + deploy).

## Deviations from Plan

### Minor deviations (within plan latitude)

**1. [Plan latitude] `layoutAssemblyChildren` exported (not just module-local)**
- **Found during:** Task 1
- **Issue:** The plan said "define it near `buildPartMesh`, keep it as a named function" but didn't say whether to `export` it.
- **Resolution:** Made it an `export function` (consistent with the other 7 helpers in the file being exported). Harmless; lets Plan 31-03 unit-test the ring layout in isolation if useful.
- **Files modified:** `satellite/satellite-3d.js`
- **Commit:** `7b92727`

**2. [Plan latitude] Added a 10th cell to `3d-test.html`**
- **Found during:** Task 1 (the plan marked this "Optional (not required)")
- **Resolution:** Added one assembly demo cell (EPS-ASSY with 5 hardcoded children + a "↩ back" button wired to `handle.deselect()`); the existing 9 family cells are untouched.
- **Files modified:** `satellite/3d-test.html`
- **Commit:** `7b92727`

**3. [Plan latitude] `viewerHandle` also exposes `selectChild(grp)` + `opts.onDeselect` is honored**
- **Found during:** Task 1
- **Issue:** The plan's must-haves only required `deselect()` + `onSelect`. The execution-context note mentioned `opts.onSelect(null)` *or* a separate `onDeselect`.
- **Resolution:** Kept `opts.onSelect(null)` as the primary signal (per the must-haves) and *additionally* fire `opts.onDeselect()` if the caller passes one; also exposed a `selectChild(grp)` handle key (no-op on the leaf path) for symmetry. Neither changes the required behavior.
- **Files modified:** `satellite/satellite-3d.js`
- **Commit:** `7b92727`

No bugs or blocking issues encountered; no auth gates; no architectural changes.

## Deferred Issues

None.

## Notes for Plan 31-03 (the pages)

- Pass the `/api/parts/:partDefId/children?sat=` rows (now carrying `specifications` from Plan 31-01) directly as `opts.assemblyChildren` — `buildPartMesh` reads only `part_number` + `subsystem_code` + `specifications`, so the rows being missing `default_make_buy` is fine.
- Wire a page-owned `<button>` in `.cad-frame` (hidden by default) → `onclick = () => viewerHandle.deselect()`; in `opts.onSelect`, `cd ? showBackButton() & updateHud(cd) : hideBackButton() & updateHud(parentPart)`.
- Leaf parts (children fetch returns `[]`) → pass no `assemblyChildren` (or an empty array) → identical Phase-30 single-mesh viewer.
- The handle is always `{ controls, deselect, selectChild, dispose }` — `deselect`/`selectChild` are no-ops on leaf parts, so the back-button wiring can be unconditional.

## Self-Check: PASSED

- FOUND: `.planning/phases/31-3d-dimension-hud-clickable-assemblies/31-02-SUMMARY.md`
- FOUND: `/Users/jeet/turion-space-demo/satellite/satellite-3d.js` (+ `satellite/3d-test.html`)
- FOUND: commit `7b92727` (`feat(31-02): multi-mesh assembly viewer …`) on `turion-space-demo` main, authored `jeet-avatar <jm@techcloudpro.com>`, local-only
