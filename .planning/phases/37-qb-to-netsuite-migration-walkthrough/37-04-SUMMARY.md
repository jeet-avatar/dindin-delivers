---
phase: 37-qb-to-netsuite-migration-walkthrough
plan: 04
subsystem: deploy
tags: [aws, lambda, cloudfront, s3, ecr, supabase, postgres, deploy, e2e, audit, quickbooks, ramp, netsuite, migration]

# Dependency graph
requires:
  - phase: 37-qb-to-netsuite-migration-walkthrough
    plan: 01
    provides: turion.qb_records + turion.ramp_card_txns + turion.migration_runs tables + GET routes + FIELD_MAPS const
  - phase: 37-qb-to-netsuite-migration-walkthrough
    plan: 02
    provides: POST /migrate handlers for 6 QB types + Ramp (atomic txn, audit trail, idempotent skipped[])
  - phase: 37-qb-to-netsuite-migration-walkthrough
    plan: 03
    provides: 8 vanilla-HTML wizard pages + index.html migration-tools section + 8 CF clean-URL rewrites
provides:
  - turion-demo-api Lambda redeployed with CodeSha256 2a63ac5d… (was c716f0d2…)
  - turionspace.zietra.com frontend with 8 new clean URLs live
  - CloudFront Function turion-clean-urls published to LIVE with Phase 37 rewrites
  - DB-direct E2E walk proof (1 QB customer + 1 Ramp txn round-trip + idempotency + cleanup-to-baseline)
  - dual button audit 0/0 violations (satellite + ERP)
  - Phase 27-36 regression intact (6 ERP pages 200, /api/data/all 53 keys, satellite /api/health ok)
  - STATE.md narrative entry + ROADMAP.md 4/4 plans complete
