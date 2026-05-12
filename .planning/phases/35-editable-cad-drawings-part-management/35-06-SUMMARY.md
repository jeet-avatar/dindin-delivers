---
phase: 35-editable-cad-drawings-part-management
plan: 06
subsystem: turion-satellite-frontend
tags: [cad, part-management, bom, frontend]
requires: ["35-04", "35-02", "35-03", "35-05"]
provides:
  - "bom.html: Add-BOM-line modal has a 'Pick existing part' / '➕ Create new part' tab; the create tab does POST /api/parts → POST /api/satellites/:satId/instances → POST /api/satellites/:satId/bom"
  - "bom.html: each recursive-tree row has a 🗑 delete control (event delegation) → DELETE /api/satellites/:satId/bom/:lineId; on 409 → offer ?recursive=1; retired part definitions get a '⚠ retired' badge"
  - "part.html: '✎ Edit part' modal → PATCH /api/parts/:id (changed fields only); dimensions changed → prompt → POST .../drawing/regenerate → reload. '🗑 Retire part' → DELETE /api/parts/:id; 409 → ?force=1; both hidden when retired (35-05's banner carries Restore)"
  - "parts.html: per-row '🗑' retire control → DELETE /api/parts/:id; 409 → ?force=1; list reloads (GET /api/parts already excludes retired)"
affects: ["35-07 (deploy)"]
tech-stack:
  added: []
  patterns: ["no-bundler plain <script>", "event delegation on stable container for re-rendered rows", "addEventListener-only — button audit stays 0", "satelliteApi.{post,patch,del} for all API"]
key-files:
  created: []
  modified:
    - /Users/jeet/turion-space-demo/satellite/bom.html
    - /Users/jeet/turion-space-demo/satellite/part.html
    - /Users/jeet/turion-space-demo/satellite/parts.html
decisions:
  - "The /bom/tree node does NOT carry bom_lines.id — bom.html now also fetches the flat GET /api/satellites/:satId/bom and builds a Map keyed by '<parentInstanceId|ROOT>|<childInstanceId>' → line.id, used to put data-line-id on each tree row's 🗑 button. Best-effort: if that fetch fails, the tree still renders without delete controls. No backend change."
  - "The create-new-part chain reuses the EXISTING add-line POST (POST /api/satellites/:satId/bom {parent_part_instance_id, child_part_instance_id, qty}) — the new instance's id (from POST .../instances RETURNING *) is the child_part_instance_id. Partial-create failures (part created but instance/line failed) surface a message telling the user the part exists and can be added manually — no half-create silently swallowed."
  - "dimensions_mm shape: passed as {length, width, height} (matches part.html's existing fmtDims() which already handles both that object form and the [L,W,H] array form; backend POST/PATCH only require 'an object', not specific keys)."
  - "ApiError (satellite-api.js) carries only {status, message} — no response body — so the 409-on-delete handler can't read child_line_count. It instead offers a generic 'remove the whole subtree (?recursive=1)? Cancel to delete the sub-lines first' confirm. (Satisfies the must-have: 'tells the user to delete sub-lines first' AND adds the recursive shortcut.)"
  - "Edit + Retire controls on part.html are HIDDEN when retired_at is set (PATCH /api/parts/:id and DELETE both filter retired_at IS NULL → would 404). The retired banner from 35-05 already carries the Restore button — no duplication. parts.html has retire only (restore lives on the part page via deep link; GET /api/parts has no ?include_retired opt-in per 35-03)."
metrics:
  duration: ~40min
  tasks: 3
  files: 3
  completed: 2026-05-12
---

# Phase 35 Plan 06: Part-management UI — Summary

The user-facing half of PartCreate / PartEdit / PartRetire / BomLineDelete: create a brand-new part inline from the Add-BOM-line modal, edit an existing part's fields, retire/restore a part, and delete a BOM line — all via the 35-02 / 35-03 routes, all `addEventListener`-wired so the button audit stays at 0 violations.

## What shipped

