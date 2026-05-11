# Phase 30: Interactive WebGL 3D part viewer (all 165 parts) - Research

**Researched:** 2026-05-11
**Domain:** Three.js WebGL viewer in a no-bundler vanilla-HTML/JS frontend (S3-static + CloudFront), procedural mesh generation per part-family
**Confidence:** HIGH (Three.js CDN/import-map approach, mesh primitives, existing-page integration all verified; mesh-generation design ports the Phase 27 dispatch which is in-repo)

---

## Summary

The Turion satellite frontend (`/Users/jeet/turion-space-demo/satellite/`) is plain HTML/CSS/JS served from S3 + CloudFront — **no npm build step, no bundler**. Each page loads a fixed chain of classic `<script src>` tags (`satellite-config.js` → Supabase UMD → `satellite-auth.js` → `satellite-api.js` → `satellite-cad.js` → `satellite-render.js` → `cost-render.js`) then an inline classic `<script>` that does `(async () => {...})()`. Phase 27 shipped 165 static cabinet-projection SVG drawings (one per part_definition on SAT-003 "Cygnus") via an 8-template dispatch (`/Users/jeet/turion-satellite/scripts/cad-templates/`), and those SVGs are stored in `part_definitions.drawing_svg` and returned by `GET /api/parts/:id/drawing`. This phase replaces the static SVG hero in `part.html` and `instance.html` with a real interactive Three.js viewer (orbit / zoom / pan), keeping the SVG as a selectable "2D drawing" fallback view. `bom.html` keeps SVG thumbnails (165 nodes — 3D-per-node is a non-starter) but gets a "view in 3D" deep-link per node.

**The delivery path:** Three.js `0.184.0` (latest on npm as of 2026-05-11; the project should pin this exact version) loaded as an **ES module via an import map** from jsDelivr — `three` → `https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.min.js` (≈365 KB raw, ≈100 KB gzip; `three.module.js` internally `import`s `./three.core.js` which the browser resolves by relative URL — no extra map entry needed) and `three/addons/` → `https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/` so `OrbitControls` imports as `import { OrbitControls } from 'three/addons/controls/OrbitControls.js'`. jsDelivr serves these with `Access-Control-Allow-Origin: *` so CORS is fine from the S3 origin. UMD/global builds of Three.js no longer exist for r150+, so the import-map ES-module path is the only correct option.

**The mesh path:** there are NO CAD model files (no STEP/glTF/OBJ). Geometry is built procedurally, dispatched by the same regex-on-`part_number` logic Phase 27 already uses (`chooseTemplate` in `scripts/generate-cad-svgs.ts`). Port that dispatch + `perturbForPartNumber` (deterministic ±3 djb2 jitter) + `normalizeDims` + the per-subsystem palette hex values into a new client-side JS module (`satellite/satellite-3d.js`). Each family maps to a Three.js primitive: assembly/subassembly → `BoxGeometry` (+ optional vent slats / LED spheres / connector boxes), cylindrical → `CylinderGeometry`, lens-optical → stacked `CylinderGeometry` discs (or `LatheGeometry`), antenna-dish → `LatheGeometry` parabola + boom `CylinderGeometry`, solar-cell → thin `BoxGeometry` + grid (canvas texture or `InstancedMesh` of cell boxes), fastener → `CylinderGeometry` shaft + 6-radial-segment `CylinderGeometry` hex head, plate → thin `BoxGeometry` (ring → `TorusGeometry`). Size from `specifications.dimensions_mm` (already on the `/api/parts/:id` payload via `pd.*`), normalized so every part fits a unit cube regardless of real-world size; default `{40,40,40}` when dims are missing. Material = `MeshStandardMaterial` colored with the mid-tone of the subsystem palette, `metalness`/`roughness` heuristics from the `specifications.material` string. **No backend or DB change** — every input the viewer needs (`subsystem_code`, `default_make_buy`, `specifications`, `part_number`) is already in the `/api/parts/:id` response.

**Primary recommendation:** Add one new client-side module `satellite/satellite-3d.js` exporting `mount3DViewer(containerEl, partData, opts)` → builds Scene + PerspectiveCamera + WebGLRenderer (antialias, sized to container via `clientWidth/clientHeight`, `devicePixelRatio`-aware, capped at 2) + the procedural part mesh + three-point lighting + AmbientLight + a `GridHelper` floor + `OrbitControls` (`enableDamping`) + a `requestAnimationFrame` loop, returning a `{ dispose() }` handle. Feature-detect WebGL — if unavailable, leave the existing static SVG in place. Mount it inside the existing `.cad-frame` block on `part.html` and `instance.html` with a small 2D/3D toggle (mirror the existing Phase-27 `cad-toggle` chip pattern). Load the module from the existing inline page script via `await import('/satellite/satellite-3d.js')` (a dynamic `import()` is legal from a classic script and avoids the classic-vs-module load-order trap) — or have the module read the part ID from the URL and self-mount independently.

---

<phase_requirements>
## Phase Requirements

From ROADMAP Phase 30: **Requirements: ThreeJSViewer, MeshGenerator, OrbitControls, WebGLFallback**

| ID | Description | Research Support |
|----|-------------|-----------------|
| ThreeJSViewer | A reusable Three.js viewer (Scene/Camera/Renderer/lighting/animation loop) embedded in `part.html` + `instance.html`, replacing the static isometric SVG hero | §Standard Stack (Three.js 0.184.0 via import map), §Architecture Pattern 1 (`mount3DViewer`), §Pattern 4 (page integration into `.cad-frame`), §Code Examples (full viewer skeleton + dispose) |
| MeshGenerator | Every one of the 165 part_definitions renders as a procedurally-built 3D mesh, shape dispatched by part-family mirroring the Phase 27 8-template dispatch, sized from `specifications.dimensions_mm` (with defaults), colored by the subsystem palette | §Architecture Pattern 2 (family→primitive map), §Pattern 3 (deterministic sizing/perturb/material), §Don't Hand-Roll (use built-in geometries), §Code Examples (dispatch port + mesh builders), §Pitfall 5 (zero-size guard) |
| OrbitControls | Drag-rotate, scroll-zoom, pan; `enableDamping`; optional `autoRotate` toggle | §Standard Stack (`three/addons/controls/OrbitControls.js`), §Code Examples (OrbitControls wiring), §Pitfall 4 (controls need camera + DOM element + `update()` in loop) |
| WebGLFallback | WebGL-unavailable browsers fall back to the existing isometric SVG; the static SVG also stays as a selectable "2D drawing" view | §Architecture Pattern 4 (feature-detect + 2D/3D toggle), §Pitfall 6 (feature detection), §Code Examples (`isWebGLAvailable`) |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | **0.184.0** (r184) — pin exactly | WebGL scene graph, geometries, materials, lights, renderer | The canonical WebGL library; ships ESM build + `examples/jsm/` addons; works without a bundler via import maps; latest published on npm 2026-05-11 |
| OrbitControls | shipped inside `three@0.184.0` at `examples/jsm/controls/OrbitControls.js` | Mouse/touch orbit + zoom + pan camera control | The official, maintained camera control addon — never hand-roll camera math |

### Supporting (all built into `three` — nothing extra to fetch)
| Thing | Where | Purpose | When to use |
|-------|-------|---------|-------------|
| `BoxGeometry`, `CylinderGeometry`, `LatheGeometry`, `TorusGeometry`, `SphereGeometry`, `RingGeometry` | `three` core | Procedural part bodies | All 8 part families map onto these (see §Architecture Pattern 2) |
| `InstancedMesh` | `three` core | Many identical sub-meshes (solar-cell grid) cheaply | Only if you choose the instanced-cells variant for solar panels; a single canvas-texture box is simpler and fine |
| `MeshStandardMaterial` | `three` core | PBR material (metalness/roughness) for realistic metal vs dielectric look | Every part mesh; derive base color + metalness/roughness per subsystem + material string |
| `GridHelper` | `three` core | Ground reference plane for scale/orientation | Floor under the part |
| `DirectionalLight` ×2 + `PointLight`/`DirectionalLight` rim + `AmbientLight` | `three` core | Three-point lighting + base fill | Standard product-viewer lighting |
| `CanvasTexture` | `three` core | Procedural solar-cell grid texture (draw cells on a `<canvas>`, wrap onto the panel face) | Solar-cell family, cheaper than InstancedMesh |
| `Box3` / `Box3.getBoundingBox` + `camera.lookAt` | `three` core | Frame the camera so any part fills the viewport regardless of real size | Initial camera positioning per part |

