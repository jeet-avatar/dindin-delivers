---
phase: 60-real-cad-support-step-stl-upload-3d-viewer-drawing-markup
plan: 03
subsystem: cad-markup
tags: [cad, fabric.js, svg, dompurify, xss, markup, revision-history, rls, aurora]

requires:
  - phase: 60-real-cad-support-step-stl-upload-3d-viewer-drawing-markup
    plan: 01
    provides: "part_cad_files + cad-files routes + cadAudit + s3-presigner — Plan 60-03 markups FK-reference cad_files via ON DELETE CASCADE, and audits ride on the same audit_log action whitelist"
  - phase: 60-real-cad-support-step-stl-upload-3d-viewer-drawing-markup
    plan: 02
    provides: "GET /api/parts/:id/drawing-source — Plan 60-03 markup overlay calls this to decide whether to render the canvas (source=uploaded) or a hint (source=procedural)"
  - phase: 35
    provides: "part_revisions table (cols: part_def_id, rev, drawing_svg, edited_by, edited_at) — Plan 60-03 extends with nullable cad_file_id FK so uploaded revs join the mixed history"
  - phase: 55-03
    provides: "withTenantClient + requireAuth + tenantContext + RLS+FORCE pattern + zietra_app GRANT shape"

provides:
  - "Migration 024: part_drawing_markups (512 KB CHECK, RLS+FORCE) + part_revisions.cad_file_id FK + part_drawing_jobs (Plan 60-04 SQS PDF gen prereq)"
  - "backend/src/lib/markup-sanitizer.ts — DOMPurify SVG-profile sanitizer with FORBID_TAGS (script/foreignObject/iframe/object/embed) + FORBID_ATTR (on*) + 512 KB cap"
  - "POST /api/parts/:id/cad-files/:fileId/markup (admin/manager, UPSERT, sanitized, audited)"
  - "GET /api/parts/:id/cad-files/:fileId/markup (any auth)"
  - "DELETE /api/parts/:id/cad-files/:fileId/markup (admin/manager, hard DELETE, audited)"
  - "GET /api/parts/:id/revisions — UNION procedural (part_revisions where cad_file_id IS NULL) + uploaded (part_cad_files) with per-row has_markup flag"
  - "satellite/cad-markup.js — Fabric.js v6 ESM overlay with base-as-locked-DOM-layer (Pitfall 7) + debounced auto-save + role-gated mount"
  - "part.html — additive #markupPanel + #revisionPanel + module wiring (no existing logic removed)"

affects:
  - 60-04-cad-pdf-generation

tech-stack:
  added:
    - "isomorphic-dompurify@2.16.0 — pinned to this version specifically because 2.36+/3.x pulls jsdom@28 → html-encoding-sniffer@6 → @exodus/bytes ESM-only, breaking Lambda Node 20 require()"
    - "fabric@6.4.3 — loaded at runtime from jsDelivr ESM bundle (no bundler, no vendoring) per project import-map pattern"
  patterns:
    - "Three-layer XSS defense: client never reaches the user with raw SVG (Fabric only emits its own primitives), server sanitizes BEFORE INSERT via DOMPurify with SVG profile + explicit FORBID lists, DB CHECK is the absolute floor (524288 bytes)."
    - "Base-image-as-locked-DOM-layer (RESEARCH Pitfall 7): the procedural underlay lives in a peer <img> with pointer-events:none below the Fabric canvas — NOT as a Fabric backgroundImage. canvas.toSVG() therefore serializes only user annotations, keeping the markup payload small and the underlay re-fetchable."
    - "Last-write-wins UPSERT per cad_file_id (RESEARCH §A Open Question 4 default): one canonical markup row per file revision. Plan 60-04 SQS PDF gen reads that single row directly — no merge logic needed."
    - "Mixed revision UNION (procedural Phase-35 part_revisions WHERE cad_file_id IS NULL  +  uploaded Phase-60 part_cad_files) — single ORDER BY created_at DESC list, with per-uploaded-row EXISTS subquery for has_markup."
    - "In-flight save coalescing: only one POST in flight at a time; subsequent canvas events set a 'pending' flag and re-fire schedSave after the in-flight save completes. Prevents 429-storm during rapid editing."
    - "Module-script + IIFE race handled with bounded poll (max 50 × 50 ms = 2.5 s) for window.satelliteApi — same pattern Plan 60-02 dispatcher established."

