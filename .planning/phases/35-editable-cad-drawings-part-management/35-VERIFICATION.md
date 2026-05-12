---
phase: 35-editable-cad-drawings-part-management
verified: 2026-05-12T16:40:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
human_verification:
  - test: "Open part.html, click 'edit drawing', move a shape, hit Save; confirm the SVG persists on reload and drawing_rev increments in the DB."
    expected: "Drawing saves, rev bumps, part_revisions row inserted."
    why_human: "Requires live Supabase session + browser interaction with canvas drag events."
  - test: "On part.html open the drawing editor, click 'Revert to generated'; confirm the server-re-generated SVG appears and drawing_rev increments."
    expected: "Regenerated SVG matches the Phase-27 template output for that part_number."
    why_human: "Requires live auth + visual comparison of SVG output."
  - test: "On bom.html use the '+ Add BOM line' modal's 'Create new part' tab; fill subsystem/dims/make-buy; submit."
    expected: "POST /api/parts 201, part appears in the picker, BOM line created."
    why_human: "Multi-step form flow with dynamic subsystem select requires browser."
  - test: "On parts.html click the retire control for a part with live instances; confirm 409 → force-retire confirm → row disappears."
    expected: "409 shown, user confirms, part retired with force=1, list refreshes."
    why_human: "Requires live data with instances + browser interaction."
  - test: "On bom.html click the 🗑 button on a BOM line with children; confirm 409 → recursive confirm → lines removed."
    expected: "409 returned, confirm shown, recursive delete removes subtree."
    why_human: "Requires live BOM data with nested lines + browser interaction."
---

# Phase 35: Editable CAD Drawings + Part Management Verification Report

**Phase Goal:** Let users fix what doesn't look right in the Turion satellite app — freehand SVG editor, drawing regeneration, part CRUD (create/edit/retire/restore), and BOM line deletion.
**Verified:** 2026-05-12T16:40:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can open an SVG editor on part.html, edit shapes, and save the drawing back to the server | VERIFIED | `svg-editor.js` 783 lines, `window.svgEditor.open(...)` exposed; `part.html` line 294 loads it, line 135 wires edit button via addEventListener; line 523 calls `satelliteApi.patch('/api/parts/'+id+'/drawing', {drawing_svg})`; live CF returns HTTP 200 containing `svgEditor` |
| 2 | User can revert a drawing to the server-regenerated version | VERIFIED | `part.html` line 498 calls `satelliteApi.post('.../drawing/regenerate', {})`; backend `parts.ts` line 552 `POST /:id/drawing/regenerate` calls `generateDrawingSvg`, bumps `drawing_rev`, writes `part_revisions` row; cad-generator vitest 14/14 pass including byte-equality vs migration-017 fixture |
| 3 | User can create a brand-new part_definition from the BOM add-line modal | VERIFIED | `bom.html` line 397 "Create new part" tab; line 500 chains `POST /api/parts` then instances then bom; backend `parts.ts` line 363 `POST /` requireAuth, generates drawing, `drawing_rev=1`; `POST /api/parts` unauth → 401 live |
| 4 | User can edit a part_definition's fields and is prompted to regenerate the drawing if dimensions changed | VERIFIED | `part.html` line 547-662: editPartBtn wired via addEventListener → `PATCH /api/parts/:id`; line 548 explains dimensions-change regenerate prompt; line 648 sets `dimensions_mm`; line 662 `POST .../regenerate` when `dimsChanged`; `PATCH /api/parts/:id` unauth → 401 live |
| 5 | User can soft-retire a part (and restore it), with 409 guard when live instances exist | VERIFIED | `DELETE /api/parts/:id` at backend line 587: 409 if instances + `?force=1` not passed, sets `retired_at`; `POST /:id/restore` clears it; `parts.html` line 143-184 retire button + 409 → force confirm; `part.html` line 430 retired banner + Restore button; `DELETE /api/parts/:id` unauth → 401 live |
| 6 | User can delete a BOM line (409 if children, ?recursive=1 removes subtree) | VERIFIED | `bom.ts` line 209-269: `DELETE /:lineId` requireAuth, child-count check, recursive walk, returns 200 JSON; `bom.html` line 262 row-del-btn via event delegation, line 312 `satelliteApi.del(...)`, line 321 retry `?recursive=1`; `DELETE .../bom/:id` unauth → 401 live |

