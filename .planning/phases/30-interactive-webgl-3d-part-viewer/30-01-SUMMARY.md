---
phase: 30-interactive-webgl-3d-part-viewer
plan: 01
subsystem: ui
tags: [three.js, webgl, es-modules, import-map, procedural-mesh, satellite-cad]

# Dependency graph
requires:
  - phase: 27-cad-coverage-hotspots
    provides: chooseTemplate 8-template regex dispatch, normalizeDims, perturbForPartNumber, per-subsystem palette hexes (ported from turion-satellite, not imported)
provides:
  - "satellite/satellite-3d.js — reusable ES-module Three.js part viewer (mount3DViewer) + procedural mesh generator (buildPartMesh) + WebGL feature-detect (isWebGLAvailable)"
  - "chooseTemplate3D — JS port of Phase 27 chooseTemplate (8-family regex dispatch, solar before plate)"
  - "satellite/3d-test.html — standalone 9-cell visual harness covering all 8 chooseTemplate3D families with hardcoded fixtures (no auth/API)"
affects: [30-02-part-instance-bom-integration, 30-03-deploy]

# Tech tracking
tech-stack:
  added: ["three@0.184.0 (via jsDelivr import map — NOT npm-installed, NOT vendored)"]
  patterns:
    - "ES-module client viewer loaded via dynamic import() from classic inline scripts; bare 'three' / 'three/addons/' specifiers resolved by the page's <script type=\"importmap\">"
    - "mount3DViewer(containerEl, partData, opts) → { controls, dispose() } | null — explicit lifecycle, returns null when WebGL unavailable so callers keep the static SVG"
    - "buildPartMesh — part-family → distinct Three.js primitive group, sized from normalizeDims + deterministic perturbForPartNumber, colored by ported subsystem palette mid-tone"

key-files:
  created:
    - /Users/jeet/turion-space-demo/satellite/satellite-3d.js
    - /Users/jeet/turion-space-demo/satellite/3d-test.html
  modified: []

key-decisions:
  - "Three.js 0.184.0 delivered via jsDelivr import map (consuming pages, Plan 30-02) — no bundler/build step, no npm install in turion-space-demo, no vendored Three.js (consistent with the existing Supabase UMD jsDelivr posture)"
  - "chooseTemplate3D regexes ported byte-identical from Phase 27 generate-cad-svgs.ts (solar BEFORE plate, W5 fix) so a part renders as the same family in 2D SVG and 3D"
  - "PALETTES_3D base = each Phase-27 palette's frontLight mid-tone; accent = each palette's accent hex (STR has no accent → its edge #cde); no new hex codes invented"
  - "All mesh dimensions Math.max-clamped and the final mesh normalized to a ~2-unit cube with a 1e-4 zero-guard — never a 0×0×0 invisible mesh even when dimensions_mm is null/[]/0"
  - "subassembly is chooseTemplate3D's catch-all and has its own builder (Box + 2 emissive LED dots + connector pad) — no silent fall-through to a bare Box"

patterns-established:
  - "Pattern: ported-helper module — pure functions (chooseTemplate3D / normalizeDims / perturbForPartNumber / PALETTES_3D / paletteFor3D / materialFor) copied from a sibling repo with 'Source: ported from …' comments, since cross-repo imports aren't possible"
  - "Pattern: WebGL fallback contract — isWebGLAvailable() + a try/catch around new WebGLRenderer; both mount3DViewer and isWebGLAvailable() return falsy on a WebGL-less browser so the page keeps the existing SVG and doesn't even show the 2D/3D toggle"
  - "Pattern: viewer disposal — dispose() does cancelAnimationFrame + ResizeObserver.disconnect + controls.dispose + scene.traverse disposing geometries/materials/textures (m.map.dispose()) + renderer.dispose + forceContextLoss + canvas removal"

requirements-completed: [ThreeJSViewer, MeshGenerator, OrbitControls, WebGLFallback]

# Metrics
duration: 4min
completed: 2026-05-11
---

# Phase 30 Plan 01: WebGL 3D Part Viewer Module + 8-Family Visual Harness Summary

**`satellite/satellite-3d.js` — a reusable Three.js 0.184.0 ES-module part viewer (`mount3DViewer` → `{ controls, dispose() }`) with 3-point lighting, GridHelper floor, OrbitControls (enableDamping/autoRotate), ResizeObserver, RAF loop, unit-cube normalize + bounding-sphere camera framing — plus `buildPartMesh`, a procedural mesh generator mapping the Phase-27 8-template `chooseTemplate` dispatch to 8 distinct Three.js primitive groups, and `satellite/3d-test.html`, a standalone 9-cell visual harness.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-11T20:12:48Z
- **Completed:** 2026-05-11T20:16:00Z
- **Tasks:** 3
- **Files modified:** 2 (both created)

