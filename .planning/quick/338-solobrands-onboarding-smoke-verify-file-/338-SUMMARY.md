---
phase: 338
plan: 01
subsystem: zietra-platform / onboarding
tags: [smoke, solobrands, onboarding, finalize, tenant-features, quick-task]
dependency_graph:
  requires:
    - Phase 54.4 onboarding wizards live
    - Phase 55 RLS rollout (zietra_app role)
    - Phase 65-01 Solo Brands tenant + real data imported
  provides:
    - Confidence that all 7 onboarding wizards are healthy before Phase 65-02 (data-aware wizards) builds on top
    - Reusable smoke harness scripts/smoke-onboarding.sh for the new wizards
  affects:
    - turion-space-demo scripts/ directory
tech_stack:
  added: []
  patterns:
    - "APIGW direct-curl smoke pattern: X-Tenant-Slug only, NEVER an explicit Host header"
    - "Lambda warm-reuse safe SET app.tenant_id replay per invocation (Phase 65-01 lesson)"
key_files:
  created:
    - /Users/jeet/turion-space-demo/scripts/smoke-onboarding.sh
    - /Users/jeet/doordash-p2p/.planning/quick/338-solobrands-onboarding-smoke-verify-file-/338-SMOKE-RESULTS.md
    - /Users/jeet/doordash-p2p/.planning/quick/338-solobrands-onboarding-smoke-verify-file-/338-SUMMARY.md
  modified: []
decisions:
  - "Punt sample-data 500 to a phase — IAM grant + handler precondition together exceed 30-min budget AND raise a BYPASSRLS surface design question"
  - "Smoke residue (SMOKE-338-* rows) purged via bypass runner after round-trip; Solo Brands counts byte-equal to Phase 65-01 baseline"
metrics:
  duration_minutes: 14
  completed_at: 2026-05-16T22:38Z
  endpoints_smoked: 9
  static_assets_smoked: 16
  failing_endpoints_in_user_flow: 0
  failing_endpoints_total: 1
  fixes_shipped: 0
  punted_to_phase: 1
requirements:
  - SB-ONB-01  # 7 onboarding HTML pages 200 from CloudFront — VERIFIED
  - SB-ONB-02  # /api/onboarding/recommend returns recommendations for admin — VERIFIED
  - SB-ONB-03  # /api/onboarding/finalize persists + /api/tenants/current mirrors — VERIFIED (round-trip)
  - SB-ONB-04  # Each migrate/* returns 2xx (or documented 4xx) — PARTIAL (4 of 5 green; sample-data 500 documented)
  - SB-ONB-05  # 4xx/5xx blocking real user flow is fixed or punted — VERIFIED (sample-data is non-blocking for Solo Brands; punted to phase)
---

# Quick Task 338: Solo Brands Onboarding Smoke + Finalize Round-Trip — Summary

One-liner: All 7 onboarding wizards verified healthy on PROD for Solo Brands tenant — finalize round-trip proven (BEFORE → test selection → AFTER → restored) — only sample-data 500 punted to a phase (IAM + design decision), zero user-flow regressions.

## What was done

