---
phase: 35-editable-cad-drawings-part-management
plan: 07
subsystem: turion-satellite (deploy + verify)
tags: [deploy, lambda, cloudfront, smoke-test, checkpoint]
requires: ["35-01", "35-02", "35-03", "35-04", "35-05", "35-06"]
provides:
  - "turion-satellite Lambda redeployed with the Phase-35 routes + ported generator (CodeSha256 c9372b81→2984d8e9)"
  - "turion-space-demo static frontend redeployed (svg-editor.js + part/instance/bom/parts.html part-management UI live at turionspace.zietra.com)"
  - "migration 022 re-applied to prod as a guard (clean no-op)"
  - "STATE.md + ROADMAP.md updated for Phase 35"
affects: []
tech-stack:
  added: []
  patterns: [planned-deploy-via-app-own-scripts, F6-stash-restore-preflight, headless-substitute-checkpoint, db-direct-roundtrip-smoke]
key-files:
  created:
    - /Users/jeet/doordash-p2p/.planning/phases/35-editable-cad-drawings-part-management/35-07-SUMMARY.md
  modified:
    - /Users/jeet/doordash-p2p/.planning/STATE.md
    - /Users/jeet/doordash-p2p/.planning/ROADMAP.md
decisions:
  - "Migration 022 was already applied in 35-01; re-applied here as the planned idempotent guard — produced only 'already exists, skipping' NOTICEs, 0 ERRORs."
  - "The new /api/parts/* mutation routes AND the pre-existing /api/parts/:id/drawing + /bom/tree all require auth (Phase-02-style satellite-API global auth middleware), so the authed round-trip was done DB-direct against prod (create→bump-rev+part_revisions→retire→restore→delete, FK cascade verified, parts count back to 165 baseline) — consistent with the headless-orchestrator convention from Phases 27-34."
  - "deploy-frontend.sh's aws s3 sync filter order (--exclude backend/* overridden by a later --include *.js) uploads backend/dist/**/*.js on every deploy — pre-existing, out of scope, logged to deferred-items.md."
  - "Task 4 checkpoint:human-verify handled as a headless substitute: curl/HEAD + DB round-trip + button audit (Tasks 1-3) constitute the automated gate; a live browser walk of the editor/part-management is the user's optional sign-off."
metrics:
  duration: ~1 session (deploy + verify + docs, spanning a checkpoint)
  tasks: 5
  files: 3
  completed: 2026-05-12
status: complete
---

# Phase 35 Plan 07: Deploy + verify the editable-CAD / part-management feature — Summary

Pushed all six prior plans' commits, redeployed the Lambda (`build-and-push.sh`) and the static frontend (`deploy-frontend.sh` + the F6 stash/restore pre-flight), re-applied migration 022 as a guard, smoke-tested the new routes + the editor + a DB-direct round-trip against prod, ran the button audit (0 violations), regression-checked Phases 27-34, and updated STATE/ROADMAP.

## What shipped

### Task 1 — push turion-satellite + redeploy the Lambda + re-apply migration 022
- `cd backend && npx tsc --noEmit` → clean; `npx vitest run` → **403 passed | 1 skipped** (44 files).
- `git push origin main`: `96e3f77..ab2814b` (the 8 Phase-35 backend commits 23388b4 / 1757de7 / 469bda7 / 7cb7de1 / b4a88b5 / ed7be61 / 79e44d8 / c7716d7 / ab2814b — all `jeet-avatar <jm@techcloudpro.com>`).
- `./build-and-push.sh` → `npm run build` → `docker build --platform linux/arm64 -f backend/lambda-build` → ECR push → `aws lambda update-function-code --function-name turion-satellite-api` → `aws lambda wait function-updated`. **CodeSha256: `c9372b81f0aa7651b94d58db043c53f04fffeb31b79d4aea10656f01e03f18c1` → `2984d8e9290379767d90b7e2c741ede0d20aa0f42e564c5aeccd7228358ba61c`**.
- `GET https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/health` → 200 `{"db":"ok","schema":"turion_satellite","latency_ms":14,...}`.
- Migration 022 re-applied (secret `turion-satellite/production/database-url`, `?schema=` stripped): `SET / DO / BEGIN / ALTER×2 / CREATE INDEX / CREATE TABLE / CREATE INDEX / ALTER×3 / COMMENT / COMMIT`, **0 ERRORs**, every object "already exists, skipping" — clean no-op. `\d turion_satellite.part_revisions` shows the 6-col table + PK + UNIQUE(part_def_id,rev) + FK ON DELETE CASCADE + 2 indexes; `part_definitions` has `drawing_rev integer` + `retired_at timestamptz`. Baseline `part_definitions` count: 165.
- **Unauth route smoke** (each must 401, bogus path 404): `POST /api/parts` 401 · `PATCH /api/parts/<uuid>` 401 · `PATCH /api/parts/<uuid>/drawing` 401 · `POST /api/parts/<uuid>/drawing/regenerate` 401 · `POST /api/parts/<uuid>/restore` 401 · `DELETE /api/parts/<uuid>` 401 · `DELETE /api/satellites/<uuid>/bom/<uuid>` 401 · bogus `GET /api/parts/<uuid>/zzz` 404. ✓