### Task 1 — `satellite/bom.html` (commit `b6c47e3`)
- **Extended the "+ Add BOM line" modal** with a `[Pick existing part] [➕ Create new part]` tab toggle (new CSS in the page `<style>`). The "create new part" pane has: `part_number` (required), `description` (required), `subsystem` (`<select>` populated from `GET /api/subsystems`), `dimensions_mm` (L/W/H number inputs → `{length, width, height}`, optional), `default_make_buy` (`<select>` make|buy), `itar_flag` (checkbox). The parent-instance picker, qty and ref-designator inputs are shared by both tabs.
  - On Save in "create" mode: `await satelliteApi.post('/api/parts', {part_number, description, subsystem_id, default_make_buy, itar_flag, dimensions_mm?})` → `await satelliteApi.post('/api/satellites/'+satId+'/instances', {part_definition_id: pd.id})` → `await satelliteApi.post('/api/satellites/'+satId+'/bom', {child_part_instance_id: inst.id, parent_part_instance_id, qty, ref_designator?})` → close modal, `r.toast('Part created and added to the BOM')`, reload.
  - Error handling: `409` on `POST /api/parts` highlights the part-number field + "A part with that part number already exists." Other errors show the message. If `POST /api/parts` succeeds but a later step fails, the user is told "Part \"X\" was created, but … — you can add it to the BOM manually." (no silent half-create).