## Accomplishments
- `satellite/satellite-3d.js` (438 lines) — 8 exports: `isWebGLAvailable`, `chooseTemplate3D`, `normalizeDims`, `perturbForPartNumber`, `paletteFor3D`, `materialFor`, `buildPartMesh`, `mount3DViewer`. ES module: `import * as THREE from 'three'` + `import { OrbitControls } from 'three/addons/controls/OrbitControls.js'`.
- `chooseTemplate3D` — Phase-27 `chooseTemplate` regex dispatch ported byte-identical (fastener → `^[A-Z]+-ASSY$` assembly → cylindrical → **solar before plate** → lens → antenna → plate → subassembly catch-all). Verified all 9 harness fixtures dispatch to the expected family.
- `buildPartMesh` — 8 distinct primitive builders:
  - **fastener** → `CylinderGeometry` shaft + `CylinderGeometry(…,6)` hex-prism head + 3 thin `TorusGeometry` thread rings
  - **assembly** → `BoxGeometry`
  - **cylindrical** → `CylinderGeometry` body + 2 `TorusGeometry` seam rings; `/THRUSTER/` adds a flared (`rTop>rBot`, open-ended) `CylinderGeometry` nozzle
  - **solar** → thin `BoxGeometry` substrate + `CanvasTexture` cell-grid (`cols` from `perturbForPartNumber`) on the +Y face (BoxGeometry face index 2)
  - **lens** → 3 stacked decreasing-radius `CylinderGeometry` discs along Z + dark `CircleGeometry` aperture + emissive accent `TorusGeometry` ring
  - **antenna** → `LatheGeometry` of a sampled `y = (x²/dishR²)·depth` parabola profile (DoubleSide, metalness 0.8) + `CylinderGeometry` feed boom + `BoxGeometry` feed-horn
  - **plate** → thin `BoxGeometry` (or `TorusGeometry` rotated π/2 if `/RING/` in part_number)
  - **subassembly** (catch-all) → `BoxGeometry` + 2 emissive `SphereGeometry` LED dots (palette accent) + `BoxGeometry` connector pad on +X