### CDN delivery (verified 2026-05-11; all return HTTP 200 with `Access-Control-Allow-Origin: *`)
| URL | Notes |
|-----|-------|
| `https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.min.js` | The map target for bare specifier `three`. ≈365 KB raw / ≈100 KB gzip. Internally does `import {...} from './three.core.js'` — the browser resolves that **relative to this file's URL**, so you do NOT need a `three.core` map entry. Use `.min.js` in prod; `three.module.js` (unminified) for debugging. |
| `https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/` | The map target for the `three/addons/` prefix. `OrbitControls.js` lives at `examples/jsm/controls/OrbitControls.js`. (In r184 `OrbitControls` extends the newer `Controls` base class — still works exactly the same.) |
| `https://unpkg.com/three@0.184.0/build/three.module.min.js` | Equivalent fallback CDN (also CORS-OK). Pick one; jsDelivr is what the project already uses for the Supabase UMD bundle, so jsDelivr is the consistent choice. |

**Installation:** none — no `npm install`, no `package.json` change in `turion-space-demo`. The "install" is an `<script type="importmap">` block in `part.html` / `instance.html` (see §Code Examples). Optionally vendor the two files into `satellite/vendor/three/` and point the import map at `/satellite/vendor/three/...` to avoid a third-party runtime dependency — but jsDelivr is already a load-bearing dependency of these pages (Supabase UMD) so a CDN import map is consistent with the existing posture.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Three.js ESM via import map | `<script src=".../three.min.js">` UMD global | **Not possible** — Three.js dropped the UMD/global build in r150 (2023). Only ESM (`three.module.js`) + addons (`examples/jsm/`) ship now. Old `three.min.js` URLs only exist for ancient versions (e.g. r101). Don't go there. |
| Hand-rolled OrbitControls | Custom mousedown/mousemove camera rotation | Reinvents quaternion math, damping, touch gestures, zoom clamping, pan — exactly what OrbitControls already does correctly. Never. |
| `@react-three/fiber` / `<model-viewer>` / `three-globe` | — | These pages are vanilla JS, not React; `<model-viewer>` wants a glTF file (we have none); `three-globe` is for globes. Plain `three` + `OrbitControls` is the right size. |
| Procedural meshes | Real CAD files (STEP→glTF) | There are no CAD files. Generating glTF assets per part offline would be a much bigger project; procedural primitives mirroring the Phase 27 templates is the right scope and matches the existing visual language. |
| jsDelivr CDN import map | Vendor the 2 files into `/satellite/vendor/three/` | Vendoring removes the third-party runtime dep but adds ≈365 KB to the S3 bucket + the deploy script (`deploy-frontend.sh` already syncs `*.js`). Either is fine; CDN matches the existing Supabase pattern. **Decision for the planner / user discussion.** |

---

## Architecture Patterns

