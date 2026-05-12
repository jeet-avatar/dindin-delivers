---
phase: 33-end-to-end-satellite-build-flow
plan: 06
subsystem: deploy-and-verify
tags: [deploy, lambda, cloudfront, e2e-verification, turion-satellite]
status: complete
requires:
  - "33-01..05 (migration 020/021, sales-orders + spawn-satellite routes, program-new.html wizard, programProgress strip, next-step wiring)"
provides:
  - "turion-satellite Lambda redeployed with the new routes (live)"
  - "turion-space-demo frontend deployed (wizard + wiring live on turionspace.zietra.com)"
  - "DB-direct E2E verification of the spawn → satellite → part_instances → bom_lines → stage-0-events chain"
affects:
  - "Phase 33 complete (6/6 plans) — end-to-end satellite-build flow shipped + live"
tech-stack:
  added: []
  patterns:
    - "Turion satellite app has its OWN deploy scripts (build-and-push.sh for the Lambda, deploy-frontend.sh for S3/CloudFront) — NOT the dollor.ai CI/CD workflows"
    - "F6 deploy-hygiene pre-flight: stash unrelated WIP root HTML + mv .superpowers/ aside before `aws s3 sync . --delete`, restore after (even on failure)"
    - "Headless E2E substitute (Pitfall 4): no browser/magic-link/synthetic-JWT — verify the data path directly against prod via SQL spawn + chain assertions + ordered cleanup"
key-files:
  created:
    - /Users/jeet/doordash-p2p/.planning/phases/33-end-to-end-satellite-build-flow/33-06-SUMMARY.md
  modified: []
decisions:
  - "Phase-33 commits in both repos already existed locally from waves 1-4 — Task 1/2 = git push + redeploy, not new commits."
  - "Migrations 020 + 021 re-applied as an idempotency guard — clean no-ops (all NOTICE: ... already exists / does not exist, skipping)."
  - "DB-direct E2E walk used SQL `spawn_satellite_program(...)` directly (no JWT minted) — the plan allows either path; the HTTP POST path was already 401-smoked in Task 1."
  - "Deviation (Rule 1): the plan asserted SAT-003's BOM root = bom_lines with parent_part_instance_id IS NULL (>0); the real data has 0 such rows — SAT-003's 20 root instances are simply those that never appear as a bom_lines child. Verified that real invariant instead (20 root instances on the clone == 20 on SAT-003)."
metrics:
  duration: ~40m
  completed: 2026-05-12
---

# Phase 33 Plan 06: Deploy + E2E walk Summary

Shipped Phase 33: redeployed the `turion-satellite` Lambda with the new routes, deployed the `turion-space-demo` frontend (wizard + wiring) with the F6 pre-flight, ran the button audit in both repos (0 violations each), and verified the whole end-to-end spawn chain with a DB-direct walk against prod (spawn a throwaway SAT-999 program → confirm 261 part_instances / 241 bom_lines / 0 dangling refs / 20 root instances / 261 stage-0 `drawing`-`forward`-`entered` events / status advance → ordered cleanup → prod back to baseline), then updated STATE.md + ROADMAP.md to mark Phase 33 complete (6/6 plans). The human-verify checkpoint was approved as a headless-substitute (DB-direct walk + curl/HEAD smoke + both-repo button audit stand in for the browser visual sign-off, per the Phases 27-32 precedent).

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Commit + redeploy turion-satellite Lambda; smoke new routes | `c13e4ce` (pushed; commits already existed) | turion-satellite: routes/sales-orders.ts, routes/satellites.ts, app.ts, tests, migrations/020+021 |
| 2 | Deploy turion-space-demo frontend with F6 pre-flight; post-deploy audit | `79b5ed7` (pushed; commits already existed) | turion-space-demo: satellite/program-new.html, index.html, satellite-render.js, sat/bom/kanban/instance/work-order/work-orders/part/cost/cost-detail.html |
| 3 | DB-direct E2E walk — spawn test program, confirm chain, clean up | (no commit — prod mutation + cleanup, recorded here) | — |
| (checkpoint) | Human verification of the live E2E flow (optional) | approved (headless-substitute) | — |
| 4 | Update STATE.md + ROADMAP.md; commit docs | docs commit (this repo) | .planning/STATE.md, .planning/ROADMAP.md, .planning/phases/33-*/33-06-SUMMARY.md |

## Verification Records