key-files:
  created:
    - /Users/jeet/turion-satellite/migrations/024_part_drawing_markups.sql
    - /Users/jeet/turion-satellite/backend/src/lib/markup-sanitizer.ts
    - /Users/jeet/turion-space-demo/satellite/cad-markup.js
  modified:
    - /Users/jeet/turion-satellite/backend/src/routes/cad-files.ts
    - /Users/jeet/turion-satellite/backend/src/routes/parts.ts
    - /Users/jeet/turion-satellite/backend/package.json
    - /Users/jeet/turion-satellite/backend/package-lock.json
    - /Users/jeet/turion-space-demo/satellite/part.html

key-decisions:
  - "Pinned isomorphic-dompurify@2.16.0 — newer 2.36/3.x ship a transitive dep on @exodus/bytes (ESM-only) that breaks Lambda Node 20 require(). v2.16 uses jsdom@25 → html-encoding-sniffer@4 (CJS-clean). Verified by reading dependency tree + a live Lambda crash log (ERR_REQUIRE_ESM) before the downgrade."
  - "Column-name substitution in GET /:id/revisions: plan assumed part_revisions had modified_by_cognito_sub + created_at, but mig 022 schema actually uses edited_by (uuid) + edited_at. Mapped accordingly so the UNION compiles + the response shape stays {revision, source, cad_file_id?, filename?, format, by_sub?, created_at, has_markup} as the frontend expects."
  - "Hard DELETE for markup (not soft) — markups are by design re-creatable via the canvas, and the audit_log row preserves history. Soft-delete would force the GET route to filter on a flag column, adding complexity for no recovery value."
  - "Frontend files in /Users/jeet/turion-space-demo/satellite/ (NOT /Users/jeet/turion-satellite/frontend/satellite/ as the plan frontmatter listed). Same Rule-3 deviation Plan 60-02 documented — the listed path doesn't exist; the live deploy script (deploy-frontend.sh) and all sibling files (cad-upload.js, cad-viewer*.js, part.html) live in turion-space-demo. Following live convention."
  - "Substitute headless smoke for full Cognito-bound E2E render — same gate as 60-01/02: the executor cannot mint a Cognito ID token for an admin user. Substituted: (a) auth-gate curl smoke (401/400 on all 4 new routes), (b) direct sanitizer unit smoke via the built dist/lib/markup-sanitizer.js (5 cases: clean / <script> / onclick / oversize / empty), (c) DB-direct INSERT + UNION-query verification via the rls-runner Lambda with synthetic cad_file + markup rows, (d) DB CHECK constraint test (600 KB → 23514), (e) puppeteer-core same-origin module import on login.html confirming cad-markup.js parses + exports + part.html markers present."

patterns-established:
  - "DOMPurify pinning discipline: when adding any DOMPurify-based dep to a Lambda Node backend, verify the html-encoding-sniffer transitive version (must be ≤4) by running `npm ls html-encoding-sniffer` BEFORE deploying. v5+ pulls @exodus/bytes ESM-only and breaks require()."
  - "Plan field NOTE override: when a plan body explicitly says 'executor substitutes the closest equivalent and documents in SUMMARY' for a schema-uncertain field, that's a sanctioned deviation — execute it inline, surface in key-decisions. Done here for part_revisions.edited_by/edited_at vs assumed modified_by_cognito_sub/created_at."

requirements-completed:
  - DrawingMarkup
  - RevisionControlOnUploads

# Metrics
duration: 17min
completed: 2026-05-16
---

# Phase 60 Plan 03: Drawing Markup + Revision Control Summary

