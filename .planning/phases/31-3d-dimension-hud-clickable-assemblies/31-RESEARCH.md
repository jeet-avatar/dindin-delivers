# Phase 31: 3D Dimension HUD + Clickable Multi-Mesh Assemblies - Research

**Researched:** 2026-05-11
**Domain:** Three.js 0.184.0 (browser, no bundler) — DOM overlay HUD, `THREE.Raycaster` object picking, multi-mesh scene layout; one small Express/pg backend SELECT change + Lambda redeploy
**Confidence:** HIGH (the entire Phase-30 surface, the `/children` route, the test file, the spec-keys convention, the page wiring, and the deploy scripts were all read directly; only the camera-tween easing helper is a design choice with no single canonical source)

---

## User Constraints

No `CONTEXT.md` exists for Phase 31 (`/gsd:discuss-phase 31` was not run). There are therefore no locked decisions to copy verbatim. The ROADMAP §"Phase 31" entry is the authoritative scope statement and is treated as the constraint set below.

### From ROADMAP §Phase 31 (the constraint)

> **Goal:** Enhance the Phase-30 Three.js viewer so it conveys part SIZE and lets you inspect assembly internals.
> (1) A dimension HUD overlay on the `.cad-frame` canvas, always visible, showing the current part's `L × W × H mm` + mass + material from `specifications` (the mesh is normalized to fit the viewport, so the textual dims are how size is communicated).
> (2) Assembly parts (those with ≥1 BOM child on a satellite) render as MULTIPLE meshes — one per BOM child built via the existing `buildPartMesh`, laid out in 3D (radial ring or grid sized by child count), each pickable via `THREE.Raycaster` + pointer events (hover → highlight outline, click → select + camera-frame it); selecting a child updates the HUD to that child's dimensions and shows its part number / ref designator. Leaf parts keep the single-mesh path.
> Small backend change: add `specifications` (or `dimensions_mm`) to the `GET /api/parts/:partDefId/children` SELECT so the viewer has each child's real dimensions (needs a Lambda redeploy via build-and-push.sh).
> Frontend changes in `satellite/satellite-3d.js` (new `mountAssemblyViewer` or an `assemblyChildren` opt on `mount3DViewer`, raycaster picker, HUD render helper) + `part.html` + `instance.html` (HUD overlay div in `.cad-frame`, fetch `/api/parts/:id/children?sat=` when present, wire `onSelect`). The static SVG 2D fallback + 2D/3D toggle from Phase 30 stay.

### Out of scope (explicit, from the prompt's §F)

- **No DB migration.** The `specifications` JSONB column already exists on `part_definitions` (migration `009_add_specifications_to_parts.sql`, Phase 25-01, `DEFAULT '{}'::jsonb`). `dimensions_mm` lives inside it.
- **No new frontend page.** Changes are confined to `satellite-3d.js`, `part.html`, `instance.html`.
- **No change to the Phase-30 single-mesh path** for leaf parts.
- **No change to `bom.html`** (the "🧊 3D" deep-link badge from Phase 30 stays as-is).
- The Phase-30 2D-SVG fallback, the `?view=2d`/`?view=3d` handling, the `.cad-frame.mode-3d` toggle, the `#autoRotateChk` checkbox, and `3d-test.html` all stay untouched (except `3d-test.html` MAY gain one extra cell demonstrating the assembly path — optional).

---

## Summary

Phase 30 shipped `satellite/satellite-3d.js`, a 438-line ES module loaded via dynamic `import('/satellite/satellite-3d.js')` from the classic inline scripts on `part.html`/`instance.html`. Its public entry point is **`mount3DViewer(containerEl, partData, opts = {}) → { controls, dispose() } | null`** — it builds a `THREE.Scene`/`PerspectiveCamera(45)`/`WebGLRenderer({antialias,alpha})`, 3-point lighting, a `GridHelper` floor, `OrbitControls(enableDamping)`, a `requestAnimationFrame` loop, and a `ResizeObserver`; it calls `buildPartMesh(partData)` (which returns a **`THREE.Group`** of primitives — never a bare `Mesh`), normalizes that group to a ~2-unit cube via `Box3 → scale.multiplyScalar(2/maxDim)`, recenters it on the origin, and frames the camera off the group's bounding sphere (`dist = r / sin(fov/2)`, camera at `(0.8d, 0.6d, d)`). `dispose()` does `cancelAnimationFrame` + `ResizeObserver.disconnect` + `controls.dispose` + a `scene.traverse` disposing geometries/materials/textures + `renderer.dispose`/`forceContextLoss` + canvas removal. `buildPartMesh` is exported and pure — it dispatches on `chooseTemplate3D(partData.part_number)` (a byte-for-byte port of the Phase-27 8-family regex table) and only reads `partData.part_number`, `partData.subsystem_code`, and `partData.specifications` (`dimensions_mm` + `material`). It does **NOT** read `default_make_buy`, so child rows that lack it are fine.

The two changes are: **(1) a DOM dimension HUD** — a plain `<div>` child of `.cad-frame` (NOT a `THREE.Sprite` — text must stay crisp/selectable), absolutely positioned bottom-left, styled with the existing CSS custom-properties (`--text-1/2/3`, `--bg-2/3`, `--border`, `Fira Code`), updated by a small page-side `updateHud(partOrChild)` function from `specifications.dimensions_mm`/`weight_grams`/`material`; and **(2) the multi-mesh assembly path** — extend `mount3DViewer` with an `opts.assemblyChildren` array (childData objects) and an `opts.onSelect(childData)` callback. When `assemblyChildren` is present and non-empty, instead of one normalized mesh the viewer builds N meshes via `buildPartMesh(childData)`, lays them out on a radial ring (children at evenly-spaced angles, ring radius scaled by N, each child mesh independently normalized to a small uniform size), wires a `THREE.Raycaster` + `pointermove` (hover → emissive boost on the hovered child group, restore on pointer-out) + `pointerdown`/`click` (select → highlight + camera-tween + `opts.onSelect(childData)`), and adds a "back to whole assembly" affordance to deselect. The HUD lives in the page, not the module — the module just calls `opts.onSelect`, and `part.html`/`instance.html` call `updateHud()` from there.