### Task 1 — Lambda redeploy
- Migrations 020 + 021 re-applied to prod (DB URL from secret `turion-satellite/production/database-url-NCbgX6`, `?schema=` stripped): clean no-ops — `NOTICE: relation "sales_orders" already exists, skipping` / `column "sales_order_id" ... already exists, skipping` / `relation "idx_satellites_sales_order" already exists, skipping` (020); `NOTICE: constraint "audit_log_action_check" ... does not exist, skipping` (021).
- `git push origin main` (turion-satellite): `15df18d..c13e4ce`.
- Lambda CodeSha256: **before** `5438a289ebd28a88a1b44c5162ad8d321b63f78b14d0ed79ae9162856f4d252d` → **after `./build-and-push.sh`** `ffde2154a568790b14406521e95e929aab821b601c90ada6b39b8071887a5c21` (changed ✓).
- Smoke (`https://rjydekliee.execute-api.us-east-1.amazonaws.com`):
  - `POST /api/sales-orders` → **401**
  - `POST /api/satellites` → **401**
  - `PATCH /api/satellites/00000000-...` → **401**
  - `GET /api/this-route-does-not-exist` → **404** (sanity: not everything 401s)
  - `GET /api/health` → `{"db":"ok","schema":"turion_satellite","latency_ms":169,...}`

### Task 2 — Frontend deploy
- `git push origin main` (turion-space-demo): `f3195a5..79b5ed7`.
- F6 pre-flight: `git stash push -- about-this-demo.html agent-sales-cash.html dashboard-cio.html` + `mv .superpowers /tmp/superpowers-stash-33`. Confirmed `git status` clean of WIP root HTML + `.superpowers` gone. (`deploy-frontend.sh` excludes `backend/*`, `.git/*`, `*.sh`, `*.md` — the remaining dirty files were all under `backend/` and safely untouched.)
- `./deploy-frontend.sh` — synced `satellite/*.html`, `satellite-config.js`, `satellite-render.js`, plus the 3 root HTML files (at their HEAD versions, since the WIP was stashed). CloudFront invalidation: **`IC5BXDW47M3MIBSQTULPJMGPQJ`**.
- Restore: `git stash pop` (dropped `refs/stash@{0}`), `mv /tmp/superpowers-stash-33 .superpowers`. `git stash list` empty; working tree == pre-deploy baseline.
- CF invalidation polled to **`Completed`**.
- Curl-smoke (`https://turionspace.zietra.com/satellite/...`), all HTTP 200, expected substrings present:
  - `program-new.html` — `grep("New satellite program")=2`, `content-type: text/html`
  - `satellite-render.js` — `grep("programProgress")=3`, `content-type: text/javascript`
  - `index.html` — `grep("program-new.html")=2`
  - `sat.html` — `grep("programProgress")=1`, `grep("satelliteApi.patch('/api/satellites/")=1`
  - `bom.html` — `grep("programProgress")=1`; `kanban.html` — `grep("programProgress")=1`
  - `work-order.html` — `grep("work-orders/")=9`
  - `cost-detail.html` — `grep("bom.html?sat=")=1`
  - `instance.html` / `work-orders.html` / `cost.html` / `login.html` — 200
  - Phase-27-32 regression: `3d-test.html` 200; `part.html` `grep("mount3DViewer")=4`; `bom.html` `grep("🧊 3D")=1`; jsDelivr `three@0.184.0` import-map URL → 200
- Button audit: `node scripts/audit-satellite-buttons.mjs` — **turion-satellite/backend**: `routes: 66, onclick: 16, satelliteApi: 65, violations: 0, exit 0`; **turion-space-demo**: identical, `violations: 0, exit 0`.

### Task 3 — DB-direct E2E walk (against prod, then cleaned up)
SAT-003 = `24587565-b15b-42ce-b590-87ecf9b6bb99`.

**Baseline:** `satellites` total = 4 · SAT-003 `part_instances` = 261 (N) · SAT-003 `bom_lines` = 241 (M) · SAT-003 root instances (instances never a `bom_lines.child`) = 20 · SAT-003 `bom_lines` with `parent_part_instance_id IS NULL` = **0** (so the plan's "NULL-parent root line >0" assertion doesn't hold for this data — verified the real "20 root instances" invariant instead).

**Spawn:** `INSERT turion_satellite.sales_orders (order_number='SO-E2E-TEST-33', customer_name='E2E Test Customer', program_name='E2E Test Program', status='open')` → `SO=002270df-0c41-4dac-b6e5-7d3aad4d3e1a`. `SELECT turion_satellite.spawn_satellite_program('E2E Test Sat','SAT-999', SO, NULL, 'standard-bus')` → `NEWSAT=78aec563-535f-43e0-837e-ef9de315b86b`.