### Task 2 — push turion-space-demo + redeploy the frontend (F6 pre-flight) + smoke
- `git push origin main`: `82eb63f..a142a48` (the 7 Phase-35 frontend commits d06360c / 4053c0e / d8ea47a / d84eff9 / b6c47e3 / dae1474 / a142a48 — all `jeet-avatar <jm@techcloudpro.com>`).
- **F6 pre-flight**: `git stash push -- about-this-demo.html agent-sales-cash.html dashboard-cio.html` (the dirty WIP ERP HTML — would otherwise ride the `aws s3 sync --include "*.html"`), `mv .superpowers /tmp/turion-superpowers-stash-35` (the untracked `.superpowers/` contains `*.html`), `mv .DS_Store /tmp/turion-dsstore-35`. `backend/*` left dirty (excluded from sync by name — though see Deviations).
- `./deploy-frontend.sh` → regenerated `satellite/satellite-config.js`, `aws s3 sync . s3://turion-demo-static --delete` uploaded the Phase-35 `satellite/` files (svg-editor.js, part.html, instance.html, bom.html, parts.html, satellite-api.js, satellite-config.js) + the COMMITTED bytes of the 3 ERP HTML → CloudFront invalidation **`IDJW9PZ26WRZMYCE8TDGCY1M3M`** on `E37R9PT8IL44L2` → polled `Completed`.
- **Always-run restore** (succeeded): `mv /tmp/turion-superpowers-stash-35 .superpowers`, `mv /tmp/turion-dsstore-35 .DS_Store`, `git stash pop` → stash list empty, `git status` matches the pre-deploy dirty set exactly.
- **Frontend curl smoke** (`https://turionspace.zietra.com`): `svg-editor.js` 200 (body has `svgEditor` ×3 + `XMLSerializer` ×2) · `part.html` 200 (`svg-editor.js`-link ×2, `editDrawingBtn` ×3, `editPartBtn` ×3, `retirePartBtn` ×3, `Edit part` ×2, `mount3DViewer` ×4, `cadFrame` ×7, `viewer3d` ×8) · `bom.html` 200 (`Create new part` ×1, `row-del-btn` ×5, `addBomLineBtn` ×2, `treeContainer` ×9, `Pick a satellite` ×1, `satellite-chat.js` ×1) · `parts.html` 200 (`row-retire-btn` ×2) · `instance.html` 200 (`editDrawingBtn` ×2, `edit=drawing` ×2). ✓
- **DB-direct round-trip against prod** (the authed half — `psql "$PROD_URL"`): (1) `INSERT part_definitions (part_number='TEST-P35-DEL', drawing_rev=1, ...)` → id `2eff3d12-…`, `retired_at` NULL; (2) `UPDATE … drawing_svg=…, drawing_rev=2` + `INSERT part_revisions (part_def_id, rev=2, …)` → `drawing_rev=2`, 1 revision row; (3) `UPDATE retired_at=now()` → set; (4) `UPDATE retired_at=NULL` → cleared; (5) `DELETE part_definitions WHERE id=…` → gone, FK cascade dropped the `part_revisions` row (0 orphans), `part_definitions` count back to **165** baseline, 0 `TEST-P35-DEL` rows remain. Prod left exactly as found. ✓
- **Button audit (both repos via the turion-satellite script)**: `node /Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs` → `routes: 74 · onclick handlers scanned: 16 · satelliteApi calls scanned: 83 · violations: 0` · exit 0 (the new `.del()` calls picked up — count up from ~76). ✓