The backend change is **adding `c_pd.specifications AS specifications` (one line) to the `SELECT` in `GET /api/parts/:partDefId/children`** in `turion-satellite/backend/src/routes/parts.ts` (line ~300-310), keeping the existing Vitest cases in `backend/tests/parts.test.ts` green (they assert `part_number`/`drawing_svg`/`subsystem_code` and `capturedParams === ['pd-parent-1','sat-uuid-1']` — adding a column to the returned mock rows + a `specifications` assertion is the only test edit needed), then redeploying via `cd /Users/jeet/turion-satellite && ./build-and-push.sh` (ECR + Lambda `turion-satellite-api` arm64 — the same path Phase 28's `/bom/tree` route already used; adding a column is low-risk).

**Primary recommendation:** Extend (don't fork) `mount3DViewer` with `opts.assemblyChildren` + `opts.onSelect`; render the DOM HUD as a `.cad-frame` child driven by a page-side `updateHud()`; add one column to the `/children` SELECT; layout the N child meshes on a radial ring with per-child uniform normalization; pick with `THREE.Raycaster` + `pointermove`/`click` using **canvas-rect-relative NDC** (not `window.innerWidth/innerHeight`); disable `controls` during the camera tween; restore hover emissive on pointer-out; in `dispose()` also remove the pointer listeners and dispose the N child groups.

---

<phase_requirements>
## Phase Requirements

No phase-requirement IDs were supplied by the orchestrator (the ROADMAP entry is prose, not a `REQUIREMENTS.md` ID list). The functional requirements distilled from the ROADMAP §Phase 31 entry, for the planner to map to plans:

| Req | Description | Research Support |
|-----|-------------|-----------------|
| HUD-01 | Always-visible DOM dimension HUD on `.cad-frame` showing `L × W × H mm` + mass + material from `specifications` | §"Dimension HUD" — mount as a `.cad-frame` child `<div>`, CSS uses existing custom-props; `normalizeDims`-like reading of `dimensions_mm` (object `{length,width,height}` OR array `[L,W,H]`), `weight_grams`, `material` |
| HUD-02 | HUD updates to the selected child's dims/part-number/ref-designator on select; "back to assembly" resets it | §"Multi-mesh assemblies" picking → `opts.onSelect(childData)` → page-side `updateHud(childData)`; deselect → `updateHud(part)` |
| ASM-01 | Parts with ≥1 BOM child *on the current satellite* render as N meshes (one per child via `buildPartMesh`) instead of a single mesh | §"Multi-mesh assemblies" + `opts.assemblyChildren`; "assembly" defined as `/children?sat=<satId>` returning rows (NOT `chooseTemplate3D`'s `assembly` family — that's just a regex on `-ASSY`) |
| ASM-02 | N child meshes laid out in 3D (radial ring sized by child count); the parent box is either a faint wireframe envelope or not rendered | §"Architecture Patterns → Pattern 2: Radial-ring layout" |
| ASM-03 | Each child mesh pickable: hover → highlight outline/emissive boost; click → select + camera-frame the child | §"Pattern 3: Raycaster picking", §"Pattern 4: camera tween"; canvas-rect-relative NDC |
| BE-01 | `GET /api/parts/:partDefId/children?sat=` returns each child's `specifications` (so the viewer has real `dimensions_mm`) | §"Backend change" — add `c_pd.specifications AS specifications` to the SELECT; update `parts.test.ts` mock rows + add an assertion; `./build-and-push.sh` redeploy |
| INT-01 | `part.html` + `instance.html`: HUD `<div>` in `.cad-frame`, fetch `/children?sat=` when `?sat=` present, pass `assemblyChildren`+`onSelect` to `mount3DViewer` | §"Integration points" |
| KEEP-01 | Phase-30 single-mesh leaf path, 2D-SVG fallback, `?view=` handling, `.mode-3d` toggle, `#autoRotateChk` all unchanged | §"Anti-patterns to avoid" + §"Don't Hand-Roll" |
</phase_requirements>

---

## Current Phase-30 Viewer Surface (the thing we're extending)

**File:** `/Users/jeet/turion-space-demo/satellite/satellite-3d.js` (438 lines, ES module). Loaded via `<script type="importmap">` (in `<head>` of both pages, mapping `three` → `https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.min.js` and `three/addons/` → `https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/`) + a dynamic `await import('/satellite/satellite-3d.js')` from the classic inline scripts. No bundler, no `node --check` (the bare `import 'three'` fails Node — that's expected).

### Exports (8)

| Export | Signature | What it does / what to know |
|---|---|---|
| `isWebGLAvailable()` | `() → boolean` | `document.createElement('canvas').getContext('webgl')` probe. Callers keep the SVG when false. **Unchanged in Phase 31.** |
| `chooseTemplate3D(partNumber)` | `(string) → 'fastener'\|'assembly'\|'cylindrical'\|'solar'\|'lens'\|'antenna'\|'plate'\|'subassembly'` | Byte-identical port of the Phase-27 regex table. **Note:** the `'assembly'` family here means `/^[A-Z]+-ASSY$/` on the *part number string* — it is NOT "has BOM children". The Phase-31 "is this an assembly?" question is answered by `/children?sat=` returning rows, not by this. **Unchanged.** |
| `normalizeDims(spec)` | `(specifications) → {L,W,H}` | Handles `dimensions_mm` as `{length,width,height}` OR `[L,W,H]`; missing/0/NaN → `40`. **Reuse this for the HUD's fallback display logic** (but the HUD should show the *raw* mm values, not the 40-default — show "—" when truly missing). |
| `perturbForPartNumber(pn, base)` | `(string, number) → number` | djb2 `±3` deterministic offset. Internal to `buildPartMesh`. **Unchanged.** |
| `paletteFor3D(code)` | `(subsystemCode) → {base,accent,metal,rough}` | 8-subsystem palette, STR fallback. Used for the hover-highlight accent color (highlight with the child's `paletteFor3D(child.subsystem_code).accent` emissive). |
| `materialFor(partData)` | `(partData) → MeshStandardMaterial` | Color from subsystem palette, metalness/roughness nudged by `specifications.material` substring. **Reads only `subsystem_code` + `specifications.material`.** |
| `buildPartMesh(partData)` | `(partData) → THREE.Group` | **Returns a `THREE.Group`** (8 family builders, each adding ≥1 `Mesh` to the group). Reads `partData.part_number` (→ `chooseTemplate3D`), `partData.subsystem_code` (→ palette), `partData.specifications.dimensions_mm` (→ `normalizeDims`), `partData.specifications.material` (→ `materialFor`). **Does NOT read `default_make_buy`.** Never produces a 0×0×0 group (every dim `Math.max`-clamped). Some families build several meshes (e.g. `subassembly` = box + 2 LED spheres + connector pad; `lens` = 3 discs + aperture + accent ring) — picking must therefore raycast the **group**, not a single mesh, and `intersectObjects([...childGroups], true)` (recursive) is required; map the hit back to its top-level child group via `object.parent` walk or by tagging `group.userData.childData`. |
| `mount3DViewer(containerEl, partData, opts={})` | `(HTMLElement, partData, {autoRotate?:boolean}) → {controls: OrbitControls, dispose():void} \| null` | The entry point. **This is what Phase 31 extends.** |

### `mount3DViewer` internals (line 340-438) — the parts Phase 31 touches

- **Sizing:** `w = max(1, containerEl.clientWidth)`, `h = max(1, containerEl.clientHeight || 520)`. `renderer.setPixelRatio(min(devicePixelRatio,2))`, `setSize(w,h,false)`, `outputColorSpace = SRGBColorSpace`. `containerEl.appendChild(renderer.domElement)` — so the `<canvas>` is a child of `#viewer3d` (which is a child of `.cad-frame`).
- **Scene:** `scene.background = new THREE.Color(0x050811)` (matches `.cad-frame`). `PerspectiveCamera(45, w/h, 0.01, 1000)`.
- **Lights:** key `DirectionalLight(0xffffff,1.6)@(3,4,5)`, fill `(0xbfd4ff,0.6)@(-4,1,2)`, rim `(0xffffff,0.9)@(0,3,-5)`, `AmbientLight(0x404a5c,1.0)`. (Reuse as-is for the assembly scene.)
- **Mesh:** `const mesh = buildPartMesh(partData)`; `Box3.setFromObject` → `scale.multiplyScalar(2/max(size,1e-4))`; recenter via second `Box3` + `position.sub(center)`; `scene.add(mesh)`. **In the assembly path, replace this single block with the N-child ring layout.**
- **Grid:** `GridHelper(8,16,0x2a3a55,0x1a2438)` at `y=-1.05`. (Keep for the assembly scene too — it's a nice scale floor; maybe widen to `GridHelper(12,24,...)` if the ring is bigger.)
- **Camera framing:** bounding sphere of the mesh → `dist = safeR / sin(fov/2)`; `camera.position.set(0.8d, 0.6d, d)`; `lookAt(0,0,0)`. **In the assembly path, frame off the whole ring's bounding sphere.**
- **`OrbitControls`:** `enableDamping`, `dampingFactor 0.08`, `minDistance safeR*0.6`, `maxDistance safeR*8`, `target (0,0,0)`, `autoRotate = !!opts.autoRotate`, `autoRotateSpeed 1.0`, `update()`. **In the assembly path, when camera-tweening to a selected child, set `controls.enabled = false` for the tween duration (or lerp `controls.target` to the child's world position) — otherwise damping fights the tween.**
- **`ResizeObserver`:** updates `camera.aspect` + `renderer.setSize`. **The raycaster must recompute the canvas `getBoundingClientRect()` on every `pointermove` (cheap) — do NOT cache the rect, because resize/scroll moves it.**
- **RAF tick:** `controls.update(); renderer.render(scene,camera); raf = requestAnimationFrame(tick)`. **The camera tween advances inside this tick (lerp toward target each frame, clear the tween state when close enough).**
- **`dispose()`:** `cancelAnimationFrame(raf)`, `ro.disconnect()`, `controls.dispose()`, `scene.traverse` disposing geometries + (array-aware) materials + `m.map.dispose()`, `renderer.dispose()`, `forceContextLoss()`, canvas removal. **Phase 31 must also: remove the `pointermove`/`pointerdown`/`click` listeners from `renderer.domElement` (the `scene.traverse` already disposes the N child groups' geometries/materials since they're in the scene graph).**

### How `part.html` / `instance.html` call it today

**`part.html`** (`/Users/jeet/turion-space-demo/satellite/part.html`):
- `<head>` has the importmap (line 10). `<style>` has `#viewer3d { width:100%; min-height:520px; display:none; position:relative; }`, `.cad-frame.mode-3d #viewer3d { display:block; }`, `.cad-frame.mode-3d > svg.frame-svg { display:none; }`, `.view-toggle { position:absolute; top:10px; left:10px; z-index:6; }`, `.rotate-chip { position:absolute; top:10px; left:140px; z-index:6; display:none; ... }`, `.cad-frame.mode-3d .rotate-chip { display:inline-flex; }`.
- `.cad-frame` (id `cadFrame`, line 97) contains, in order: `<button id="toggleCallouts" class="cad-toggle">` (Phase-27 labels chip, top-right), `<button id="viewToggle" class="cad-toggle view-toggle" style="display:none;">view: 3D</button>`, `<label class="rotate-chip"><input id="autoRotateChk"> auto-rotate</label>`, `<div id="viewer3d"></div>`, then the existing `<svg class="frame-svg" viewBox="0 0 600 480">...<g id="cadCenter">...</svg>`. **The HUD `<div>` goes here — as a child of `#cadFrame`, AFTER `#viewer3d` (or inside `#viewer3d` — see §"Where the HUD mounts"), positioned bottom-left so it doesn't collide with the top chips.**
- Inline classic `(async () => {...})()` (line 233): `partId = r.getQueryParam('id')`, `satId = r.getQueryParam('sat')`. **`Promise.all` already fetches `children` from `/api/parts/${partId}/children?sat=${satId}` when `satId` is present (line 250-252), else `[]`.** So the children data the assembly path needs is *already fetched* on `part.html`. After the Phase-27 callouts block + the Phase-30 3D-mount block, the 3D mount is: `want3D = (r.getQueryParam('view')||'3d') !== '2d'` → `m.isWebGLAvailable()` → `frame.classList.add('mode-3d')` → `viewerHandle = m.mount3DViewer(document.getElementById('viewer3d'), part, { autoRotate:false })`. **Phase 31: change that call to `m.mount3DViewer(el, part, { autoRotate:false, assemblyChildren: (Array.isArray(children) && children.length) ? children : null, onSelect: (cd) => updateHud(cd) })`, and call `updateHud(part)` once after mount (or have `mount3DViewer` call `onSelect(null)`/page calls `updateHud(part)` to seed the HUD).**

**`instance.html`** (`/Users/jeet/turion-space-demo/satellite/instance.html`):
- `<head>` importmap (line 10). `<style>` has the same `#viewer3d`/`.mode-3d` rules but `min-height:320px`. `.cad-frame` is `id="cadFrame"` (line 115), contains `<button id="viewToggle">`, `<label class="rotate-chip">`, `<div id="viewer3d">`, then `<svg class="frame-svg" viewBox="0 0 600 320">...<g id="cadCenter">...</svg>`. No `#toggleCallouts` on this page.
- `satId = r.getQueryParam('sat')`, `instId = r.getQueryParam('inst') || r.getQueryParam('id')` — **always present** (`if (!satId || !instId) { location.href='/satellite/'; return; }`, line 217). So `instance.html` never has the no-sat problem.
- The Stage-2 `Promise.all` (line ~325-328) fetches `part = GET /api/parts/${inst.part_definition_id}`. **It does NOT currently fetch `/api/parts/:id/children` — instance.html's BOM-children gallery is derived from `bom = GET /api/satellites/:satId/bom` (line 325, filtered by `parent_part_instance_id === instId`, line 556).** So for the assembly viewer on `instance.html`, **add a `GET /api/parts/${inst.part_definition_id}/children?sat=${satId}` fetch** (it's keyed by part_definition_id + sat, which is exactly the partDef this instance is of — and the `/children` route's `WITH parent AS (SELECT id FROM part_instances WHERE part_definition_id=$1 AND satellite_id=$2 LIMIT 1)` finds *an* instance of that partDef on that sat; if multiple instances exist with different children that's a rare edge — acceptable for a demo). The 3D-mount block (line 379-416) passes the already-fetched `part` as `partData` — Phase 31 changes the call the same way as `part.html`.
- **`instance.html` already has `viewerHandle` + `pagehide → dispose()` wiring (line 384, 409) — reuse it.**

---

## Standard Stack

### Core (already present — no new deps)

| Library | Version | Purpose | Why standard |
|---|---|---|---|
| Three.js | `0.184.0` | WebGL scene, `Raycaster`, `Vector2/3`, `Box3`, `Sphere`, `MeshStandardMaterial`, `Group` | Already loaded via jsDelivr importmap on both pages; Phase 30 uses it; no bundler in `turion-space-demo` |
| `three/addons/controls/OrbitControls.js` | (bundled with 0.184.0) | Camera orbit/zoom; needs `controls.enabled` toggling during the camera tween | Already imported in `satellite-3d.js` |

### Supporting (browser built-ins / vanilla — no library needed)

| Thing | Purpose | When |
|---|---|---|
| `PointerEvent` (`pointermove`, `pointerdown`, `click`) on `renderer.domElement` | Hover + select | Attach in the assembly branch only; remove in `dispose()` |
| `Element.getBoundingClientRect()` | Convert pointer client coords → NDC relative to the canvas | Every `pointermove` (recompute, don't cache) |
| `requestAnimationFrame` (already used) | Drive the camera lerp tween | The existing `tick()` loop advances it |
| CSS custom properties (`--text-1/2/3`, `--bg-2/3`, `--border`, `Fira Code`) | HUD styling matching the dark `.cad-frame` theme | In each page's `<style>` (or `satellite-shell.css` if shared — but page-local is consistent with how `#viewer3d`/`.rotate-chip` were done in Phase 30) |

### Alternatives considered (and rejected)

| Instead of | Could use | Why not |
|---|---|---|
| DOM `<div>` HUD | `THREE.Sprite` / `CSS2DRenderer` text-in-scene | The prompt explicitly bans a Three.js sprite — text must stay crisp at any DPR and be selectable. A `<div>` is also far simpler and matches the existing `.cad-toggle`/`.rotate-chip` chips. (`CSS2DRenderer` is a real Three.js addon, but it's overkill for a static corner overlay and would add a second render pass.) |
| Extend `mount3DViewer` with `opts.assemblyChildren` | Separate `mountAssemblyViewer(el, partData, children, opts)` | One entry point keeps the page-side wiring (and `dispose()` lifecycle, `pagehide`, `.mode-3d` toggle) identical. The internal branch is a clean `if (opts.assemblyChildren?.length) { ...ring + raycaster... } else { ...existing single mesh... }`. ROADMAP says "new `mountAssemblyViewer` OR an `assemblyChildren` opt" — the latter is recommended and matches the prompt's §D. |
| Hover-highlight via emissive boost on the child group's materials | `THREE.OutlinePass` (post-processing) / `EdgesGeometry` outline mesh | `OutlinePass` requires `EffectComposer` + a `RenderPass` + an `OutlinePass` — a whole post-processing pipeline added to a viewer that currently renders straight to the canvas. Emissive boost (save `material.emissive` + `material.emissiveIntensity`, set to the palette accent on hover, restore on out) is one-tenth the code and reads fine on the dark background. (An `EdgesGeometry` wireframe overlay added/removed on hover is a middle-ground option if emissive proves too subtle — but start with emissive.) |
| Per-child uniform normalization (each child mesh scaled to the same small size) | Scale all children by the same global factor derived from the parent's `dimensions_mm` | True-relative scaling sounds right but: (a) `buildPartMesh` already applies its own `perturbForPartNumber` + `Math.max` clamps so the raw group sizes aren't proportional to `dimensions_mm` anyway; (b) a 1.6mm-thick PCB next to a 160mm panel would be an invisible sliver. Normalize each child to a uniform ~1-unit cube (like the single-mesh path does for the whole part) so every child is clickable; the HUD carries the *real* mm. |
| Camera lerp tween in the RAF loop | A tween library (`@tweenjs/tween.js`, GSAP) | Adding a tween lib to a no-bundler project = another importmap entry + another CDN dep. A 6-line `Vector3.lerp` toward a target each frame (with an ease-out via `t = 1 - (1-t)^3` or just a fixed `0.12` lerp factor) is plenty for "fly to the clicked child". |

**Installation:** none — `three@0.184.0` is already in the importmap. Backend has `express`/`pg`/`vitest` already.

---

## Architecture Patterns

### Recommended structure of the change

```
turion-space-demo/satellite/
├── satellite-3d.js          # MODIFIED: mount3DViewer gains `opts.assemblyChildren` + `opts.onSelect`
│                            #   + a new internal `layoutAssemblyRing(scene, children) → {childGroups, ringRadius}`
│                            #   + a raycaster picker + a camera-tween state machine in tick()
│                            #   (buildPartMesh, chooseTemplate3D, normalizeDims, etc. UNCHANGED)
├── part.html                # MODIFIED: HUD <div> in .cad-frame + .cad-hud CSS; pass assemblyChildren (already
│                            #   fetched as `children`) + onSelect → updateHud; call updateHud(part) on mount
├── instance.html            # MODIFIED: HUD <div> + CSS; ADD a /api/parts/:id/children?sat= fetch; pass
│                            #   assemblyChildren + onSelect → updateHud
└── 3d-test.html             # OPTIONAL: add a 10th cell with a hardcoded `assemblyChildren` array to demo it

turion-satellite/backend/
├── src/routes/parts.ts      # MODIFIED: add `c_pd.specifications AS specifications` to the /children SELECT
└── tests/parts.test.ts      # MODIFIED: add `specifications:{...}` to the two mock child rows + assert it surfaces
```

### Pattern 1: DOM HUD as a `.cad-frame` child, driven by a page-side `updateHud()`

**What:** The HUD is *not* owned by `satellite-3d.js` — that module just calls `opts.onSelect(childData)` (and `onSelect(null)` or nothing on deselect). The page owns a small `updateHud(partOrChild)` function and a `<div class="cad-hud" id="cadHud">` in `.cad-frame`. This keeps `satellite-3d.js` framework-agnostic and means the HUD can show page-specific fields (e.g. on `instance.html`, the serial number) without the module knowing about them.

**Where it mounts:** Two viable spots:
- **(a) Child of `.cad-frame`, sibling of `#viewer3d`, after `#viewer3d` in DOM order.** `.cad-frame { position:relative }` (already true). `.cad-hud { position:absolute; bottom:12px; left:12px; z-index:6; ... }`. Show it only in 3D mode: `.cad-frame.mode-3d .cad-hud { display:flex; }` (mirrors `.rotate-chip`'s pattern). **RECOMMENDED** — survives the `mount3DViewer` returning `null` (HUD just stays hidden because `.mode-3d` is removed), and survives `dispose()` (it's not inside `#viewer3d`, so it's not removed when the canvas is).
- (b) Child of `#viewer3d`. Simpler CSS but: `mount3DViewer` does `containerEl.appendChild(renderer.domElement)` — the canvas appends *after* any existing children, so a HUD `<div>` placed first in `#viewer3d` would be *behind* the canvas in paint order (need `z-index` + the canvas would need to be `position:absolute` too). Workable but fiddlier. Go with (a).

**HUD content:**
```
┌──────────────────────────────┐
│ COMM-ANT-XBAND-DISH-A        │   ← part_number (mono, --text-1)
│ X-band high-gain dish        │   ← description (--text-3, optional)
│ L × W × H  340 × 340 × 95 mm │   ← dims (mono); "—" per axis when missing
│ Mass  1,250 g                │   ← weight_grams (toLocaleString); "—" when missing
│ Material  Al-7075-T6         │   ← specifications.material; "—" when missing
│ ref: ANT-1                   │   ← only when a child is selected (ref_designator); hidden for the parent
└──────────────────────────────┘
```
**When it updates:** `updateHud(part)` once on mount (seeds it with the parent's dims). On `onSelect(childData)` → `updateHud(childData)` (the child's `specifications` came from the now-augmented `/children` response; `ref_designator` + `part_number` were always there). On deselect ("back to assembly" button or clicking empty space) → `updateHud(part)` again. For leaf parts (no `assemblyChildren`), the HUD just shows the parent's dims and never changes — still valuable (the user's actual complaint was "spinning doesn't convey size").

**Example (page-side, vanilla):**
```html
<!-- in .cad-frame, after #viewer3d -->
<div class="cad-hud" id="cadHud" aria-live="polite"></div>
```
```css
/* page <style> — uses the existing custom-props from satellite-shell.css */
.cad-hud {
  position:absolute; bottom:12px; left:12px; z-index:6; display:none;
  font-family:'Fira Code',monospace; font-size:11px; line-height:1.55;
  color:var(--text-2); background:rgba(10,14,26,0.82); border:1px solid var(--border-2);
  border-radius:5px; padding:9px 12px; max-width:60%; pointer-events:none;
}
.cad-frame.mode-3d .cad-hud { display:block; }
.cad-hud .hud-pn   { color:var(--text-1); font-weight:500; }
.cad-hud .hud-dim  { color:var(--text-1); }
.cad-hud .hud-key  { color:var(--text-3); }
.cad-hud .hud-ref  { color:var(--blue-1); }
```
```js
// page inline script — note: read RAW mm, show "—" when truly absent (do NOT use the 40-default)
function fmtDims(spec) {
  const d = spec && spec.dimensions_mm; if (!d) return '—';
  const [l,w,h] = Array.isArray(d) ? d : [d.length, d.width, d.height];
  const v = x => (x == null || x === '' || Number.isNaN(Number(x))) ? '—' : String(x);
  return `${v(l)} × ${v(w)} × ${v(h)} mm`;
}
function updateHud(p) {
  const hud = document.getElementById('cadHud'); if (!hud || !p) return;
  const spec = p.specifications || {};
  const mass = (spec.weight_grams == null) ? '—' : `${Number(spec.weight_grams).toLocaleString()} g`;
  const refLine = p.ref_designator ? `<div><span class="hud-key">ref:</span> <span class="hud-ref">${escapeHtml(p.ref_designator)}</span></div>` : '';
  hud.innerHTML = `
    <div class="hud-pn">${escapeHtml(p.part_number || '—')}</div>
    ${p.description ? `<div style="color:var(--text-3)">${escapeHtml(p.description)}</div>` : ''}
    <div><span class="hud-key">L × W × H</span> <span class="hud-dim">${fmtDims(spec)}</span></div>
    <div><span class="hud-key">Mass</span> ${mass}</div>
    <div><span class="hud-key">Material</span> ${escapeHtml(spec.material || '—')}</div>
    ${refLine}`;
}
```
(`escapeHtml` already exists on both pages as `r.escapeHtml` / `window.satelliteRender.escapeHtml`.)

### Pattern 2: Radial-ring layout for N child meshes

**What:** Place the N child groups at evenly-spaced angles on a horizontal circle (XZ-plane, `y=0`), facing the center; the camera frames the whole ring.

**Sizing:**
- Per-child normalization: build `g = buildPartMesh(childData)`, `Box3.setFromObject(g)` → `g.scale.multiplyScalar(childUnit / max(size, 1e-4))` where `childUnit ≈ 0.9` (a bit under 1 so neighbors don't touch); recenter each child group on *its own* origin first (`g.position.sub(center)`), then translate it out to the ring.
- Ring radius: `ringRadius = max(2.2, childUnit * N / Math.PI)` — i.e. circumference ≈ `2π·R ≈ N · (slightly-more-than-childUnit)`, so children are always spaced by ~one child width regardless of N. For N=1 just put it at the center (no ring). For very large N (10+) this naturally grows the ring; if it gets *too* big, optionally cap `ringRadius` at ~6 and shrink `childUnit` to `min(0.9, 6π/N)` so they still fit. (The ROADMAP says "radial ring or grid sized by child count" — radial ring is the recommendation; a grid is the fallback if a future part has 30 children, which none currently do.)
- Position: `child i` at angle `θ = (i/N)·2π` → `g.position.set(R·cos θ, 0, R·sin θ)`; optionally `g.lookAt(0,0,0)` so each faces the center (cosmetic).
- Tag for picking: `g.userData.childData = childData; g.userData.isAssemblyChild = true;` and `g.traverse(o => { o.userData.childGroup = g; })` so a raycast hit on a deep `Mesh` can find its top-level child group via `hit.object.userData.childGroup` (more robust than walking `.parent`).

**Parent rendering:** Per the prompt, either render the parent as a faint `MeshBasicMaterial({wireframe:true, transparent:true, opacity:0.12})` box (sized from the parent's normalized `dimensions_mm`) at the center as a "containment envelope", **or just don't render the parent box at all** (cleaner — the ring of children *is* the assembly). Recommendation: **no parent box** (or a very faint `GridHelper`-style ring on the floor). The HUD already names the parent.

**Camera framing:** after laying out the ring, `Box3.setFromObject(ringRoot).getBoundingSphere(sphere)` → same `dist = r/sin(fov/2)` formula → `camera.position.set(0.8d, 0.55d, d)`. `controls.target = (0,0,0)`. `controls.minDistance = r*0.4`, `maxDistance = r*8`.

**Example (inside `mount3DViewer`'s assembly branch):**
```js
// opts.assemblyChildren is a non-empty array of child rows (each has part_number, subsystem_code,
// specifications, ref_designator — and may lack default_make_buy, which buildPartMesh doesn't need)
const ringRoot = new THREE.Group();
const children = opts.assemblyChildren;
const N = children.length;
const childUnit = N > 10 ? Math.min(0.9, (6 * Math.PI) / N) : 0.9;
const ringRadius = N === 1 ? 0 : Math.max(2.2, Math.min(6, (childUnit * N) / Math.PI));
const childGroups = [];
children.forEach((cd, i) => {
  const g = buildPartMesh(cd);                       // THREE.Group of primitives
  const b = new THREE.Box3().setFromObject(g);
  const sz = b.getSize(new THREE.Vector3());
  g.scale.multiplyScalar(childUnit / Math.max(sz.x, sz.y, sz.z, 1e-4));
  const c = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
  g.position.sub(c);                                 // recenter on own origin
  const theta = (i / N) * Math.PI * 2;
  g.position.x += Math.cos(theta) * ringRadius;
  g.position.z += Math.sin(theta) * ringRadius;
  g.userData.childData = cd;
  g.traverse(o => { o.userData.childGroup = g; });
  ringRoot.add(g);
  childGroups.push(g);
});
scene.add(ringRoot);
```

### Pattern 3: `THREE.Raycaster` picking with canvas-rect-relative NDC

**What:** On `pointermove`, convert the pointer's client coords to NDC *relative to the canvas's bounding rect* (NOT the window), raycast against the N child groups (recursive), highlight the hovered group; on `click`, select it.

**Critical detail:** the canvas is a small element inside `.cad-frame`, not full-window. NDC must be:
```js
const rect = renderer.domElement.getBoundingClientRect();   // recompute every move — resize/scroll moves it
pointer.x =  ((ev.clientX - rect.left) / rect.width)  * 2 - 1;
pointer.y = -((ev.clientY - rect.top)  / rect.height) * 2 + 1;
```
Using `window.innerWidth/innerHeight` (the canonical tutorial snippet) would be wrong here and is a classic bug.

**Hover highlight (emissive boost, restore on out):**
```js
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;
function setEmissive(group, on) {
  group.traverse(o => {
    if (!o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (!('emissive' in m)) return;            // MeshBasicMaterial has none — skip
      if (on) {
        if (m.userData._emSaved == null) { m.userData._emSaved = { c: m.emissive.clone(), i: m.emissiveIntensity }; }
        const accent = paletteFor3D(group.userData.childData?.subsystem_code).accent;
        m.emissive.set(accent); m.emissiveIntensity = 0.5;
      } else if (m.userData._emSaved) {
        m.emissive.copy(m.userData._emSaved.c); m.emissiveIntensity = m.userData._emSaved.i;
        m.userData._emSaved = null;
      }
    });
  });
}
function onPointerMove(ev) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x =  ((ev.clientX - rect.left) / rect.width)  * 2 - 1;
  pointer.y = -((ev.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(childGroups, true);   // recursive — children are Groups of Meshes
  const grp = hits.length ? hits[0].object.userData.childGroup : null;
  if (grp !== hovered) {
    if (hovered) setEmissive(hovered, false);
    hovered = grp;
    if (hovered) setEmissive(hovered, true);
    renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab';
  }
}
function onClick(ev) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x =  ((ev.clientX - rect.left) / rect.width)  * 2 - 1;
  pointer.y = -((ev.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(childGroups, true);
  if (hits.length) {
    const grp = hits[0].object.userData.childGroup;
    selectChild(grp);                       // highlight + camera tween + opts.onSelect
  } else {
    deselect();                             // clicking empty space → back to assembly
  }
}
renderer.domElement.addEventListener('pointermove', onPointerMove);
renderer.domElement.addEventListener('click', onClick);
// dispose(): renderer.domElement.removeEventListener('pointermove', onPointerMove); ... same for 'click'
```
Use `click` (not `pointerdown`) so an orbit-drag that ends elsewhere doesn't fire a select; OrbitControls handles its own `pointerdown` for dragging — they coexist fine (a small drag that returns to the same spot will still fire `click`; if that's annoying, gate `onClick` on "pointer moved < 4px since `pointerdown`" — a 4-line guard).

### Pattern 4: camera tween that doesn't fight OrbitControls

**What:** On select, smoothly move the camera to frame the chosen child. The simplest robust approach: compute the desired camera position + target, set a tween state, and each RAF frame `lerp` toward it; disable `controls` while tweening.

```js
let tween = null;   // { camTo:Vector3, tgtTo:Vector3 } or null
function selectChild(grp) {
  if (hovered && hovered !== grp) setEmissive(hovered, false);
  hovered = grp; setEmissive(grp, true);                 // keep it lit while selected
  // child world position + a frame distance from its bounding sphere
  const wp = grp.getWorldPosition(new THREE.Vector3());
  const s = new THREE.Box3().setFromObject(grp).getBoundingSphere(new THREE.Sphere());
  const d = Math.max(s.radius, 1e-3) / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2) * 1.6;
  // approach from the camera's current direction so it doesn't whip around
  const dir = camera.position.clone().sub(controls.target).normalize();
  tween = { camTo: wp.clone().add(dir.multiplyScalar(d)), tgtTo: wp.clone() };
  controls.enabled = false;
  showBackButton(true);
  if (typeof opts.onSelect === 'function') opts.onSelect(grp.userData.childData);
}
function deselect() {
  if (hovered) { setEmissive(hovered, false); hovered = null; }
  // tween back to the whole-ring framing (cache the initial cam pos + target at mount time)
  tween = { camTo: initialCamPos.clone(), tgtTo: new THREE.Vector3(0, 0, 0) };
  controls.enabled = false;
  showBackButton(false);
  if (typeof opts.onSelect === 'function') opts.onSelect(null);    // page → updateHud(part)
}
// in tick():
if (tween) {
  camera.position.lerp(tween.camTo, 0.12);
  controls.target.lerp(tween.tgtTo, 0.12);
  if (camera.position.distanceTo(tween.camTo) < 0.01 && controls.target.distanceTo(tween.tgtTo) < 0.01) {
    camera.position.copy(tween.camTo); controls.target.copy(tween.tgtTo);
    tween = null; controls.enabled = true;
  }
}
controls.update();
renderer.render(scene, camera);
```
**"Back to whole assembly" affordance:** a small chip — either a Three.js-side DOM button the module creates inside `containerEl` (but that complicates `dispose()`), OR (cleaner) the page renders a `<button id="hudBack" class="cad-toggle" style="display:none">↩ back to assembly</button>` in `.cad-frame` and `mount3DViewer` exposes `viewerHandle.deselect()` + the page wires `hudBack.onclick = () => viewerHandle.deselect()` and `onSelect(cd)` → `hudBack.style.display = cd ? 'inline-block' : 'none'`. Recommendation: **page-owned back button, module exposes `deselect()`** (symmetry with the HUD being page-owned). Also: clicking empty canvas space deselects (already in `onClick` above).

### Anti-patterns to avoid

- **Touching the leaf single-mesh path.** When `opts.assemblyChildren` is absent/empty, `mount3DViewer` must behave *exactly* as it does today (the existing `Box3`-normalize-recenter-frame block runs unchanged). Don't refactor it "while you're in there".
- **NDC from `window.innerWidth/innerHeight`.** Wrong for a sub-element canvas — use `renderer.domElement.getBoundingClientRect()`.
- **Caching the canvas rect.** It moves on resize/scroll/`.mode-3d` toggle — recompute per event.
- **Camera tween + `controls.enableDamping` running simultaneously.** Set `controls.enabled = false` for the tween, restore after.
- **Forgetting to restore hover emissive on pointer-out** (and on `dispose()` it doesn't matter — materials get disposed — but during a session a stuck-lit child is a visible bug). Save `{emissive.clone(), emissiveIntensity}` on first hover, restore on out.
- **Raycasting `scene.children` instead of `childGroups`.** The grid, lights, and (if you render it) the faint parent envelope are in `scene.children` — only the N child groups should be pickable. Pass `childGroups` explicitly with `recursive=true`.
- **`THREE.Sprite` for the HUD.** Banned by the prompt — text blurs at non-1 DPR and isn't selectable.
- **Skipping `pointermove`/`click` listener removal in `dispose()`.** The `scene.traverse` disposal handles geometries/materials/textures; it does NOT remove DOM event listeners. Add explicit `removeEventListener` for both (and `style.cursor` reset).
- **Assuming `instance.html` already has the children data.** It doesn't — it derives BOM children from `/api/satellites/:satId/bom`. Add a `/api/parts/:partDefId/children?sat=` fetch there. (`part.html` *does* already fetch `children` — line 250-252.)
- **Backend: changing the WHERE/JOIN of `/children`.** Only add `c_pd.specifications AS specifications` to the SELECT column list. Touching the joins risks the `bom-tree.test.ts`/`parts.test.ts` cases and the `?sat=` 400 behavior.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| 3D object picking | Manual screen-space hit-testing / projecting bounding boxes | `THREE.Raycaster` + `intersectObjects(childGroups, true)` | Handles perspective, depth-sorting (`hits[0]` is nearest), and arbitrary mesh geometry; the only gotcha is NDC-relative-to-canvas |
| Pointer → NDC | Reading `event.offsetX/offsetY` (inconsistent across browsers/pointer types) | `(clientX - rect.left)/rect.width * 2 - 1` etc. with a fresh `getBoundingClientRect()` | The canonical, browser-portable formula; `offsetX` is unreliable on touch and when the canvas has CSS transforms |
| Outline / highlight | `OutlinePass` + `EffectComposer` + `RenderPass` post-processing pipeline | Emissive boost (save/restore `material.emissive` + `emissiveIntensity`) | The viewer renders straight to the canvas today; a post-FX pipeline is a large change for a hover glow. `EdgesGeometry` overlay is the next step up if needed, still no composer |
| Camera fly-to | A tween library (tween.js/GSAP) added to a no-bundler project | `Vector3.lerp` toward a target in the existing RAF loop, `controls.enabled=false` while tweening | No new CDN dep / importmap entry; 6 lines; matches the project's "vanilla, no bundler" posture |
| HUD text overlay | `CSS2DRenderer` / `THREE.Sprite` / canvas-texture text | A plain absolutely-positioned `<div>` child of `.cad-frame` styled with the existing CSS custom-props | Crisp at any DPR, selectable, trivially styled, matches the existing `.cad-toggle`/`.rotate-chip` chips; the prompt mandates DOM |
| Per-child "true relative scale" | Globally scaling all children by the parent's `dimensions_mm` | Normalize each child to a uniform ~0.9-unit cube; carry real mm in the HUD | `buildPartMesh` already perturbs/clamps sizes non-proportionally; a 1.6mm PCB next to a 160mm panel would be unclickable. The HUD is *how size is communicated* (per the ROADMAP) |
| Backend dimension data | N+1 `GET /api/parts/:childId` fetches from the viewer | Add `c_pd.specifications` to the `/children` SELECT (one column, one Lambda redeploy) | One round-trip vs. N; the column already exists; the redeploy path (`./build-and-push.sh`) is the same one Phase 28's `/bom/tree` used |

**Key insight:** Three.js + browser built-ins already provide every primitive this phase needs (`Raycaster`, `Vector2/3`, `Box3`, `Sphere`, `Group`, `PointerEvent`, `getBoundingClientRect`, `requestAnimationFrame`). The temptations are all "let's add a library" (tween.js, OutlinePass/EffectComposer) or "let's do it the hard way" (manual hit-testing, sprite text) — both are wrong for this codebase.

---

## Common Pitfalls

### Pitfall 1: NDC computed against the window instead of the canvas
**What goes wrong:** Hover/click hits the wrong object (or nothing) because the picking ray is offset; the bug is invisible on a full-window canvas but the viewer is in a small `.cad-frame`.
**Why:** The canonical tutorial snippet uses `event.clientX / window.innerWidth`.
**How to avoid:** Always `const rect = renderer.domElement.getBoundingClientRect();` then `((clientX-rect.left)/rect.width)*2-1` and `-((clientY-rect.top)/rect.height)*2+1`.
**Warning signs:** Hover highlights a different child than the one under the cursor; offset grows as you scroll the page.

### Pitfall 2: Camera tween fights OrbitControls damping
**What goes wrong:** On select, the camera judders or never settles — `controls.update()` (with `enableDamping`) keeps pushing it back toward the orbit state while the tween pulls it elsewhere.
**Why:** `controls.update()` runs every frame and applies damping toward the *last user-set* spherical position.
**How to avoid:** `controls.enabled = false` before the tween, restore `= true` when the tween completes; lerp both `camera.position` AND `controls.target` (and `controls.update()` still runs — it just doesn't fight because `enabled` is false... actually `enableDamping` still applies on `update()` even when `enabled` is false; safest is to also skip the lerp's last `controls.update()` mismatch by `controls.target.copy(tween.tgtTo)` exactly at the end). Simpler still: while `tween` is active, don't call `controls.update()` at all that frame — just `renderer.render`.
**Warning signs:** Camera "snaps back" after the fly-to; jitter near the end of the tween.

### Pitfall 3: Hover emissive not restored → stuck-lit children
**What goes wrong:** Move the cursor quickly across several children; some stay glowing because the pointer-out for them never fired (the next `pointermove` already had a different/no hit and we only un-lit the *previous* `hovered`, which can desync).
**Why:** Naive "un-light old, light new" desyncs if multiple children get touched between frames or if `pointerleave` on the canvas isn't handled.
**How to avoid:** Track exactly one `hovered` group; on every `pointermove` recompute the hit and if it differs from `hovered`, un-light `hovered` then light the new one; also handle `pointerleave` on the canvas → un-light `hovered`, set `hovered=null`. Save the per-material `{emissive, emissiveIntensity}` on first light, restore on un-light.
**Warning signs:** Multiple children glowing at once when only one is under the cursor.

### Pitfall 4: `dispose()` leaks pointer listeners (and `style.cursor`)
**What goes wrong:** Navigate away and back (SPA-ish) or toggle 2D/3D repeatedly — the old `pointermove`/`click` closures keep firing on a detached canvas, or the `<canvas>` cursor stays `pointer`.
**Why:** Phase-30's `dispose()` only disposes scene-graph resources + the renderer; it never added DOM listeners, so there was nothing to remove. Phase 31 adds them.
**How to avoid:** In the assembly branch, keep references to the listener functions; in `dispose()` add `renderer.domElement.removeEventListener('pointermove', onPointerMove)`, `...('click', onClick)`, `...('pointerleave', onPointerLeave)`, and `renderer.domElement.style.cursor = ''`.
**Warning signs:** `console` errors about operating on a removed canvas after `pagehide`; cursor stays a pointer after leaving the canvas.

### Pitfall 5: `/children?sat=` returns 400 when `?sat=` is absent (only relevant on `part.html`)
**What goes wrong:** `part.html?id=...` opened *without* `&sat=...` → the `Promise.all` already does `satId ? fetch(...).catch(()=>[]) : Promise.resolve([])` (line 250-252), so `children` is `[]` — fine for the assembly path (falls back to single mesh). But if someone later "optimizes" that to always fetch, it'd 400.
**Why:** The route does `if (!satId) { res.status(400)... }` (parts.ts line 292).
**How to avoid:** Keep the `satId ? ... : []` guard on `part.html`; on `instance.html` `satId` is always present (the page redirects to `/satellite/` otherwise), so the new fetch there is unconditional but safe. The assembly path activates only when `assemblyChildren` is a non-empty array, so the no-sat case degrades cleanly to the Phase-30 single-mesh viewer + a static HUD (the parent's dims).
**Warning signs:** A 400 in the network tab on a `part.html` URL with no `sat` param.

### Pitfall 6: Backend test breakage from the SELECT change
**What goes wrong:** `parts.test.ts` `describe('GET /api/parts/:partDefId/children')` has two mock child rows and asserts `res.body[0].part_number`, `res.body[1].drawing_svg`, and `capturedParams === ['pd-parent-1','sat-uuid-1']`. Adding `c_pd.specifications AS specifications` to the SQL doesn't change those assertions (the mock `query()` returns hardcoded rows, not real SQL output), so the *existing* tests stay green even without edits — BUT the new column should be *covered*, so add `specifications: {dimensions_mm:{length:..,width:..,height:..}, weight_grams:.., material:'..'}` to each mock row and one `expect(res.body[0].specifications).toMatchObject({...})` assertion. `bom-tree.test.ts` is for `/bom/tree` (a different route) — untouched.
**Why:** Vitest mocks `query()` (`vi.mocked(query).mockImplementation(...)`) so the SQL string is only matched, not executed — the column list change is invisible to the mock unless you also update the mock rows.
**How to avoid:** Update the two mock child rows + add one assertion in `parts.test.ts`; run `cd /Users/jeet/turion-satellite/backend && npx vitest run` (all suites must stay green); then `./build-and-push.sh`.
**Warning signs:** A red `parts.test.ts` (you broke an existing assertion) — revert and re-do minimally.

### Pitfall 7: `deploy-frontend.sh` does `aws s3 sync . --delete`
**What goes wrong:** Unrelated dirty files in `turion-space-demo` (the Phase-30 SUMMARY notes `about-this-demo.html`, `agent-sales-cash.html`, `backend/dist/*`, `dashboard-cio.html`, untracked `.superpowers/`) get synced — or, worse, `--delete` removes things — if the working tree is dirty at deploy time.
**Why:** `deploy-frontend.sh` syncs the whole repo with `--delete`.
**How to avoid:** Before the frontend deploy, run the Phase-29 "F6 pre-flight": stash unrelated dirty ERP-demo HTML, `mv` aside `.superpowers/`, then `bash deploy-frontend.sh` (s3 sync + CloudFront `E37R9PT8IL44L2` invalidate `/*`), then restore. (This is a deploy-task concern, not a code concern — flag it in the deploy wave of the plan.)
**Warning signs:** `git status` shows unrelated dirty files when you're about to deploy.

### Pitfall 8: `<canvas>` cursor / pointer events vs. OrbitControls drag
**What goes wrong:** A click that's actually the end of a small orbit-drag fires `selectChild` and yanks the camera.
**Why:** `click` fires after `pointerdown`+`pointerup` on the same element even if there was a tiny drag in between.
**How to avoid:** Optional 4-line guard: record `{x,y}` on `pointerdown`; in `onClick`, if `Math.hypot(ev.clientX-down.x, ev.clientY-down.y) > 4` → ignore. Start without it; add only if it's annoying in testing.
**Warning signs:** Camera jumps when you finish an orbit gesture over a child.

---

## Code Examples

### Backend: add `specifications` to the `/children` SELECT
```ts
// turion-satellite/backend/src/routes/parts.ts — GET /api/parts/:partDefId/children
// ADD ONE LINE to the SELECT column list (after subsystem_label):
      SELECT
        c_pd.id AS child_part_definition_id,
        c_pi.id AS child_part_instance_id,
        c_pd.part_number,
        c_pd.description,
        bl.qty,
        bl.uom,
        bl.ref_designator,
        c_pd.drawing_svg,
        s.code AS subsystem_code,
        s.label AS subsystem_label,
        c_pd.specifications AS specifications        -- <-- Phase 31: so the 3D viewer has each child's dimensions_mm
      FROM turion_satellite.bom_lines bl
      ...
// (everything else — WITH parent, JOINs, WHERE bl.status='released', ORDER BY, the ?sat= 400 — UNCHANGED)
```
```ts
// turion-satellite/backend/tests/parts.test.ts — in describe('GET /api/parts/:partDefId/children'),
// add `specifications` to each mock child row, e.g.:
{
  child_part_definition_id: 'pd-child-1', child_part_instance_id: 'pi-child-1',
  part_number: 'STR-HINGE-SPRING', description: 'Solar array hinge return spring',
  qty: '1', uom: 'EA', ref_designator: 'HINGE-1', drawing_svg: null,
  subsystem_code: 'STR', subsystem_label: 'Structure',
  specifications: { dimensions_mm: { length: 18, width: 6, height: 6 }, weight_grams: 4, material: 'Stainless 302' },
},
// ...and one assertion:
expect(res.body[0].specifications).toMatchObject({ dimensions_mm: { length: 18 }, weight_grams: 4 });
```

### Frontend: the `mount3DViewer` extension shape (signature only — internals per Patterns 2-4)
```js
// satellite-3d.js
export function mount3DViewer(containerEl, partData, opts = {}) {
  if (!isWebGLAvailable()) return null;
  // ... renderer / scene / camera / lights / grid — UNCHANGED ...

  const isAssembly = Array.isArray(opts.assemblyChildren) && opts.assemblyChildren.length > 0;
  let childGroups = [], raycaster = null, pointer = null, hovered = null, tween = null;
  let onPointerMove = null, onClick = null, onPointerLeave = null;
  let initialCamPos = null;

  if (isAssembly) {
    // ---- Pattern 2: radial-ring layout ----
    // build childGroups, position on the ring, tag userData.childData + userData.childGroup
    // frame camera off the ring's bounding sphere; remember initialCamPos = camera.position.clone()
    // ---- Pattern 3: raycaster picker ----
    // raycaster = new THREE.Raycaster(); pointer = new THREE.Vector2();
    // onPointerMove / onClick / onPointerLeave (canvas-rect-relative NDC); addEventListener on renderer.domElement
    // selectChild(grp): highlight + tween + opts.onSelect(grp.userData.childData) + showBackButton
    // deselect(): un-highlight + tween back to initialCamPos + opts.onSelect(null)
  } else {
    // ---- EXISTING Phase-30 single-mesh path — UNCHANGED ----
    const mesh = buildPartMesh(partData);
    // Box3 normalize → scale 2/maxDim → recenter → scene.add → frame camera off bounding sphere
  }

  // controls, ResizeObserver — UNCHANGED (but in tick(): advance `tween` if non-null; skip controls.update() while tweening)

  return {
    controls,
    deselect: isAssembly ? deselect : (() => {}),     // page wires a "back to assembly" button to this
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      if (isAssembly) {
        renderer.domElement.removeEventListener('pointermove', onPointerMove);
        renderer.domElement.removeEventListener('click', onClick);
        renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
        renderer.domElement.style.cursor = '';
      }
      scene.traverse(o => { /* dispose geometries/materials/textures — UNCHANGED, covers child groups */ });
      renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
  };
}
```

### Frontend: `part.html` integration (the only line that changes in the existing 3D-mount block)
```js
// part.html — `children` is ALREADY fetched (line 250-252: satId ? GET /api/parts/${partId}/children?sat= : []).
// In the Phase-30 3D-mount block, change the mount3DViewer call + seed the HUD:
viewerHandle = m.mount3DViewer(document.getElementById('viewer3d'), part, {
  autoRotate: false,
  assemblyChildren: (Array.isArray(children) && children.length) ? children : null,
  onSelect: (cd) => { updateHud(cd || part); document.getElementById('hudBack').style.display = cd ? 'inline-block' : 'none'; },
});
if (viewerHandle) {
  updateHud(part);                                            // seed HUD with the parent's dims
  const back = document.getElementById('hudBack');
  if (back && viewerHandle.deselect) back.onclick = () => viewerHandle.deselect();
  // ... existing rotChk / toggle / pagehide wiring — UNCHANGED ...
}
```

### Frontend: `instance.html` — ADD the children fetch (it doesn't have it today)
```js
// instance.html — in the Stage-2 Promise.all (which currently fetches bom, work-orders, part, instances),
// ADD: window.satelliteApi.get(`/api/parts/${encodeURIComponent(inst.part_definition_id)}/children?sat=${encodeURIComponent(satId)}`).catch(() => [])
// → destructure as `partChildren`. Then the 3D-mount block's mount3DViewer call:
viewerHandle = m.mount3DViewer(document.getElementById('viewer3d'), part, {
  autoRotate: false,
  assemblyChildren: (Array.isArray(partChildren) && partChildren.length) ? partChildren : null,
  onSelect: (cd) => { updateHud(cd || part); document.getElementById('hudBack').style.display = cd ? 'inline-block' : 'none'; },
});
if (viewerHandle) { updateHud(part); /* + hudBack wiring + existing rotChk/toggle/pagehide */ }
```

---

## State of the Art

| Old approach (Phase 30) | New approach (Phase 31) | When | Impact |
|---|---|---|---|
| One normalized mesh per part; auto-rotate to "show it off" | DOM dimension HUD (always visible) + multi-mesh ring for assemblies with click-to-inspect | This phase | The user's actual complaint ("spinning doesn't convey size") is addressed by the HUD; assemblies become explorable |
| `/api/parts/:id/children` returns thumbnail data only (`drawing_svg`, `subsystem_code`, qty, ref) | + `specifications` (so `dimensions_mm` is available per child) | This phase (backend) | One column, one Lambda redeploy; the children-gallery thumbnails on `part.html`/`instance.html` are unaffected |
| `mount3DViewer(el, partData, {autoRotate})` | `mount3DViewer(el, partData, {autoRotate, assemblyChildren?, onSelect?})` returning `{controls, deselect, dispose}` | This phase | Backwards-compatible — leaf parts still call it with just `{autoRotate}` and get the identical single-mesh viewer |

**Deprecated/outdated:** Nothing. Phase 30's `3d-test.html`, the SVG fallback, the `?view=` handling, the `.mode-3d` toggle, and the `#autoRotateChk` all carry forward verbatim. (Three.js `Layers`-based picking, `OutlinePass`, `CSS2DRenderer` were *considered and rejected* — not deprecated, just not the right tool here.)

---

## Open Questions

1. **Which spec keys does the HUD show beyond L×W×H / mass / material?**
   - What we know: `specifications` commonly carries (per `backend/src/lib/spec-keys.ts` + the migration seeds) `weight_grams`, `dimensions_mm` (object `{length,width,height}` OR array `[L,W,H]`), `material`, `operating_temp_c_min/max`, `vendor_part_number`, `tolerance`, `surface_finish`, `flight_heritage`, plus subsystem-specific keys (`capacitance_uf`, `thrust_n`, `pin_count`, ...).
   - What's unclear: whether the HUD should be just the 3 ROADMAP-named fields or a few more (e.g. `flight_heritage` is a nice "TRL 9 (14 missions)" line).
   - Recommendation: HUD shows exactly `part_number` / (description) / `L × W × H mm` / `Mass` / `Material` / (`ref:` when a child is selected) — the ROADMAP's three + identity. The full spec sheet already lives below the `.cad-frame` on both pages (`#specSheet` on `instance.html`, the `#specSheet` panel on `part.html`); the HUD is a *summary*, not a duplicate. (Planner's call; this is "Claude's discretion" territory.)

2. **Parent envelope: faint wireframe box or nothing?**
   - What we know: prompt says "faint wireframe envelope at the center, or just don't render the parent box".
   - What's unclear: which reads better — only visual testing tells.
   - Recommendation: **start with no parent box** (the ring of children IS the assembly; the HUD names the parent). If the scene feels empty, add a `MeshBasicMaterial({wireframe:true, opacity:0.1, transparent:true})` box sized from the parent's normalized `dimensions_mm` at the origin (NOT pickable — don't add it to `childGroups`). Cheap to add later; don't over-engineer up front.

3. **Layout for very large N (10+ children) — ring vs. grid?**
   - What we know: ROADMAP says "radial ring or grid sized by child count". Current SAT-003 assemblies: EPS-ASSY etc. have a handful of children; the densest BOM nodes (post Phase 26/28) might reach ~8-10.
   - What's unclear: whether any node will ever exceed ~12 (where a single ring gets crowded even with `ringRadius` growth).
   - Recommendation: single radial ring with `childUnit = N>10 ? min(0.9, 6π/N) : 0.9` and `ringRadius = min(6, max(2.2, childUnit·N/π))` — this self-scales for the current data. If a future densification pushes a node past ~15, switch that case to a 2-ring concentric layout or a grid; not worth building now (YAGNI). Note in the plan that the layout fn is `layoutAssemblyChildren(scene, children)` so it's swappable.

4. **`instance.html` — which instance's children when a partDef has multiple instances on a sat?**
   - What we know: `/children?sat=` does `WITH parent AS (SELECT id FROM part_instances WHERE part_definition_id=$1 AND satellite_id=$2 LIMIT 1)` — picks *an* instance arbitrarily. On `part.html` that's already the behavior (it's a part-def page, not an instance page). On `instance.html` we're looking at a specific instance, but we'd query by its `part_definition_id`.
   - What's unclear: edge case where instance #1 and instance #2 of the same partDef have different child BOMs (rare/unlikely in this seed data).
   - Recommendation: accept the `LIMIT 1` behavior (it's a demo; the BOMs are seeded consistently). If precision is wanted later, add a `?inst=<partInstanceId>` param to `/children` — out of scope for Phase 31.

---

## Sources

### Primary (HIGH confidence — read directly)
- `/Users/jeet/turion-space-demo/satellite/satellite-3d.js` — full module: `mount3DViewer`, `buildPartMesh` (returns `THREE.Group`), `chooseTemplate3D`, `normalizeDims`, `perturbForPartNumber`, `PALETTES_3D`/`paletteFor3D`, `materialFor`, `isWebGLAvailable`; the normalize→recenter→frame-camera pipeline; `dispose()` internals.
- `/Users/jeet/turion-space-demo/satellite/part.html` — `.cad-frame` markup (`#toggleCallouts`, `#viewToggle`, `#autoRotateChk`, `#viewer3d`, the `frame-svg`), the `<style>` `#viewer3d`/`.mode-3d`/`.view-toggle`/`.rotate-chip` rules, the inline script: `Promise.all` fetching `children` from `/api/parts/${partId}/children?sat=` (line 250-252), the Phase-27 callouts block, the Phase-30 3D-mount block (line 331-366), the subpart gallery (line 805-841).
- `/Users/jeet/turion-space-demo/satellite/instance.html` — `.cad-frame` markup, the `<style>` (`min-height:320px`), the redirect-if-no-`sat`/`inst` guard (line 217), the Stage-2 `Promise.all` (line 325-328 — fetches `part` but NOT `/children`), the BOM-children gallery derived from `/api/satellites/:satId/bom` (line 556, 577-598), the Phase-30 3D-mount block (line 379-416, `viewerHandle` + `pagehide` wiring).
- `/Users/jeet/turion-space-demo/satellite/satellite-shell.css` — theme custom-props (`--text-1/2/3 #e6eef7/#9ab1c8/#5a6b7e`, `--bg-2/3 #141b2d/#1a2030`, `--border #2a3142`, `--border-2 #3a4358`, `--blue-1 #3B82F6`, `Fira Code`), `.cad-toggle`/`.cad-frame` rules (line 200-229).
- `/Users/jeet/turion-satellite/backend/src/routes/parts.ts` — `GET /api/parts/:partDefId/children?sat=` handler (line 285-325): the `WITH parent AS ...` CTE, the SELECT column list (`child_part_definition_id, child_part_instance_id, part_number, description, qty, uom, ref_designator, drawing_svg, subsystem_code, subsystem_label` — NO `specifications`), the `if (!satId) → 400` guard, `bl.status = 'released'`.
- `/Users/jeet/turion-satellite/backend/tests/parts.test.ts` — `describe('GET /api/parts/:partDefId/children')` (line 317-396): mocked `query()`, two mock child rows, assertions on `part_number`/`drawing_svg` and `capturedParams === ['pd-parent-1','sat-uuid-1']`, the 400-without-`sat` test, the auth test, the 500-no-leak test.
- `/Users/jeet/turion-satellite/backend/src/app.ts` — `app.use('/api/parts', parts)` (line 29) confirms the `/api/parts/:partDefId/children` mount path.
- `/Users/jeet/turion-satellite/backend/src/lib/spec-keys.ts` — the `CommonSpecKeys` interface + `SPEC_KEY_LABELS` (`weight_grams`, `dimensions_mm` as `{length,width,height}`|`[L,W,H]`, `material`, `operating_temp_c_min/max`, `vendor_part_number`, `tolerance`, `surface_finish`, `flight_heritage`) + subsystem hints.
- `/Users/jeet/turion-satellite/migrations/009_add_specifications_to_parts.sql` — confirms `specifications JSONB NOT NULL DEFAULT '{}'::jsonb` already exists on `part_definitions` (no migration needed). Migrations `016`/`018` show real seeded `specifications` values (e.g. `'{"weight_grams":85,"dimensions_mm":{"length":160,"width":110,"height":1.6},"material":"FR4 6-layer / immersion gold",...}'`).
- `/Users/jeet/doordash-p2p/.planning/ROADMAP.md` §"Phase 31" — the goal/scope statement (quoted in §"User Constraints").
- `/Users/jeet/doordash-p2p/.planning/phases/30-interactive-webgl-3d-part-viewer/30-01-SUMMARY.md` + `30-02-SUMMARY.md` — the Phase-30 module API, the page-integration details, the `deploy-frontend.sh` `aws s3 sync . --delete` pre-flight warning, the importmap setup, the `mount-once vs. lazy-mount` decision.
- `/Users/jeet/doordash-p2p/.planning/config.json` — `branching_strategy: phase`, `phase_branch_template: gsd/phase-{phase}-{slug}`.

### Secondary (MEDIUM confidence — verified against official Three.js docs)
- Three.js `Raycaster` docs (`threejs.org/docs` Raycaster page) — `setFromCamera(coords, camera)` takes NDC in `[-1,1]`; `intersectObjects(objects, recursive)` recursive descends into children; `hits[0]` is nearest. Cross-checked with `DefinitelyTyped/types/three/src/core/Raycaster.d.ts` and the riptutorial "Object picking / Raycasting" example. The NDC-relative-to-canvas formula (`(clientX-rect.left)/rect.width*2-1`) is the standard one; the common bug is using `window.innerWidth/innerHeight` for a sub-element canvas (confirmed by mrdoob/three.js issue #28026 discussion and multiple tutorials).

### Tertiary (LOW confidence — design choices, no single canonical source)
- Camera fly-to via `Vector3.lerp` in the RAF loop with `controls.enabled=false` while tweening — a widely-used pattern but with no "official" Three.js helper (the docs don't ship a camera-tween util); the `0.12` lerp factor and "approach from current camera direction" are judgment calls. Validated only by it being the obvious minimal approach for a no-bundler project; the planner/executor should expect to tune it visually.
- Radial-ring sizing formula (`ringRadius = max(2.2, min(6, childUnit·N/π))`, `childUnit = N>10 ? min(0.9, 6π/N) : 0.9`) — derived from "circumference ≈ N child-widths"; reasonable but unverified against actual SAT-003 child counts. Adjust during visual testing.

---

## Metadata

**Confidence breakdown:**
- Current Phase-30 viewer surface (the thing being extended): **HIGH** — `satellite-3d.js`, `part.html`, `instance.html` all read end-to-end; the `mount3DViewer` signature, `buildPartMesh` return type (`THREE.Group`), the normalize/recenter/frame pipeline, the `dispose()` path, and the page-side wiring are exact.
- Backend change (`/children` SELECT + test edit + redeploy): **HIGH** — the route handler, the test file, the `app.ts` mount, the `specifications` column existence (migration 009), and the `./build-and-push.sh` deploy path are all confirmed.
- HUD design (DOM `<div>` in `.cad-frame`, CSS custom-props, `updateHud()`): **HIGH** for the mechanics (the existing `.cad-toggle`/`.rotate-chip` chips are the proven pattern; theme vars confirmed in `satellite-shell.css`); **MEDIUM** for which exact fields beyond L×W×H/mass/material (Open Question 1 — discretion).
- Multi-mesh assembly path (`opts.assemblyChildren`, radial ring, raycaster, camera tween): **HIGH** for the `Raycaster`/`pointermove`/NDC mechanics and the "extend not fork" + "page-owns-HUD" architecture; **MEDIUM-LOW** for the ring-sizing formula and the camera-tween easing (Open Questions 2-3 — visual-testing territory).
- Pitfalls: **HIGH** — every one is grounded in either the Phase-30 code (NDC-against-canvas, `dispose()` listener leak, the `satId ? ... : []` guard, `deploy-frontend.sh --delete`), the backend test structure (mocked `query()`), or a well-documented Three.js gotcha (tween-vs-damping, hover-emissive-restore).

**Research date:** 2026-05-11
**Valid until:** 2026-06-10 (30 days — the Three.js version is pinned at `0.184.0` via importmap and won't move on its own; the only thing that'd invalidate this is someone editing `satellite-3d.js`/`part.html`/`instance.html`/`parts.ts` before the phase is planned, or a new densification migration radically changing child counts).