**Fabric.js v6 markup overlay wired end-to-end with isomorphic-dompurify SVG-profile XSS sanitization (server-side, defense-in-depth) plus a UNION-based mixed revision history that joins Phase-35 procedural-SVG history and Phase-60 uploaded-CAD history into one chronological list with per-row `has_markup` awareness — closes 2 ROADMAP requirements (DrawingMarkup + RevisionControlOnUploads) and pre-creates the `part_drawing_jobs` table that Plan 60-04 SQS PDF gen requires.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-05-16T10:13:50Z
- **Completed:** 2026-05-16T10:31:36Z
- **Tasks:** 2 (autonomous, no checkpoints)
- **Files created:** 3 (migration 024 + markup-sanitizer.ts + cad-markup.js)
- **Files modified:** 5 (cad-files.ts, parts.ts, package.json, package-lock.json, part.html)
- **Git commits:** 4 (3 in turion-satellite + 1 in turion-space-demo)

## Accomplishments

### Task 1 — Migration 024 + sanitizer + 4 routes + Lambda redeploy

- **Migration 024_part_drawing_markups.sql** applied to Aurora via `zietra-rls-runner-55-05` (operator-injected password from the proxy's registered master secret `rds!cluster-16d5e38c-…-mhV473`). 3 schema changes in ONE BEGIN/COMMIT:
  - `turion_satellite.part_drawing_markups` (id PK, part_cad_file_id FK ON DELETE CASCADE, tenant_id, markup_svg TEXT CHECK length ≤ 524288, created_by_cognito_sub, created_at, updated_at) + 2 indexes + RLS ENABLE + FORCE + tenant_isolation policy bound to `current_setting('app.tenant_id')`
  - `part_revisions` extended with nullable `cad_file_id uuid REFERENCES part_cad_files(id) ON DELETE SET NULL` (Phase 35 rows keep cad_file_id NULL)
  - `turion_satellite.part_drawing_jobs` (id PK, part_id FK, tenant_id, status CHECK queued|rendering|ready|failed, pdf_s3_key, error, requested_by_cognito_sub, requested_at, completed_at) + tenant+status index + RLS+FORCE — **consumed by Plan 60-04, no migration needed there**
  - Post-apply verify: both new tables show `relrowsecurity=true, relforcerowsecurity=true`; `part_revisions.cad_file_id` column present (uuid, nullable)
- **`backend/src/lib/markup-sanitizer.ts`** — `sanitizeMarkupSvg(svg): string` exports + `MARKUP_SVG_MAX_BYTES` constant. Uses DOMPurify with `USE_PROFILES: { svg: true, svgFilters: true }` plus explicit `FORBID_TAGS: ['script','foreignObject','iframe','object','embed']` and `FORBID_ATTR: ['onload','onclick','onerror','onmouseover','onmouseout','onfocus','onblur','onchange','onsubmit']`. 512 KB cap raised before sanitization (cheap to check). Empty result rejection (input was 100% unsafe).
- **`backend/src/routes/cad-files.ts`** — 3 new routes mounted under `/api/parts/:id/cad-files/:fileId/markup`:
  - `POST` (admin/manager) — sanitizes, confirms `cad_file_id` belongs to the part (defense in depth alongside RLS), UPSERTs (one row per cad_file_id, last-write-wins), audits `cad_upload_commit` with `{markup_size, cad_file_id, markup_id, action_subtype: 'markup_save'}`. 400 on sanitize/oversize; 404 if cad_file doesn't belong to part; 400 on DB CHECK 23514 (oversize through another path).
  - `GET` (any auth) — joins markups → part_cad_files to scope by part_id; 404 when no markup.
  - `DELETE` (admin/manager) — hard DELETE via cad_files JOIN (rejects misrouted deletes), audits `cad_file_deactivate` with `action_subtype: 'markup_delete'`.
- **`backend/src/routes/parts.ts`** — `GET /:id/revisions` UNION procedural + uploaded, ordered DESC by `created_at`. **Column-name substitution documented:** plan assumed `modified_by_cognito_sub`/`created_at` on `part_revisions`, but mig 022 actually defines `edited_by`/`edited_at` — mapped to `by_sub`/`created_at` in the SELECT so the response stays as plan promised.
- **Backend dep:** installed `isomorphic-dompurify@2.16.0` (NOT 2.36 or 3.x — see Rule 1 fix below).
- **TypeScript compile clean:** `npx tsc --noEmit` exits 0.
- **Lambda redeployed twice via `./build-and-push.sh`:**
  - First redeploy (CodeSha256 `66a251e8…`) crashed on ERR_REQUIRE_ESM (the dompurify dep version bug — see deviations).
  - Final redeploy (CodeSha256 **`19ba6068685e43943b4bcbc6fd569759e0c425ae167ca8c8d1d25f1853bce15b`**) initialized cleanly.
- **Live route smoke:**
  - `POST /markup` (no JWT, valid tenant) → **401** ✓
  - `GET  /markup` (no JWT, valid tenant) → **401** ✓
  - `DELETE /markup` (no JWT, valid tenant) → **401** ✓
  - `GET  /revisions` (no JWT, valid tenant) → **401** ✓
  - `GET  /markup` (no tenant slug) → **400** ✓
- **Direct sanitizer unit smoke** (Node, against the built `dist/lib/markup-sanitizer.js`):
  - Clean SVG (text + line) → preserves `<text>` element ✓
  - `<script>alert(1)</script>` payload → script tag stripped, `<text>` preserved ✓
  - `onclick="alert(1)"` attribute → attribute stripped, element preserved ✓
  - 600 KB SVG → rejected with `markup_svg exceeds 512 KB limit (got 600011 bytes)` ✓
  - Empty string → rejected with `markup_svg must be a non-empty string` ✓
- **DB-direct branch verification via rls-runner Lambda** (substitute for full Cognito-bound E2E — same gate as Phase 60-01/02):
  - Seeded a synthetic `part_cad_files` row (format=stl, revision=99) for the ADCS-ASSY part used in Phase 60-02 smoke → returned `cad_file_id e78a5745-…-4c53`
  - INSERT into `part_drawing_markups` with a 103-byte `<svg><text>SMOKE</text></svg>` → row inserted, indexed, RLS-scoped
  - Ran the exact `/revisions` UNION SQL the route uses → returned 1 row `{revision:"99", source:"uploaded", cad_file_id, filename:"smoke-60-03.stl", format:"stl", by_sub:"smoke-user", has_markup:true}` — UNION shape matches plan spec exactly
  - DB CHECK constraint test: INSERT of a 600 KB markup → 23514 violation on `part_drawing_markups_markup_svg_check` ✓
  - Cleanup: DELETE on the cad_file CASCADEd the markup (verified `leftover_markups=0`), `cad_files_remaining=0` confirms baseline restored

### Task 2 — Fabric.js overlay + revision panel + frontend deploy + headless smoke

- **`satellite/cad-markup.js`** (7,310 bytes deployed on CloudFront) — Fabric.js v6 ESM loaded from `https://cdn.jsdelivr.net/npm/fabric@6.4.3/dist/index.min.mjs` (no bundler, no vendoring — same pattern as Three.js in Phase 30/60-02). Exports `mountMarkup(container, partId, cadFileId, baseImageUrl)` returning a controller with `{addText, addArrow, addRect, enableFreehand, disableFreehand, clear, save, exportSvg, destroy}`.
  - **Base image as locked DOM layer (Pitfall 7):** renders as a peer `<img>` with `position:absolute; inset:0; pointer-events:none; z-index:1` — NOT a Fabric backgroundImage. `canvas.toSVG({suppressPreamble:true})` therefore serializes only user-added annotations; the underlay is never re-encoded into the markup payload.
  - **Auto-save (debounced 500 ms)** on `object:added`, `object:modified`, `object:removed`, `path:created` events.
  - **In-flight save coalescing:** if a save is mid-POST, subsequent events flip a `pending` flag; the in-flight save's finally re-fires `schedSave()` so the latest state always lands without concurrent POSTs.
  - **Role gate** read from Cognito ID-token claims (`cognito:groups` → admin/manager); returns `null` and hides the panel for non-admin/manager. Backend `requireRole('admin','manager')` is the source of truth.
- **`satellite/part.html`** — additive (no existing handlers removed):
  - 2 new sections after `#cadUploadPanel`: `#markupPanel` (with toolbar + #markupCanvas) and `#revisionPanel` (with #revisionList).
  - New module script at the bottom (before the closing `</body>`):
    - Polls for `window.satelliteApi` (max 2.5 s, same race-handler pattern Plan 60-02 established).
    - `loadRevisions(partId)` always runs — calls `/api/parts/:id/revisions`, renders each row with a `procedural` or `uploaded` badge, a `has_markup` badge when the uploaded rev has annotations, a `view this rev` deep-link (`?id=...&cad_file_id=...`) for uploaded revs, and a `by` slice for the actor sub.
    - `setupMarkup(partId)` calls `/api/parts/:id/drawing-source`. On `source='uploaded'` mounts the Fabric canvas + wires the 6 toolbar buttons (Text/Line/Rect/Freehand/stop-pen/Clear-all). On `source='procedural'` keeps the panel visible but swaps the canvas for a hint "Markup is available after you upload a CAD file…" (sets user expectation correctly).
- **Frontend deploy via `./deploy-frontend.sh`:** 4 objects uploaded to `s3://turion-demo-static` (cad-markup.js, part.html, satellite-config.js, turion-config.js). **CloudFront invalidation: `I51LF3DZ0I20K9CAZBXN5G8L6Q`** on `E37R9PT8IL44L2`.
- **HEAD smoke (post-invalidation):** `cad-markup.js` → 200 / 7310 bytes ✓. `part.html` → 200 / 101191 bytes ✓.
- **Deployed part.html marker grep:** `markupPanel` (2 hits), `revisionPanel` (1), `cad-markup.js` (1), `revisionList` (2) — all 4 new markers present in CloudFront cache.
- **Headless module-parse smoke (Puppeteer):** navigates to `https://turionspace.zietra.com/satellite/login.html` (same-origin no-auth host page) and:
  - Test 1: dynamic `import('/satellite/cad-markup.js')` resolves; exports `['mountMarkup']` with `typeof mountMarkup === 'function'` ✓
  - Test 2: `mountMarkup()` returns `null` when `window.satelliteApi` is missing (defensive role-gate path) ✓
  - Test 3: `fetch('/satellite/part.html')` returns HTML containing all 5 markers (markupPanel, revisionPanel, markupCanvas, mkText, revisionList) ✓
  - All 3 tests PASSED.

## Task Commits

1. **Task 1A: migration 024 SQL** → `ce81099` (feat) in turion-satellite
2. **Task 1B: sanitizer + 3 markup routes + /revisions UNION + dep pin** → `99af083` (feat) in turion-satellite
3. **Task 1C: Lambda redeploy marker (CodeSha256 19ba6068…)** → `06d4a2b` (chore) in turion-satellite
4. **Task 2: cad-markup.js + part.html additive wiring** → `7e6e8fb` (feat) in turion-space-demo

All commits authored as `jm@techcloudpro.com` per the global git-author identity rule. All pushed to `github.com/jeet-avatar/turion-satellite` and `github.com/jeet-avatar/turion-space-demo`.

## Files Created/Modified

**Created:**
- `/Users/jeet/turion-satellite/migrations/024_part_drawing_markups.sql` (114 lines) — 3 schema changes (markups + part_revisions.cad_file_id FK + part_drawing_jobs)
- `/Users/jeet/turion-satellite/backend/src/lib/markup-sanitizer.ts` (52 lines) — DOMPurify wrapper + 512 KB cap
- `/Users/jeet/turion-space-demo/satellite/cad-markup.js` (~180 lines, 7,310 bytes on CDN) — Fabric.js v6 overlay

**Modified:**
- `/Users/jeet/turion-satellite/backend/src/routes/cad-files.ts` (+165 lines — 3 markup routes + 1 sanitizer import)
- `/Users/jeet/turion-satellite/backend/src/routes/parts.ts` (+55 lines — `GET /:id/revisions` UNION)
- `/Users/jeet/turion-satellite/backend/package.json` (+1 dep — isomorphic-dompurify@2.16.0)
- `/Users/jeet/turion-satellite/backend/package-lock.json` (transitive deps locked)
- `/Users/jeet/turion-space-demo/satellite/part.html` (+30 lines panel HTML + +130 lines additive module script before `</body>`)

## Decisions Made

1. **`isomorphic-dompurify@2.16.0` pinned.** 2.36 (latest 2.x) ships `jsdom@28` → `html-encoding-sniffer@6` → `@exodus/bytes@^1.6.0`, which is ESM-only and crashes Lambda Node 20 with `ERR_REQUIRE_ESM`. Caught it live (first redeploy returned 500 on every route, log showed `require() of ES Module … from html-encoding-sniffer not supported`). Downgraded to 2.16 which uses `jsdom@25 → html-encoding-sniffer@4` (CJS-clean). Documented in a key-decision so the next CI bump doesn't silently re-break the Lambda.
2. **Column-name substitution in `/revisions` UNION.** Plan assumed `modified_by_cognito_sub` and `created_at` on `part_revisions`, but mig 022 schema is `edited_by uuid` + `edited_at timestamptz`. Per the plan body's explicit NOTE, mapped to `NULLIF(pr.edited_by::text, '') AS by_sub` and `pr.edited_at AS created_at` so the UNION compiles and the response shape stays as plan-specified. The frontend `loadRevisions()` consumes the response unchanged.
3. **Hard DELETE for markups (not soft).** Markups are recoverable from the canvas at any time; the `audit_log` row preserves the save history. Soft-delete would force every GET to filter on a flag column and add no recovery value.
4. **Frontend in `turion-space-demo` not `turion-satellite/frontend/`.** Same Rule-3 deviation Plan 60-02 documented and resolved. The `/Users/jeet/turion-satellite/frontend/satellite/` path listed in the plan frontmatter does not exist; all live frontend (cad-upload.js, cad-viewer*.js, part.html, deploy-frontend.sh) lives in `turion-space-demo`. Followed live convention.
5. **Substitute headless smoke + DB-direct branch verification for full Cognito-bound E2E render.** Same gate Plans 60-01 and 60-02 documented: the autonomous executor cannot mint a Cognito ID token for an admin user, so the full "browser navigates to part.html, sees /drawing-source=uploaded, sees the Fabric canvas, types text, sees it persist to DB" flow requires a human operator. Substitute smoke covered every layer the executor can reach: route-mount auth gate (curl 401/400), sanitizer behavior (5-case unit smoke against built JS), DB UNION shape (rls-runner Lambda exact-SQL test), DB CHECK constraint (23514 on 600 KB), Lambda init cleanliness (post-fix CodeSha256 + 401 instead of 500), frontend module parse + part.html markers (puppeteer-core same-origin on login.html), CloudFront delivery (HEAD 200 + content-length match).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `isomorphic-dompurify@3.13` crashed Lambda Node 20 with `ERR_REQUIRE_ESM`**
- **Found during:** Task 1 Step H (first live smoke; all routes returned 500 instead of 401)
- **Issue:** `npm install --save isomorphic-dompurify` (no version pin) pulled v3.13.0, which transitively requires `jsdom@28 → html-encoding-sniffer@6 → @exodus/bytes@^1.6.0`. `@exodus/bytes` is published as ESM-only (`"type": "module"` + no CJS build), and `html-encoding-sniffer/lib/html-encoding-sniffer.js` does a plain `require('@exodus/bytes/encoding-lite.js')`. Lambda Node 20 doesn't allow `require()` of an ESM module → INIT_REPORT crash on every cold start.
- **Fix:** `npm uninstall isomorphic-dompurify && npm install --save isomorphic-dompurify@2.16.0` — that version uses `jsdom@25 → html-encoding-sniffer@4` (CJS-clean, no `@exodus/bytes`). Verified with `npm ls html-encoding-sniffer` showing v4. Rebuilt + redeployed Lambda (CodeSha256 `19ba6068…`); subsequent smoke returned 401 as expected.
- **Files modified:** `backend/package.json`, `backend/package-lock.json`
- **Verification:** post-fix Lambda init logs are clean; all 4 routes return 401 (no auth) and 400 (no tenant); sanitizer unit smoke runs cleanly via Node.
- **Committed in:** `99af083` + `06d4a2b` (the post-fix deploy marker carries the working CodeSha256)

**2. [Rule 3 — Blocking] Frontend path in plan frontmatter doesn't exist**
- **Found during:** Task 2 Step A (about to create `cad-markup.js`)
- **Issue:** Plan frontmatter listed `/Users/jeet/turion-satellite/frontend/satellite/cad-markup.js`, but that directory does not exist. `ls /Users/jeet/turion-satellite/` confirms only `backend/`, `docs/`, `migrations/`, `node_modules/`, `scripts/`, plus two deploy scripts — no `frontend/`. All live satellite frontend (cad-upload.js from Plan 60-01, cad-viewer*.js from Plan 60-02, part.html) lives at `/Users/jeet/turion-space-demo/satellite/`.
- **Fix:** Created `cad-markup.js` and modified `part.html` at `/Users/jeet/turion-space-demo/satellite/`. Deployed via `/Users/jeet/turion-space-demo/deploy-frontend.sh`. Same resolution Plan 60-02 documented under its identical deviation.
- **Files modified:** location of `cad-markup.js` and `part.html` (not their contents).
- **Verification:** `deploy-frontend.sh` syncs from the correct dir; HEAD on `https://turionspace.zietra.com/satellite/cad-markup.js` returns 200 with 7,310 bytes and `content-type: text/javascript`.
- **Committed in:** `7e6e8fb` (Task 2 commit)

**3. [Rule 1 — Bug] Plan example used wrong `part_revisions` column names**
- **Found during:** Task 1 Step F (designing the UNION query)
- **Issue:** Plan example referenced `pr.modified_by_cognito_sub` and `pr.created_at` on `part_revisions`. Reading `migrations/022_part_revisions_and_retire.sql` (the table's actual DDL) shows columns `part_def_id`, `rev`, `drawing_svg`, `edited_by uuid`, `edited_at timestamptz`. Plan's NOTE explicitly sanctioned the substitution.
- **Fix:** UNION SELECT uses `pr.rev::text AS revision`, `NULLIF(pr.edited_by::text, '') AS by_sub`, `pr.edited_at AS created_at` — same response field names the frontend expects (`x.revision`, `x.by_sub`, `x.created_at`), just sourced from the real columns.
- **Files modified:** `backend/src/routes/parts.ts`
- **Verification:** TypeScript compile clean (tsc --noEmit exits 0); DB-direct UNION test via rls-runner returned the expected `{revision, source, by_sub, created_at, has_markup}` shape with all fields populated for the uploaded branch.
- **Committed in:** `99af083` (Task 1B commit)

---

**Total deviations:** 3 auto-fixed (1 bug — Rule 1 dep crash, 1 blocking — Rule 3 wrong path, 1 bug — Rule 1 column-name mismatch sanctioned by plan NOTE)
**Impact on plan:** All three were correctness fixes. The dep crash was a real runtime bug discovered by live smoke (would have shipped broken without the smoke). The path correction mirrors Plan 60-02's known repo-layout stale-frontmatter pattern. The column-name substitution was anticipated by the plan body itself.

## Issues Encountered

- **Live Cognito-bound E2E markup-canvas render is operator-gated.** Same gate as Plans 60-01 and 60-02. The full "operator opens https://turionspace.zietra.com/satellite/part?id=<id> with an uploaded CAD file for the part → sees the Fabric canvas mounted in #markupCanvas → adds text → saves → reloads → sees the text persist" walk requires a Cognito ID token the executor cannot mint. Substitute smoke covered: (a) the cad-markup.js module parses + exports correctly under puppeteer-core, (b) the part.html DOM contains all 5 markup/revision markers, (c) the backend routes 401-gate correctly, (d) the DB UNION returns the expected shape, (e) the DB CHECK constraint fires at 524288 bytes. The remaining gap is the ~30-second manual operator walk.

## Authentication Gates

- **Cognito JWT for full E2E render** — operator action required to verify the visual canvas mounts, accepts user input, and the auto-save round-trips through the live API. Substitute smoke (5 layers, see Decisions §5) covered every code path the executor can reach.

## User Setup Required

None — Phase 60-03 added zero new AWS services. Migration 024 used existing Aurora cluster, existing rls-runner Lambda, existing zietra_app + zietra_admin_bypass roles. `isomorphic-dompurify` is a pure-JS dep bundled into the Lambda image (no IAM/secret/env-var extension). Fabric.js loads from public jsDelivr CDN at runtime (no bundling, no S3 cost). The Phase 60-01 `CAD_BUCKET` env var covers the markup-overlay flow because markups never touch S3 — they live entirely in Postgres.

## Next Phase Readiness

- **Plan 60-04 (async PDF generation via Sparticuz Chromium Lambda)** is **fully unblocked**:
  - `turion_satellite.part_drawing_jobs` table pre-created (id, part_id, tenant_id, status enum, pdf_s3_key, error, requested_by, requested_at, completed_at). Plan 60-04 needs zero migrations.
  - The single canonical markup row per cad_file_id means the PDF renderer's SQL is `SELECT markup_svg FROM part_drawing_markups WHERE part_cad_file_id = $1 LIMIT 1` — no UNION, no merge, no ordering.
  - `audit_log.action` CHECK already includes `cad_pdf_generate` (added in Phase 60-01 mig 023). Plan 60-04 audits land in the same table with no schema change.
  - `GET /api/parts/:id/drawing-source` (Phase 60-02) is the canonical entry point — the PDF renderer hits this to fetch either the presigned upload URL or the procedural SVG, then layers the markup_svg over it.

## Self-Check: PASSED

- [x] `/Users/jeet/turion-satellite/migrations/024_part_drawing_markups.sql` exists (114 lines on disk)
- [x] `/Users/jeet/turion-satellite/backend/src/lib/markup-sanitizer.ts` exists (52 lines, exports `sanitizeMarkupSvg` + `MARKUP_SVG_MAX_BYTES`)
- [x] `/Users/jeet/turion-satellite/backend/src/routes/cad-files.ts` contains `/markup` route handlers (3 routes + sanitizer import)
- [x] `/Users/jeet/turion-satellite/backend/src/routes/parts.ts` contains `'/:id/revisions'` route with UNION + edited_by/edited_at substitution
- [x] `/Users/jeet/turion-space-demo/satellite/cad-markup.js` exists (7,310 bytes on CloudFront)
- [x] `/Users/jeet/turion-space-demo/satellite/part.html` contains all 5 markers: markupPanel (×2), revisionPanel, markupCanvas, mkText, revisionList (×2)
- [x] Commit `ce81099` exists in turion-satellite (migration)
- [x] Commit `99af083` exists in turion-satellite (sanitizer + routes)
- [x] Commit `06d4a2b` exists in turion-satellite (deploy marker)
- [x] Commit `7e6e8fb` exists in turion-space-demo (frontend)
- [x] Migration 024 applied to Aurora: 2 new tables show `relrowsecurity=true,relforcerowsecurity=true`; `part_revisions.cad_file_id` column present
- [x] Lambda CodeSha256 = `19ba6068685e43943b4bcbc6fd569759e0c425ae167ca8c8d1d25f1853bce15b` (post-dep-fix)
- [x] CloudFront invalidation `I51LF3DZ0I20K9CAZBXN5G8L6Q` created on distribution `E37R9PT8IL44L2`
- [x] Auth gates: 401 on POST/GET/DELETE /markup + GET /revisions (no JWT); 400 (no tenant slug)
- [x] Sanitizer unit smoke: 5/5 PASS (clean / `<script>` strip / `onclick` strip / oversize reject / empty reject)
- [x] DB-direct UNION smoke: returned `{revision:"99", source:"uploaded", cad_file_id, filename, format:"stl", by_sub, has_markup:true}` exactly as plan specified
- [x] DB CHECK constraint test: 600 KB INSERT → 23514 violation on `part_drawing_markups_markup_svg_check`
- [x] CASCADE cleanup: deleting the cad_file removed the markup (leftover_markups=0), cad_files_remaining=0 (baseline restored)
- [x] Headless puppeteer smoke: 3/3 PASS (module import + exports / mount-no-api null / part.html markers present in deployed HTML)

---
*Phase: 60-real-cad-support-step-stl-upload-3d-viewer-drawing-markup*
*Completed: 2026-05-16*