**Score: 6/6 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `/turion-space-demo/satellite/svg-editor.js` | Hand-rolled no-bundler SVG editor, `window.svgEditor.open(...)`, toolbar, DOMParser/XMLSerializer, double-load guard | VERIFIED | 783 lines; all required APIs present; CloudFront 200; double-load guard at line 32 |
| `/turion-space-demo/satellite/part.html` | Loads svg-editor.js, edit-drawing button wired via addEventListener, PATCH on save, deep-link ?edit=drawing honored | VERIFIED | Line 294 `<script src="/satellite/svg-editor.js">`; line 135 edit button; line 541 `?edit=drawing` auto-open |
| `/turion-space-demo/satellite/instance.html` | Deep-links to part.html?id=...&edit=drawing | VERIFIED | Line 397-398 navigate with `?edit=drawing` |
| `/turion-satellite/backend/src/cad-templates/index.ts` | Exports `generateDrawingSvg(part)`, all template files | VERIFIED | `index.ts` exports `generateDrawingSvg`; 11 template files present; 14/14 cad-generator tests pass |
| `/turion-satellite/backend/src/routes/parts.ts` | POST /api/parts, PATCH /:id, PATCH /:id/drawing, POST /:id/drawing/regenerate, DELETE /:id, POST /:id/restore | VERIFIED | All 6 route handlers confirmed; all return 401 unauth; 22/22 parts.write.test.ts pass |
| `/turion-satellite/backend/src/routes/bom.ts` | DELETE /:lineId with child-guard and ?recursive=1 | VERIFIED | Line 215 router.delete; 6/6 bom.delete.test.ts pass |
| `/turion-satellite/migrations/022_part_revisions_and_retire.sql` | `drawing_rev int DEFAULT 1`, `retired_at timestamptz`, `part_revisions` table, widened audit_log CHECK | VERIFIED | Migration file present and complete; adds drawing_rev, retired_at, part_revisions table, index, widened CHECK constraint |
| `/turion-space-demo/satellite/satellite-api.js` | `del()` method | VERIFIED | Line 60: `del: (path) => api(path, { method: 'DELETE' })` |
| `/turion-satellite/backend/scripts/audit-satellite-buttons.mjs` | Recognizes `.del(` calls | VERIFIED | Line 273-277: regex `/(get|post|patch|put|delete|del)/` with `DEL → DELETE` mapping; audit exits 0, 74 routes, 83 API calls, 0 violations |
| `/turion-space-demo/satellite/parts.html` | Per-row retire control | VERIFIED | Line 143 `row-retire-btn`; line 162-191 event delegation retire flow |
| `/turion-space-demo/satellite/bom.html` | Row-delete 🗑 control; "Create new part" tab | VERIFIED | Line 262 `row-del-btn`; line 397 `tabNew` "Create new part" |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `part.html` edit-drawing button | `PATCH /api/parts/:id/drawing` | `satelliteApi.patch(...)` in addEventListener | WIRED | part.html:523 |
| `part.html` revert button | `POST /api/parts/:id/drawing/regenerate` | `satelliteApi.post(...)` in onRevert callback | WIRED | part.html:498 |
| `part.html` edit-part form | `PATCH /api/parts/:id` | `satelliteApi.patch(...)` in submit handler | WIRED | part.html:654 |
| `part.html` edit-part dims change | `POST /api/parts/:id/drawing/regenerate` | prompt → `satelliteApi.post(...)` when `dimsChanged` | WIRED | part.html:662 |
| `part.html` retire button | `DELETE /api/parts/:id` | `satelliteApi.del(...)` in addEventListener | WIRED | part.html:673 + grep confirms `.del(` |
| `part.html` restore button | `POST /api/parts/:id/restore` | `satelliteApi.post(...)` in addEventListener | WIRED | part.html:454 |
| `bom.html` "Create new part" tab | `POST /api/parts` → instances → bom | `satelliteApi.post(...)` chain | WIRED | bom.html:500 |
| `bom.html` row-del-btn | `DELETE /api/satellites/:satId/bom/:lineId` | `satelliteApi.del(...)` in event delegation handler | WIRED | bom.html:312 |
| `parts.html` row-retire-btn | `DELETE /api/parts/:id` | `satelliteApi.del(...)` in event delegation | WIRED | parts.html:176 |
| `cad-templates/index.ts` | `generateDrawingSvg` | imported in `parts.ts` regenerate route | WIRED | parts.ts:568 (calls generator) |
| `instance.html` edit-drawing chip | `part.html?id=...&edit=drawing` | href navigation with `?edit=drawing` | WIRED | instance.html:397-398 |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DrawingEditor | 35-04, 35-05, 35-07 | Freehand in-browser SVG editor on part.html/instance.html | SATISFIED | svg-editor.js 783 lines; part.html wired; instance.html deep-links; CloudFront 200 |
| DrawingRegenerate | 35-01, 35-02, 35-07 | POST /api/parts/:id/drawing/regenerate server-side CAD generator port | SATISFIED | cad-templates/ present; 14/14 byte-equality tests pass; route at parts.ts:552 |
| PartCreate | 35-02, 35-06, 35-07 | POST /api/parts with inline create from bom.html add-line modal | SATISFIED | parts.ts:363; bom.html:397 "Create new part" tab; 201 test passes |
| PartEdit | 35-02, 35-06, 35-07 | PATCH /api/parts/:id + regenerate prompt on dimension change | SATISFIED | parts.ts:419; part.html:547-662 edit modal + dims-change regenerate |
| PartRetire | 35-03, 35-06, 35-07 | DELETE /api/parts/:id soft-retire + POST /:id/restore; 409 guard | SATISFIED | parts.ts:587-622; parts.html retire; part.html retired banner + restore |
| BomLineDelete | 35-03, 35-06, 35-07 | DELETE /api/satellites/:satId/bom/:lineId; 409 children guard; ?recursive=1 | SATISFIED | bom.ts:215-269; bom.html:262+312; 6/6 bom.delete tests pass |