- `mount3DViewer` — `Scene`/`PerspectiveCamera(45)`/`WebGLRenderer({antialias,alpha})` sized from `containerEl.clientWidth/clientHeight||520` (NOT window), `setPixelRatio(min(dpr,2))`, `outputColorSpace = SRGBColorSpace`; 3-point lighting (`DirectionalLight` key 1.6 @(3,4,5) / fill 0.6 @(-4,1,2) / rim 0.9 @(0,3,-5)) + `AmbientLight`; mesh normalized to a ~2-unit cube via `Box3` + `scale.multiplyScalar(2/max(size,1e-4))` then recentered; `GridHelper(8,16)` floor at y=-1.05; camera framed off the bounding sphere (`dist = r / sin(fov/2)`); `OrbitControls` with `enableDamping`, `dampingFactor 0.08`, `minDistance r·0.6`, `maxDistance r·8`, `autoRotate = !!opts.autoRotate`, `update()` first in the RAF tick; `ResizeObserver` updating `camera.aspect` + `renderer.setSize`; returns `{ controls, dispose() }`, or `null` when `isWebGLAvailable()` is false or `new WebGLRenderer` throws.
- `dispose()` — `cancelAnimationFrame` + `ResizeObserver.disconnect` + `controls.dispose` + `scene.traverse` disposing geometries + materials (array-aware) + textures (`m.map.dispose()`) + `renderer.dispose` + `forceContextLoss` + canvas removal.
- `materialFor` — `MeshStandardMaterial` colored by the subsystem palette mid-tone; metalness/roughness from the per-subsystem PBR baseline, nudged by `specifications.material` substring heuristics (al/7075/6061→0.85/0.35; ti/6al-4v→0.9/0.3; steel/stainless/inconel/cres→0.95/0.25; cu/copper/brass/bronze→0.9/0.3; fr4/pcb/pei/peek/epoxy/kapton/polyimid/g10→0.0/0.7; gaas/ge/triple-junction/photovolta/solar→0.4/0.15; cfrp/carbon/composite→0.0/0.6).
- `satellite/3d-test.html` (149 lines) — standalone page with the jsDelivr import map in `<head>` BEFORE the module script; a CSS auto-fill grid of 9 cells (each min-height 320px, #050811, per-cell "auto-rotate" checkbox wired to `handle.controls.autoRotate`); imports `{ mount3DViewer }` from `./satellite-3d.js` and mounts one viewer per hardcoded fixture (fastener / assembly / cylindrical(THRUSTER) / solar / lens / antenna / plate / plate-RING-variant / subassembly), each with a representative `subsystem_code`; null handle (no WebGL) → cell label "WebGL unavailable — SVG fallback path" + disabled checkbox; `pagehide` → `handle.dispose()`. Not linked from any nav.

## Task Commits

Each task was committed atomically (in `github.com/jeet-avatar/turion-space-demo`, `main`):

1. **Task 1: ported helpers (chooseTemplate3D, normalizeDims, perturbForPartNumber, PALETTES_3D, paletteFor3D, materialFor) + isWebGLAvailable** — `e165a12` (feat)
2. **Task 2: buildPartMesh (8 family builders) + mount3DViewer** — `e82b4f4` (feat)
3. **Task 3: 3d-test.html — standalone 8-family visual harness** — `bd55dfd` (feat)

**Plan metadata:** committed in `doordash-p2p` (this SUMMARY + STATE/ROADMAP/REQUIREMENTS).

## Files Created/Modified
- `/Users/jeet/turion-space-demo/satellite/satellite-3d.js` (NEW, 438 lines) — ES-module Three.js part viewer + procedural mesh generator + WebGL feature-detect; 8 exports.
- `/Users/jeet/turion-space-demo/satellite/3d-test.html` (NEW, 149 lines) — standalone 9-cell visual harness, hardcoded per-family fixtures, no auth/API.

## 8 Family → Primitive Mappings (chooseTemplate3D → buildPartMesh)

| Family (regex on part_number) | Three.js primitive group |
|---|---|
| `fastener` — `^FASTENER-` / `HINGE-PIVOT-PIN` / `-PIN-A$` / `-SCREW-` | `CylinderGeometry` shaft + 6-radial-seg `CylinderGeometry` hex-prism head + 3 thin `TorusGeometry` thread rings |
| `assembly` — `^[A-Z]+-ASSY$` | `BoxGeometry` (perturbed L/W/H) |
| `cylindrical` — `SPRING\|DAMPER\|TANK\|THRUSTER\|VALVE\|FILTER\|PUMP\|XDUCER\|HARNESS\|CABLE\|WAVEGUIDE\|REGULATOR` | `CylinderGeometry` body + 2 `TorusGeometry` seam rings; `THRUSTER` → + flared open-ended `CylinderGeometry` nozzle |
| `solar` — `SOLAR-CELL\|SOLAR-PANEL\|SOLAR-WING\|SOLAR-ARRAY` (BEFORE plate, W5) | thin `BoxGeometry` substrate + `CanvasTexture` cell-grid on the +Y face (face idx 2), `metalness 0.4 roughness 0.15` |
| `lens` — `TELESCOPE\|FOCAL\|BAFFLE\|LENS\|MIRROR\|SENSOR-OPT` | 3 stacked decreasing-radius `CylinderGeometry` discs along Z + dark `CircleGeometry` aperture + emissive accent `TorusGeometry` ring |
| `antenna` — `ANT-\|ANTENNA\|DISH-` | `LatheGeometry` parabola dish (DoubleSide, metalness 0.8) + `CylinderGeometry` feed boom + `BoxGeometry` feed-horn |
| `plate` — `-(BUSBAR\|BRACKET\|RING\|PANEL)-` / `PANEL-RAD\|MOUNT-PLATE` | thin `BoxGeometry`; `RING` in part_number → `TorusGeometry` rotated π/2 |
| `subassembly` (catch-all) | `BoxGeometry` + 2 emissive `SphereGeometry` LED dots (palette accent) + `BoxGeometry` connector pad on +X |

## Ported Palette Mid-Tones (PALETTES_3D — from turion-satellite/scripts/cad-templates/palettes.ts, no new hex)

| Subsystem | `base` (= frontLight) | `accent` | metal / rough baseline |
|---|---|---|---|
| STR | `#5a6b88` | `#cde` (edge — STR has no accent) | 0.85 / 0.35 |
| EPS | `#5d8fc8` | `#b08040` (copper busbar) | 0.40 / 0.20 |
| ADCS | `#a8aebc` | `#a06bc0` (reaction-wheel purple) | 0.85 / 0.35 |
| PROP | `#c4654a` | `#ffba66` (flame orange) | 0.90 / 0.30 |
| PAY | `#b8e0a8` | `#9ed68a` (lens green) | 0.20 / 0.50 |
| COMM | `#b0a890` | `#f0c060` (gold anodized) | 0.85 / 0.35 |
| TCS | `#d65656` | `#c87850` (copper heat-pipe) | 0.80 / 0.35 |
| CDH | `#bcc8d8` | `#3a6a3a` (PCB green) | 0.00 / 0.70 |

`paletteFor3D(code)` upper-cases and falls back to `STR` for null/unknown (matches Phase 27).

## What the 3d-test.html harness covers
9 cells, one per `chooseTemplate3D` branch (8 families + a `plate` RING variant), each mounting `mount3DViewer` with hardcoded fixture `partData`:
- `FASTENER-M4-SCREW-A` (STR, Stainless 304) → fastener
- `EPS-ASSY` (EPS, Aluminum 6061) → assembly
- `PROP-THRUSTER-MONO-A` (PROP, Titanium 6Al-4V) → cylindrical + flared nozzle
- `EPS-SOLAR-PANEL-A` (EPS, GaAs/Ge triple-junction) → solar with cell grid
- `PAY-TELESCOPE-FOCAL-A` (PAY, CFRP composite) → lens stacked discs
- `COMM-ANT-XBAND-DISH-A` (COMM, Aluminum 7075-T6) → antenna dish + boom
- `TCS-PANEL-RAD-A` (TCS, Aluminum 6061) → thin plate slab
- `STR-MOUNT-RING-A` (STR, Aluminum 7075-T6) → plate RING → TorusGeometry
- `CDH-OBC-MODULE-X` (CDH, FR4 epoxy) → subassembly catch-all (box + LED dots + connector pad)

## Decisions Made
See `key-decisions` frontmatter — primarily: jsDelivr import map (no bundler/vendoring), byte-identical Phase-27 regex port, ported palette mid-tones (no new hex), Math.max-clamped + 1e-4-guarded sizing (no 0×0×0 mesh), subassembly catch-all has its own builder (no silent fall-through to bare Box).

## Deviations from Plan
None — plan executed exactly as written. Three minor verify-clause notes (none required code changes):
- The Task-1 verify suggested `grep -c "PALETTES_3D" >= 8` ("8 subsystem keys + uses"). The implementation uses a compact one-line-per-subsystem object literal, so the literal token `PALETTES_3D` appears 3× (declaration + 2 uses); the substantive requirement — all 8 subsystem palettes (STR/EPS/ADCS/PROP/PAY/COMM/TCS/CDH) present, each `grep -q "^  $k: "` confirmed — is fully met. Layout difference only, not a behavioral deviation.
- `node --check satellite/satellite-3d.js` fails on the bare `import 'three'` (no browser import map) — expected per the plan; syntax was validated by stripping the two `import` lines and running `node --check` on the remainder (PASS).
- Visual confirmation of the 9 rendered meshes is deferred to Plan 30-03's human-verify checkpoint — this execution environment is headless (no browser/WebGL). The harness wiring was verified instead: importmap precedes the module script, `mount3DViewer` is imported from `./satellite-3d.js`, all 9 fixtures parse cleanly, and each fixture `part_number` dispatches through `chooseTemplate3D` to its expected family (verified via a Node script running the ported `chooseTemplate3D` against all 9 part numbers).

## Issues Encountered
None.

## User Setup Required
None — no external service configuration. (Three.js 0.184.0 is fetched at runtime from jsDelivr by the consuming pages' import map; verified 2026-05-11 to return HTTP 200 with `Access-Control-Allow-Origin: *`.)

## Next Phase Readiness
- Plan 30-02 (part.html / instance.html / bom.html integration) can now `await import('/satellite/satellite-3d.js')` and call `mount3DViewer(containerEl, part, opts)` — the module, the WebGL fallback contract, the `{ controls, dispose() }` shape, and the 8-family mesh dispatch are all in place.
- Plan 30-02 must add the `<script type="importmap">` (jsDelivr three@0.184.0 + `three/addons/` with trailing slash) to `<head>` of each consuming page BEFORE any module import, and a `#viewer3d` div + 2D/3D toggle inside `.cad-frame`.
- Plan 30-03 owns deploy (and the human visual-verify checkpoint at `/satellite/3d-test.html` + the integrated pages). NOT deployed by this plan. Reminder: `deploy-frontend.sh` does `aws s3 sync . --delete` — run the Phase-29 F6 pre-flight (stash unrelated dirty ERP-demo HTML + `mv` aside `.superpowers/`) before that deploy.

---
*Phase: 30-interactive-webgl-3d-part-viewer*
*Completed: 2026-05-11*

## Self-Check: PASSED

- FOUND: /Users/jeet/turion-space-demo/satellite/satellite-3d.js
- FOUND: /Users/jeet/turion-space-demo/satellite/3d-test.html
- FOUND: /Users/jeet/doordash-p2p/.planning/phases/30-interactive-webgl-3d-part-viewer/30-01-SUMMARY.md
- FOUND commit: e165a12 (Task 1 — ported helpers + isWebGLAvailable)
- FOUND commit: e82b4f4 (Task 2 — buildPartMesh + mount3DViewer)
- FOUND commit: bd55dfd (Task 3 — 3d-test.html)
