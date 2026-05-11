---
phase: 31-3d-dimension-hud-clickable-assemblies
plan: 03
subsystem: ui
tags: [vanilla-js, dom, css, turion-space-demo, threejs-integration, raycaster]

# Dependency graph
requires:
  - phase: 31-3d-dimension-hud-clickable-assemblies (plan 01)
    provides: "GET /api/parts/:partDefId/children now returns each child's specifications JSONB inline — dims/mass/material reach the HUD without per-child fetches"
  - phase: 31-3d-dimension-hud-clickable-assemblies (plan 02)
    provides: "mount3DViewer(opts.assemblyChildren) + opts.onSelect + viewerHandle.deselect() — the multi-mesh radial ring + raycaster picker + camera tween that the pages now drive"
  - phase: 30-interactive-webgl-3d-part-viewer
    provides: "part.html + instance.html existing Phase-30 .cad-frame.mode-3d + #viewer3d + #autoRotateChk + ?view= / view-toggle scaffolding"
provides:
  - "part.html + instance.html each gain a DOM .cad-hud overlay inside .cad-frame (only visible in .mode-3d) showing part_number + L × W × H mm + Mass + Material + optional ref_designator"
  - "Page-side fmtDims(spec) + updateHud(p) helpers — handle the {length,width,height} object form AND the [L,W,H] array form; missing/NaN values render as '—'"
  - "Page-side #hudBack 'back to assembly' chip (addEventListener-wired, NOT inline onclick) → viewerHandle.deselect(); data-shown attr toggled by onSelect"
  - "mount3DViewer call now passes assemblyChildren (when non-empty) + onSelect → updateHud(cd || part); updateHud(part) seeded on mount"
  - "instance.html now fetches GET /api/parts/:partDefId/children?sat= in its Stage-2 Promise.all (destructured as partChildren) — same template-literal pattern as the existing /process call (audit-safe)"