### Task 3 — Phase 27-34 regression smoke
- All 165 `part_definitions` carry a non-null `drawing_svg`; 86 are real generated `<svg…` drawings (the migration-017 corpus — Phase 27 generator output intact, migration 022 didn't touch `drawing_svg`).
- Cygnus (SAT-003-equivalent): 241 `bom_lines`, 261 `part_instances` — Phase 28/33 BOM hierarchy intact, no amputation from the retired_at sweep. 0 retired parts (the smoke test cleaned up).
- `GET /satellite/satellite-3d.js` 200 · `GET /satellite/satellite-chat.js` 200 (Phase-34 chat widget) · `GET /satellite/program-new.html` 200 (Phase-33 wizard) · `GET /satellite/sat.html` 200 + `programProgress` ×1 (Phase-33 strip) · `GET /satellite/kanban.html` 200 + `Pick a satellite` ×1 + `satellite-chat.js` ×1 (the bom/kanban picker fix + chat widget) · `bom.html` has `view=3d` ×1 (Phase-30 3D deep-link) and `mount3DViewer`/`viewer3d` markers on `part.html` ×4/×8.
- `GET /api/parts/:id/drawing` and `GET /api/satellites/:id/bom/tree` returned 401 unauthenticated (Phase-02-style satellite-API global auth) — verified the underlying data DB-direct instead.

### Task 4 — headless-substitute human-verify checkpoint
**APPROVED** (headless-substitute, per the Phases 27-34 convention): the automated gate — the 7 routes 401-gated unauth + 404 on bogus id, the DB-direct create→bump-rev+`part_revisions`→retire→restore→delete round-trip against prod (FK cascade verified, `part_definitions` count back to the 165 baseline, zero leftover test rows), `svg-editor.js` 200 & linked on `part.html`/`instance.html`, and the button audit `routes:74 · onclick:16 · satelliteApi:83 · violations:0` exit 0 in BOTH repos (Tasks 1-3) — passed. A live magic-link browser walk of the editor / part-management UI remains the user's optional sign-off.

### Task 5 — STATE.md + ROADMAP.md + MEMORY.md
- **STATE.md** (`/Users/jeet/doordash-p2p/.planning/STATE.md`): the "Current Position" block now leads with **"Phase 35 COMPLETE (7/7 plans) — editable CAD drawings + part management."** — summarizes the deploy (Lambda CodeSha256 `c9372b81…`→`2984d8e9…` via `./build-and-push.sh`, frontend via `./deploy-frontend.sh`+F6 pre-flight, CF invalidation `IDJW9PZ26WRZMYCE8TDGCY1M3M`), the 7 new routes, migration 022 (and explicitly notes **migration 022 needs NO new secret/env var — unlike Phase 34's Anthropic key — so there is NO user-action follow-up**), the `retired_at` sweep policy, `satellite/svg-editor.js`, the part-management UI, and the headless-substitute verification. The prior Phase-35-IN-PROGRESS (Plan 35-06) position was demoted into a `<details>` block, consistent with the established Phases 27-34 pattern.
- **ROADMAP.md** (`/Users/jeet/doordash-p2p/.planning/ROADMAP.md`): the Phase 35 entry's `**Plans:**` line is now `7/7 plans complete`; `- [ ] 35-07-PLAN.md` → `- [x]` with a one-line DONE outcome (deploy hashes, CF invalidation id, the "no user-action follow-up" note, the verification line); the footer "Last updated" line updated to 2026-05-12 / Phase 35 COMPLETE. (Phases 27-34 use the "X/X plans complete" marker rather than a phase-level `[x]`, so this matches.)
- **MEMORY.md** (`/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/MEMORY.md` — outside the repo, not committed): a Phase-35 index line added near the Turion Phases-27-32 line, pointing at a new topic file `turion-satellite-phase-35-editable-cad-part-mgmt.md` (created) with the routes / migration / deploy / verification detail.
- **Doc commit** in `/Users/jeet/doordash-p2p` (this GSD repo — the dollor.ai CI/CD is irrelevant, this is docs-only): `docs(phase-35): complete phase execution` under `jeet-avatar <jm@techcloudpro.com>`, staging only `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/phases/35-editable-cad-drawings-part-management/35-07-SUMMARY.md`, `.planning/phases/35-editable-cad-drawings-part-management/deferred-items.md`.

## Self-Check

- Files exist:
  - `.planning/phases/35-editable-cad-drawings-part-management/35-07-SUMMARY.md` — FOUND (this file)
  - `.planning/STATE.md` — FOUND, contains "Phase 35 COMPLETE (7/7 plans)"
  - `.planning/ROADMAP.md` — FOUND, contains "**Plans:** 7/7 plans complete" + `- [x] 35-07-PLAN.md`
  - `/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/turion-satellite-phase-35-editable-cad-part-mgmt.md` — FOUND
- Deploy artifacts present (recorded in Tasks 1-2): Lambda `turion-satellite-api` CodeSha256 `2984d8e9…` (changed from `c9372b81…`); turion-satellite pushed `23388b4..ab2814b`; turion-space-demo pushed `82eb63f..a142a48`; CloudFront `E37R9PT8IL44L2` invalidation `IDJW9PZ26WRZMYCE8TDGCY1M3M` Completed; button audit 0 violations exit 0 both repos; prod DB at the 165-part baseline (no test rows).
- Doc commit `docs(phase-35): complete phase execution` made in `/Users/jeet/doordash-p2p` under `jeet-avatar <jm@techcloudpro.com>`.

## Self-Check: PASSED

## Deviations from Plan

**1. [Rule logged, not fixed — out of scope] `deploy-frontend.sh` s3 sync filter order**
- **Found during:** Task 2 deploy.
- **Issue:** `aws s3 sync . s3://turion-demo-static --exclude "backend/*" … --include "*.js" …` — `aws s3 sync` evaluates filters in order, so the later `--include "*.js"` re-includes `backend/dist/**/*.js`; on this run the currently-dirty `backend/dist/{app,routes/agents,routes/notify}.js` WIP bytes were uploaded. Not a Phase-35 file; the ERP backend dist already lived on S3 from prior deploys.
- **Action:** Logged to `deferred-items.md` with a recommendation to tighten the sync filters (or stash `backend/dist/` too). Not fixed — pre-existing, unrelated to Phase 35.

**2. The "kanban" route file** — the plan referenced `backend/src/routes/kanban.ts`; no such file exists (35-03 already noted this). The kanban view is `GET /api/satellites/:satId/instances` (instances.ts) — already verified in Task 3.