- **Delete control on tree rows**: `renderNodeClean()` now resolves the `bom_lines.id` for each row via a `Map` keyed `<parentInstanceId|ROOT>|<childInstanceId>` (built from a best-effort `GET /api/satellites/:satId/bom` fetch — the `/bom/tree` node doesn't carry the line id) and renders a `<button class="row-del-btn" data-line-id="…">🗑</button>` next to the row badges. A single delegated `click` listener on `#treeContainer` (so it survives the wholesale `innerHTML` re-render) does `e.preventDefault(); e.stopPropagation();` (so the click never toggles the surrounding `<details>`), confirm, `await satelliteApi.del('/api/satellites/'+satId+'/bom/'+lineId)`; on `409` → confirm "remove the whole subtree (?recursive=1)? Cancel to delete the sub-lines first" → `del(...+'?recursive=1')`; reload + toast on success.
- **Retired badge**: tree nodes whose payload carries `retired_at` (surfaced by 35-03's `/bom/tree`) get a `<span class="badge retired">⚠ retired</span>` in their badge row.
- `onclick=` count unchanged (3, all pre-existing allowlisted modal-close buttons); the inline `<script>` parses (`node --check`); `audit-satellite-buttons.mjs` → `violations: 0` (the new `DELETE` calls now resolve against `/api/satellites/:satId/bom/:lineId` thanks to 35-04's regex widening — both `del()` calls use full template-literal paths so the audit can parse them).

### Task 2 — `satellite/part.html` (commit `dae1474`)
- Added `#editPartBtn` ("✎ Edit part") and `#retirePartBtn` ("🗑 Retire part") to `#partActions` (`display:none` initially); a `wirePartManagement()` IIFE (after 35-05's `wireDrawingEditor()` IIFE — does NOT touch the `#retiredBanner`/`#restorePartBtn` 35-05 added).
  - Both buttons stay hidden when `part.retired_at` is set (PATCH/DELETE both filter `retired_at IS NULL` → would 404; the 35-05 banner already carries Restore).
  - **Edit form**: `openEditForm()` builds a `createElement` modal prefilled from `part` (`part_number`, `description`, `subsystem` `<select>` from a best-effort `GET /api/subsystems` — omitted if that fetch returns empty, leaving subsystem unchanged, `dimensions_mm` L/W/H prefilled from `part.specifications.dimensions_mm` handling both object and array forms, `default_make_buy`, `itar_flag`). On Save: builds a body of **only the changed fields**; `await satelliteApi.patch('/api/parts/'+partId, body)`; `409` → "A part with that part number already exists." If `dimensions_mm` is among the changed fields → after the PATCH `confirm('Dimensions changed. Regenerate the 2D drawing to match?…')` → `await satelliteApi.post('/api/parts/'+partId+'/drawing/regenerate', {})` (non-fatal on failure — the part still saved) → `location.reload()` (re-mounts the 3D viewer from the fresh dims + reloads the 2D drawing). If no dims change → toast + reload.
  - **Retire button**: confirm → `await satelliteApi.del('/api/parts/'+partId)`; on `409` (live instances) → confirm "Retire anyway? (instances stay visible with a 'retired' badge.)" → `del(...+'?force=1')`; reload + toast on success.
- `onclick=` count unchanged (4, all pre-existing); inline `<script>` parses; audit `violations: 0` (`satelliteApi calls scanned` 76→81).

### Task 3 — `satellite/parts.html` (commit `a142a48`)
- Each catalog row's last `<td>` gets a `<button class="row-retire-btn" data-pid data-pn>🗑</button>` before the `→` link. A single delegated `click` listener on `#partsBody` (stable; rows re-render every `load()`) does `e.preventDefault(); e.stopPropagation();` (so the click doesn't trigger the `<tr>`'s `onclick="location.href=…"` nav), confirm, `await satelliteApi.del('/api/parts/'+pid)`; on `409` → confirm "Retire anyway?" → `del(...+'?force=1')`; `load()` re-renders (the now-retired part is excluded by `GET /api/parts` per 35-03, so its row vanishes). No Edit/Restore here — the part page is canonical (row click navigates there; restore deep-links from there).
- `onclick=` count unchanged (1, the pre-existing row-nav); inline `<script>` parses; audit `violations: 0`.

## Deviations from Plan

**1. [Rule 3 — blocking] The `/bom/tree` node has no `bom_lines.id`.** The DELETE route is `/api/satellites/:satId/bom/:lineId` (a `bom_lines.id`), but the tree node carries only `instance_id` (child) + `parent_instance_id`. Rather than a backend change (35-03 owns the tree query and is complete), bom.html now also fetches `GET /api/satellites/:satId/bom` (flat lines, with `bl.*` including `id`, `parent_part_instance_id`, `child_part_instance_id`) and builds a `Map` keyed by edge → line id. If that fetch fails, the tree still renders, just without the delete controls. No backend change.

**2. [pragmatic] 409-on-delete has no `child_line_count` to show.** `ApiError` carries `{status, message}` only — no response body. The bom.html delete handler offers a generic "remove the whole subtree (?recursive=1)? Cancel to leave it and delete the sub-lines first" confirm instead of quoting the count. Satisfies the must-have ("tells the user to delete sub-lines first") and adds the recursive shortcut.

**3. [pragmatic] parts.html has no "show retired" toggle.** 35-03 made `GET /api/parts` hard-filter retired with no `?include_retired` opt-in. Per the plan's own latitude ("if the backend doesn't support it, do the part.html-only restore"), parts.html does retire-only; restore lives on the part page (`part.html?id=<retired-part-id>` — 35-05's banner + Restore button handles it).

Otherwise the plan executed as written. No auth gates, no architectural changes, no fix-attempt retries.

## NOT done (owned by other plans)
- `git push` + `./build-and-push.sh` Lambda redeploy + `./deploy-frontend.sh` + CloudFront invalidation + curl smoke + Phase 27–35 regression — 35-07. The 3 commits (`b6c47e3`, `dae1474`, `a142a48`) are local-only on `turion-space-demo` main; nothing pushed, no deploy. The repo's pre-existing dirty WIP (`about-this-demo.html`, `agent-sales-cash.html`, `dashboard-cio.html`, `backend/*`, `.superpowers/`) was left untouched — only the three named files were staged.
- Visual/functional sign-off — deferred to the W6 headless-substitute checkpoint (per Phases 27–34); this plan's verification was the button audit + inline-script `node --check` + grep.

## Self-Check: PASSED
- `/Users/jeet/turion-space-demo/satellite/bom.html` — modified; `grep "Create new part\|satelliteApi.del\|/api/parts\|retired"` → FOUND (tab label, delete handler, create-part POST, retired badge)
- `/Users/jeet/turion-space-demo/satellite/part.html` — modified; `grep "Edit part\|Retire\|satelliteApi.del\|drawing/regenerate"` → FOUND
- `/Users/jeet/turion-space-demo/satellite/parts.html` — modified; `grep "row-retire-btn\|satelliteApi.del"` → FOUND
- `grep -c "onclick="`: bom.html 3 / part.html 4 / parts.html 1 — all unchanged vs pre-plan
- `node --check` on the extracted inline `<script>` of all three pages → OK
- `node /Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs` → `routes:74, onclick:16, satelliteApi:83, violations:0`, exit 0
- commits `b6c47e3`, `dae1474`, `a142a48` — FOUND on turion-space-demo main (`jeet-avatar <jm@techcloudpro.com>`)