affects: [31-04-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Page-owned DOM HUD layered over a Three.js canvas via CSS position:absolute (text stays crisp, selectable, themed via existing custom-props — beats a Three.js sprite for legibility/zoom)"
    - "Sibling-of-canvas pattern: the HUD is a child of .cad-frame (not #viewer3d) so it survives mount3DViewer returning null and dispose()"
    - "Page-owned 'back to assembly' chip wired via addEventListener (Phase-29 audit stays at 0 violations); data-shown attr toggled by the Three.js onSelect callback to drive CSS display"
    - "Defensive fmtDims that handles BOTH the dimensions_mm object form (length/width/height keys) AND the legacy [L,W,H] array form — same dispatch as satellite-3d.js normalizeDims"

key-files:
  created: []
  modified:
    - /Users/jeet/turion-space-demo/satellite/part.html
    - /Users/jeet/turion-space-demo/satellite/instance.html

key-decisions:
  - "Per the action block: HUD CSS lives in each page's inline <style> (next to the Phase-30 #viewer3d rules), NOT in satellite-shell.css — keeps the HUD changes co-located with the per-page 3D viewer wiring and avoids touching the shared shell file"
  - "fmtDims handles BOTH object and array dimension_mm forms (mirrors satellite-3d.js normalizeDims) — defensive against historical seed-data variation"
  - "Single combined commit on turion-space-demo main (per plan must_haves: 'One local commit … scoped to the two pages') — squashed two interim per-task commits into a single commit before the final summary"
  - "No push, no Lambda redeploy, no S3 sync — Plan 31-04 owns the push + deploy-frontend.sh"
  - "Did NOT add HUD CSS to satellite-shell.css despite a suggestion in the must_haves — the action block specified per-page <style> and that's where the matching #viewer3d/.view-toggle/.rotate-chip rules live"

patterns-established:
  - "Phase-31 HUD pattern: <div class='cad-hud' id='cadHud'> + <button id='hudBack' class='cad-toggle'> as siblings of #viewer3d inside .cad-frame; updateHud(p) + fmtDims(spec) as page-side helpers; mount3DViewer wired with assemblyChildren + onSelect → updateHud(cd || part); #hudBack addEventListener → viewerHandle.deselect()"
  - "When adding a new satelliteApi.get() call alongside the audit, match the EXACT template-literal shape of an adjacent already-passing call (here: instance.html's /api/parts/${...}/process call) — the audit's path normalizer resolves identical patterns identically"

requirements-completed: [DimensionHUD, AssemblyMultiMesh, RaycastPicker]

# Metrics
duration: 4min
completed: 2026-05-11
---

# Phase 31 Plan 03: Dimension HUD + Clickable-Assembly Wiring Summary

**`part.html` + `instance.html` each gain a DOM `.cad-hud` overlay inside `.cad-frame` (visible only in `.mode-3d`) showing `part_number / L × W × H mm / Mass / Material / (ref:)` plus a `#hudBack` chip; `mount3DViewer` is wired with `assemblyChildren` + `onSelect → updateHud(cd || part)` so clicking a child in the Phase-31 radial ring swaps the HUD to that child's identity + dims, and the chip resets it; `instance.html` also gains the previously-missing `GET /api/parts/:partDefId/children?sat=` fetch in its Stage-2 `Promise.all` — Phase-29 audit stays at `0 violations`.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-11T21:46:24Z
- **Completed:** 2026-05-11
- **Tasks:** 3/3 (Task 1 part.html, Task 2 instance.html, Task 3 commit)
- **Files modified:** 2

## Accomplishments

### part.html (Task 1)

- **CSS** added to the page `<style>` next to the Phase-30 `#viewer3d` / `.view-toggle` / `.rotate-chip` rules:
  - `.cad-hud` — `position:absolute; bottom:12px; left:12px; z-index:6; display:none;` `Fira Code` 11px, `color:var(--text-2)`, `background:rgba(10,14,26,0.82)`, `border:1px solid var(--border-2)`, `border-radius:5px; padding:9px 12px; max-width:60%; pointer-events:none`.
  - `.cad-frame.mode-3d .cad-hud { display:block }` (only visible in 3D mode).
  - Inner element styles: `.hud-pn` (color: text-1, weight 500), `.hud-dim` (text-1), `.hud-key` (text-3), `.hud-ref` (blue-1).
  - `#hudBack { position:absolute; bottom:12px; right:12px; z-index:6; display:none }` + `.cad-frame.mode-3d #hudBack[data-shown="1"] { display:inline-flex }` — only shown when a child is selected.
- **Markup** inside `.cad-frame` / `#cadFrame`, AFTER `#viewer3d`, BEFORE the `<svg class="frame-svg">`:
  - `<div class="cad-hud" id="cadHud" aria-live="polite"></div>` — sibling of `#viewer3d` so it survives `mount3DViewer` returning `null` and `dispose()`.
  - `<button id="hudBack" class="cad-toggle" type="button">↩ back to assembly</button>` — reuses the existing `.cad-toggle` chip styling.
- **`fmtDims(spec)`** — destructures `dimensions_mm` from the `{length,width,height}` object form OR `[L,W,H]` array form; values pass through a per-component `(x == null || x === '' || Number.isNaN(Number(x))) ? '—' : String(x)` guard so missing / null / blank / NaN renders as `—`, never `0` or `undefined`.
- **`updateHud(p)`** — renders five lines: `part_number` (or `—`), optional `description`, `L × W × H` (via `fmtDims`), `Mass: {weight_grams.toLocaleString()} g` (or `—`), `Material: {material}` (or `—`), and a `ref: {ref_designator}` line that's only present when `p` is a selected child (parent parts never have `ref_designator`). Uses `window.satelliteRender.escapeHtml` when available, with a `String(s)` fallback.
- **`mount3DViewer` call** changed from `{ autoRotate: false }` to:
  ```js
  { autoRotate: false,
    assemblyChildren: (Array.isArray(children) && children.length) ? children : null,
    onSelect: function (cd) {
      updateHud(cd || part);
      const b = document.getElementById('hudBack'); if (b) b.setAttribute('data-shown', cd ? '1' : '0');
    },
  }
  ```
  — `children` is the pre-existing `?sat=`-guarded `/api/parts/:partDefId/children` fetch (no duplicate fetch added). When `sat=` is absent the existing guard yields `[]` and `assemblyChildren` becomes `null` → leaf single-mesh viewer (unchanged Phase-30 behavior).
- **Mount-time wiring** (inside the existing `if (viewerHandle)` block):
  - `updateHud(part)` seeds the HUD with the parent's dims.
  - `back.addEventListener('click', () => viewerHandle.deselect())` — wires `#hudBack`. NEVER inline `onclick=` (Phase-29 audit-safe).

### instance.html (Task 2)

- **CSS** identical to part.html (same `.cad-hud` + `#hudBack` rules), placed next to instance.html's Phase-30 `.view-toggle` / `.rotate-chip` rules.
- **Markup** identical structure inside `.cad-frame` / `#cadFrame`, AFTER `#viewer3d`, BEFORE the `<svg class="frame-svg" viewBox="0 0 600 320">`.
- **`fmtDims(spec)` + `updateHud(p)`** — byte-identical to part.html's helpers.
- **Stage-2 `Promise.all`** — added a sixth fetch and a `partChildren` destructure entry:
  ```js
  let stages, bom, wos, part, allInstances, partChildren;
  [stages, bom, wos, part, allInstances, partChildren] = await Promise.all([
    window.satelliteApi.get('/api/lifecycle-stages'),
    window.satelliteApi.get(`/api/satellites/${encodeURIComponent(satId)}/bom`),
    window.satelliteApi.get(`/api/satellites/${encodeURIComponent(satId)}/work-orders`),
    window.satelliteApi.get(`/api/parts/${encodeURIComponent(inst.part_definition_id)}`),
    window.satelliteApi.get(`/api/satellites/${encodeURIComponent(satId)}/instances`),
    window.satelliteApi.get(`/api/parts/${encodeURIComponent(inst.part_definition_id)}/children?sat=${encodeURIComponent(satId)}`).catch(() => []),
  ]);
  ```
  — `satId` is unconditionally present on this page (the script returns to `/satellite/` if it's missing) so no guard needed; `.catch(() => [])` degrades a 4xx/5xx (e.g. partDef has no released BOM lines) to a leaf-mesh view, not a hard fail.
  - Template-literal shape is **byte-identical** to the existing `` `/api/parts/${encodeURIComponent(inst.part_definition_id)}/process` `` call — the Phase-29 audit's path normalizer resolves it to `GET /api/parts/:partDefId/children` (a known route).
- **`mount3DViewer` call** changed to pass `assemblyChildren: (Array.isArray(partChildren) && partChildren.length) ? partChildren : null` + same `onSelect` callback as part.html.
- **Mount-time wiring** seeds `updateHud(part)` and `addEventListener`-wires `#hudBack` → `viewerHandle.deselect()`.

### Single combined commit (Task 3)

Squashed the two interim per-task commits into a single commit per the plan's must_haves (`"One local commit on turion-space-demo authored jeet-avatar <jm@techcloudpro.com>, scoped to the two pages, not pushed"`). Used the explicit `-- satellite/part.html satellite/instance.html` file form so the unrelated dirty WIP (ERP demo HTML, `backend/*`, `.superpowers/`) wasn't staged.

## Verification

- [x] **Grep proof — part.html:** `grep -c cad-hud` = 7 (≥3 ✓), `grep -c cadHud` = 2, `grep -c hudBack` = 7, `grep -c updateHud` = 4 (≥3 ✓), `grep -c fmtDims` = 3, `grep -c assemblyChildren` = 2 (≥1 ✓). The `satId ?` `/children` fetch ternary guard preserved at line 273 (unchanged).
- [x] **Grep proof — instance.html:** `grep -c cad-hud` = 7 (≥3 ✓), `grep -c cadHud` = 2, `grep -c hudBack` = 7, `grep -c updateHud` = 4 (≥3 ✓), `grep -c fmtDims` = 3, `grep -c assemblyChildren` = 2 (≥1 ✓), `grep -c partChildren` = 4 (≥2 ✓), `grep -c "/children?sat="` = 2 (≥1 ✓ — once in the comment, once in the fetch).
- [x] **Inline-script syntax — part.html:** Extracted the inline JS (stripping `<!-- … -->` HTML comments first to avoid matching `<script>` text inside a comment, plus skipping `<script src=...>` and `<script type="importmap">`) → `node --check /tmp/part-inline.js` → exit 0.
- [x] **Inline-script syntax — instance.html:** Same extraction → `node --check /tmp/instance-inline.js` → exit 0.
- [x] **Phase-29 button audit:** `cd /Users/jeet/turion-satellite/backend && node scripts/audit-satellite-buttons.mjs` → `routes: 61 / onclick handlers scanned: 16 / satelliteApi calls scanned: 58 / violations: 0`, exit 0. API-call count rose 57 → 58 with the new `/children?sat=` fetch on instance.html.
- [x] **New endpoint resolves correctly:** Verified `routes.filter(x => x.includes('/children'))` → `[ 'GET /api/parts/:partDefId/children' ]` (the path normalizer collapses both `encodeURIComponent(inst.part_definition_id)` and `encodeURIComponent(satId)` to `:X` and the `?sat=` query suffix is stripped — exact match against the allowlist route).
- [x] **Diff hygiene — part.html:** `git diff --stat` = `1 file changed, 67 insertions(+), 2 deletions(-)`. Removed lines: only the Phase-30 comment header (replaced with Phase 30 + 31 wording) and the previous `mount3DViewer(..., { autoRotate: false })` call (replaced with the new options object). SVG fallback, `?view=`, `.mode-3d`, `#autoRotateChk`, Phase-27 `renderCalloutsOnSvg`/`#toggleCallouts` block, subpart gallery — all unchanged.
- [x] **Diff hygiene — instance.html:** `git diff --stat` = `1 file changed, 71 insertions(+), 5 deletions(-)`. Removed lines: the prior `let stages, bom, wos, part, allInstances` declaration + destructuring (replaced with 6-element version), the Phase-30 comment header, the previous `mount3DViewer(..., { autoRotate: false })` call. `/api/satellites/:satId/bom` BOM-children gallery (line 488 `parent_part_instance_id`), integrations panel, subtree rollup, lifecycle timeline, parent-trail — all unchanged.
- [x] **Commit proof:** `git log -1 --format='%an <%ae> %s'` → `jeet-avatar <jm@techcloudpro.com> feat(31-03): dimension HUD + clickable-assembly wiring in part.html + instance.html`. `git show --stat HEAD` → exactly 2 files: `satellite/part.html` + `satellite/instance.html`. `git log origin/main..HEAD --oneline` → 31-02 (`7b92727`) + 31-03 (`802eec6`) both local-only.
- [x] **Unrelated WIP untouched:** `git status --short` shows the prior dirty ERP HTML / `backend/*` / `.superpowers/` files still in the same dirty state as before (not staged, not committed).

## Deviations from Plan

### Minor deviations (within plan latitude)

**1. [Plan latitude] Squashed two interim per-task commits into the single commit Task 3 prescribed**
- **Found during:** Task 3
- **Issue:** The default gsd-executor `task_commit_protocol` says "commit after each task". I followed it initially, creating commits `59b376e` (part.html only) and `ef41d97` (instance.html only). But the plan's `<success_criteria>` explicitly says **"One local commit on `turion-space-demo` authored `jeet-avatar <jm@techcloudpro.com>`, scoped to the two pages"**, and Task 3 is itself the commit task with a single combined commit message.
- **Resolution:** Soft-reset the two interim commits (`git reset --soft HEAD~2`) and recreated a single combined commit `802eec6` with both files via the explicit `--` file list. Plan's must-have honored.
- **Files modified:** None (it was a commit reorg, not a code change).
- **Commit:** `802eec6` (final), supersedes the discarded `59b376e` + `ef41d97`.

**2. [Plan latitude] HUD CSS in each page's `<style>`, NOT in `satellite-shell.css`**
- **Found during:** Task 1
- **Issue:** The plan's must_haves mention `"Put the CSS in satellite-shell.css next to .cad-toggle (so both pages get it)"` but the action block says **"CSS (in the page `<style>`, near the existing `#viewer3d` / `.view-toggle` / `.rotate-chip` rules)"**. The two pieces of guidance disagree.
- **Resolution:** Followed the action block — CSS in each page's `<style>`. Rationale: the matching `#viewer3d` / `.view-toggle` / `.rotate-chip` Phase-30 rules already live per-page in inline `<style>`, so putting `.cad-hud` next to them is consistent with the established pattern. Side benefit: the rules are co-located with the per-page JS wiring, easier to maintain. Cost: 18 lines of CSS are duplicated across the two pages.
- **Files modified:** `satellite/part.html`, `satellite/instance.html`
- **Commit:** `802eec6`

No bugs found. No blocking issues. No auth gates. No architectural changes.

## Deferred Issues

None.

## Notes for Plan 31-04 (the deploy plan)

- The single commit `802eec6` on `turion-space-demo` main is the deployable artifact for this plan; together with Plan 31-02's commit `7b92727` they are the two commits 31-04 needs to push.
- The new fetch `GET /api/parts/:partDefId/children?sat=` on instance.html depends on the deployed `turion-satellite` Lambda carrying Plan 31-01's commit `15df18d` (the `c_pd.specifications AS specifications` SELECT-column addition). If the Lambda hasn't been rebuilt, the new fetch will still succeed but child rows will lack `specifications` — the radial ring will render with default-sized child meshes and the HUD will show `—` for dims/mass/material on selected children. 31-04 should run `./build-and-push.sh` in `turion-satellite` BEFORE pushing this frontend commit, or both atomically.
- F6 pre-flight on production: with `.mode-3d` active, look bottom-left for the HUD; on an assembly (e.g. `EPS-ASSY` instance on SAT-003) click one of the ring children, the HUD should swap to that child's identity + dims and the `↩ back to assembly` chip should appear bottom-right.

## Self-Check: PASSED

- FOUND: `.planning/phases/31-3d-dimension-hud-clickable-assemblies/31-03-SUMMARY.md` (this file)
- FOUND: commit `802eec6` (`feat(31-03): dimension HUD + clickable-assembly wiring in part.html + instance.html`) on `turion-space-demo` main, authored `jeet-avatar <jm@techcloudpro.com>`, scoped to exactly `satellite/part.html` + `satellite/instance.html`, local-only (not pushed)
- FOUND: `/Users/jeet/turion-space-demo/satellite/part.html` (modified, 67 insertions / 2 deletions)
- FOUND: `/Users/jeet/turion-space-demo/satellite/instance.html` (modified, 71 insertions / 5 deletions)
- Phase-29 button audit: 0 violations (verified post-edit)