**Chain confirmation (NEWSAT):**
| Check | Expected | Actual |
| ----- | -------- | ------ |
| satellite row: name / designation / status / sales_order_id | E2E Test Sat / SAT-999 / design / =SO | ✓ all match |
| sales_orders back-link `satellite_id` | =NEWSAT | ✓ `78aec563-...` |
| `part_instances` on NEWSAT | = N (261) | 261 ✓ |
| `bom_lines` on NEWSAT | = M (241) | 241 ✓ |
| dangling refs at SAT-003 instances | 0 | 0 ✓ |
| root instances on NEWSAT (never a child) | = 20 (SAT-003) | 20 ✓ |
| stage-0 `part_stage_events` (`drawing`/`forward`/`entered`) | = N (261) | 261 ✓ |
| `part_stage_events` at any other stage | 0 | 0 ✓ |
| total `part_stage_events` on NEWSAT | 261 | 261 ✓ |
| status advance: `UPDATE satellites SET status='build'` | returns 'build' | 'build' ✓ (UPDATE 1) |

**Cleanup (ordered):** `DELETE part_stage_events` (261) → `DELETE bom_lines` (241) → `DELETE part_instances` (261) → `DELETE satellites` (1) → `DELETE sales_orders` (1).

**Post-cleanup:** `satellites` total = 4 (== baseline) · `satellites WHERE designation='SAT-999'` = 0 · `sales_orders WHERE order_number='SO-E2E-TEST-33'` = 0 · orphan instances/events on NEWSAT = 0. Prod restored exactly.

## Deviations from Plan

**1. [Rule 1 - Bug] Plan's BOM-root assertion didn't match the data**
- **Found during:** Task 3 baseline.
- **Issue:** The plan asserted SAT-003 has `bom_lines` with `parent_part_instance_id IS NULL` (>0) representing the BOM root, and the clone should preserve that count. Actual: SAT-003 has **0** NULL-parent `bom_lines`; its 20 "root" parts are the `part_instances` that never appear as a `bom_lines.child_part_instance_id`.
- **Fix:** Verified the real invariant — # of root instances (never-a-child) on the clone == 20 == SAT-003's count. Plus the explicit "0 dangling refs at SAT-003 instances" check (passed) covers the rewiring correctness the plan was after.
- **Files modified:** none (verification-only).
- **Commit:** none.

## Task 4 — STATE.md + ROADMAP.md

- ROADMAP.md: Phase 33 `**Plans:**` line → "6/6 plans complete"; 33-06 checkbox `[x]` with the deploy/E2E/audit/cleanup outcome line (matching how Phases 27-32 plan rows are recorded).
- STATE.md: "Current Position" rewritten to "**Phase 33 COMPLETE (6/6 plans)**" with the per-plan recap (mig 020/021, 3 routes, program-new.html wizard, programProgress strip + next-step wiring, Lambda CodeSha256 before→after `5438a289…`→`ffde2154…`, CF invalidation `IC5BXDW47M3MIBSQTULPJMGPQJ`, F6 pre-flight, DB-direct E2E walk result, button audit 0 violations both repos, the Rule-1 deviation); the prior 33-05 position moved into a `<details>` block.
- Docs committed to /Users/jeet/doordash-p2p as `jeet-avatar <jm@techcloudpro.com>`.

## Self-Check: PASSED

- `.planning/phases/33-end-to-end-satellite-build-flow/33-06-SUMMARY.md` — FOUND
- turion-satellite push range `15df18d..c13e4ce` / Lambda CodeSha256 `ffde2154…` — verified in Task 1 records (live API smoked 401/401/401/404)
- turion-space-demo push range `f3195a5..79b5ed7` / CF invalidation `IC5BXDW47M3MIBSQTULPJMGPQJ` Completed — verified in Task 2 records (deployed pages curl-smoked 200 with expected substrings)
- docs commit in /Users/jeet/doordash-p2p — FOUND (see commit list below)
- No "Self-Check: FAILED" items.

## Deferred / follow-ups

- Live magic-link browser walk through the wizard + the full forward chain (sat → bom → kanban → instance → work-order → back) — not performed headlessly; offered to the user as an optional follow-up in the checkpoint.
- (Carried from earlier phases) instance>1 duplicate instances missing WO/PR; `ns_invoice_id` NULL on some instances; gsd-tools STATE.md bloat.
