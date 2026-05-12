# Phase 35: Editable CAD drawings + part management — Research

**Researched:** 2026-05-12
**Domain:** In-browser SVG editing (vanilla, no bundler) + Express/TS CRUD routes on AWS Lambda + Postgres migration + porting an existing TS SVG generator into the Lambda image
**Confidence:** HIGH (everything is in-repo and well-instrumented; the only MEDIUM is the hand-rolled SVG editor UX surface)

> No CONTEXT.md exists for this phase yet. The `<phase_requirements>` and `<open_questions_resolved>` sections below carry the constraints. If `/gsd:discuss-phase 35` is run later, a `<user_constraints>` block must be prepended.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **DrawingEditor** | "Edit drawing" mode on `part.html` (reachable from `instance.html`): load `drawing_svg` into a lightweight in-browser SVG editor — select/move/resize/rotate/delete shapes, edit text, add primitives (rect/line/circle/ellipse/polyline/text), undo/redo, Save → `PATCH /api/parts/:id/drawing` + bump `drawing_rev` | Hand-roll `satellite/svg-editor.js` (§Standard Stack, §Architecture Pattern 1). Backend `PATCH /api/parts/:partDefId/drawing` mounts in `parts.ts` (§Architecture Pattern 4). The Phase-30/31 3D viewer re-derives from `dimensions_mm` only, so editing the SVG body never breaks it (§Pitfall 4). |
| **DrawingRegenerate** | "Revert to generated" button → server-side regenerate of the cabinet-projection SVG from the part's family + dimensions (Phase-27 generator logic, now callable in the Lambda) | Port `scripts/cad-templates/*` → `backend/src/cad-templates/*` (compiled by `tsc`, shipped in the `npm ci --omit=dev` image). `POST /api/parts/:partDefId/drawing/regenerate` calls `chooseTemplate(part).fn(part)` then UPDATEs `drawing_svg` + bumps `drawing_rev` (§Architecture Pattern 2, §Don't Hand-Roll). |
| **PartCreate** | `POST /api/parts` — create a brand-new `part_definition` inline (part_number, description, subsystem_id, dimensions_mm→specifications, default_make_buy, itar_flag); also surfaced as a "create new part" sub-form in the extended add-BOM-line modal | New route in `parts.ts`. On insert, immediately generate `drawing_svg` via the ported generator + set `drawing_rev=1`, `specifications={dimensions_mm:{...}}`, `flagged_for_review=false`. The modal's sub-form does `POST /api/parts` → then the existing `POST /api/satellites/:satId/bom` flow to create the instance + line (§Open Question 7). |
| **PartEdit** | `PATCH /api/parts/:partDefId` — rename / re-describe / change subsystem / change dimensions / change make-buy; editing dimensions offers to regenerate the drawing + the 3D mesh updates | New route in `parts.ts`. After a dimensions edit the frontend prompts "regenerate the 2D drawing?" (calls regenerate) then `location.reload()` to re-mount `mount3DViewer` from the fresh payload (§Open Question 5). |
| **PartRetire** | `DELETE /api/parts/:partDefId` — soft-delete (`retired_at timestamptz`); hidden from parts list, BOM tree, kanban, pickers, BOM-children endpoints; blocked if live `part_instances` exist unless `?force=1` | Migration 022 adds `retired_at`. Backend sweep: add `WHERE pd.retired_at IS NULL` to the part-definition list/picker SELECTs (§Architecture Pattern 5 enumerates them). Block: `EXISTS (SELECT 1 FROM part_instances WHERE part_definition_id=$1)` → 409 unless `?force=1`; force just sets `retired_at` anyway (orphan instances stay visible with a "retired part" badge — keep it simple, §Open Question 4). |
| **BomLineDelete** | `DELETE /api/satellites/:satId/bom/:lineId` — remove a BOM line; delete control on BOM tree rows | New route in `bom.ts` (router is `mergeParams:true`, mounted at `/api/satellites/:satId/bom`, so the path is `/:lineId`). Deletes only the `bom_lines` row; the orphaned `part_instance` survives and re-appears as a root node in `/bom/tree` (the roots CTE already treats "not a child in any bom_line" as a root). Refuse (409) if the line's child instance has its own released child lines, unless `?cascade=1` — recommend: refuse + tell the user to delete leaves first (§Open Question 8). |
</phase_requirements>

---

## Summary

