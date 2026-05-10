# Phase 27: Last-Mile CAD Coverage + Interactive Hotspots - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning
**Decision authority:** User chose "Full upgrade: regenerate all 80" — full scope, every part gets a truly isometric 3D rendering + child-callout overlay.

<domain>
## Phase Boundary

Replace the migration-011 auto-generated SVGs with truly isometric 3D-rendered CAD drawings for ALL 80 part_definitions, and overlay clickable BOM-child callouts on each parent's drawing. The user explicitly rejected the auto-generated drawings as "not 3D enough" and wants BOM children visible *inside* the CAD diagram, not in a separate panel below.

**Inputs:** existing 80 part_definitions, existing bom_lines hierarchy on SAT-003, existing 8 hand-crafted subsystem silhouettes at `/Users/jeet/turion-space-demo/satellite/cad/*.svg` (style reference).

**Phase 27 ships:**
1. New generator script (TS or JS) that emits truly isometric 3D SVGs per part. Cabinet projection (30° axonometric), multi-faceted shapes with shaded faces, depth-aware gradients per face, ground-shadow effect, optional rivet/seam details for assemblies.
2. Migration 016 (replaces 011's drawing_svg with new content; idempotent UPDATE).
3. Child-callout overlay SVG layer: when a part has BOM children on SAT-003, overlay labeled callouts (text + leader line + optional clickable region) pointing to plausible mounting positions on the parent's drawing.
4. Frontend update: part.html CAD frame renders the new SVG inline; clickable callouts navigate to that child's part.html (drill-down). Sub-parts gallery panel from quick-333 stays — provides a redundant grid view below the drawing.

Out of scope:
- BOM tree viewer page → Phase 28.
- Integrated SF→NS→Arena→MES side panel → Phase 28.
- Drawings for parts on satellites other than SAT-003 (the overlay logic queries SAT-003 BOM only; non-SAT-003 part pages would just show drawing without callouts).
- Photo-realistic raytraced renders (still SVG-based, not raster).

</domain>

<decisions>
## Implementation Decisions

### Drawing style
- **Cabinet projection** (axonometric ~30°/30°) — the standard engineering isometric look. Foreshorten depth axis by 0.5 for visual clarity.
- **Multi-faceted bodies**: every box/cylinder/disk renders as ≥3 visible faces (top, front, right), each with its own gradient (typically: top brightest, front mid-tone, right darkest). Produces the "3D solid" appearance the user wants.
- **Material palette per subsystem**:
  - STR: anodized aluminum (cool gray-blue gradients)
  - EPS: solar blue + bus copper accents
  - ADCS: machined titanium (warm silver) + accent
  - PROP: chamber stainless + flame nozzle
  - PAY: optical black + cyan lens accent
  - COMM: brushed aluminum + gold-anodized accents
  - TCS: copper heat-pipe + radiator white
  - CDH: PCB green + chip silver
- **Ground shadow**: every part has a subtle elliptical drop-shadow on the "ground plane" via SVG filter (feGaussianBlur + offset).
- **Part-family templates** (the generator dispatches on part_definition category):
  - **Fastener** template: hex/socket head + threaded shaft + ground shadow. Parameterized by size (M3/M4/M5).
  - **Assembly** template: 3-face box with embossed corners, screw seams. Parameterized by L×W×H aspect ratio.
  - **Sub-assembly** template: nested boxes with visible joints.
  - **Cylindrical component** template (springs, dampers, pistons): cylinder with coil/face details.
  - **Plate component** template (busbars, brackets): thin extruded plate.
  - **Lens/optical** template: stacked discs (objective, focal, back).
  - **Antenna/dish** template: parabolic profile + feed horn.
  - **Solar cell** template: hexagonal cell grid on substrate.
- **Label**: bottom-right corner, monospace font, part_number (e.g., `STR-HINGE-SA-DEPLOY`), 10pt.

### Child-callout overlay
- **When rendered**: only when the part has ≥1 bom_line child on SAT-003 (queried at page-load via the existing `/api/parts/:id/children?sat=<satId>` endpoint).
- **Layout**: callouts arrange around the parent's silhouette via a simple algorithm — angles distributed around centroid (top, right, bottom, left, then halfway angles for >4 children). Leader lines drawn from callout-text edge to nearest visible point on the parent body. Avoid overlapping labels via greedy non-overlap layout.
- **Callout shape**: rounded rectangle background (#1a2030 with 70% opacity) + white text + a tiny dot at the leader-line terminus on the body.
- **Text**: `<part_number> × <qty>` (e.g., `STR-HINGE-SPRING × 1`). Max 18 chars truncated with ellipsis.
- **Clickable**: each callout is wrapped in `<a xlink:href="part.html?id=<child_part_def_id>&sat=<satId>">` — click navigates to that child's part.html. Cursor:pointer + hover state (callout brightens).
- **Toggleable**: small "Show/Hide labels" button at top-right of CAD frame; default ON.

### Frontend changes
- `satellite/part.html` CAD frame renders the parent SVG inline (existing behavior, already loads drawing_svg from API).
- Add the overlay rendering: after the parent SVG is injected into `#cadCenter`, fetch `/api/parts/:id/children?sat=<satId>` and append `<g class="callouts">…</g>` to the SVG root with the child labels. JS function `renderCalloutsOnSvg(svgEl, children, satId)`.
- The existing sub-parts gallery panel below the CAD frame stays unchanged (redundant grid view, also helpful when a part has many sub-parts).
- "Show/Hide labels" toggle uses CSS class `.callouts-hidden` on the SVG root → hides `<g class="callouts">`.

### Generator architecture
- **TypeScript** in `/Users/jeet/turion-satellite/scripts/generate-cad-svgs.ts` (was JS in quick-332/26-01; user environment supports both).
- Imports a parts list from the live database (or a fixed YAML in repo for reproducibility).
- For each part, the generator:
  1. Looks up category (fastener, assembly, sub-assembly, cylindrical, plate, lens, antenna, solar-cell, custom).
  2. Picks subsystem palette.
  3. Renders the template with parametric dimensions from `specifications.dimensions_mm` JSONB (set in Phase 26).
  4. Emits SVG to a temp directory + a SQL UPDATE.
- Output: migration 016 (idempotent UPDATEs) + a directory of preview SVGs for QA.

### Naming + IDs
- Filter IDs and gradient IDs are per-part-prefixed to avoid collision when multiple SVGs render on one page (e.g., gallery tiles). Prefix = first 4 chars of part_number, lowercase, sanitized: `STR-HINGE-SA-DEPLOY` → `str-`.
- ViewBox uniformly `0 0 60 60` so all drawings scale identically.

### Migration approach
- Migration 016 is a single idempotent file: `UPDATE turion_satellite.part_definitions SET drawing_svg = '...' WHERE part_number = '...';`
- Re-run is a no-op via `WHERE drawing_svg IS DISTINCT FROM '...'` clause OR just unconditional UPDATE (same content → same row state).
- Apply directly to production (no staging) per established Phase 24-26 pattern.

### Backwards compatibility
- Existing sub-parts gallery panel (quick-333) keeps working — it just queries the same /children endpoint and renders thumbnails.
- Cost panels, BOM panel, etc. on part.html — unchanged.
- API contracts unchanged.

### Claude's Discretion
- Exact callout placement algorithm (greedy non-overlap is fine; can refine if visually crowded).
- Whether to include rivets/screws/seam details in templates (recommend yes for hero parts, minimal for fasteners).
- Whether to bundle generator + sample SVGs into a separate `scripts/cad-templates/` dir (recommend yes for organization).
- Whether to emit a per-part HTML preview page for QA (recommend yes: `scripts/cad-preview/index.html` rendering all 80 SVGs in a grid for visual QA).
- Color hex codes within each subsystem palette.
- Whether the toggleable "Show/Hide labels" button appears on every part page or only when children exist (recommend the latter).
- Lambda redeploy NOT needed (data-only change to drawing_svg column).
- Single-migration approach for the SQL (alternative: split by subsystem for executor checkpointing — but single is simpler).

</decisions>

<specifics>
## Specific Ideas

- **"Truly 3D"** = the user wants drawings that look like CAD product renders: visible top/front/side faces with shading, depth lines, ground-shadow. Not flat 2D with gradients.
- **"Children in the diagram"** = explicit labeled callouts overlaid on the parent's drawing, with leader lines pointing to the position. Like an exploded-view callout from a service manual.
- **Reference**: the 8 hand-crafted subsystem silhouettes at `/Users/jeet/turion-space-demo/satellite/cad/{structure,eps,adcs,propulsion,payload,comms,thermal,cdh}.svg` set the visual bar. Phase 27 generates 80 parts at that quality level.
- **Reuse Phase 26 specifications JSONB**: `dimensions_mm` field (where present) drives the generator's L×W×H parameters so each part has correct relative proportions.

</specifics>

<deferred>
## Deferred Ideas

- **Per-callout cost / status badges** (e.g., green checkmark if child is built, red X if blocked) → Phase 28.
- **Animated exploded view** (callouts pull away on hover, parent unfolds) → out of scope.
- **3D-rotatable WebGL viewer** (replace SVG with three.js scene) → out of scope; SVG isometric is sufficient.
- **Photo-realistic rendering** (raytraced PNGs replacing SVG) → out of scope.
- **Per-part custom artwork** (hand-illustrated SVGs for ~10 marquee parts) — defer; algorithmic generation will produce 80 consistent drawings, which beats 10 amazing + 70 mediocre.
- **Callouts on satellites other than SAT-003** — defer; SAT-003 is the demo target.
- **BOM tree viewer page** — Phase 28.
- **SF→NS→Arena→MES integrated side panel** — Phase 28.

</deferred>

---

*Phase: 27-last-mile-cad-coverage*
*Context gathered: 2026-05-10*