### Recommended file layout (turion-space-demo/satellite/)
```
satellite/
├── satellite-3d.js          # NEW — the viewer module (ES module)
│                            #   exports mount3DViewer(containerEl, partData, opts)
│                            #   contains: chooseTemplate3D() (port of Phase 27 dispatch),
│                            #             buildPartMesh(partData), the per-family mesh builders,
│                            #             PALETTES_3D (ported hex mid-tones), materialHeuristics(),
│                            #             isWebGLAvailable()
├── part.html                # MODIFIED — add importmap + 2D/3D toggle + mount call in inline script
├── instance.html            # MODIFIED — same, smaller hero
├── bom.html                 # MODIFIED — add "view in 3D" deep-link per tree row (links to part.html?id=…&view=3d)
├── satellite-cad.js         # UNCHANGED — still the 2D SVG loader (loadPartCad / loadSubsystemCad / renderCalloutsOnSvg)
├── satellite-render.js      # UNCHANGED — escapeHtml etc.
└── (rest unchanged)
```
`satellite-3d.js` is an **ES module** (`import * as THREE from 'three'`). The existing page scripts stay classic scripts. The bridge is a dynamic `import('/satellite/satellite-3d.js')` inside the existing inline `<script>` (legal from a classic script; returns a promise resolving to the module's namespace) — OR make `satellite-3d.js` self-bootstrapping (it reads `?id=`/`?view=` from `location.search`, fetches `/api/parts/:id` via its own `fetch` with the Supabase token, and mounts). The dynamic-import bridge is simpler because the inline script already fetched `part`.

### Pattern 1: Reusable viewer with explicit lifecycle (`mount3DViewer` → `{ dispose() }`)
**What:** One function creates the whole scene for one container and returns a teardown handle. Everything that allocates GPU memory (geometries, materials, textures, the renderer) is tracked and released in `dispose()`.
**When to use:** Always — these are MPA pages so dispose matters less than in an SPA, but a 2D⇄3D toggle re-mounts within the same page, so a clean teardown prevents stacked renderers / RAF loops / WebGL context leaks. Browsers cap WebGL contexts (~16); leaking one per toggle eventually kills the page.
**Shape:**
```js
export function mount3DViewer(containerEl, partData, opts = {}) {
  // 1. feature-detect → if no WebGL return null (caller keeps the SVG)
  // 2. scene, camera (PerspectiveCamera fov 45, aspect from container), renderer (antialias, alpha)
  //    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(w, h)
  // 3. lighting: key DirectionalLight, fill DirectionalLight (dimmer, opposite side), rim DirectionalLight from behind, AmbientLight 0.35
  // 4. GridHelper(size, divisions) on y=0 as the floor
  // 5. const mesh = buildPartMesh(partData);  scene.add(mesh)
  //    frame the camera: compute Box3 of mesh, set camera distance from bounding sphere radius / tan(fov/2)
  // 6. OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.08
  //    controls.target = mesh centroid; controls.minDistance / maxDistance clamps; optional controls.autoRotate
  // 7. ResizeObserver on containerEl → on resize: camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h)
  // 8. let raf; function tick(){ controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(tick); } tick();
  // 9. return { dispose() {
  //      cancelAnimationFrame(raf); resizeObserver.disconnect(); controls.dispose();
  //      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) disposeMaterial(o.material); });
  //      renderer.dispose(); renderer.forceContextLoss?.(); containerEl.removeChild(renderer.domElement);
  //    }, controls };  // expose controls so the page can wire an "auto-rotate" checkbox
}
```

### Pattern 2: part-family → Three.js primitive map (mirrors Phase 27 `chooseTemplate`)
**What:** Port the `chooseTemplate` regex dispatch from `scripts/generate-cad-svgs.ts` (lines 69–87) verbatim into JS — the order matters (fastener → assembly `^[A-Z]+-ASSY$` → cylindrical → **solar before plate** (W5 fix) → lens → antenna → plate → subassembly catch-all). Then each family name maps to a mesh builder:

| Phase 27 template | Regex (part_number) | 2D shape today | Three.js geometry |
|-------------------|---------------------|----------------|-------------------|
| `fastener` | `^FASTENER-` / `HINGE-PIVOT-PIN` / `-PIN-A$` / `-SCREW-` | hex head + threaded shaft | `CylinderGeometry` shaft + `CylinderGeometry(rTop=rBot, h, radialSegments=6)` hex head (6 segments = hex prism); a few thin `TorusGeometry` thread rings optional |
| `assembly` | `^[A-Z]+-ASSY$` | 3-face cabinet box + corner screws + seam | `BoxGeometry` + 4 tiny `SphereGeometry`/`CylinderGeometry` corner-screw dots + a thin `BoxGeometry` seam strip on a face |
| `cylindrical` | `SPRING\|DAMPER\|TANK\|THRUSTER\|VALVE\|FILTER\|PUMP\|XDUCER\|HARNESS\|CABLE\|WAVEGUIDE\|REGULATOR` | vertical cylinder + caps + seam rings | `CylinderGeometry` body + 2–3 thin `TorusGeometry` seam rings; for THRUSTER add a flared nozzle (`CylinderGeometry` with `rTop > rBot`) |
| `solar` | `SOLAR-CELL\|SOLAR-PANEL\|SOLAR-WING\|SOLAR-ARRAY` | thin box + hex-cell grid | thin `BoxGeometry` substrate + `CanvasTexture` cell grid on the +Z face (or `InstancedMesh` of small cell `BoxGeometry`); bluish glossy material |
| `lens` | `TELESCOPE\|FOCAL\|BAFFLE\|LENS\|MIRROR\|SENSOR-OPT` | 3 stacked concentric discs + aperture + glint | 3 stacked `CylinderGeometry` discs of decreasing radius along Z (objective → focal → back), a dark `CircleGeometry`/small `CylinderGeometry` aperture, optional accent emissive ring. `LatheGeometry` works too if you want a smooth tube profile. |
| `antenna` | `ANT-\|ANTENNA\|DISH-` | parabolic ellipse + inner ring + feed boom + horn | `LatheGeometry` of a parabola profile (`y = k·x²` sampled points → revolve) for the dish + `CylinderGeometry` feed boom from dish center + small `BoxGeometry` feed-horn at boom tip |
| `plate` | `-(BUSBAR\|BRACKET\|RING\|PANEL)-` / `PANEL-RAD\|MOUNT-PLATE` | wide shallow box + 2 mounting holes | thin `BoxGeometry`; if `RING` in part_number → `TorusGeometry` (or a flat annulus via `RingGeometry` extruded). Mounting holes can be skipped (cosmetic) or done with `CylinderGeometry` indents — skip is fine. |
| `subassembly` (catch-all) | (default) | small box + connector pad + 2 LED dots | `BoxGeometry` + a small `BoxGeometry` connector pad on the +X face + 2 tiny emissive `SphereGeometry` LED dots at a top corner |

**Anti-pattern:** branching the 3D dispatch on something *other* than `part_number` regex. The Phase 27 dispatch is purely `part_number`-based and the new module must keep its own copy of that regex table (the TS source lives in another repo and can't be imported). Keep the regex strings identical so a part renders as the "same family" in 2D and 3D.

### Pattern 3: deterministic sizing + perturbation + material (ports Phase 27 primitives.ts)
**What:** Port three pure functions from `scripts/cad-templates/primitives.ts`:
- `normalizeDims(spec)` → `{L,W,H}` from `spec.dimensions_mm` (object `{length,width,height}` OR array `[L,W,H]`), default `{40,40,40}` when missing/null/0 (Pitfall 5 — never a 0×0×0 invisible mesh).
- `perturbForPartNumber(partNumber, baseValue)` → `baseValue + ((djb2(partNumber) % 7) - 3)` — deterministic ±3 offset so sibling parts in a family get visibly different aspect ratios in 3D too (same trick Phase 27 uses for SVG silhouettes). Apply to at least two axes per mesh (e.g. perturb the box width and height, or the cylinder radius and height).
- A subsystem palette: port the hex values from `scripts/cad-templates/palettes.ts` (`PALETTES` record keyed by `STR`/`EPS`/`ADCS`/`PROP`/`PAY`/`COMM`/`TCS`/`CDH`, each with `topLight/topDark/frontLight/frontDark/rightLight/rightDark/edge/accent`). For 3D, **pick the mid-tone** — e.g. `frontLight` (or lerp `topLight`↔`frontDark`) — as the `MeshStandardMaterial.color`; use `accent` for emissive LED/aperture/nozzle highlights. `paletteFor(code)` falls back to `STR` for null/unknown (same as Phase 27).

**Normalize to a unit cube:** after building the mesh, compute its `Box3`, find the max dimension, and scale the whole mesh group by `1 / maxDim` (or a target like `2 / maxDim`) so a 5 mm screw and a 2 m boom both fill the viewport. Then frame the camera off the bounding sphere. (The real mm sizes still drive *aspect ratio* via `normalizeDims` + `perturb`; only the overall scale is normalized.)

**Material heuristics from `specifications.material` (a free-text string like "Aluminum 7075-T6" / "Titanium 6Al-4V" / "FR4 epoxy" / "GaAs/Ge triple-junction"):**
| `material` substring (case-insensitive) | metalness | roughness | color tweak |
|---|---|---|---|
| `al`, `alumin`, `7075`, `6061` | 0.85 | 0.35 | keep palette mid-tone |
| `ti`, `titan`, `6al-4v` | 0.9 | 0.3 | slightly warmer/silver |
| `steel`, `stainless`, `inconel`, `cres` | 0.95 | 0.25 | cooler silver |
| `cu`, `copper`, `brass`, `bronze` | 0.9 | 0.3 | copper tint (use palette `accent` if EPS/PROP) |
| `fr4`, `pcb`, `pei`, `peek`, `epoxy`, `kapton`, `polyimid`, `g10` | 0.0 | 0.7 | dielectric — keep palette green-ish (CDH) |
| `gaas`, `ge`, `triple-junction`, `solar`, `photovolta` | 0.4 | 0.15 | bluish, glossy (solar look) |
| `cfrp`, `carbon`, `composite` | 0.0 | 0.6 | dark matte |
| anything else / null | 0.5 | 0.5 | palette mid-tone |
Subsystem palette wins for *hue*; the `material` string only nudges metalness/roughness (and an optional tint). Defaults `{0.5, 0.5}` if `material` is absent.

### Pattern 4: page integration — replace the SVG hero, keep a 2D⇄3D toggle
**What:** Both pages have a `.cad-frame` block (`#cadFrame`, ~520 px on part.html / ~320 px on instance.html) that today injects the SVG into a `#cadCenter` `<g>`. Add a `#viewer3d` div *inside* `.cad-frame` (positioned over / replacing the SVG), and a toggle chip (reuse the existing `.cad-toggle` CSS class + the Phase-27 `#toggleCallouts`-style pattern). Default = 3D when WebGL is available; the toggle flips to "2D drawing" which hides `#viewer3d` and shows the existing inline `<svg class="frame-svg">`. The Phase-27 BOM-child callout overlay (`renderCalloutsOnSvg`) stays on the 2D view only.
**When to use:** part.html (full integration — toggle + viewer + callouts coexist), instance.html (same, smaller container, no callouts there today). bom.html does NOT get a viewer — it gets a per-row "🧊 3D" link to `part.html?id=<childPdId>&sat=<satId>&view=3d` (the part page reads `?view=3d` to open in 3D mode). `?view=2d` forces SVG-only.
**Load-order detail:** the existing inline `<script>` is a *classic* script (runs during parse, before any `type="module"`). So `window.satellite3D` won't exist when it runs. Bridge with `const m = await import('/satellite/satellite-3d.js'); const handle = m.mount3DViewer(document.getElementById('viewer3d'), part, {...});` inside the inline async IIFE, *after* `part` is fetched. The `import()` triggers the module's own `import * as THREE from 'three'`, which resolves via the page's `<script type="importmap">`. (Import maps must appear in the HTML *before* the first module import — put the `<script type="importmap">` in `<head>` or at least before the dynamic import fires.)

### Anti-Patterns to Avoid
- **One Three.js scene per BOM tree node.** `bom.html` has ~165 nodes. 165 WebGL contexts is impossible (browser cap ~16) and 165 canvases is a perf disaster. Keep SVG thumbnails there; deep-link to the part page for 3D.
- **Sizing the renderer to `window.innerWidth/Height`.** The viewer lives in a flex/grid cell. Use `containerEl.clientWidth/clientHeight` + a `ResizeObserver`. `window`-sizing overflows the layout.
- **Forgetting `controls.update()` in the RAF loop.** With `enableDamping=true`, OrbitControls only applies inertia/damping when `update()` is called every frame. Skip it → janky/stuck controls.
- **Not disposing on the 2D⇄3D toggle.** Each toggle that re-mounts must `dispose()` the old viewer (geometries, materials, textures, renderer, RAF, ResizeObserver) or you stack leaks.
- **Hand-rolling camera framing per part.** Compute a `Box3`/bounding sphere and derive camera distance from `fov`; don't hardcode camera positions (parts range from screws to booms).
- **Loading Three.js as a classic `<script src>`.** It's an ES module — a classic `<script>` tag will throw "Cannot use import statement outside a module". Must be an import map + `type="module"` (or dynamic `import()`).

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Camera orbit/zoom/pan + damping + touch | Custom pointer-event camera math | `OrbitControls` from `three/addons/controls/OrbitControls.js` | Quaternion rotation, spherical coords, inertia, pinch-zoom, pan clamping — all already correct and maintained |
| Box/cylinder/sphere/torus/lathe/ring geometry | Manual vertex/index buffers | `THREE.BoxGeometry`, `CylinderGeometry`, `SphereGeometry`, `TorusGeometry`, `LatheGeometry`, `RingGeometry` | Correct normals/UVs/winding; parametric segment counts; battle-tested |
| PBR metal-vs-plastic look | Custom shader | `THREE.MeshStandardMaterial` with `metalness`/`roughness` | Physically-based, lit by standard lights, no GLSL to maintain |
| Procedural texture (solar-cell grid) | A pre-baked image asset per panel | `THREE.CanvasTexture` drawing cells on a `<canvas>` | Deterministic, no asset pipeline, scales with `perturb`-driven cell counts |
| Resize handling | `window.onresize` + manual debounce | `ResizeObserver` on the container | Fires for *container* resize (sidebar collapse, grid reflow), not just window |
| Camera framing for arbitrary part size | Hardcoded camera distances | `mesh`'s `THREE.Box3` → bounding sphere radius → `distance = r / Math.sin(fov/2)` | One formula handles screws to booms |
| WebGL feature detection | `try { canvas.getContext('webgl') }` ad hoc | A small `isWebGLAvailable()` (Three.js ships `WebGL.isWebGL2Available()` in `examples/jsm/capabilities/WebGL.js`, but a 5-line inline check is fine and dependency-free) | Reliable across browsers; fall back to SVG cleanly |
| Deterministic per-part variance | `Math.random()` jitter | Port `perturbForPartNumber` (djb2 hash) from Phase 27 `primitives.ts` | Same input → same mesh; matches the SVG's family-sibling distinction; no flicker on re-render |

**Key insight:** the entire 3D toolbox (geometries, materials, lights, controls, renderer, resize, framing) already exists inside `three@0.184.0` — the only *new* code is (a) the import-map plumbing, (b) the `chooseTemplate3D` regex port, (c) ~8 small mesh-builder functions, and (d) the palette/material/perturb ports. Resist building anything else.

---

## Common Pitfalls

### Pitfall 1: ESM-only Three.js vs the page's classic `<script src>` chain
**What goes wrong:** You add `<script src="https://.../three.min.js">` and the browser throws (no such UMD build exists for r150+), or you add `<script type="module" src="satellite-3d.js">` and it runs *after* the existing inline classic script — so the inline script (which already fetched `part`) can't see `window.satellite3D`.
**Why:** Three.js dropped the UMD/global build in r150 (only `three.module.js` ESM + `examples/jsm/` addons ship now). And classic inline scripts execute during HTML parse; `type="module"` scripts are deferred to after parsing.
**How to avoid:** (1) Put an `<script type="importmap">{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.min.js", "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/" } }</script>` in `<head>` (must precede any module import). (2) From the existing inline classic `<script>`, call `await import('/satellite/satellite-3d.js')` *after* `part` is fetched — dynamic `import()` is legal from classic scripts and the loaded module's own `import * as THREE from 'three'` resolves via the import map. (3) Alternatively, make `satellite-3d.js` self-bootstrap (read `?id=`/`?view=`, fetch `/api/parts/:id` with the Supabase token from `window.satelliteApi`, mount itself) — fully decoupled from load order.
**Warning signs:** "Cannot use import statement outside a module", "Failed to resolve module specifier 'three'", `window.satellite3D is undefined`.

### Pitfall 2: WebGL context / GPU-memory leak on the 2D⇄3D toggle (and SPA-style navigation)
**What goes wrong:** Toggling 2D→3D→2D→3D a few times → "Too many active WebGL contexts" warning, then a blank/black canvas; RAF loops stack so the fps drops; GPU memory grows.
**Why:** Browsers cap WebGL contexts (~8–16). Each `new WebGLRenderer()` allocates one. Geometries/materials/textures hold GPU buffers that GC doesn't free automatically — you must call `.dispose()`.
**How to avoid:** `mount3DViewer` returns `{ dispose() }` that: `cancelAnimationFrame(raf)`, `resizeObserver.disconnect()`, `controls.dispose()`, `scene.traverse(o => { o.geometry?.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.map?.dispose(); m.dispose(); }); })`, `renderer.dispose()`, `renderer.forceContextLoss?.()`, remove the canvas from the DOM. Call `dispose()` before re-mounting (the toggle handler holds the current handle).
**Warning signs:** console "WARNING: Too many active WebGL contexts. Oldest context will be lost."; fps degrades after a few toggles.

### Pitfall 3: canvas sized to the wrong thing inside a flex/grid layout
**What goes wrong:** The 3D canvas is huge/overflows the `.cad-frame` cell, or is 1×1 px (container had 0 width at init time), or doesn't resize when the page reflows.
**Why:** `.cad-frame` is inside `.part-grid` (`grid-template-columns:1.5fr 1fr` on part.html) — its width depends on the grid, not the window. Reading `window.innerWidth` or measuring before layout settles gives wrong numbers.
**How to avoid:** Size from `containerEl.clientWidth` / `containerEl.clientHeight` (give `#viewer3d` an explicit `min-height` in CSS — 520 px on part.html, 320 px on instance.html, matching today's `.cad-frame`). Set `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` then `renderer.setSize(w, h, false)`. Attach a `ResizeObserver(containerEl)` that updates `camera.aspect`, `camera.updateProjectionMatrix()`, `renderer.setSize(w, h, false)`. If `clientWidth` is 0 at mount (rare), defer one frame with `requestAnimationFrame`.
**Warning signs:** stretched/squashed render; canvas spills past the panel border; resize does nothing.

### Pitfall 4: OrbitControls misconfigured (no camera, wrong DOM element, no `update()`)
**What goes wrong:** Controls don't respond; or they capture events from the whole page; or with `enableDamping` the camera "sticks" and never settles.
**Why:** `new OrbitControls(camera, domElement)` needs the *camera* and the *renderer's canvas* (`renderer.domElement`), not `document` or the container div. And damping requires `controls.update()` every frame.
**How to avoid:** `const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.target.copy(meshCentroid); controls.minDistance = r*0.6; controls.maxDistance = r*6; controls.update();` — then call `controls.update()` first thing in the RAF tick. Expose `controls` from `mount3DViewer` so the page can wire `controls.autoRotate = checkbox.checked`.
**Warning signs:** drag does nothing; scroll-zoom scrolls the page instead; camera never comes to rest.

### Pitfall 5: zero-size / invisible mesh when `specifications.dimensions_mm` is missing
**What goes wrong:** A part whose `specifications.dimensions_mm` is `null`/`{}`/`[0,0,0]` produces a 0×0×0 geometry → nothing renders, viewport looks broken.
**Why:** Phase 26/28 backfilled specs but some rows may have partial/empty `dimensions_mm`; the array vs object shape also varies.
**How to avoid:** Port `normalizeDims` exactly — `null`/missing/`0` collapses to `{40,40,40}`; handle both `{length,width,height}` and `[L,W,H]`. Then `perturbForPartNumber` adds ±3 so siblings still differ. After building, assert the `Box3` has non-zero extent before scaling (clamp `maxDim` to a small epsilon).
**Warning signs:** empty/black viewport for specific parts; `NaN` in camera distance math (division by 0 max dimension).

### Pitfall 6: assuming WebGL is always available (no fallback)
**What goes wrong:** On a browser/GPU without WebGL (locked-down VM, ancient browser, GPU blocklist), `new WebGLRenderer()` throws and the part page hero is empty.
**Why:** WebGL availability isn't universal; the requirement explicitly says fall back to the static SVG.
**How to avoid:** Before creating the renderer, `isWebGLAvailable()` = `try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch { return false; }`. If false, `mount3DViewer` returns `null` and the page keeps the existing SVG visible (don't even show the 2D/3D toggle). Also wrap `new WebGLRenderer()` in try/catch as a belt-and-suspenders — on failure, fall back the same way.
**Warning signs:** "Error creating WebGL context"; empty hero on certain machines; the demo VM (where Phase 29 UAT ran headless) may not have WebGL — design so it degrades gracefully there.

### Pitfall 7: import map placed too late / typo in the bare specifier
**What goes wrong:** "Failed to resolve module specifier 'three'" even though the import map is on the page.
**Why:** Import maps must appear *before* the first module load (static or dynamic). If the dynamic `import('/satellite/satellite-3d.js')` fires before the `<script type="importmap">` is parsed, or the specifier in the module is `'Three'`/`'three.js'` instead of `'three'`, resolution fails. Also: `examples/jsm/` addons import `'three'` internally — they rely on the same map entry.
**How to avoid:** Put `<script type="importmap">…</script>` in `<head>` (before all other scripts). Use exactly `import * as THREE from 'three'` and `import { OrbitControls } from 'three/addons/controls/OrbitControls.js'`. The `three/addons/` map key MUST have the trailing slash (`"three/addons/": "https://.../examples/jsm/"`).
**Warning signs:** module specifier resolution error in console; OrbitControls.js itself failing to resolve `'three'`.

### Pitfall 8: pages are S3-static — no server-side anything; CDN must allow CORS
**What goes wrong:** A CDN that doesn't send `Access-Control-Allow-Origin` blocks the ES module import (CORS error) from the `turionspace.zietra.com` origin.
**Why:** ES module imports are CORS-checked. The page is served from CloudFront/S3 with no proxy.
**How to avoid:** Use jsDelivr (`cdn.jsdelivr.net`) or unpkg — both verified to send `Access-Control-Allow-Origin: *` for these files (2026-05-11). jsDelivr is the consistent choice (already used for the Supabase UMD bundle on every satellite page). Don't introduce a CDN you haven't CORS-checked. (Optional: vendor the 2 files into `/satellite/vendor/three/` and point the map at same-origin paths — no CORS concern at all.)
**Warning signs:** "Access to script at 'https://…' from origin 'https://turionspace.zietra.com' has been blocked by CORS policy".

### Pitfall 9: deploy hygiene — `deploy-frontend.sh` does `aws s3 sync . --delete`
**What goes wrong:** Unrelated dirty WIP in `turion-space-demo` (the ERP-demo HTML files, `.superpowers/`) rides along on the next `deploy-frontend.sh` (it syncs the *whole repo*, only excluding `.git/`, `backend/`, `*.md`, `*.sh`, `deploy-*`).
**Why:** Phase 29 already hit this — the deploy script syncs everything matching `*.html`/`*.js`/`*.css`/`*.svg`/`*.jpg`/`*.png` and `--delete`s anything in the bucket not present locally.
**How to avoid:** Before the Phase 30 deploy, run the same F6 pre-flight Phase 29 used: `git status` → if anything outside `satellite/` is dirty, `git stash` it (and `mv` aside untracked scratch dirs), deploy, then restore. New files this phase: `satellite/satellite-3d.js` + edits to `satellite/part.html` / `satellite/instance.html` / `satellite/bom.html` — all under `satellite/`, all should be committed before deploy. If vendoring Three.js, `satellite/vendor/three/*.js` also ships (it matches the `*.js` include) — make sure that's intended and committed.
**Warning signs:** `aws s3 sync` output lists files outside `satellite/`; the post-deploy site shows unrelated ERP-demo changes.

### Pitfall 10: the `/api/parts/:id` payload — what's actually there
**What you can rely on (verified in `turion-satellite/backend/src/routes/parts.ts:37-58`):** `GET /api/parts/:id` does `SELECT pd.*, s.code AS subsystem_code, s.label AS subsystem_label, v.name AS preferred_vendor_name, v.itar_compliant AS vendor_itar_compliant` — so the response includes `part_number`, `description`, `default_make_buy` (`'make'`|`'buy'`|null), `itar_flag`, `subsystem_code`, `subsystem_label`, **`specifications`** (JSONB, coerced to `{}` if null), `preferred_vendor_id`, `preferred_vendor_name`, plus `drawing_svg` (it's `pd.*`). `specifications` shape (Phase 25/26): `{ dimensions_mm: {length,width,height} | [L,W,H], weight_grams, operating_temp_c_min, operating_temp_c_max, material, vendor_part_number, tolerance, flight_heritage, ... }`. **No 3D model data exists** — there's no `model_gltf` / `mesh_url` column. The viewer builds geometry purely from `subsystem_code` + `default_make_buy` + `specifications` + `part_number`. **No new endpoint, no migration needed.** (part.html already fetches `part` via `GET /api/parts/:id`; instance.html fetches it via `GET /api/parts/:partDefId`.)

---

## Code Examples

> All snippets below are illustrative skeletons for the planner — the executor should adapt to the exact `.cad-frame` markup. Three.js APIs verified against `three@0.184.0`.

### Import map + 2D/3D toggle markup (add to `part.html` `<head>` and the `.cad-frame` block)
```html
<!-- in <head>, BEFORE any other <script> -->
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.min.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/"
  }
}
</script>
<style>
  /* #viewer3d sits inside .cad-frame, replacing the SVG when active */
  #viewer3d { width:100%; min-height:520px; display:none; position:relative; }      /* 320px on instance.html */
  #viewer3d canvas { display:block; width:100%; height:100%; }
  .cad-frame.mode-3d #viewer3d { display:block; }
  .cad-frame.mode-3d svg.frame-svg { display:none; }
  .view-toggle { position:absolute; top:10px; left:10px; z-index:6; /* mirror .cad-toggle styles */ }
</style>

<!-- inside <div class="cad-frame" id="cadFrame"> ... -->
<button id="viewToggle" class="cad-toggle view-toggle" type="button" style="display:none;">view: 3D</button>
<div id="viewer3d"></div>
<!-- the existing <svg class="frame-svg">…</svg> stays as the 2D view -->
```

### Bridge from the existing inline classic `<script>` (after `part` is fetched)
```js
// ... inside the existing (async () => { ... })() in part.html, after `part` is loaded ...
let viewerHandle = null;
const want3D = (r.getQueryParam('view') || '3d') !== '2d';   // ?view=2d forces SVG-only
try {
  const m = await import('/satellite/satellite-3d.js');
  if (m.isWebGLAvailable()) {
    const frame = document.getElementById('cadFrame');
    const toggle = document.getElementById('viewToggle');
    toggle.style.display = 'inline-block';
    const set3D = (on) => {
      frame.classList.toggle('mode-3d', on);
      toggle.textContent = on ? 'view: 3D' : 'view: 2D drawing';
      if (on && !viewerHandle) viewerHandle = m.mount3DViewer(document.getElementById('viewer3d'), part, {});
      // (keep the viewer mounted when toggling back to 2D — cheaper than re-mount; only dispose on page unload)
    };
    set3D(want3D);
    toggle.addEventListener('click', () => set3D(!frame.classList.contains('mode-3d')));
    window.addEventListener('pagehide', () => { viewerHandle?.dispose?.(); }, { once: true });
  }
  // if no WebGL: do nothing — the SVG stays visible, no toggle shown
} catch (e) { console.warn('[part] 3D viewer unavailable:', e); }   // SVG fallback already in place
```

### `satellite/satellite-3d.js` — viewer skeleton (ES module)
```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function isWebGLAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch { return false; }
}

export function mount3DViewer(containerEl, partData, opts = {}) {
  if (!isWebGLAvailable()) return null;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch (e) { console.warn('[satellite-3d] WebGL context failed:', e); return null; }

  const w = Math.max(1, containerEl.clientWidth), h = Math.max(1, containerEl.clientHeight || 520);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  containerEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050811);   // matches .cad-frame bg
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);

  // three-point lighting + base fill
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xbfd4ff, 0.6); fill.position.set(-4, 1, 2); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9); rim.position.set(0, 3, -5); scene.add(rim);
  scene.add(new THREE.AmbientLight(0x404a5c, 1.0));

  // procedural part mesh, normalized to a unit cube
  const mesh = buildPartMesh(partData);                   // see §Architecture Pattern 2/3
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1e-4);
  mesh.scale.multiplyScalar(2 / maxDim);
  // recenter on origin
  const box2 = new THREE.Box3().setFromObject(mesh);
  const center = box2.getCenter(new THREE.Vector3());
  mesh.position.sub(center);
  scene.add(mesh);

  // ground grid for scale
  const grid = new THREE.GridHelper(8, 16, 0x2a3a55, 0x1a2438);
  grid.position.y = -1.05;                                 // just below the normalized mesh
  scene.add(grid);

  // frame the camera off the bounding sphere
  const sphere = new THREE.Box3().setFromObject(mesh).getBoundingSphere(new THREE.Sphere());
  const dist = sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2);
  camera.position.set(dist * 0.8, dist * 0.6, dist);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = sphere.radius * 0.6; controls.maxDistance = sphere.radius * 8;
  controls.target.set(0, 0, 0);
  controls.autoRotate = !!opts.autoRotate; controls.autoRotateSpeed = 1.0;
  controls.update();

  const ro = new ResizeObserver(() => {
    const nw = Math.max(1, containerEl.clientWidth), nh = Math.max(1, containerEl.clientHeight || 520);
    camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh, false);
  });
  ro.observe(containerEl);

  let raf;
  const tick = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(tick); };
  tick();

  return {
    controls,
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.map?.dispose?.(); m.dispose(); });
      });
      renderer.dispose(); renderer.forceContextLoss?.();
      renderer.domElement.parentNode?.removeChild(renderer.domElement);
    },
  };
}
```

### `chooseTemplate3D` — port of Phase 27 `chooseTemplate` (keep regexes identical)
```js
// Source: ported from turion-satellite/scripts/generate-cad-svgs.ts lines 69-87 (DO NOT change the order or regexes).
export function chooseTemplate3D(partNumber) {
  const pn = partNumber || '';
  if (/^FASTENER-|HINGE-PIVOT-PIN|^.*-PIN-A$|-SCREW-/.test(pn)) return 'fastener';
  if (/^[A-Z]+-ASSY$/.test(pn))                                 return 'assembly';
  if (/SPRING|DAMPER|TANK|THRUSTER|VALVE|FILTER|PUMP|XDUCER|HARNESS|CABLE|WAVEGUIDE|REGULATOR/.test(pn)) return 'cylindrical';
  if (/SOLAR-CELL|SOLAR-PANEL|SOLAR-WING|SOLAR-ARRAY/.test(pn))  return 'solar';   // before plate (W5)
  if (/TELESCOPE|FOCAL|BAFFLE|LENS|MIRROR|SENSOR-OPT/.test(pn))  return 'lens';
  if (/ANT-|ANTENNA|DISH-/.test(pn))                             return 'antenna';
  if (/^.*-(BUSBAR|BRACKET|RING|PANEL)-/.test(pn) || /PANEL-RAD|MOUNT-PLATE/.test(pn)) return 'plate';
  return 'subassembly';   // default catch-all
}
```

### Deterministic helpers — ports of Phase 27 `primitives.ts` (pure functions)
```js
// Source: ported verbatim from turion-satellite/scripts/cad-templates/primitives.ts
export function normalizeDims(spec) {
  const d = spec && spec.dimensions_mm;
  if (!d) return { L: 40, W: 40, H: 40 };
  if (Array.isArray(d) && d.length >= 3) return { L: Number(d[0]) || 40, W: Number(d[1]) || 40, H: Number(d[2]) || 40 };
  if (typeof d === 'object') return { L: Number(d.length) || 40, W: Number(d.width) || 40, H: Number(d.height) || 40 };
  return { L: 40, W: 40, H: 40 };
}
export function perturbForPartNumber(partNumber, baseValue) {
  let hash = 5381;
  for (let i = 0; i < (partNumber || '').length; i++) hash = ((hash * 33) ^ partNumber.charCodeAt(i)) >>> 0;
  return baseValue + ((hash % 7) - 3);   // deterministic [-3, +3]
}
```

### `buildPartMesh` — dispatch + per-family geometry (sketch of a couple of builders)
```js
import * as THREE from 'three';
// PALETTES_3D: { STR:{base:'#5a6b88', accent:'#9ed0ff', metal:0.85, rough:0.35}, EPS:{...}, ... } — ported mid-tones from palettes.ts
import { chooseTemplate3D, normalizeDims, perturbForPartNumber } from './...';

function paletteFor3D(code) { return PALETTES_3D[(code || 'STR').toUpperCase()] || PALETTES_3D.STR; }

function materialFor(partData) {
  const p = paletteFor3D(partData.subsystem_code);
  const m = String(partData.specifications?.material || '').toLowerCase();
  let metal = p.metal ?? 0.5, rough = p.rough ?? 0.5;
  if (/(^|[^a-z])al|alumin|7075|6061/.test(m)) { metal = 0.85; rough = 0.35; }
  else if (/ti|titan|6al-4v/.test(m))          { metal = 0.9;  rough = 0.3;  }
  else if (/steel|stainless|inconel|cres/.test(m)) { metal = 0.95; rough = 0.25; }
  else if (/cu|copper|brass|bronze/.test(m))   { metal = 0.9;  rough = 0.3;  }
  else if (/fr4|pcb|pei|peek|epoxy|kapton|polyimid|g10/.test(m)) { metal = 0.0; rough = 0.7; }
  else if (/gaas|^ge$|triple-junction|solar|photovolta/.test(m)) { metal = 0.4; rough = 0.15; }
  else if (/cfrp|carbon|composite/.test(m))    { metal = 0.0; rough = 0.6; }
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(p.base), metalness: metal, roughness: rough });
}

export function buildPartMesh(partData) {
  const fam = chooseTemplate3D(partData.part_number);
  const d = normalizeDims(partData.specifications);
  const pn = partData.part_number || '';
  const mat = materialFor(partData);
  const g = new THREE.Group();

  if (fam === 'assembly' || fam === 'subassembly') {
    const w = Math.max(8, perturbForPartNumber(pn, d.L * 0.5));
    const h = Math.max(6, perturbForPartNumber(pn + ':h', d.W * 0.4));
    const z = Math.max(4, perturbForPartNumber(pn + ':d', d.H * 0.3));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, z), mat));
    if (fam === 'subassembly') {
      const p = paletteFor3D(partData.subsystem_code);
      const led = new THREE.MeshStandardMaterial({ color: new THREE.Color(p.accent), emissive: new THREE.Color(p.accent), emissiveIntensity: 0.6 });
      [-1, 1].forEach((s, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.4, w * 0.03), 8, 8), led); m.position.set(-w * 0.4 + i * w * 0.08, h * 0.4, z / 2 + 0.1); g.add(m); });
    }
  } else if (fam === 'cylindrical') {
    const isTall = d.H >= d.W;
    const r = Math.max(2, perturbForPartNumber(pn, (isTall ? d.W * 0.4 : d.W * 0.5) / 2));
    const len = Math.max(6, perturbForPartNumber(pn + ':h', isTall ? d.H * 0.5 : d.H * 0.4));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 32), mat));
    // 2 seam rings
    [0.33, 0.66].forEach(f => { const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, r * 0.04, 8, 24), mat); ring.rotation.x = Math.PI / 2; ring.position.y = -len / 2 + len * f; g.add(ring); });
  } else if (fam === 'fastener') {
    const headR = Math.max(1.5, perturbForPartNumber(pn, d.L * 0.2));
    const headH = Math.max(1, perturbForPartNumber(pn + ':h', d.L * 0.14));
    const shaftR = Math.max(0.6, d.W * 0.15), shaftLen = Math.max(6, perturbForPartNumber(pn + ':s', d.L));
    const head = new THREE.Mesh(new THREE.CylinderGeometry(headR, headR, headH, 6), mat);   // 6 segments = hex prism
    head.position.y = shaftLen / 2 + headH / 2; g.add(head);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(shaftR, shaftR, shaftLen, 16), mat));
  } else if (fam === 'plate') {
    if (/RING/.test(pn)) { g.add(new THREE.Mesh(new THREE.TorusGeometry(Math.max(4, d.L * 0.3), Math.max(0.4, d.H * 0.15), 12, 48), mat)); g.children[0].rotation.x = Math.PI / 2; }
    else { const w = Math.max(8, perturbForPartNumber(pn, d.L * 0.6)), h = Math.max(4, perturbForPartNumber(pn + ':h', d.W * 0.4)); g.add(new THREE.Mesh(new THREE.BoxGeometry(w, Math.max(0.6, d.H * 0.2), h), mat)); }
  } else if (fam === 'solar') {
    const w = Math.max(10, perturbForPartNumber(pn, d.L * 0.55)), h = Math.max(6, perturbForPartNumber(pn + ':h', d.W * 0.45));
    const panel = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, h), mat);
    // procedural cell-grid texture on +Y face — draw cells on a <canvas>, wrap as CanvasTexture
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const ctx = cv.getContext('2d');
    const cols = 3 + (perturbForPartNumber(pn + ':c', 0) % 3 + 3) % 3, rows = 6;
    ctx.fillStyle = '#16314f'; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#0a1a2e'; for (let i = 0; i <= cols; i++) { ctx.beginPath(); ctx.moveTo(i * 256 / cols, 0); ctx.lineTo(i * 256 / cols, 256); ctx.stroke(); }
    for (let j = 0; j <= rows; j++) { ctx.beginPath(); ctx.moveTo(0, j * 256 / rows); ctx.lineTo(256, j * 256 / rows); ctx.stroke(); }
    const tex = new THREE.CanvasTexture(cv);
    panel.material = [mat, mat, new THREE.MeshStandardMaterial({ map: tex, metalness: 0.4, roughness: 0.15 }), mat, mat, mat];   // +Y face index = 2
    g.add(panel);
  } else if (fam === 'lens') {
    const r1 = Math.max(3, perturbForPartNumber(pn, d.L * 0.4));
    const objective = new THREE.Mesh(new THREE.CylinderGeometry(r1, r1, r1 * 0.25, 32), mat); objective.rotation.x = Math.PI / 2; g.add(objective);
    const focal = new THREE.Mesh(new THREE.CylinderGeometry(r1 * 0.75, r1 * 0.75, r1 * 0.3, 32), mat); focal.rotation.x = Math.PI / 2; focal.position.z = -r1 * 0.3; g.add(focal);
    const back = new THREE.Mesh(new THREE.CylinderGeometry(r1 * 0.55, r1 * 0.55, r1 * 0.4, 32), mat); back.rotation.x = Math.PI / 2; back.position.z = -r1 * 0.7; g.add(back);
    const ap = new THREE.Mesh(new THREE.CircleGeometry(r1 * 0.4, 32), new THREE.MeshStandardMaterial({ color: 0x0a0a14 })); ap.position.z = r1 * 0.13; g.add(ap);
  } else if (fam === 'antenna') {
    const dishR = Math.max(5, perturbForPartNumber(pn, d.L * 0.5));
    // parabola profile points → LatheGeometry (revolve around Y)
    const pts = []; const n = 16, depth = dishR * 0.35;
    for (let i = 0; i <= n; i++) { const x = (i / n) * dishR; pts.push(new THREE.Vector2(x, (x * x) / (dishR * dishR) * depth)); }
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 48), new THREE.MeshStandardMaterial({ color: new THREE.Color(paletteFor3D(partData.subsystem_code).base), metalness: 0.8, roughness: 0.25, side: THREE.DoubleSide })));
    const boomLen = dishR * 1.1;
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(dishR * 0.04, dishR * 0.04, boomLen, 12), mat); boom.position.y = boomLen / 2; g.add(boom);
    const horn = new THREE.Mesh(new THREE.BoxGeometry(dishR * 0.18, dishR * 0.15, dishR * 0.18), mat); horn.position.y = boomLen; g.add(horn);
  }
  return g;
}
```

### bom.html — per-row "view in 3D" deep-link (add to `renderNodeClean`)
```js
// inside renderNodeClean(node), alongside the existing instHref:
const partPdId = encodeURIComponent(node.part_definition_id);   // node carries part_definition_id from /bom/tree
const view3dHref = `part.html?id=${partPdId}&sat=${encodeURIComponent(satId)}&view=3d`;
// add to the badges/links area:  <a class="badge" href="${view3dHref}" title="Open in interactive 3D">🧊 3D</a>
// NOTE: confirm /bom/tree nodes include part_definition_id; if only part_number is present, the link can
// instead go to parts.html?search=<part_number> — but /bom/tree already returns subsystem_code etc., so
// part_definition_id is very likely present (verify against the live /bom/tree response during planning).
```

---

## State of the Art

| Old approach | Current approach | When changed | Impact |
|--------------|------------------|--------------|--------|
| `<script src=".../three.min.js">` UMD global | `<script type="importmap">` + `import * as THREE from 'three'` | r150 (mid-2023) — UMD/global build removed | The only way to use modern Three.js without a bundler is the import-map ES-module path. Tutorials/StackOverflow answers older than ~2023 are wrong. |
| `THREE.OrbitControls` global (from `examples/js/`) | `import { OrbitControls } from 'three/addons/controls/OrbitControls.js'` (from `examples/jsm/`) | `examples/js/` deleted ~r148 | OrbitControls is now an ES module that itself `import`s `'three'` — needs the `three` import-map entry. |
| Single-file `three.min.js` | Split build: `three.module.js` `import`s `./three.core.js` | r166 (mid-2024) | Map only the `three` → `three.module(.min).js` entry; the browser auto-resolves `./three.core.js` by relative URL. No extra map entry needed. |
| `THREE.Geometry` (vertex/face objects) | `THREE.BufferGeometry` only; all `*Geometry` classes are buffer-based | r125 (2021) | Just use `BoxGeometry`/`CylinderGeometry`/etc. — they're all BufferGeometry under the hood. |
| `renderer.outputEncoding = sRGBEncoding` | `renderer.outputColorSpace = THREE.SRGBColorSpace` | r152 (2023) | Use the new color-space API for correct colors. |
| `OrbitControls extends EventDispatcher` | r178+: `OrbitControls extends Controls` (a new base) | r178 (2025) | Behavior identical for our use; just don't be surprised by the class hierarchy. |

**Deprecated/outdated — do NOT use:**
- `three.min.js` / `THREE` global / `<script src>` for Three.js core — gone since r150.
- `examples/js/controls/OrbitControls.js` — gone; use `examples/jsm/controls/OrbitControls.js`.
- `THREE.Geometry`, `Face3` — removed in r125.
- `renderer.gammaOutput` / `outputEncoding` — replaced by `outputColorSpace`.
- Old pinned tutorials using `three@r128` (2021) — the API has moved on; use `0.184.0`.

---

## Open Questions

1. **CDN import map vs vendoring the 2 Three.js files into `/satellite/vendor/three/`.**
   - What we know: jsDelivr serves `three@0.184.0/build/three.module.min.js` (≈365 KB / ≈100 KB gzip) and `examples/jsm/` with CORS-OK headers; the satellite pages already depend on jsDelivr for the Supabase UMD bundle. Vendoring would put same-origin paths in the import map (no CORS, no third-party runtime dep) but adds files to the S3 bucket + `deploy-frontend.sh`'s `*.js` sync.
   - What's unclear: the project's preference (the memory has a "Turion frontend — zero hardcoding" note about *DB-derived* values, not about CDN deps — not directly relevant, but the user is opinionated about the satellite frontend).
   - Recommendation: default to the **jsDelivr CDN import map** (consistent with the existing Supabase posture, zero new files); offer vendoring as a discussion point in `/gsd:discuss-phase`. Either is a small, contained choice the planner can defer.

2. **Does `GET /api/satellites/:satId/bom/tree` return `part_definition_id` on each node?** (Needed for the bom.html "view in 3D" deep-link.)
   - What we know: `/bom/tree` returns `part_number`, `subsystem_code`, `subsystem_label`, `default_make_buy`, `itar_flag`, `drawing_svg`, `instance_id`, `instance_index`, `qty`, `ref_designator`, `children`, `depth` (per `bom.html`'s `renderNodeClean`). It very likely also includes `part_definition_id` (it's joined to `part_definitions`), but `renderNodeClean` doesn't currently reference it.
   - What's unclear: whether the field is in the payload under that exact name.
   - Recommendation: during planning, `grep` the `/bom/tree` route in `turion-satellite/backend/src/routes/bom.ts` for the SELECT list; if `part_definition_id` is present, use it for the deep-link; if not, the link can fall back to `parts.html?search=<part_number>` (no backend change needed either way).

3. **Default view: 3D-on-load, or 2D-on-load with a 3D button?**
   - What we know: the user's stated intent is "the 3d effect on each part is still missing … only do the 3d graphics so i can make the part moving" — implies 3D should be front-and-centre. WebGL feature-detect already gates it.
   - What's unclear: whether they want 3D as the *default* on `part.html`/`instance.html` (extra GPU cost on every page load) or behind a one-click toggle (lighter default, opt-in).
   - Recommendation: default to **3D-on-load when WebGL is available** (matches the intent), `?view=2d` and the toggle chip both available; bom.html deep-links pass `?view=3d` explicitly. Surface this as a `/gsd:discuss-phase` question.

4. **`autoRotate` on by default?**
   - What we know: a slow auto-rotate makes a static-looking page feel alive; OrbitControls supports it (`controls.autoRotate`); stops on user interaction is automatic.
   - Recommendation: ship a small "⟳ auto-rotate" checkbox in the `.cad-frame` corner, **off by default** (auto-spin can be annoying / waste battery); easy to flip. Planner's discretion / discuss-phase.

---

## Sources

### Primary (HIGH confidence)
- **In-repo source — Phase 27 CAD templates** — `/Users/jeet/turion-satellite/scripts/cad-templates/{primitives,palettes,assembly,subassembly,cylindrical,lens-optical,antenna-dish,solar-cell,fastener,plate}.ts` + `/Users/jeet/turion-satellite/scripts/generate-cad-svgs.ts` — the 8-template `chooseTemplate` dispatch, `perturbForPartNumber`, `normalizeDims`, `paletteFor`, and the per-subsystem hex palettes to port.
- **In-repo source — satellite frontend** — `/Users/jeet/turion-space-demo/satellite/{part,instance,bom}.html`, `satellite-cad.js`, `satellite-render.js`, `satellite-api.js`, `satellite-auth.js`, `satellite-config.js`, `satellite-shell.css`, `deploy-frontend.sh` — the existing `<script>` load order, `.cad-frame` markup, the `cad-toggle` CSS pattern, the Supabase auth flow, and the S3+CloudFront deploy script.
- **In-repo source — backend** — `/Users/jeet/turion-satellite/backend/src/routes/parts.ts` — confirms `GET /api/parts/:id` returns `pd.*` (incl. `specifications` JSONB, `drawing_svg`, `default_make_buy`, `part_number`) + `subsystem_code`/`subsystem_label` from the `subsystems` join — no backend change needed.
- **npm registry** — `https://registry.npmjs.org/three/latest` (queried 2026-05-11) — latest published Three.js version = **0.184.0**.
- **jsDelivr CDN (HEAD-verified 2026-05-11, all HTTP 200 + `Access-Control-Allow-Origin: *`)** — `https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.min.js` (≈365 KB), `.../build/three.module.js`, `.../build/three.core.min.js`, `.../examples/jsm/controls/OrbitControls.js`, `.../examples/jsm/Addons.js` — confirms the import-map targets exist and the split-build `three.module.js` `import`s `./three.core.js` (relative — no extra map entry).
- **unpkg CDN (HEAD-verified 2026-05-11)** — `https://unpkg.com/three@0.184.0/build/three.module.min.js` — equivalent CORS-OK fallback CDN.
- **threejs.org docs — Installation manual** (WebFetch, 2026-05-11) — confirms the import-map pattern (`"three"` → build file, `"three/addons/"` → `examples/jsm/`) is the official no-build-tool path; `OrbitControls` at `three/addons/controls/OrbitControls.js`.

### Secondary (MEDIUM confidence)
- **three.js forum threads** (WebSearch, 2026-05-11) — "OrbitControls is not defined: proper way to import OrbitControls using a CDN" (discourse.threejs.org/t/56357), "Orbit Controls — Install with cdn" (discourse.threejs.org/t/40062) — community confirmation that UMD `three.min.js` no longer exists and the import-map ES-module path is the supported approach; cross-checked against the official docs above.

### Tertiary (LOW confidence — flagged, not load-bearing)
- General Three.js "state of the art" version history (UMD removed r150, `examples/js`→`examples/jsm`, split build r166, `outputColorSpace` r152, `OrbitControls extends Controls` r178) — from accumulated knowledge + the verified `three.module.js` source showing the `./three.core.js` import; the exact revision numbers for the older changes should be sanity-checked against the Three.js migration guide if a plan task depends on a precise revision, but they don't affect the recommended `0.184.0` approach.

---

## Metadata

**Confidence breakdown:**
- Standard stack (Three.js 0.184.0 via jsDelivr import map + OrbitControls addon): **HIGH** — version queried from npm registry today; all CDN paths HEAD-verified with CORS headers; import-map pattern confirmed by official docs.
- Architecture (mount3DViewer lifecycle, family→primitive map, deterministic sizing/material, page integration): **HIGH** — the family dispatch + perturb + palette are direct ports of in-repo Phase 27 code; the `.cad-frame` integration points are read from the actual `part.html`/`instance.html`/`bom.html`; the Three.js APIs (BoxGeometry, CylinderGeometry, LatheGeometry, TorusGeometry, OrbitControls, MeshStandardMaterial, GridHelper, ResizeObserver, Box3) are all stable, long-standing primitives.
- Pitfalls (ESM-vs-classic load order, WebGL context leak, container sizing, OrbitControls config, zero-size mesh, WebGL fallback, import-map placement, CDN CORS, deploy hygiene, `/api/parts/:id` payload shape): **HIGH** — each is grounded in either the verified Three.js behavior, the verified CDN headers, the actual `parts.ts` SELECT, or the Phase 29 deploy-hygiene incident already on record in STATE.md.

**Research date:** 2026-05-11
**Valid until:** ~2026-06-10 (30 days — Three.js cuts a release roughly monthly; pin `0.184.0` and the import map URLs stay valid indefinitely. Re-check the latest version only if the planner wants the newest; `0.184.0` is fine.)