This is a **brownfield UI + CRUD phase, almost entirely in-repo** — there is no genuinely novel technology to research. The work is: (1) **hand-roll a small vanilla SVG editor** (`satellite/svg-editor.js`, ~400-600 lines, plain `<script>`, no bundler — there is no acceptable single-file no-build SVG editor library, see §Standard Stack), (2) **port the existing Phase-27 SVG generator** (`scripts/cad-templates/*.ts` + `generate-cad-svgs.ts`'s `chooseTemplate` dispatch) **into the Lambda's compiled `backend/src/` tree** so `POST .../drawing/regenerate` works server-side, (3) **add six Express routes** following the established `routes/parts.ts` / `routes/bom.ts` patterns + mount them in `app.ts`, (4) **migration 022** adding `part_definitions.drawing_rev int default 1`, `part_definitions.retired_at timestamptz`, and a `part_revisions` history table (mirroring the idempotent migration-021 style), and (5) **wire the UI** into `part.html`/`instance.html`/`bom.html`/`parts.html` strictly via `addEventListener` so the Phase-29 button audit stays at 0 violations.

The biggest hidden risks are: **the Lambda Docker image is `npm ci --omit=dev` and `tsc`-built** — the existing generator under `scripts/` runs via `node --import tsx` and uses `pg` `Client` directly; porting means copying the *pure template functions* (which only depend on `part_number`, `subsystem_code`, `specifications`) into `backend/src/cad-templates/` and rewriting the `.js` import-extension specifiers (the source uses `./foo.js` ESM specifiers; `backend/src/` is also ESM-style `tsc` output, so that mostly carries over — verify the `tsconfig`'s `module`/`moduleResolution`). **The button-audit script's `iterApiCalls` regex only scans `satelliteApi.{get,post,patch}(`** — adding a `del()` method to `satellite-api.js` requires a 1-line tweak to that regex (to `get|post|patch|put|delete|del`) or the new DELETE calls go unvalidated (the audit would still pass — but silently, which defeats the purpose). **Deploy is the Turion app's own scripts** (`build-and-push.sh` for the Lambda, `deploy-frontend.sh` w/ F6 pre-flight stash), **never** the dollor.ai `gh workflow run deploy-*`. **Migrations are applied manually** via `psql "$DATABASE_URL" -f migrations/022_...sql` (no migration runner) — strip the `?schema=` suffix before psql; the connection string is AWS Secrets Manager `turion-satellite/production/database-url-NCbgX6`.

**Primary recommendation:** 7 plans across 6 waves — W1: migration 022 + ported generator module (+ self-test reproducing a known part's SVG byte-for-byte) → applied to prod; W2 (parallel pair, both depend on W1): (a) parts CRUD + drawing routes, (b) retire + bom-line-delete + the `retired_at IS NULL` filter sweep; W3: `svg-editor.js` + `satelliteApi.del()` + audit-script regex tweak; W4 ‖ W5 (both depend on W2/W3): (W4) Edit-drawing/Revert controls on `part.html`+`instance.html`; (W5) part-management UI (extended add-BOM modal + create-new-part sub-form on `bom.html`, Edit-part form + Retire control on `part.html`/`parts.html`, delete control on `bom.html` tree rows); W6: deploy (`build-and-push.sh` + `deploy-frontend.sh` w/ F6 + CF invalidation + curl smoke + button audit BOTH repos + Phase 27-34 regression + headless-substitute checkpoint + STATE/ROADMAP).

---

## Standard Stack

### Core (already in the repos — use as-is)
| Library / artifact | Version / location | Purpose | Why standard here |
|--------------------|--------------------|---------|-------------------|
| Express + TypeScript | `turion-satellite/backend` (`tsc` build → Lambda arm64 image, `npm ci --omit=dev`) | Backend routes | Every existing satellite route is `Router()` + `requireAuth` + `query/queryOne` from `src/db.ts` — follow `routes/parts.ts` and `routes/bom.ts` verbatim. |
| `pg` (via `src/db.ts` `query`/`queryOne`) | already a dep | Postgres access | All routes parametrize; never string-interpolate user input. |
| `jsonwebtoken` (`src/middleware/auth.ts` `requireAuth`) | already a dep | Auth gate | ES256 (`SUPABASE_JWT_PUBLIC_KEY`) or HS256 (`SUPABASE_JWT_SECRET`). `requireAuth` only — **no role gate** for this phase ("all gated behind auth", any logged-in user). |
| `vitest` + `supertest` | `backend/tests/*.test.ts` | Route tests | Mock `../src/db`, mint a JWT with `crypto.generateKeyPairSync('ec',{namedCurve:'P-256'})` + `SUPABASE_JWT_PUBLIC_KEY`. See `backend/tests/parts.test.ts` as the template. |
| Phase-27 generator | `turion-satellite/scripts/cad-templates/` (`primitives.ts`, `palettes.ts`, `assembly.ts`, `subassembly.ts`, `cylindrical.ts`, `lens-optical.ts`, `antenna-dish.ts`, `solar-cell.ts`, `fastener.ts`, `plate.ts`) + `chooseTemplate()` in `scripts/generate-cad-svgs.ts` | Cabinet-projection SVG generator | **Templates are pure functions** of `{part_number, subsystem_code?, specifications?}` — they call `makePrefix`, `perturbForPartNumber`, `normalizeDims`, `cabinetBox`, `dropShadowFilter`, `partLabel`, `paletteFor`. No DB, no I/O. **Port these files (plus a copy of the `chooseTemplate` dispatch table)** into `backend/src/cad-templates/` so they ship in the Lambda image. |
| Vanilla JS frontend skeleton | `turion-space-demo/satellite/*` | All pages | Page load order: `satellite-config.js` → supabase UMD → `satellite-auth.js` → `satellite-api.js` (`window.satelliteApi.{get,post,patch}`) → `satellite-render.js` (`window.satelliteRender` / aliased `r.`: `escapeHtml`, `breadcrumb`, `statusTag`/`statusTag`, `topbarHTML`, `getQueryParam`, `toast`, …) → `satellite-3d.js` (dynamic-imported), `satellite-cad.js`, `cost-render.js` → inline IIFE. **No bundler. No npm in the frontend repo.** |
| `satellite-3d.js` `mount3DViewer` | `turion-space-demo/satellite/satellite-3d.js` | Three.js 3D viewer on `part.html`/`instance.html` | Returns `{ controls, deselect(), selectChild(grp), dispose() }` or `null`. **Re-derives geometry from `partData.specifications.dimensions_mm` only** (`normalizeDims` → `{L,W,H}` with `{40,40,40}` default). Editing the SVG body does NOT affect it. After a dimensions edit, the cheapest correct path is `location.reload()` (re-runs the existing mount). |

### Supporting (frontend SVG editor — what's actually available)
| Option | License / size | Verdict |
|--------|----------------|---------|
| **Hand-rolled `svg-editor.js`** (recommended) | — / ~400-600 LOC | **Use this.** No CDN/license risk; matches the codebase's no-build vanilla style; the feature surface is bounded (select / 8-handle resize / 1-handle rotate / delete / text edit / add rect-line-circle-ellipse-polyline-text / snapshot undo-redo / serialize on Save). |
| `svgcanvas` (`@svgedit/svgcanvas`) | MIT / ~hundreds of KB, **expects a bundler / ES-module import graph** | Reject — it's the headless engine extracted from SVG-Edit and is not a single drop-in `<script>` file; pulling it in means adding a bundler step to the frontend repo, which the project has deliberately avoided. |
| `SVG-Edit` (full app) | MIT / ~MB, iframe-embed app | Reject — it's a whole IDE-in-an-iframe; massive overkill, theming clash, embed friction. |
| `Fabric.js` / `Konva` / `SVG.js` | MIT / 50-300KB UMD `<script>` | Possible but not warranted — they're canvas/scene libraries, and Fabric/Konva work on `<canvas>` not native `<svg>` DOM (Save would have to re-emit SVG from a scene graph, losing the original markup's structure). `SVG.js` is closest (a thin DOM wrapper) but adds a dep for ~no benefit over a hand-roll given the modest scope. **If the planner wants a library anyway, `SVG.js` UMD is the only defensible pick — but the recommendation stands: hand-roll.** |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `drawing_rev int` + `part_revisions` history table | just `drawing_rev int`, no history | History table is ~free (4 columns: `part_def_id`, `rev`, `drawing_svg`, `edited_by`, `edited_at`) and gives a future "restore rev N" + an audit trail; **recommend keeping it** (§Open Question 3). The migration also writes a row at rev 1 for every existing part on first PATCH/regenerate (lazy backfill — don't bulk-backfill). |
| New `part_revisions` table | a row in the existing `audit_log` table | The CAD payloads are large (`drawing_svg` is multi-KB) and the `audit_log.action` CHECK constraint would need yet another widening. A dedicated table is cleaner. If the planner prefers `audit_log`, migration 022 must also widen `chk_audit_log_action` (mirror migration-021's drop-IF-EXISTS / re-add idiom) with e.g. `'edit_part_definition'`, `'retire_part_definition'`, `'edit_part_drawing'`. **Recommend: dedicated `part_revisions` table for the SVG history + an `audit_log` row for the structural events (create/edit/retire/bom-line-delete) using a widened action list** — best of both. |
| `DELETE /api/satellites/:satId/bom/:lineId` also deletes the orphaned `part_instance` | leave the instance | Leave it — it's still a valid instance on the satellite; `/bom/tree`'s roots CTE re-roots it. (§Open Question 8) |

**Installation:** Backend — no new npm deps (the generator port is pure TS). If the planner picks `SVG.js` instead of hand-rolling, it's a `<script src="https://cdn.jsdelivr.net/npm/@svgdotjs/svg.js@3/dist/svg.min.js">` UMD line on `part.html`/`instance.html` — but **recommend not doing this**.

---

## Architecture Patterns

### Recommended layout (additions only)
```
turion-satellite/
├── migrations/
│   └── 022_part_revisions_and_retire.sql        # drawing_rev + retired_at + part_revisions + (optional) audit_log action widen
├── backend/
│   ├── src/
│   │   ├── cad-templates/                        # PORTED from ../../scripts/cad-templates/ (pure fns only)
│   │   │   ├── primitives.ts  palettes.ts
│   │   │   ├── assembly.ts subassembly.ts cylindrical.ts lens-optical.ts
│   │   │   ├── antenna-dish.ts solar-cell.ts fastener.ts plate.ts
│   │   │   └── index.ts                          # exports generateDrawingSvg(part) = chooseTemplate(part).fn(part)
│   │   └── routes/
│   │       ├── parts.ts                          # + POST /, PATCH /:id, PATCH /:id/drawing, POST /:id/drawing/regenerate, DELETE /:id
│   │       └── bom.ts                            # + DELETE /:lineId   (router is mergeParams under /api/satellites/:satId/bom)
│   └── tests/
│       ├── parts.write.test.ts                   # new — POST/PATCH/regenerate/DELETE-retire
│       ├── bom.delete.test.ts                    # new — DELETE bom line, refuse-on-children
│       └── cad-generator.test.ts                 # new — chooseTemplate dispatch + a known part's SVG byte-equal to migration 017's row
turion-space-demo/satellite/
├── svg-editor.js                                 # NEW — vanilla, plain <script>, ~400-600 LOC
├── satellite-api.js                              # + del(path) method
├── part.html  instance.html                      # + "Edit drawing" / "Revert to generated" controls + editor mount; + "Edit part" form + "Retire part" control (part.html)
├── bom.html                                      # extended Add-BOM modal + "create new part" sub-form; + delete control on tree rows
└── parts.html                                    # + "Edit part" / "Retire part" affordances (optional — part.html is the canonical place)
turion-satellite/backend/scripts/
└── audit-satellite-buttons.mjs                   # 1-line regex tweak: iterApiCalls + the `routeMatches`/buildRouteAllowlist already handle DELETE; just add del to the satelliteApi.<method> regex
```

### Pattern 1: Hand-rolled vanilla SVG editor
**What:** `svg-editor.js` exposes `window.svgEditor = { open(svgString, { onSave, onCancel }) }`. Internally it parses `svgString` via `new DOMParser().parseFromString(svg, 'image/svg+xml')`, mounts the `<svg>` into an overlay/modal, and works on the **live SVG DOM** (not a model) — selection is just a reference to the currently-clicked element.
**When to use:** the only option (no acceptable library — see §Standard Stack).
**Editing model (recommend):**
- **Select:** `svg.addEventListener('pointerdown', e => { sel = e.target.closest('rect,circle,ellipse,line,polyline,polygon,path,text'); drawHandles(sel); })`. Clicking empty space deselects.
- **Move:** pointerdown on the selected element → pointermove updates a `transform="translate(dx,dy)"` (or directly mutates `x`/`y`/`cx`/`cy`/`points`/`d` — translate is simplest and uniform). On pointerup, optionally bake the transform into geometry (or just leave the `transform` attr — SVG round-trips it fine).
- **Resize:** an 8-handle bounding box (corners + edge midpoints) drawn from `sel.getBBox()`. Dragging a handle scales via a `transform` matrix or rewrites geometry. **getBBox()** must be called while the element is rendered (in the DOM, not display:none) — a known gotcha.
- **Rotate:** one handle above the bbox; drag → `transform="rotate(deg, cx, cy)"` around the bbox center.
- **Delete:** `Delete`/`Backspace` key or a toolbar button → `sel.remove()`.
- **Edit text:** double-click a `<text>` → prompt or an inline `<input>` overlay → set `sel.textContent`.
- **Add primitive:** toolbar buttons; click-drag on the canvas creates a `<rect>`/`<line>`/`<circle>`/`<ellipse>`/`<polyline>`/`<text>` with `document.createElementNS('http://www.w3.org/2000/svg', tag)` and appends to the root `<svg>` (or to the first `<g>` if one exists).
- **Undo/redo:** snapshot the whole `<svg>` `outerHTML` onto a stack after every committed mutation (Save the *string*, not nodes). `undo()` re-parses the previous snapshot and replaces the canvas. Cap the stack (~50). This is O(svg-size) per op but the SVGs are small — fine.
- **Save:** `new XMLSerializer().serializeToString(svgEl)` → strip the editor's own handle/overlay elements first (keep them in a separate `<g class="__editor-ui">` that's removed before serialize) → `PATCH /api/parts/:id/drawing { drawing_svg }`.
**Example skeleton:**
```javascript
// Source: hand-rolled (no library) — namespace constants per MDN SVG-in-HTML docs
const SVG_NS = 'http://www.w3.org/2000/svg';
window.svgEditor = (function () {
  let host, svgEl, sel = null, undoStack = [], redoStack = [];
  function snapshot() { undoStack.push(serialize()); redoStack = []; if (undoStack.length > 50) undoStack.shift(); }
  function serialize() {
    const clone = svgEl.cloneNode(true);
    clone.querySelectorAll('.__editor-ui').forEach(n => n.remove());
    return new XMLSerializer().serializeToString(clone);
  }
  function open(svgString, { onSave, onCancel }) {
    const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
    if (doc.querySelector('parsererror')) { /* fall back to raw textarea edit */ }
    svgEl = doc.documentElement;             // the <svg>
    // ... mount svgEl into a modal overlay, add a toolbar, wire pointer/keyboard, drawHandles(), etc.
  }
  return { open };
})();
```

### Pattern 2: Server-side generator port + the `regenerate` route
**What:** `backend/src/cad-templates/index.ts` exports `generateDrawingSvg(part: { part_number: string; subsystem_code: string | null; specifications: any }): string` — it contains the `chooseTemplate` dispatch table copied from `scripts/generate-cad-svgs.ts` (regex order matters; the W5-fix comment about SOLAR-* before plate must carry over) and calls the matched template fn. The route:
```typescript
// backend/src/routes/parts.ts  (additions)
import { generateDrawingSvg } from '../cad-templates';
router.post('/:id/drawing/regenerate', requireAuth, async (req, res) => {
  const part = await queryOne(`SELECT pd.id, pd.part_number, pd.specifications, s.code AS subsystem_code
                               FROM part_definitions pd LEFT JOIN subsystems s ON s.id = pd.subsystem_id
                               WHERE pd.id = $1 AND pd.retired_at IS NULL`, [req.params.id]);
  if (!part) { res.status(404).json({ error: 'Part not found' }); return; }
  let svg: string;
  try { svg = generateDrawingSvg(part); } catch (e) { res.status(500).json({ error: 'Generation failed' }); return; }
  const updated = await queryOne(`UPDATE part_definitions SET drawing_svg = $1, drawing_rev = drawing_rev + 1
                                  WHERE id = $2 RETURNING id, drawing_rev`, [svg, req.params.id]);
  await query(`INSERT INTO part_revisions (part_def_id, rev, drawing_svg, edited_by) VALUES ($1,$2,$3,$4)`,
              [req.params.id, updated.drawing_rev, svg, req.user!.id]);
  res.json({ part_id: updated.id, drawing_rev: updated.drawing_rev, drawing_svg: svg });
});
```
**Port gotchas:** (1) the `scripts/` files import each other with `./foo.js` ESM specifiers — check whether `backend/tsconfig.json` uses `"module": "NodeNext"` / `"moduleResolution": "NodeNext"` (which *requires* the `.js` extension) or `"CommonJS"` (which forbids it). Match whatever `backend/src/` already does — open an existing multi-file area like `src/lib/`. (2) `scripts/cad-templates/__tests__/` exists — port those tests too (under `backend/tests/`) so the generator stays covered. (3) The generator references `/Users/jeet/turion-space-demo/satellite/cad/*.svg` only in *comments* (the palettes were derived from them) — no runtime dependency, safe.

### Pattern 3: New CRUD routes — follow `routes/parts.ts` / `routes/bom.ts` verbatim
- `POST /api/parts` — validate `part_number` (non-empty, unique → 409 on conflict), `description`, `subsystem_id` (must exist), `default_make_buy ∈ {make,buy}`, optional `itar_flag`, optional `dimensions_mm`. INSERT with `specifications = jsonb_build_object('dimensions_mm', $dims::jsonb)` (or `'{}'` if no dims), then generate `drawing_svg`, `drawing_rev=1`. Return 201 with the row. Audit-log a `'create_part_definition'` action (requires the widened CHECK).
- `PATCH /api/parts/:id` — accept any subset of `{description, subsystem_id, default_make_buy, itar_flag, part_number, dimensions_mm}`. Build a dynamic `SET` clause from the provided keys (parametrized). For `dimensions_mm`, merge into `specifications` (`specifications = jsonb_set(specifications, '{dimensions_mm}', $1::jsonb)`). 404 if not found or retired. Audit-log `'edit_part_definition'`. **Does NOT auto-regenerate the drawing** — the *frontend* prompts and calls `regenerate` separately (keeps the route single-purpose; the prompt is a UX choice).
- `PATCH /api/parts/:id/drawing` — body `{ drawing_svg }`. Validate it's a string, starts with `<svg`, contains `</svg>`, and is under ~500KB (defensive; `express.json({limit:'2mb'})` is the hard ceiling). UPDATE `drawing_svg`, `drawing_rev = drawing_rev + 1`, INSERT a `part_revisions` row, return `{ drawing_rev }`. 404 if not found/retired.
- `DELETE /api/parts/:id` — soft-delete. `?force=1` query flag. If `!force` and `EXISTS (SELECT 1 FROM part_instances WHERE part_definition_id=$1)` → 409 `{ error: 'Part has live instances; pass ?force=1 to retire anyway' }`. Else `UPDATE part_definitions SET retired_at = NOW() WHERE id=$1 AND retired_at IS NULL`. Audit-log `'retire_part_definition'`. (Optionally also support `?undo=1` or a separate `POST /api/parts/:id/restore` to clear `retired_at` — handy for the smoke test "retire then un-retire". **Recommend a `POST /api/parts/:id/restore`.**)
- `DELETE /api/satellites/:satId/bom/:lineId` — in `bom.ts` (`Router({mergeParams:true})` already; add `router.delete('/:lineId', requireAuth, …)`). Verify the line exists and `satellite_id = satId` (404 otherwise). If the line's `child_part_instance_id` is itself a parent in any released `bom_lines` on this satellite → 409 `{ error: 'This line has sub-lines; delete those first' }` unless `?cascade=1` (recommend: don't implement cascade in v1 — just refuse). Else `DELETE FROM bom_lines WHERE id=$1`. Return 204. Audit-log optional.

### Pattern 4: Mount in `app.ts`
`PATCH /api/parts/:id` etc. are added to the *existing* `parts` router → no `app.ts` change for those. `DELETE /api/satellites/:satId/bom/:lineId` is added to the *existing* `bom` router (already `app.use('/api/satellites/:satId/bom', bomRouter)` via `satellites.ts:179`) → no `app.ts` change. **The button-audit derives its allowlist from `app.ts`'s mount tree + each router's `router.{get,post,patch,put,delete}('...')` — since all new routes live inside already-mounted routers, the audit picks them up automatically.** (Confirmed: `ROUTER_METHOD_RE` in the audit already matches `delete`.)

### Pattern 5: The `retired_at IS NULL` filter sweep — enumerate every part-definition list/picker SELECT
Files containing `part_definitions` SELECTs (`grep -rln part_definitions backend/src/routes/`): `parts.ts`, `bom.ts`, `buy-costs.ts`, `make-costs.ts`, `cost-rollup.ts`, `instances.ts`, `integration.ts`, `make-buy-decisions.ts`, `work-orders.ts`, `procurement-requests.ts`, `vendor-orders.ts`. **Add `AND pd.retired_at IS NULL` ONLY to the SELECTs that *enumerate parts for picking/listing*:**
- `parts.ts` — `GET /` list (`WHERE pd.retired_at IS NULL`), `GET /:id` (404 if retired — or return it with a `retired_at` field so the part page can show a "retired" banner; **recommend: return it, with the field, and let the page show the banner** — retiring shouldn't 404 a deep link, just hide from lists), `GET /:partDefId/children` (filter child rows: `AND c_pd.retired_at IS NULL`).
- `bom.ts` — `GET /tree` (the roots CTE + the recursive child join: `AND pd.retired_at IS NULL` / `AND c_pd.retired_at IS NULL`) **— BUT** if `?force=1` retire left orphan instances, those instances still appear (instance ≠ definition); the tree should still show them with a badge. Decide: **filter the *definition* from the tree means a retired-part instance shows with `part_number` still resolvable (the JOIN still works since we're only adding a WHERE on the recursive walk's child filter — actually adding `AND c_pd.retired_at IS NULL` would *drop* the subtree). Recommend: do NOT filter the tree's recursive walk by `retired_at` (it would silently amputate sub-assemblies); instead surface `c_pd.retired_at` in the node payload and let `bom.html` render a "⚠ retired part" badge. Only filter the *pickers* and the *parts list*.** This is the safest reading of "hidden from BOM tree" — hidden from the *Add-line picker*, badged in the tree.
- Kanban — `kanban.html` lists `part_instances` grouped by stage (instances, not definitions). If a definition is retired, its instances still exist. **Recommend: surface `retired_at` on the instance payload (join through to `part_definitions`) and badge; don't drop the card.** (Or: the kanban's instance query *could* `WHERE pd.retired_at IS NULL` — but that hides in-flight work, which is wrong. Badge, don't hide.)
- The Add-BOM-line modal's "pick existing part" sub-form (new in W5) — must `GET /api/parts` which is already filtered; good.
- Satellite pickers (the Phase-33-fix bom/kanban satellite dropdowns) list *satellites*, not parts → n/a.

**Bottom line for the sweep:** the *required* edits are `parts.ts GET /` and `parts.ts GET /:partDefId/children` (and any new "pick a part" list endpoint). Everything else gets a `retired_at` field surfaced for badging, not a hard filter. **Document this decision explicitly in the plan** so a reviewer doesn't "fix" the tree to amputate subtrees.

### Anti-Patterns to Avoid
- **Inline `onclick="..."` on any new control.** The button audit fails closed on dead-onclick. Use `addEventListener` exclusively. (The existing modal HTML has `onclick="document.getElementById('bomLineModal').remove()"` which the audit *allowlists* via `ONCLICK_BUILTIN_PATTERNS` — `document.getElementById(...).remove()` is on the list. New controls that do anything more than that **must** be `addEventListener`.)
- **Adding `satelliteApi.del()` without tweaking the audit regex.** `iterApiCalls` is `/satelliteApi\.(get|post|patch)\s*\(/gi` — DELETE calls would be invisible to the audit. Change it to `(get|post|patch|put|delete|del)` (and add `del`/`delete` to the method→path resolution if the script branches on method — it doesn't, it just uppercases). The route side already handles DELETE. **This is a planned task in W3.**
- **Re-running the migration-017 bulk backfill on regenerate.** `regenerate` updates ONE part. Migration 017's 5523-line bulk UPDATE is not touched, ever.
- **Auto-regenerating the drawing on every `PATCH /api/parts/:id`.** Keep the route single-purpose; the *frontend* prompts and calls `regenerate`.
- **Letting the SVG editor's own handles/overlay leak into the saved `drawing_svg`.** Keep editor UI in a removable `<g class="__editor-ui">`; strip before serialize.
- **`getBBox()` on a `display:none` element.** It returns zeros. The editor must operate on a rendered SVG.
- **Deploying via `gh workflow run deploy-*` (dollor.ai's pipeline).** Turion uses its OWN `build-and-push.sh` (Lambda) and `deploy-frontend.sh` (S3+CF). Commits use `git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar"`.
- **`deploy-frontend.sh` without the F6 pre-flight.** The frontend repo has dirty WIP (`about-this-demo.html`, `agent-sales-cash.html`, `dashboard-cio.html`, dirty `backend/*`, a `.superpowers/` dir). `deploy-frontend.sh` does `aws s3 sync . --delete` and only excludes `.git/*ts .vercel/* .DS_Store backend/* *.md *.sh deploy-*` — so the WIP HTML files **would get published**. The F6 pre-flight stashes/moves them aside and restores after. (Every Phase 27-34 deploy did this; mirror it.)
- **Forgetting to widen `audit_log.action` CHECK if you write new audit actions.** Migration 022 must include the drop-IF-EXISTS / re-add idiom (copy from migration 021) with the new actions, OR don't write audit_log rows for the new operations (acceptable — the `part_revisions` table covers drawing history; structural-change auditing is nice-to-have, not required).

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Cabinet-projection SVG generation for "Revert to generated" | a new generator | **Port `scripts/cad-templates/*.ts` + `chooseTemplate`** | It's already written, tested (`scripts/cad-templates/__tests__/`), deterministic, uniqueness-gated, and matches the existing 87+ drawings exactly. Re-deriving it would diverge from the corpus. |
| SVG parsing / serialization | a regex SVG parser | `DOMParser` / `XMLSerializer` (browser built-ins) | SVG is XML; the browser parses it correctly including namespaces. Regex-on-SVG is the canonical foot-gun. |
| Bounding box / hit testing in the editor | manual geometry math | `element.getBBox()` + `event.target.closest(selector)` | `getBBox()` is exact (in user units); event targeting handles overlapping shapes. |
| Auth on the new routes | a custom token check | `requireAuth` from `src/middleware/auth.ts` | Already verifies ES256/HS256, populates `req.user`. |
| The API route allowlist for the button audit | hand-maintaining a list | the existing `audit-satellite-buttons.mjs` (derives from `app.ts`) | It's already there and already 0-violations; just make sure new routes are inside mounted routers (they are) and tweak the `satelliteApi.<method>` regex for `del`. |
| Migration runner | a new migration framework | `psql "$DATABASE_URL" -f migrations/0NN_...sql` (manual, idempotent) | That's the established convention (migrations 016-021). Each migration is self-idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, drop-IF-EXISTS / re-add for CHECKs). |

**Key insight:** This phase has *almost nothing* that should be invented from scratch. The single genuinely new artifact is `svg-editor.js`, and even that is "new" only because no acceptable no-build library exists — the *logic* (DOMParser → live-DOM manipulation → XMLSerializer → PATCH) is mundane.

---

## Common Pitfalls

### Pitfall 1: The ported generator doesn't compile / doesn't ship in the Lambda image
**What goes wrong:** Files copied into `backend/src/cad-templates/` keep `./foo.js` import specifiers that don't match `backend/tsconfig.json`'s `moduleResolution`, or `tsc` doesn't include them in the build output, so the Lambda's `dist/` is missing the templates and `regenerate` 500s in prod (works locally under `tsx`).
**Why it happens:** `scripts/` runs via `node --import tsx` (transpile-on-the-fly, lenient); `backend/` is `tsc`-compiled then `npm ci --omit=dev`'d into the image (strict, only `dist/` ships).
**How to avoid:** (1) Open an existing multi-file `backend/src/` area (`src/lib/`) to see the import-extension convention; match it. (2) `npm run build` locally and confirm `dist/cad-templates/` exists. (3) Add `backend/tests/cad-generator.test.ts` that imports `../src/cad-templates` and asserts a known part (e.g. `ADCS-ASSY`) regenerates to a string byte-equal to that row's `drawing_svg` in `migrations/017_redraw_cad_phase27.sql` (extract the `$svg$...$svg$` literal). This test fails loudly if the port drifted.
**Warning signs:** `regenerate` works in `npm run dev` but 500s after `build-and-push.sh`.

### Pitfall 2: The button audit goes silent (passes but doesn't validate the new DELETE calls)
**What goes wrong:** You add `satelliteApi.del('/api/satellites/'+sat+'/bom/'+lineId)` calls, the audit still reports `violations: 0` — but it never *checked* them (the regex doesn't match `.del(`). A typo'd path ships.
**Why it happens:** `iterApiCalls` regex is `/satelliteApi\.(get|post|patch)\s*\(/gi`.
**How to avoid:** Tweak the regex to `(get|post|patch|put|delete|del)`. Add a test fixture (or just eyeball the audit's `satelliteApi calls scanned:` count went up by the right amount). The `backend/tests/audit-satellite-buttons.test.ts` already exists — extend it if practical.
**Warning signs:** `satelliteApi calls scanned:` count doesn't increase after adding DELETE calls.

### Pitfall 3: Retiring a part silently amputates BOM sub-assemblies
**What goes wrong:** Adding `AND c_pd.retired_at IS NULL` to the recursive child join in `GET /bom/tree` drops the *entire subtree* under a force-retired part — the BOM looks broken for satellites that still have that part installed.
**Why it happens:** "hidden from the BOM tree" read too literally.
**How to avoid:** Filter only the *pickers* and the *parts list*. In the tree (and kanban), *surface* `retired_at` on the node/card and render a "⚠ retired" badge. Block retire-without-`?force=1` when live instances exist, so the only way to end up here is a deliberate force. **State this decision in the plan.**
**Warning signs:** A satellite's BOM tree suddenly shows fewer nodes after a retire.

### Pitfall 4: Editing the SVG breaks the 3D viewer (it doesn't — but people assume it might)
**What goes wrong:** Nothing — but a reviewer might "defensively" re-mount the 3D viewer from the edited SVG, or block SVG edits while in 3D mode.
**Why it happens:** Conflating "the drawing" (2D SVG) with "the 3D mesh" (procedural, from `dimensions_mm`).
**How to avoid:** `mount3DViewer` reads `partData.specifications.dimensions_mm` only — it never parses `drawing_svg`. So: SVG edits → no 3D change. *Dimensions* edits → re-`location.reload()` (re-mounts 3D from the fresh `dimensions_mm`) and optionally `regenerate` the 2D drawing. The "Edit drawing" mode should only be reachable from the 2D view (or it should `dispose()` the 3D viewer and switch to 2D first — cosmetic).
**Warning signs:** N/A — this is a "don't overthink it" note.

### Pitfall 5: `deploy-frontend.sh` publishes the repo's dirty WIP
**What goes wrong:** `about-this-demo.html` / `agent-sales-cash.html` / `dashboard-cio.html` (uncommitted experiments) get pushed to prod because `aws s3 sync . --delete` includes `*.html` and only excludes a short list.
**Why it happens:** `deploy-frontend.sh` syncs the *working tree*, not a clean checkout.
**How to avoid:** The "F6 pre-flight" every prior phase used: `git stash -u` (or `mv` the dirty WIP files + `.superpowers/` aside) → run `deploy-frontend.sh` → restore. The plan's deploy task must spell this out.
**Warning signs:** Unrelated pages change on prod after a deploy.

### Pitfall 6: `drawing_rev` migration default vs. existing rows
**What goes wrong:** `ADD COLUMN drawing_rev int DEFAULT 1` — existing rows get `1`. Fine. But if a plan then "backfills" `part_revisions` with a rev-1 row for all ~165 parts in the migration, that's a lot of multi-KB rows for no benefit.
**Why it happens:** Over-eager backfill.
**How to avoid:** Lazy backfill — write the first `part_revisions` row only when a part is first PATCH'd or regenerated (the route does the INSERT). Migration 022 only creates the column + table; no data backfill.
**Warning signs:** Migration 022 takes >1s or the SQL file is huge.

### Pitfall 7: Creating a part_definition with a duplicate `part_number`
**What goes wrong:** `part_definitions.part_number` is `UNIQUE NOT NULL`. `POST /api/parts` with a dup → Postgres throws a unique-violation; if uncaught it 500s instead of a clean 409.
**How to avoid:** Catch the PG error code `23505` (unique_violation) → 409 `{ error: 'A part with that part number already exists' }`. (Or pre-check with a SELECT — but the catch is race-safe.)
**Warning signs:** 500s in the create flow with `duplicate key value violates unique constraint "part_definitions_part_number_key"`.

### Pitfall 8: The `chooseTemplate` regex order
**What goes wrong:** Porting `chooseTemplate` but re-ordering the regex tests → `SOLAR-PANEL-A` matches the `-PANEL-` plate rule instead of the solar rule (the source has a W5-fix comment about exactly this).
**How to avoid:** Copy the dispatch table verbatim, comments included. The `cad-generator.test.ts` byte-equality check on a solar part would catch a regression.

---

## Code Examples

### Migration 022 skeleton (idempotent, mirrors migration 021's style)
```sql
-- 022_part_revisions_and_retire.sql · Phase 35 · 2026-05-12
-- Adds:
--   1. part_definitions.drawing_rev   int not null default 1   (bumps on PATCH-drawing / regenerate)
--   2. part_definitions.retired_at    timestamptz null         (soft-delete; NULL = active)
--   3. turion_satellite.part_revisions(id, part_def_id, rev, drawing_svg, edited_by, edited_at)
--   4. (optional) widen audit_log.action CHECK for the new structural actions
-- Idempotent. Apply: psql "$DATABASE_URL" -f migrations/022_part_revisions_and_retire.sql
SET search_path TO turion_satellite, public;
DO $$ BEGIN IF current_database() NOT IN ('postgres') THEN RAISE EXCEPTION 'Refusing to run on database %', current_database(); END IF; END $$;

ALTER TABLE turion_satellite.part_definitions ADD COLUMN IF NOT EXISTS drawing_rev int NOT NULL DEFAULT 1;
ALTER TABLE turion_satellite.part_definitions ADD COLUMN IF NOT EXISTS retired_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_part_definitions_retired_at ON turion_satellite.part_definitions(retired_at);

CREATE TABLE IF NOT EXISTS turion_satellite.part_revisions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_def_id  uuid NOT NULL REFERENCES turion_satellite.part_definitions(id) ON DELETE CASCADE,
  rev          int  NOT NULL,
  drawing_svg  text NOT NULL,
  edited_by    uuid,                          -- Supabase auth user id (req.user.id); not FK'd (auth schema is separate)
  edited_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (part_def_id, rev)
);

-- Optional: widen audit_log action CHECK (only if the routes write audit_log rows)
ALTER TABLE turion_satellite.audit_log DROP CONSTRAINT IF EXISTS chk_audit_log_action;
ALTER TABLE turion_satellite.audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE turion_satellite.audit_log ADD CONSTRAINT chk_audit_log_action CHECK (action IN (
  'delete','restore','status_change','rate_change','fx_seed',
  'sync_sales_order','sync_ns_invoice','sync_arena_doc','sync_mes_work_order',
  'densify_seed','spawn_satellite_program','advance_satellite_status',
  'create_part_definition','edit_part_definition','retire_part_definition','restore_part_definition',
  'edit_part_drawing','delete_bom_line'
));
```

### `satellite-api.js` — add `del()`
```javascript
// Source: turion-space-demo/satellite/satellite-api.js (existing pattern, add one line)
window.satelliteApi = {
  get: (path) => api(path),
  post: (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => api(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path) => api(path, { method: 'DELETE' }),     // NEW — DELETE has no body for these routes
  ApiError, raw: api,
};
```
> Note: `api()` does `res.json()` unconditionally — a `204 No Content` DELETE response has an empty body and `res.json()` throws. Either make the DELETE routes return `200 { ok: true }` (simplest — recommend this) or guard `api()` with `if (res.status === 204) return null;`.

### Audit-script regex tweak (W3)
```javascript
// Source: turion-satellite/backend/scripts/audit-satellite-buttons.mjs  (one line in iterApiCalls)
const re = /satelliteApi\.(get|post|patch|put|delete|del)\s*\(/gi;   // was: (get|post|patch)
```
> `ROUTER_METHOD_RE` already includes `delete`, and `buildRouteAllowlist` already emits `DELETE /api/...` routes — so once `iterApiCalls` captures `.del(` calls, `routeMatches` validates them (it uppercases the method; `del` → `DEL` won't match `DELETE` — so also map `del`→`DELETE` in `iterApiCalls`: `const method = m[1].toUpperCase() === 'DEL' ? 'DELETE' : m[1].toUpperCase();`). **Two tiny edits, one file.**

### Test pattern for a new write route (`backend/tests/parts.write.test.ts`)
```typescript
// Source: turion-satellite/backend/tests/parts.test.ts (existing pattern)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto'; import jwt from 'jsonwebtoken';
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
process.env.SUPABASE_JWT_PUBLIC_KEY = publicKey.export({ type: 'spki', format: 'pem' }) as string;
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
vi.mock('../src/db', () => ({ query: vi.fn(), queryOne: vi.fn(), pool: { query: vi.fn() } }));
import request from 'supertest';
import { query, queryOne } from '../src/db'; import { app } from '../src/app';
const tok = () => jwt.sign({ sub: 'u-1', app_metadata: { role: 'engineer' } }, privateKey, { algorithm: 'ES256' });
beforeEach(() => vi.resetAllMocks());
describe('POST /api/parts', () => {
  it('401 without auth', async () => { const r = await request(app).post('/api/parts').send({}); expect(r.status).toBe(401); });
  it('creates a part_definition + generated drawing', async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ id: 'sub-1' });           // subsystem exists
    vi.mocked(queryOne).mockResolvedValueOnce({ id: 'pd-new', part_number: 'NEW-001', drawing_rev: 1 }); // insert RETURNING
    const r = await request(app).post('/api/parts').set('Authorization', `Bearer ${tok()}`)
      .send({ part_number: 'NEW-001', description: 'X', subsystem_id: 'sub-1', default_make_buy: 'make' });
    expect(r.status).toBe(201); expect(r.body.id).toBe('pd-new');
  });
});
```

---

## State of the Art

| Old | Current | When | Impact |
|-----|---------|------|--------|
| `drawing_svg` only ever written by migrations (016/017/011) — read-only from the app | App-writable via `PATCH /api/parts/:id/drawing` + `drawing_rev` + `part_revisions` | Phase 35 | First time the corpus is mutable at runtime. The `regenerate` route + `part_revisions` history mitigate accidental data loss. |
| Generator lives only in `scripts/` (dev-only, `tsx`) | Generator also in `backend/src/cad-templates/` (compiled, ships in Lambda) | Phase 35 | "Revert to generated" works in prod. Keep the two in sync (or, better, have `scripts/generate-cad-svgs.ts` import from `backend/src/cad-templates/` in a follow-up — out of scope). |
| `part_definitions` only ever inserted by seeds/migrations | App-creatable via `POST /api/parts` | Phase 35 | Users can add parts. `part_number` uniqueness must be handled (409 on `23505`). |
| Parts are forever | `retired_at` soft-delete | Phase 35 | Hidden from lists/pickers; badged (not amputated) in trees/kanban. |

**Deprecated/outdated:** none — this is purely additive. No existing route signatures change. The only existing-file edits are: `parts.ts` (+routes), `bom.ts` (+route), `app.ts` (no change needed — new routes are in mounted routers), `audit-satellite-buttons.mjs` (regex), `satellite-api.js` (+del), `part.html`/`instance.html`/`bom.html`/`parts.html` (UI), and the `retired_at IS NULL` filter on `parts.ts`'s list/children SELECTs.

---

## Open Questions

<open_questions_resolved>
1. **SVG editor library vs. hand-roll** — *Resolved: hand-roll.* No acceptable single-file no-build library exists (`svgcanvas`/`SVG-Edit` need a bundler/iframe; `Fabric`/`Konva` are canvas-not-SVG). Build ~400-600 LOC `svg-editor.js`: live-DOM model (DOMParser → manipulate → XMLSerializer), select/8-handle-resize/1-handle-rotate/delete/text-edit/add-{rect,line,circle,ellipse,polyline,text}/snapshot-undo-redo. Editor UI in a removable `<g class="__editor-ui">`. Fall back to a raw `<textarea>` edit if `DOMParser` reports a `parsererror`.
2. **Where the Phase-27 generator lives & how to port it** — *Resolved.* It's `turion-satellite/scripts/cad-templates/*.ts` (pure template fns) + the `chooseTemplate` dispatch table in `scripts/generate-cad-svgs.ts`. Port: copy `cad-templates/` → `backend/src/cad-templates/`, add `backend/src/cad-templates/index.ts` exporting `generateDrawingSvg(part)` (= the `chooseTemplate` dispatch verbatim + invoke the matched fn), match the `backend/tsconfig.json` import-extension convention, add `backend/tests/cad-generator.test.ts` asserting a known part round-trips byte-equal to its `migrations/017` literal. The migration's bulk backfill is NOT re-run. (The generator's `pg`-`Client`/`fs` machinery in `generate-cad-svgs.ts` is NOT ported — only the pure templates + dispatch.)
3. **`drawing_rev` semantics** — *Resolved: int that bumps on every PATCH-drawing AND regenerate, PLUS a `part_revisions` history table* (`part_def_id, rev, drawing_svg, edited_by, edited_at`, `UNIQUE(part_def_id, rev)`). Lazy backfill (first row written by the route, not the migration). Gives audit + a future "restore rev N" (a `GET /api/parts/:id/revisions` + a restore route are nice-to-haves the planner can include or defer).
4. **Retire blast radius** — *Resolved.* `retired_at timestamptz NULL`. **Hard filter only on the *parts list* (`parts.ts GET /`) and the *children/picker* endpoints (`parts.ts GET /:partDefId/children`, the new "pick a part" list).** In the BOM tree (`GET /bom/tree`) and kanban: do NOT filter (would amputate sub-assemblies / hide in-flight work) — surface `retired_at` on the node/card and badge. `GET /api/parts/:id` returns the retired part (with the field) so deep links don't 404. Retire blocked if `EXISTS(part_instances with this part_def)` unless `?force=1`; force just sets `retired_at` (orphan instances stay, badged). Add `POST /api/parts/:id/restore` (clears `retired_at`) for the smoke test and for un-doing mistakes.
5. **Editing `dimensions_mm`** — *Resolved.* `PATCH /api/parts/:id` merges into `specifications.dimensions_mm`. The route does NOT auto-regenerate. The frontend, after a successful dimensions edit, prompts "Regenerate the 2D drawing to match? (the 3D view updates either way)" → if yes, `POST .../drawing/regenerate` → then `location.reload()` (re-mounts `mount3DViewer` from the fresh `dimensions_mm` and reloads the SVG). Simplest correct behavior.
6. **Concurrency / who-can-edit** — *Resolved.* `requireAuth` only (any logged-in user). Last-write-wins. No locking. `drawing_rev` + `part_revisions` history is the mitigation. (A future optimistic-concurrency check — PATCH includes `expected_rev`, 409 on mismatch — is a nice-to-have the planner may include for `PATCH .../drawing` since it's cheap; **recommend including it** for the drawing PATCH only.)
7. **`POST /api/parts` scope** — *Resolved.* Creates ONLY the `part_definition` (+ its generated `drawing_svg`, `drawing_rev=1`, `specifications` from the supplied `dimensions_mm` or `{}`). It does NOT create a `part_instance`. The add-BOM-line modal's "create new part" sub-form does: `POST /api/parts` → on success, the existing flow needs a `part_instance` — **but `POST /api/satellites/:satId/bom` takes a `child_part_instance_id`, not a `part_definition_id`** → so the sub-form must ALSO call the instance-create route first. Check `routes/instances.ts` `POST /api/satellites/:satId/instances` (it exists — `instances.ts:59` checks `part_definition_id`). So the sub-form chain is: `POST /api/parts` → `POST /api/satellites/:satId/instances {part_definition_id}` → `POST /api/satellites/:satId/bom {child_part_instance_id, parent_part_instance_id, qty}`. Three calls, all existing-or-new routes, all `addEventListener`-wired. **The planner should verify the `POST .../instances` request shape from `routes/instances.ts`.**
8. **DELETE BOM line** — *Resolved.* `DELETE /api/satellites/:satId/bom/:lineId` deletes only the `bom_lines` row; the orphaned `part_instance` survives and re-appears as a root node (the `/bom/tree` roots CTE treats "not a child in any bom_line" as a root). Refuse (409) if the line's child instance is itself a parent in any released `bom_lines` on this satellite ("delete the sub-lines first") — no `?cascade=1` in v1. Return `200 {ok:true}` (not 204) so `satelliteApi.del()`'s `res.json()` doesn't throw.
9. **`satellite-api.js` DELETE support** — *Resolved: add `del(path)`* + tweak `audit-satellite-buttons.mjs`'s `iterApiCalls` regex to `(get|post|patch|put|delete|del)` and map `del`→`DELETE` (two edits, one file). DELETE routes return `200 {ok:true}` so `res.json()` is safe.
</open_questions_resolved>

**Remaining genuine unknown (LOW confidence, flag for the planner/executor to resolve at code time):**
- The exact `backend/tsconfig.json` `module`/`moduleResolution` — determines whether the ported `cad-templates/*.ts` keep their `./foo.js` import specifiers or drop them. **Mitigation:** open `backend/tsconfig.json` + an existing multi-file `backend/src/` area before porting.
- The exact request shape of `POST /api/satellites/:satId/instances` (needed for the create-new-part chain in §Open Question 7). **Mitigation:** read `routes/instances.ts` (it's short).
- Whether `part.html`/`instance.html` already have a convenient place to hang the "Edit drawing" button (the `.cad-frame` has `#toggleCallouts`, `#viewToggle` chips — adding an `#editDrawingBtn` chip alongside is natural). Cosmetic; the planner can specify the exact DOM target after a quick read of `part.html` lines ~120-135.

---

## Plan Breakdown (recommended — 7 plans, 6 waves)

| Wave | Plan | Scope | Depends on | Can run parallel with |
|------|------|-------|------------|----------------------|
| **W1** | 35-01 | **Migration 022** (`drawing_rev`, `retired_at`, `part_revisions`, optional audit_log widen) — written idempotent, applied to prod via `psql`, double-apply proven clean. **+ port `scripts/cad-templates/*` → `backend/src/cad-templates/` + `index.ts` (`generateDrawingSvg`) + `backend/tests/cad-generator.test.ts`** (byte-equality vs a migration-017 literal; port the `__tests__/` cases too). `npm run build` confirms `dist/cad-templates/` ships. | — | — (foundation; nothing else can land first) |
| **W2** | 35-02 | **Backend: parts CRUD + drawing routes** — `POST /api/parts`, `PATCH /api/parts/:id`, `PATCH /api/parts/:id/drawing` (+rev bump + `part_revisions` insert + optional `expected_rev` 409), `POST /api/parts/:id/drawing/regenerate`, `POST /api/parts/:id/restore`; `23505`→409 on dup part_number. Tests (`parts.write.test.ts`). `tsc --noEmit` clean, button audit 0. | W1 (uses `generateDrawingSvg`, `part_revisions`, `drawing_rev`) | 35-03 |
| **W2** | 35-03 | **Backend: retire + bom-line-delete + the `retired_at` sweep** — `DELETE /api/parts/:id` (`?force=1`), `DELETE /api/satellites/:satId/bom/:lineId` (refuse on sub-lines, return `200 {ok}`); add `AND pd.retired_at IS NULL` to `parts.ts GET /` + `GET /:partDefId/children`; surface `retired_at` on `GET /api/parts/:id`, `GET /bom/tree` nodes, and the kanban instance query (badge, don't filter — **document this decision in the plan**). Tests (`bom.delete.test.ts`, extend `parts.test.ts`). Button audit 0. | W1 (uses `retired_at`) | 35-02 |
| **W3** | 35-04 | **Frontend plumbing** — `satellite/svg-editor.js` (the hand-rolled editor, ~400-600 LOC, `window.svgEditor.open(svgString,{onSave,onCancel})`, removable `<g class="__editor-ui">`, parsererror→textarea fallback) **+ `satellite-api.js` `del()` method** (DELETE returns `200 {ok}`) **+ the `audit-satellite-buttons.mjs` `iterApiCalls` regex tweak** (`del`/`delete`, map `del`→`DELETE`). `node --check` clean. | W2/W3 routes exist (so the editor's Save target is real) — can start in parallel with W2/W3 but must land after them | — |
| **W4** | 35-05 | **Wire the drawing editor into `part.html` + `instance.html`** — "Edit drawing" chip on `.cad-frame` (2D mode), "Revert to generated" button (confirm → `POST .../drawing/regenerate` → reload), Save → `PATCH .../drawing` → reload. All `addEventListener`. From `instance.html`, a link/launch into `part.html`'s edit mode (or an inline editor — recommend just deep-link to `part.html?edit=drawing`). | 35-04 (svg-editor.js), 35-02 (drawing routes) | 35-06 |
| **W5** | 35-06 | **Part-management UI** — extended Add-BOM-line modal on `bom.html` with a "➕ create new part" sub-form (the 3-call chain: `POST /api/parts` → `POST /api/satellites/:satId/instances` → `POST .../bom`); "Edit part" form on `part.html` (and optionally `parts.html`) → `PATCH /api/parts/:id`, with the dimensions-changed → "regenerate?" prompt → reload; "Retire part" control with confirmation → `DELETE /api/parts/:id` (offer `?force=1` if 409); delete control (🗑) on `bom.html` tree rows → `DELETE .../bom/:lineId` (confirm; handle the sub-lines 409). All `addEventListener`; retired parts show a "⚠ retired" badge wherever surfaced. Button audit 0. | 35-04 (`del()`), 35-02 + 35-03 (routes) | 35-05 |
| **W6** | 35-07 | **Deploy + verify + docs** — `cd /Users/jeet/turion-satellite && ./build-and-push.sh` (Lambda redeploy; record old→new `CodeSha256`); `cd /Users/jeet/turion-space-demo` → **F6 pre-flight** (stash/move dirty WIP `about-this-demo.html`/`agent-sales-cash.html`/`dashboard-cio.html` + dirty `backend/*` + `.superpowers/` aside) → `./deploy-frontend.sh` → restore; CF invalidation `/*`; **curl smoke** (new routes 401 unauth / 404 bogus id / health ok; with a test JWT: `POST /api/parts` creates → `PATCH .../drawing` bumps rev → `POST .../drawing/regenerate` round-trips → `DELETE /api/parts/:id` 409 with live instances then 200 with `?force=1` then `POST .../restore` → `DELETE .../bom/:lineId`); `node backend/scripts/audit-satellite-buttons.mjs` **0 violations in BOTH repos**; **Phase 27-34 regression** (existing drawings still render, 3D viewer still mounts, Add-BOM modal still works, chat widget still loads); **headless-substitute checkpoint** (per Phases 27-34 — curl/HEAD smoke + audit, browser walk noted as pending); update `.planning/STATE.md` + `ROADMAP.md` + MEMORY. Commits via `git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar"`. | 35-05 + 35-06 | — |

**Parallelism summary:** W1 alone first. Then W2 ‖ W3 (both need W1). W4 (svg-editor + del + audit-tweak) can *start* in parallel with W2/W3 but its UI consumers (W5, W6) need its outputs *and* the W2/W3 routes — so practically W4 lands with/after W2/W3. Then W5 ‖ W6 (the part-page wiring and the bom-page wiring touch different files — `part.html`/`instance.html` vs `bom.html`/`parts.html` + the modal — so they don't conflict; if the planner prefers, fold them into one plan). W7 last.

**Hard ordering constraint:** the ported `generateDrawingSvg` module + migration 022 (35-01) **must land before** 35-02 (regenerate route, create-with-drawing) and 35-03 (`retired_at` filters). The `satelliteApi.del()` + audit-regex tweak (35-04) **must land before** 35-06 (which makes DELETE calls) — otherwise the W6 button audit either fails or goes silent.

---

## Sources

### Primary (HIGH confidence — in-repo, read directly)
- `turion-satellite/backend/src/routes/parts.ts` — existing parts routes (`GET /`, `GET /:id`, `GET /:id/drawing`, `GET /:id/process`, `GET /:partDefId/children`); the `specifications`-coercion pattern; the SELECT shapes to add `retired_at IS NULL` to.
- `turion-satellite/backend/src/routes/bom.ts` — `Router({mergeParams:true})`, `GET /` (BOM lines), `GET /tree` (recursive CTE, roots = "not a child in any bom_line"), `POST /` (create BOM line, validates `child_part_instance_id` + `qty>0`). The new `DELETE /:lineId` goes here.
- `turion-satellite/backend/src/routes/satellites.ts` — `router.use('/:satId/bom', bomRouter)` (line 179), `router.use('/:satId/instances', instancesRouter)` (line 177).
- `turion-satellite/backend/src/app.ts` — mount tree; new routes are in already-mounted routers → no `app.ts` change.
- `turion-satellite/backend/src/middleware/auth.ts` — `requireAuth` (ES256/HS256), `req.user.id` = JWT `sub`.
- `turion-satellite/backend/src/db.ts` — `query`, `queryOne` (referenced; not re-read in full).
- `turion-satellite/scripts/generate-cad-svgs.ts` — `chooseTemplate()` dispatch table (regex order, SOLAR-before-plate W5 fix), the uniqueness + determinism gates, `stripPartArtefacts`. The pure-template imports (`assemblyTemplate`, …, `makePrefix`).
- `turion-satellite/scripts/cad-templates/primitives.ts` — `cabinetBox`, `dropShadowFilter`, `partLabel`, `normalizeDims` (handles `{length,width,height}` and `[L,W,H]`, `{40,40,40}` default), `makePrefix` (8-char), `perturbForPartNumber` (djb2, ±3), `groundShadowEllipse`. **These are pure functions** — the port targets exactly these.
- `turion-satellite/scripts/cad-templates/plate.ts`, `palettes.ts` — confirm the template signature `(part: {part_number, subsystem_code?, specifications?}) => string` and that palettes are hard-coded hex (no I/O).
- `turion-satellite/migrations/001_create_turion_satellite_schema.sql` — `part_definitions` columns (`part_number TEXT UNIQUE NOT NULL`, `subsystem_id`, `itar_flag`, `preferred_vendor_id`, `default_make_buy CHECK(make|buy)`, `flagged_for_review`, `created_by`, `created_at`). No `drawing_svg`/`drawing_rev`/`retired_at` yet (added by migrations 002, and 022-to-be).
- `turion-satellite/migrations/017_redraw_cad_phase27.sql` — header (auto-generated by `scripts/generate-cad-svgs.ts`, 79 UPDATEs, `$svg$...$svg$` dollar-quoting, `drawing_svg IS DISTINCT FROM` idempotency); a sample SVG body (`ADCS-ASSY`) for the byte-equality test.
- `turion-satellite/migrations/020_add_sales_orders_and_program_seed.sql`, `021_expand_audit_log_actions_phase33.sql` — the idempotent-migration convention (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, drop-IF-EXISTS / re-add for CHECKs, `current_database()` guard).
- `turion-satellite/backend/scripts/audit-satellite-buttons.mjs` — derives the route allowlist from `app.ts` + each router's `router.{get,post,patch,put,delete}('...')` + nested `router.use`; scans `satellite/*.html` for `onclick="..."` (must be allowlisted built-in or in-file fn) and `satelliteApi.{get,post,patch}(...)` (path normalized against allowlist, fail-closed). `ROUTER_METHOD_RE` includes `delete`; `iterApiCalls` regex is `(get|post|patch)` only → **needs the `del`/`delete` tweak**. `ONCLICK_BUILTIN_PATTERNS` allowlists `document.getElementById(...).remove()` etc.
- `turion-satellite/backend/tests/parts.test.ts` — the vitest+supertest pattern (mock `../src/db`, mint an ES256 JWT, `request(app)`).
- `turion-space-demo/satellite/satellite-api.js` — `window.satelliteApi.{get,post,patch}` only; `api()` does `res.json()` unconditionally (so a 204 would throw). **No `del()`.**
- `turion-space-demo/satellite/bom.html` (lines 260-382) — the existing "+ Add BOM line" modal (`#addBomLineBtn`, `openAddBomLineModal()`, `#modalSave` → `POST /api/satellites/:satId/bom`, all `addEventListener` except the allowlisted `.remove()` onclicks); the tree-flatten helper; the `<details>` recursive tree; `r.toast` + `location.reload()` after success.
- `turion-space-demo/satellite/part.html` (lines ~1-135, ~280-475) — `.cad-frame` (`#cadFrame`, `#toggleCallouts`, `#viewToggle`, `#viewer3d`, `.cad-hud`, `#hudBack`), the import-map for `satellite-3d.js`, `mount3DViewer(document.getElementById('viewer3d'), part, {...})`, the 2D↔3D toggle. `drawing.drawing_svg` rendered into `#cadFrame svg`.
- `turion-space-demo/satellite/satellite-3d.js` — `mount3DViewer(containerEl, partData, opts)` returns `{controls, deselect(), selectChild(grp), dispose()}` or `null`; `normalizeDims` reads `partData.specifications.dimensions_mm` only (`{40,40,40}` default). **Never parses `drawing_svg`.**
- `turion-space-demo/deploy-frontend.sh` — `aws s3 sync . --delete` with a short exclude list (`.git/*`, `.vercel/*`, `.DS_Store`, `backend/*`, `*.md`, `*.sh`, `deploy-*`); CF dist `E37R9PT8IL44L2`, bucket `turion-demo-static`; runs `generate-satellite-config.sh` first. **Publishes the working tree** → F6 pre-flight stash is mandatory.
- `turion-satellite/build-and-push.sh` — `cd backend && npm run build` (tsc); `docker build --platform linux/arm64 -f backend/lambda-build backend/`; ECR push; `aws lambda update-function-code --function-name turion-satellite-api --image-uri ...:latest`; `aws lambda wait function-updated`. The Dockerfile is named `lambda-build` (not `Dockerfile`). **The image is `npm ci --omit=dev` over `dist/`** — only compiled `backend/src/` ships; `scripts/` does NOT.
- `.planning/ROADMAP.md` Phase 35 entry — the goal text, `Depends on: Phase 33, Phase 30/31`, the 6 requirement IDs.
- `.planning/phases/33-end-to-end-satellite-build-flow/33-02-SUMMARY.md` — confirms migrations are applied to prod via `psql "$DATABASE_URL" -f migrations/0NN_...sql`, double-apply proven; `SAT-003` UUID `24587565-b15b-42ce-b590-87ecf9b6bb99` (renamed `Cygnus` in prod — query by UUID); the headless-substitute checkpoint convention.
- `.claude/projects/.../memory/MEMORY.md` — Turion phases 27-34 history; commit identity `git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar"`; the P30-32 3D viewer fix (definite `#viewer3d` height + `overflow:hidden`, `renderer.setSize` without `,false`); the `rfqs` table is empty (irrelevant here); the gsd-tools STATE.md bloat caveat.

### Secondary (MEDIUM — general web knowledge, cross-checked against MDN-style facts)
- SVG-in-HTML manipulation: `DOMParser.parseFromString(svg, 'image/svg+xml')`, `document.createElementNS('http://www.w3.org/2000/svg', tag)`, `element.getBBox()` (returns zeros on un-rendered elements), `XMLSerializer.serializeToString` — standard browser APIs, no library needed.
- `svgcanvas` / `@svgedit/svgcanvas` is the headless engine from SVG-Edit and expects an ES-module/bundler graph (not a single drop-in `<script>`). `Fabric.js`/`Konva` operate on `<canvas>`, not native SVG DOM. `SVG.js` is a thin SVG-DOM wrapper available as UMD `<script>` — the only library that *could* fit, but adds a dep for ~no benefit at this scope. *(Recommendation: hand-roll; flagged MEDIUM only because I did not exhaustively re-survey the 2026 SVG-editor library landscape — but the no-bundler constraint rules out the popular options regardless.)*

### Tertiary (LOW — unverified, flagged for code-time confirmation)
- The exact `backend/tsconfig.json` `module`/`moduleResolution` (determines `.js` import-specifier handling in the ported templates) — confirm before porting.
- The exact request shape of `POST /api/satellites/:satId/instances` (`routes/instances.ts`) — confirm before building the create-new-part 3-call chain.

---

## Metadata

**Confidence breakdown:**
- Backend routes / migration / generator port: **HIGH** — everything is in-repo, the patterns are established, the only unknowns are the tsconfig module mode and the instances-route shape (both 5-min reads).
- Frontend wiring + button-audit interaction: **HIGH** — the audit script was read in full; the `del()` regex tweak is precise; the `addEventListener`-only rule is well understood.
- SVG editor (`svg-editor.js`): **MEDIUM** — the *approach* is solid (DOMParser → live DOM → XMLSerializer), but the exact UX (handle drag math, rotate-around-center, text-edit overlay) is ~400-600 LOC of bounded-but-fiddly UI work; expect iteration during execution.
- Retire blast-radius decisions: **HIGH** — the "filter pickers, badge trees/kanban" call is the only sane reading; documented explicitly so a reviewer doesn't amputate subtrees.

**Research date:** 2026-05-12
**Valid until:** ~2026-06-11 (30 days — stable; the only fast-moving thing is the Turion repos themselves, which this phase modifies — re-check `app.ts`, `parts.ts`, `bom.ts`, `audit-satellite-buttons.mjs`, `satellite-api.js`, `part.html`, `bom.html`, `deploy-frontend.sh` if execution slips past mid-June).
</content>
</invoke>