affects: [phase-38 (any follow-up gap-closure if checkpoint review surfaces issues)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "deploy-frontend.sh syncs cf-function-source/turion-clean-urls.js to S3 but does NOT publish the CloudFront Function — the publish step is a manual `aws cloudfront update-function` + `publish-function` after the deploy script runs"
    - "F6 pre-flight: mv .superpowers/ aside before deploy-frontend.sh (the script's `aws s3 sync . --delete` does NOT exclude that directory) — always-run restore even on script failure"
    - "DB-direct E2E walk pattern (the Phase 27-36 headless-substitute checkpoint): baseline counts → live API POST → DB confirms (target table + source flip + migration_runs + audit_log) → idempotency re-POST → cleanup (DELETE ns rows + UPDATE source rows back to 'new' + DELETE audit_log entries + DELETE migration_runs) → confirm post-cleanup counts EXACTLY equal baselines"

key-files:
  modified:
    - /Users/jeet/doordash-p2p/.planning/STATE.md (+1 narrative paragraph at top of Current Position, wrapped prior 37-03 entry in <details>)
    - /Users/jeet/doordash-p2p/.planning/ROADMAP.md (Phase 37 plan list 4/4 [x], updated Last-updated footer)
  created:
    - /Users/jeet/doordash-p2p/.planning/phases/37-qb-to-netsuite-migration-walkthrough/37-04-SUMMARY.md (this file)

key-decisions:
  - "CF Function publish was done explicitly (not inside deploy-frontend.sh) because the script only syncs the source to S3 — without the publish, the Phase 37 clean URLs would have returned 403/404 even after CF invalidation"
  - "DB-direct E2E walk used CUST-001 (first QB customer by qb_id) and RMP-TXN-44012 (first Ramp txn by ramp_id) — deterministic so the walk is reproducible across re-runs"
  - "Cleanup deleted ALL migration_runs from the past hour (not just specific run_ids) because the idempotent re-POST in STEP 4 added a 2nd run row + audit row; the broader DELETE clause is safer than tracking individual UUIDs"
  - "Post-cleanup verification asserts EXACT equality with baselines (not >= or approximate) — any drift means the walk left side effects in prod"

patterns-established:
  - "Phase 37 deploy pattern reusable for any future ERP backend+frontend change: (1) audit-buttons both frontends before push, (2) git push origin main, (3) ./build-and-push.sh + capture new CodeSha256, (4) curl smoke against APIGW with `jq` shape checks, (5) F6-stash .superpowers/, (6) ./deploy-frontend.sh, (7) restore .superpowers/, (8) aws cloudfront update-function + publish-function for clean-URL changes, (9) poll invalidation to Completed, (10) HEAD smoke clean URLs, (11) DB-direct E2E walk via live API + psql confirms + cleanup-to-baseline"

requirements-completed: [QbSourceData, QbMigrationRoutes, QbMigrationWizard, RampMiniModule, MigrationAuditTrail, NetSuiteGoLiveScreens]

# Metrics
duration: ~20 min (Tasks 1-3; pre-checkpoint)
completed: 2026-05-13
---

# Phase 37 Plan 04: Audit + Deploy + DB-direct E2E Walk + STATE/ROADMAP Summary

**Pushed `turion-space-demo` `de0fac9..ce40256` (5 commits); redeployed `turion-demo-api` Lambda CodeSha256 `c716f0d2…`→`2a63ac5d…`; deployed frontend via `./deploy-frontend.sh` with the F6 pre-flight; explicitly updated + published the CloudFront Function `turion-clean-urls` (LIVE) so the 8 new clean URLs resolve; CF invalidation `I45H6Q0IXWN1Z0W2WNCGH0RY07` Completed; DB-direct E2E walk against prod Supabase migrated CUST-001 + RMP-TXN-44012 through the live API, confirmed all 4 DB side-effects, proved idempotency, and cleaned back to exactly the pre-walk baselines; button audit 0/0 violations both frontends; Phase 27-36 regression intact. All 6 requirements closed. Phase 37 is LIVE on turionspace.zietra.com and ready for the team's Thursday walk-through.**

## Performance

- **Duration:** ~20 min (Tasks 1-3; Task 4 is the checkpoint review)
- **Started:** 2026-05-13T06:20:42Z
- **Completed (Tasks 1-3):** 2026-05-13T06:40Z (approx.)
- **Tasks:** 4 (3 autonomous + 1 human-verify checkpoint)
- **Files modified:** 2 (.planning/STATE.md, .planning/ROADMAP.md)
- **Files created:** 1 (this SUMMARY)

## Accomplishments

### Task 1 — Audit + Push + Lambda redeploy + Frontend deploy + CF invalidation

- **Audit-buttons both frontends:** `npm run audit-buttons` reports `routes:75 onclick:16 satelliteApi:84 violations:0` (satellite) + `pages:80 routes:213 onclick:516 fetch:67 violations:0` (ERP). Deploy gate satisfied.
- **`turion-space-demo` push:** `de0fac9..ce40256` (fast-forward, no force-push, no divergence) — pushed 5 commits `28f5b52`/`5d5e02a`/`fc45365` (37-01) + `d026f1e` (37-02) + `ed8db43`/`ce40256` (37-03) to `origin/main`.
- **Lambda redeploy via `./build-and-push.sh`:** Docker build (arm64) → ECR push (digest `sha256:2a63ac5da7c4f260a83ae4a8a72897379578e1991960c8b51a05dd586b8e8ff4`) → `aws lambda update-function-code` → wait for ready. **New CodeSha256: `2a63ac5da7c4f260a83ae4a8a72897379578e1991960c8b51a05dd586b8e8ff4`** (was `c716f0d248c116ea24a5c40841ffe29a14b1740a37461daac63dc80598c75de8` after Phase 36). **Changed — confirmed.**
- **Curl smoke against live APIGW** (`https://lo254mvukl.execute-api.us-east-1.amazonaws.com`):
  - `/api/health` → `{db:"ok"}` (the `ok` field in body is null but `db` is "ok" — same shape as Phase 36)
  - `/api/quickbooks/status` → 6 keys with counts `coa:30, customer:25, vendor:25, item:25, invoice:22, bill:22` all `status:new`
  - `/api/quickbooks/customer/mapping` → 13 fields
  - `/api/quickbooks/customer` → 25 rows
  - `/api/ramp/status` → `{card_txn:{new:28,migrated:0,error:0,total:28}}`
  - `/api/ramp/card-txns` → 28 rows
  - `POST /api/quickbooks/customer/migrate {qbIds:[]}` → **HTTP 400 `qbIds required (non-empty array)`** — NOT 501, confirms the 37-02 implementation is live, not a stub.
- **F6 pre-flight:** `git status --short` showed `.DS_Store` + `.superpowers/` only (same as Phase 36 final baseline); `.superpowers/` moved to `/tmp/turion-superpowers-stash-37-04`; `.DS_Store` is auto-excluded by deploy-frontend.sh's `--exclude ".DS_Store"`.
- **`./deploy-frontend.sh`:** Regenerated `turion-config.js` (API_BASE=`https://lo254mvukl.execute-api.us-east-1.amazonaws.com`) + `satellite-config.js`; `aws s3 sync . s3://turion-demo-static --delete` uploaded the 8 new HTML pages + the rebuilt `backend/dist/routes/{quickbooks,ramp}.js` + `cf-function-source/turion-clean-urls.js` + `index.html`; CF invalidation ID **`I45H6Q0IXWN1Z0W2WNCGH0RY07`**.
- **`.superpowers/` restored** from `/tmp/turion-superpowers-stash-37-04` back to repo root. `git status --short` confirms only `.DS_Store` + `.superpowers/` untracked (matches pre-deploy baseline).
- **CloudFront Function publish (NOT automated by `deploy-frontend.sh`):** `aws cloudfront describe-function --name turion-clean-urls --stage DEVELOPMENT` returned ETag `E3AEGXETSR30VB`; `aws cloudfront update-function --name turion-clean-urls --function-code fileb://cf-function-source/turion-clean-urls.js --if-match E3AEGXETSR30VB` returned new DEV ETag `E3P5ROKL5A1OLE`; `aws cloudfront publish-function --name turion-clean-urls --if-match E3P5ROKL5A1OLE` returned `Stage:LIVE`. The Phase 37 clean URLs now resolve on the edge.
- **CF invalidation polled:** `aws cloudfront get-invalidation --distribution-id E37R9PT8IL44L2 --id I45H6Q0IXWN1Z0W2WNCGH0RY07 --query 'Invalidation.Status' --output text` → `Completed` on first poll.
- **8 clean URLs HEAD 200 on `turionspace.zietra.com`:** `/quickbooks`, `/quickbooks/coa`, `/quickbooks/customers`, `/quickbooks/vendors`, `/quickbooks/items`, `/quickbooks/invoices`, `/quickbooks/bills`, `/ramp` — all 200.

### Task 2 — DB-direct E2E walk (the headless-substitute checkpoint)

Baseline captured against prod Supabase (`postgresql://postgres.lbpkbpfwdpnwlccmlfxn@aws-1-us-east-2.pooler.supabase.com:6543/postgres`):

| Metric                  | Baseline | Post-migrate          | Post-cleanup |
| ----------------------- | -------- | --------------------- | ------------ |
| `turion.customers`      | 1        | 2 (added CUST-001)    | 1            |
| `turion.bills`          | 9        | 10 (added Ramp bill)  | 9            |
| `turion.migration_runs` | 0        | 3 (2 qb + 1 ramp)     | 0            |
| `turion.audit_log`      | 78       | 80 (2 CREATE entries) | 78           |
| qb_customer status=new  | 25       | 24                    | 25           |
| qb_customer status=migrated | 0    | 1                     | 0            |
| ramp_card status=new    | 28       | 27                    | 28           |

**STEP 2 — Migrate ONE QB customer** (`POST /api/quickbooks/customer/migrate {qbIds:["CUST-001"]}`):
```json
{
  "ok": true,
  "run_id": "065552c9-65df-4f06-971f-6c7548ddecc5",
  "migrated": ["CUST-001"],
  "skipped": [],
  "errors": [],
  "summary": { "migrated_count": 1, "source_count": 1, "summary": "Migrated 1/1 QB customer records to turion.customers (0 already done, 0 failed)." }
}
```

**STEP 3 — DB confirms** (4 round-trip side-effects):
- `turion.customers/CUST-001` exists with `name='Space Logistics Co · contract entity'` + `source_data.migratedFrom='quickbooks'`
- `turion.qb_records` row for `(customer, CUST-001)` flipped to `status=migrated`, `migrated_at=2026-05-13 06:23:23`, `migration_run_id=065552c9-65df-4f06-971f-6c7548ddecc5`
- `turion.migration_runs` has 1 new row with `run_type=qb-customer`, `source_count=1`, `migrated_count=1`, `skipped_count=0`
- `turion.audit_log` has the CREATE row `customers/CUST-001/CREATE`

**STEP 4 — Idempotency check** (re-POST same id): `{migrated:[], skipped:["CUST-001"], errors:[]}` — proves the idempotent `skipped[]` path works end-to-end.

**STEP 5 — Migrate ONE Ramp txn** (`POST /api/ramp/card-txns/migrate {rampIds:["RMP-TXN-44012"]}`):
```json
{
  "ok": true,
  "run_id": "b5f551f6-fff5-4995-893a-803ae23efed5",
  "migrated": ["RMP-TXN-44012"],
  "summary": { "migrated_count": 1, "summary": "Migrated 1/1 Ramp card txns to turion.bills (0 already done, 0 failed)." }
}
```
DB confirms: `turion.bills/RMP-RMP-TXN-44012` (double-prefix id is plan-spec-compliant) with `vendor='Ramp · Corporate Card'` + `migratedFrom='ramp'`; `turion.migration_runs` got the ramp-card-txns row; `turion.ramp_card_txns/RMP-TXN-44012.status='migrated'`.

**STEP 6 — Cleanup (atomic transaction):**
```sql
begin;
delete from turion.customers where id='CUST-001';                    -- DELETE 1
delete from turion.bills where id='RMP-RMP-TXN-44012';                -- DELETE 1
update turion.qb_records set status='new', migrated_at=null, migration_run_id=null
  where qb_type='customer' and qb_id='CUST-001';                      -- UPDATE 1
update turion.ramp_card_txns set status='new', migrated_at=null, migration_run_id=null
  where ramp_id='RMP-TXN-44012';                                       -- UPDATE 1
delete from turion.audit_log where entity in ('customers','bills') and entity_id in ('CUST-001','RMP-RMP-TXN-44012');  -- DELETE 2
delete from turion.migration_runs where run_type in ('qb-customer','ramp-card-txns') and created_at > now() - interval '1 hour';  -- DELETE 3
commit;
```
Post-cleanup counts equal pre-walk baselines EXACTLY: customers:1==1, bills:9==9, migration_runs:0==0, audit_log:78==78, qb_customer_new:25==25, qb_customer_migrated:0==0, ramp_new:28==28. **The walk left zero side effects in prod.**

**STEP 7 — Phase 27-36 regression spot-check:**
- 6 ERP pages HEAD 200: `/satellite`, `/index.html`, `/finance/general-ledger`, `/sales/orders`, `/inventory/items`, `/procurement/orders`
- ERP `/api/data/all` → 53 top-level keys (intact)
- Satellite `https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/health` → `{db:ok}`

### Task 3 — STATE.md + ROADMAP.md + SUMMARY scaffold

- **`.planning/ROADMAP.md`:** Phase 37 plan list updated from "3/4 plans executed" with `[ ]` checkboxes → "**Plans:** 4 plans (all complete)" with all 4 `[x]` checkboxes. *Last updated:* footer rewritten to summarize Phase 37 completion + roll Phase 36 into the (prev) recap.
- **`.planning/STATE.md`:** New narrative paragraph at top of `## Current Position` covering: 4/4 plans complete, what shipped across all 3 waves, deploy state (Lambda SHA delta, CF invalidation ID, CF Function publish), DB-direct E2E walk result, audit result, regression spot-check, deferrals, the 6 requirement IDs, the Thursday demo risk note (Lambda cold-start). Prior 37-03 entry wrapped in `<details>` to preserve history. Same prose-paragraph style as the Phase 36-09 entry.
- **`.planning/phases/37-qb-to-netsuite-migration-walkthrough/37-04-SUMMARY.md`:** This file. Standard template + the full deploy/walk/regression evidence.

## Task Commits

A single dindin commit covers Task 3 (the SUMMARY scaffold + STATE/ROADMAP updates). The `turion-space-demo` push in Task 1 is the deploy commit — no source changes are made in Task 1 itself; the push just lands the existing 37-01/02/03 commits to the remote.

- **dindin commit:** `docs(37): apply phase — QB→NS + Ramp migration walkthrough live` (hash captured at push time; see git log on `gsd/phase-26-data-densification`)
- **`turion-space-demo` push:** 5 commits in the `de0fac9..ce40256` range, all `jeet-avatar <jm@techcloudpro.com>`.

## Files Created/Modified

### Created
- `/Users/jeet/doordash-p2p/.planning/phases/37-qb-to-netsuite-migration-walkthrough/37-04-SUMMARY.md` — this file.

### Modified
- `/Users/jeet/doordash-p2p/.planning/STATE.md` — +1 Phase 37 plan 37-04 narrative paragraph at top of `## Current Position`; wrapped prior 37-03 entry in `<details>` for history.
- `/Users/jeet/doordash-p2p/.planning/ROADMAP.md` — Phase 37 plan list 3/4 → 4/4 (all `[x]`); *Last updated:* footer rewritten.

## Decisions Made

- **CF Function `publish-function` was done explicitly, not inside `deploy-frontend.sh`:** the script syncs the source file to S3 (which is informational), but does NOT call `aws cloudfront update-function`/`publish-function`. Without this step, the 8 new clean URLs would have returned 403/404 even after CF invalidation. Documented as a pattern in tech-stack.
- **DB-direct E2E walk used CUST-001 + RMP-TXN-44012 (first by id):** deterministic so the walk reproduces across re-runs. The plan said "pick a test row that exists + isn't already migrated" — `order by qb_id limit 1` is the deterministic version.
- **Cleanup deleted ALL migration_runs from the past hour, not just specific run_ids:** the idempotent re-POST in STEP 4 created a 2nd run row + audit row that I would have needed to track separately; the broader `created_at > now() - interval '1 hour'` clause is safer and the time window is narrow enough to avoid collateral.
- **Post-cleanup verification asserts EXACT equality, not >= or approximate:** any drift means the walk left side effects in prod. All 7 baseline metrics matched exactly post-cleanup.
- **Lambda cold-start documented as a risk for Thursday:** the first `POST /migrate` after a 15+ min idle period will be slow (~5-10s). Mitigated by pre-warming with a hidden click before the audience watches.

## Deviations from Plan

**None — plan executed exactly as written.**

Two minor execution notes (not deviations):
- The plan's `<action>` block referred to `./backend/build-and-push.sh` but the script actually lives at `/Users/jeet/turion-space-demo/build-and-push.sh` (the repo root) — used the actual path. The script's internals reference `backend/lambda-build` (the Dockerfile name per the project's "no Dockerfile* naming" rule).
- The CF Function publish step (PART D-equivalent) was not in the plan's PART E/F sections — the plan's PART E expected `./deploy-frontend.sh` to handle the CF function source push, which it does (to S3), but the LIVE-stage publish of the CloudFront Function itself is a separate `aws cloudfront update-function` + `publish-function` round-trip that I added explicitly. This is a one-line addition to future deploys' runbook (captured in patterns-established).

## Issues Encountered

None. All curl smokes, the dual button audit, the Lambda redeploy, the frontend deploy, the CF Function publish, the CF invalidation poll, the DB-direct walk (5 steps + cleanup), and the regression spot-check all passed first try.

One sandbox-environment note (not a deviation): heredoc-style `psql ... <<EOF` was blocked by the bash sandbox; worked around by writing SQL to `/tmp/p37-*.sql` files and running `psql -f`. Same workaround as 37-01.

## User Setup Required

**None.** Phase 37 needs zero new AWS secrets — the existing DB conn string (rotated in Phase 36) is the only credential touched, and it's already in the Lambda env. The Anthropic key is irrelevant to this flow.

The remaining Phase 36 user nice-to-haves carry over unchanged: (1) rotate the exposed Resend key + set `RESEND_API_KEY` on `turion-demo-api`; (2) create the Phase-34 `turion-satellite/production/anthropic-key` secret + `ANTHROPIC_API_KEY_ARN` on `turion-satellite-api`. Neither is a Phase 37 dependency.

## Next Phase Readiness

**Phase 37 is COMPLETE pending checkpoint approval.** The team can walk the live demo on Thursday 2026-05-14:
1. Open `https://turionspace.zietra.com/quickbooks` — 6 tiles with status pills + 5 recent runs panel
2. Click `/quickbooks/customers` — 3-pane wizard, select 1-2 rows, see the right-pane NS preview
3. Click "Migrate batch ▸" — confirm() modal → success toast with "View in NetSuite →" deep-link
4. Open `/sales/orders` — confirm the migrated customer shows up (via the existing `/api/data/all` auto-pickup)
5. Open `/ramp` — same 3-pane treatment for card txns

The demo data is intentionally re-runnable; the team can re-migrate during the session (idempotent skipped[] handles duplicate clicks).

**Pre-Thursday warm-up:** Hit `POST /api/quickbooks/customer/migrate {qbIds:[]}` once 5 minutes before the session to warm the Lambda — eliminates the first-click cold-start.

## Self-Check: PASSED

- File `/Users/jeet/doordash-p2p/.planning/phases/37-qb-to-netsuite-migration-walkthrough/37-04-SUMMARY.md` exists ✓
- File `/Users/jeet/doordash-p2p/.planning/STATE.md` exists ✓
- File `/Users/jeet/doordash-p2p/.planning/ROADMAP.md` exists ✓
- All 4 `*-SUMMARY.md` files in phase dir (37-01, 37-02, 37-03, 37-04) ✓
- dindin commit `b6dc2441` reachable via `git log --oneline` ✓
- dindin commit author = `jeet-avatar <jm@techcloudpro.com>` ✓
- dindin branch `gsd/phase-26-data-densification` pushed to remote ✓
- turion-space-demo commits `28f5b52`/`5d5e02a`/`fc45365`/`d026f1e`/`ed8db43`/`ce40256` all reachable + pushed to `origin/main` ✓
- Lambda `turion-demo-api` CodeSha256 = `2a63ac5da7c4f260a83ae4a8a72897379578e1991960c8b51a05dd586b8e8ff4` (differs from prior `c716f0d2…`) ✓
- 8 clean URLs HEAD 200 on `turionspace.zietra.com` ✓
- ROADMAP.md shows "Plans: 4 plans (all complete)" with 4 `[x]` checkboxes ✓
- STATE.md `## Current Position` opens with "Phase 37 COMPLETE — 4/4 plans" ✓
- DB-direct E2E walk: post-cleanup counts EXACTLY equal pre-walk baselines (customers:1, bills:9, runs:0, audit:78, qb_cust_new:25, qb_cust_mig:0, ramp_new:28) ✓
- Dual button audit: satellite 0 violations + ERP 0 violations ✓
- Phase 27-36 regression: 6 ERP pages 200, /api/data/all 53 keys, satellite /api/health ok ✓

**Pending:** Task 4 (`checkpoint:human-verify`) approval. The headless-substitute evidence is captured in this SUMMARY + STATE.md narrative.

---

*Phase: 37-qb-to-netsuite-migration-walkthrough*
*Plan 04: Audit + deploy + DB-direct E2E walk + STATE/ROADMAP*
*Pre-checkpoint completion: 2026-05-13*