1. Built `/Users/jeet/turion-space-demo/scripts/smoke-onboarding.sh` — reusable smoke harness that:
   - Fetches admin IdToken via Cognito ADMIN_USER_PASSWORD_AUTH using the password in `zietra/admin-bypass-password`.
   - Curls all 16 onboarding static assets (HTML + lib/* + erp-api.js + cognito-auth.js + turion-config.js + app-shell.{js,css}) on CloudFront.
   - Curls all 9 onboarding API endpoints against PROD APIGW with the admin JWT + `X-Tenant-Slug: solobrands`.
   - Snapshots `public.tenant_features` for Solo Brands via the `zietra-rls-runner-55-05` Lambda (replays `SET app.tenant_id` per invocation — Phase 65-01 warm-Lambda lesson).
   - Prints a final verdict line: GREEN | YELLOW | RED.
2. Ran the harness; got the verdict (YELLOW — 24 PASS, 1 FAIL on sample-data, all 7 user-facing wizards healthy).
3. Performed the `/api/onboarding/finalize` round-trip outside the harness (it intentionally doesn't mutate tenant state):
   - Captured BEFORE → 9 enabled modules: `ai-agents, crm, items, lean-erp-pro, mes, plm, purchase, quality, sales`.
   - POSTed finalize with `[crm, sales, purchase, asc606]` — 3 currently-enabled + 1 currently-disabled, to prove both enable and disable paths.
   - Snapshot AFTER → exactly `[asc606, crm, purchase, sales]` (4) — exact match to test selection.
   - GET `/api/tenants/current` → features array mirrors `tenant_features` exactly.
   - RESTORED via finalize with original 9-module list → snapshot back to BEFORE byte-for-byte.
4. Purged the 4 `SMOKE-338-*` residue rows from `turion.items / vendors / customers` via the bypass runner — Solo Brands totals (109 items / 5 vendors / 8 customers) back to Phase 65-01 baseline.
5. Wrote the smoke matrix + round-trip proof to `338-SMOKE-RESULTS.md`.
6. Committed the smoke harness with proper attribution (`jm@techcloudpro.com`).

## Smoke matrix

Full details: [`338-SMOKE-RESULTS.md`](./338-SMOKE-RESULTS.md)

- 16/16 static-asset rows → 200.
- 8/9 API rows → 2xx.
- 1/9 API row → 500 (sample-data, see Punted to phase).
- BEFORE / AFTER / RESTORED `tenant_features` snapshots captured + diffed in the doc.

## Fixes shipped

**None — no backend or frontend code changes.**

The only thing committed is the new smoke harness:
- `26c9b41` on `turion-space-demo/main`: `test(338-01): add scripts/smoke-onboarding.sh — Solo Brands onboarding smoke harness`

The smoke harness fixed one issue: the plan-as-written instructed sending `Host: solobrands.zietra.com` to APIGW directly, which causes a gateway-level 403 on every call (APIGW SNI rejects an explicit Host header that differs from its own hostname). The harness ships without that Host header and 8/9 APIs return 200 immediately. Documented inline as a future-trap note.

## Punted to phase

**1 endpoint, 0 blocking impact for Solo Brands today.**

`POST /api/onboarding/migrate/sample-data → 500`
- CloudWatch error: `User: arn:aws:sts::134607809447:assumed-role/zietra-api-lambda-role/turion-demo-api is not authorized to perform: secretsmanager:GetSecretValue on resource: arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra-aurora/admin-bypass-role-pTsZjr`
- The handler `cloneSampleData()` uses `getBypassPool()` which loads the `zietra-aurora/admin-bypass-role` secret (BYPASSRLS Postgres role). The Lambda role doesn't have IAM permission for it.
- Why not fixed inline:
  1. The secret's own description says "used ONLY by migration scripts" — granting Lambda IAM access here expands the BYPASSRLS surface in the live request path. That is a design call, not a 5-min patch.
  2. Solo Brands has real data (109 items + 4 sales orders). Even if the IAM grant were in place, cloning over real data is wrong — a precondition check is also needed. That's two related changes + a design review, over the 30-min budget.
  3. User impact today is zero — Solo Brands won't click the sample-data card.
- Suggested next phase (~2 hours):
  - Task 1: add precondition `409 if tenant has any cloneable data` in `sample-data-clone.ts`.
  - Task 2: add `?dry_run=true` returning row counts without writing.
  - Task 3: grant Lambda IAM `secretsmanager:GetSecretValue` on `zietra-aurora/admin-bypass-role-*` (only after Task 1 lands).
  - Task 4: decide whether sample-data clone belongs in the live API at all vs. one-shot CLI.

## tenant_features round-trip proof

| Phase | Enabled module_codes (sorted) | Source |
| --- | --- | --- |
| BEFORE | ai-agents, crm, items, lean-erp-pro, mes, plm, purchase, quality, sales (9) | `public.tenant_features` via `zietra-rls-runner-55-05` |
| Test selection POSTed to `/api/onboarding/finalize` | crm, sales, purchase, asc606 (4) | manual choice — 3 ON, 1 toggled-from-OFF |
| AFTER (immediately after finalize) | asc606, crm, purchase, sales (4) | `public.tenant_features` via runner — **exact match to test selection** |
| `/api/tenants/current`.features after finalize | asc606, crm, purchase, sales (4) | live API — **exact match to tenant_features** |
| RESTORED (after finalize with BEFORE list) | ai-agents, crm, items, lean-erp-pro, mes, plm, purchase, quality, sales (9) | `public.tenant_features` via runner — **byte-equal to BEFORE** |

Smoke residue (4 rows: SMOKE-338-1 item, Smoke Vendor 338, Smoke Customer 338, Smoke SF 338) also purged. Solo Brands counts back to Phase 65-01 baseline (109 items, 5 vendors, 8 customers).

## Next steps for the user

- **Phase 65-02 (data-aware wizards) can proceed.** All 7 onboarding HTML pages and 8 of 9 API endpoints are healthy. Reuse `scripts/smoke-onboarding.sh` in the new wizard's smoke task.
- **Open new phase for sample-data:** ~2hr, 4 tasks (precondition + dry-run + IAM grant + design-decision-on-keep-or-remove). Not urgent — zero user-flow impact today.
- **No CR ticket created:** the `ticketed-task` skill points to `api.dollor.ai/api/admin/change-requests` — that's the Dollor.ai admin portal, unrelated to Zietra. No Zietra-side ticketing exists yet. If/when we add one, retrofit.
- **No CI/CD deploy triggered:** zero backend or frontend code shipped, so no `build-and-push.sh` / `deploy-frontend.sh` runs. The new smoke script lives in `scripts/` which is not bundled into Lambda or shipped to S3.

## Self-Check: PASSED

- `/Users/jeet/turion-space-demo/scripts/smoke-onboarding.sh` exists, executable, 203 lines.
- `/Users/jeet/doordash-p2p/.planning/quick/338-solobrands-onboarding-smoke-verify-file-/338-SMOKE-RESULTS.md` exists with all required sections (Verdict, Static, API, BEFORE, Fixes, Punted, Finalize round-trip, Restore).
- Commit `26c9b41` exists on `github.com/jeet-avatar/turion-space-demo` main (pushed).
- Round-trip proof in 338-SMOKE-RESULTS.md shows: BEFORE != Test, AFTER == Test, RESTORED == BEFORE.
- Solo Brands `tenant_features` enabled count is back to 9 (verified post-restore).
- Solo Brands `turion.items / vendors / customers` row counts back to (109, 5, 8) — Phase 65-01 baseline (verified post-purge).
- No 5xx in CloudWatch in the last 5 min for any endpoint in the real user flow (sample-data noted under Punted to phase, expected/known).