No REQUIREMENTS.md found in `.planning/` — requirement IDs sourced from PLAN frontmatter only (cross-referenced against all 7 plans). All 6 IDs covered.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `backend/tests/files.test.ts` | `S3Client` mock constructor failure — test suite fails | Info | Pre-existing from Phase-33-era S3 presign commit (45e074a, May 9). Unrelated to Phase 35. All Phase 35 test files pass. |
| `parts.test.ts` socket hang-up | One test timed out in first run | Info | Flaky mock-injection race — passes on rerun (confirmed). Not a Phase 35 regression. |

No Phase-35-introduced anti-patterns found. Zero placeholder returns, zero TODO/FIXME markers, zero inline onclick attributes (svg-editor.js comment line 27 explicitly guarantees this; audit confirms 0 violations).

---

### Non-Regression (Phases 27-34)

| Phase | Artifact | Status |
|-------|----------|--------|
| P27 SVG generator | `cad-templates/index.ts` byte-equality test | PASS — 2/2 byte-equality fixtures pass |
| P28 recursive BOM tree | `bom.html` native `<details>/<summary>` tree | PRESENT — line 14 CSS present |
| P29 button audit | `audit-satellite-buttons.mjs` exit 0 | PASS — 74 routes, 83 calls, 0 violations |
| P30/31 3D viewer + HUD | `satellite-3d.js`, `mount3DViewer` in part.html | PRESENT — 33939 bytes; part.html:756 wires it |
| P32 make/buy panels | `cost-render.js`, make/buy panels | Not re-audited (no Phase 35 file touches cost-render.js) |
| P33 program wizard | `program-new.html`, `programProgress`, sat picker | PRESENT — bom.html:146+184 confirms both |
| P34 chat widget | `satellite-chat.js`, `POST /api/assistant/chat` | PRESENT — part.html:1546 loads it; assistant.ts:60 route present |

---

### Human Verification Required

#### 1. Drawing editor — save flow

**Test:** Open `turionspace.zietra.com/satellite/part.html?id=<any-part-id>`, click "edit drawing", drag a shape, click Save.
**Expected:** Drawing updates in-page; reload shows the new SVG; `drawing_rev` increments; a `part_revisions` row is written to the DB.
**Why human:** Live Supabase session required; canvas drag events cannot be verified statically.

#### 2. Drawing editor — revert flow

**Test:** On the same editor, click "Revert to generated".
**Expected:** The server re-runs the Phase-27 generator for that part_number; the result is shown in the editor and persisted on confirm; `drawing_rev` increments.
**Why human:** Requires visual comparison of regenerated SVG against expected template output.

#### 3. Create new part from BOM modal

**Test:** On `bom.html?sat=<sat-id>`, open "+ Add BOM line", switch to "Create new part" tab, fill in part_number/subsystem/dimensions, submit.
**Expected:** `POST /api/parts` 201, then instance + BOM line created, new part appears in tree.
**Why human:** Multi-step form flow with dynamic subsystem `<select>` populated from API.

#### 4. Retire with live instances

**Test:** On `parts.html`, retire a part that has live instances.
**Expected:** 409 error shown in UI; user confirms force-retire; part disappears from list; `part.html` for that part shows "retired" banner.
**Why human:** Requires live data with instances.

#### 5. BOM line delete with children

**Test:** On `bom.html`, click 🗑 on a non-leaf BOM line.
**Expected:** 409 shown; confirm recursive; subtree removed; tree re-renders without those lines.
**Why human:** Requires live BOM data with nested lines.

---

### Gaps Summary

No gaps. All 6 requirement truths are fully verified at all three levels (exists, substantive, wired). The two failing test suites in the full vitest run are both pre-existing issues unrelated to Phase 35:
- `files.test.ts`: S3Client constructor mock incompatibility introduced by the Phase-33-era S3 presign commit (May 9, before Phase 35 began).
- `parts.test.ts` socket hang-up: flaky mock-injection race that passes on rerun.

The audit script (`audit-satellite-buttons.mjs`) runs exit 0 with 0 violations, confirming the `.del(` extension works correctly and no dead buttons were introduced.

---

_Verified: 2026-05-12T16:40:00Z_
_Verifier: Claude (gsd-verifier)_
