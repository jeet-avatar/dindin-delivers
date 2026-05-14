---
phase: 41-m1-cut-over-fully-to-cognito-remove-supabase-auth-dependency
plan: 04
subsystem: aws-cleanup-m1-closeout
type: summary
wave: 3
tags: [cognito, supabase-deprecation, aws-cleanup, m1-closeout, iam, secrets-manager]
status: complete
requirements:
  - SupabaseAuthDeprecation
  - CognitoOnlyFrontend
  - CognitoOnlyBackend
dependency-graph:
  requires:
    - "Phase 41-02 (turion-demo-api Cognito-only verify)"
    - "Phase 41-03 (turion-satellite-api Cognito-only verify)"
    - "Phase 41-01 (96 pages on cognitoAuth)"
  provides:
    - "Both Lambdas with SUPABASE_JWT_SECRET_ARN env var removed"
    - "Secret turion-satellite/production/supabase-jwt-secret-sWnNlr scheduled for deletion (7-day window)"
    - "Secret resource policy granting zietra-api-lambda-role read on supabase-jwt-secret deleted"
    - "5 dead-code files deleted from turion-space-demo"
    - "@aws-sdk/client-cognito-identity-provider npm dep dropped"
    - "M1-COMPLETE.md doc closing the Cognito auth foundation milestone"
  affects:
    - "M2 (Phases 42-43): can start RDS migration with the confidence Supabase Auth is fully retired"
tech-stack:
  added: []
  patterns:
    - "Env-var stripping via file:// JSON form (jq slurpfile pattern from research §Pattern 7)"
    - "Pre-flight smoke before each AWS state change + post-change smoke (Rule 3)"
    - "Aggressive dead-code deletion (Rule 5)"
key-files:
  created:
    - /Users/jeet/doordash-p2p/.planning/phases/41-m1-cut-over-fully-to-cognito-remove-supabase-auth-dependency/M1-COMPLETE.md
    - /Users/jeet/doordash-p2p/.planning/phases/41-m1-cut-over-fully-to-cognito-remove-supabase-auth-dependency/41-04-SUMMARY.md
  modified:
    - /Users/jeet/turion-space-demo/backend/package.json
    - /Users/jeet/turion-space-demo/backend/package-lock.json
    - /Users/jeet/turion-satellite/backend/src/lambda.ts
    - /Users/jeet/doordash-p2p/.planning/STATE.md
    - /Users/jeet/doordash-p2p/.planning/ROADMAP.md
    - /Users/jeet/doordash-p2p/.planning/REQUIREMENTS.md
  deleted:
    - /Users/jeet/turion-space-demo/erp-auth.js (2506 bytes)
    - /Users/jeet/turion-space-demo/satellite/satellite-auth.js (2283 bytes)
    - /Users/jeet/turion-space-demo/erp-auth-callback.html (2844 bytes)
    - /Users/jeet/turion-space-demo/backend/scripts/migrate-supabase-users-to-cognito.ts (7274 bytes)
    - /Users/jeet/turion-space-demo/backend/scripts/README-cognito-migration.md (4267 bytes)
decisions:
  - "Plan expected an IAM inline policy on zietra-api-lambda-role granting supabase-jwt-secret read; the actual setup uses a *resource policy on the secret itself* (verified: no inline policy on the role mentions supabase). Adapted by deleting the secret's resource policy via `aws secretsmanager delete-resource-policy` — achieves the same revocation (Rule 3 — verify before assuming)."
  - "Scheduled the secret for deletion with 7-day recovery window (NOT force-delete) per research §Pattern 7 step 5 — gives a rollback option through 2026-05-21."
  - "Stale comment in turion-satellite/backend/src/lambda.ts referenced SUPABASE_JWT_SECRET (deleted env var) — Rule 5 cleanup mirror of plan 41-02's fix on turion-space-demo's lambda.ts."
metrics:
  duration: "8 min 8 sec (start 2026-05-14T08:32:55Z, end 2026-05-14T08:41:03Z)"
  completed: "2026-05-14T08:41:03Z"
  tasks: 3
  commits: 2
  files_deleted: 5
  cloudfront_invalidation: I8SUS5M4KN4SO3T8ZDSXQHTJIJ
---

# Phase 41 Plan 04: AWS cleanup + dead code deletion + M1 close-out Summary

One-liner: Removed `SUPABASE_JWT_SECRET_ARN` env var from both API Lambdas, deleted the Secrets Manager resource policy granting `zietra-api-lambda-role` read on `supabase-jwt-secret`, scheduled the secret for deletion (7-day recovery window through 2026-05-21), deleted 5 dead-code files (3 frontend helpers + 1 migration script + 1 README), dropped `@aws-sdk/client-cognito-identity-provider` npm dep, redeployed frontend with `--delete` to propagate file removals to S3, ran final 10-case smoke (Cognito 200 + forged 401 + Phase 38 regression intact), wrote `M1-COMPLETE.md` closing the milestone.

## Status

COMPLETE — all 13 must_have truths verified; 2 commits pushed; M1 closed.

## Commits

| # | Hash | Repo | Author | Title |
|---|------|------|--------|-------|
| 1 | `2bb077d` | turion-space-demo | jeet-avatar <jm@techcloudpro.com> | chore(41-04): delete Phase-38 dead code — erp-auth.js, satellite-auth.js, erp-auth-callback.html, migrate-supabase-users-to-cognito.ts, @aws-sdk/client-cognito-identity-provider |
| 2 | `79fc014` | turion-satellite | jeet-avatar <jm@techcloudpro.com> | chore(41-04): remove stale Supabase reference from lambda.ts comment |

Pushed:
- `turion-space-demo` `origin/main` `21f9d48..2bb077d`
- `turion-satellite` `origin/main` `9531527..79fc014`

A separate planning-doc commit on `doordash-p2p` will land after this SUMMARY (M1-COMPLETE.md + STATE/ROADMAP/REQUIREMENTS).

## AWS state delta (verbatim)

### Lambda env var removal

```
turion-demo-api BEFORE: [ANTHROPIC_API_KEY, COGNITO_CONFIG_SECRET_ARN, DATABASE_URL, SUPABASE_JWT_SECRET_ARN]
turion-demo-api AFTER:  [ANTHROPIC_API_KEY, COGNITO_CONFIG_SECRET_ARN, DATABASE_URL]

turion-satellite-api BEFORE: [COGNITO_CONFIG_SECRET_ARN, DATABASE_URL_ARN, S3_FILES_BUCKET, SUPABASE_JWT_SECRET_ARN]
turion-satellite-api AFTER:  [COGNITO_CONFIG_SECRET_ARN, DATABASE_URL_ARN, S3_FILES_BUCKET]
```

LastUpdateStatus `Successful` on both. Verified via `aws lambda get-function-configuration --query 'Environment.Variables.SUPABASE_JWT_SECRET_ARN'` → returns `None` on both.

### IAM grant removal (DEVIATION from plan)

**Plan assumed:** an inline policy on `zietra-api-lambda-role` granted `secretsmanager:GetSecretValue` on `supabase-jwt-secret`.

**Reality:** `aws iam list-role-policies --role-name zietra-api-lambda-role` returned `[allow-zietra-demo-logs, asc606-store-s3-access, LambdaCloudWatchLogs, TurionSendVisitAlerts, zietra-cognito-config-secret-read]` — none target supabase-jwt-secret. Verified by grepping every policy's `Resource[]` (0 matches for `supabase`). The grant instead lives on the **secret's resource policy** (`secretsmanager:GetResourcePolicy` returned a policy granting `arn:aws:iam::134607809447:role/zietra-api-lambda-role` `GetSecretValue`).

**Adaptation:** Deleted the resource policy via `aws secretsmanager delete-resource-policy --secret-id "arn:aws:secretsmanager:us-east-1:134607809447:secret:turion-satellite/production/supabase-jwt-secret-sWnNlr"`. Achieves the same revocation. Post-delete, `get-resource-policy` returns no `ResourcePolicy` key (only `ARN` and `Name`).

The role's `zietra-cognito-config-secret-read` policy is intact (verified: `aws iam list-role-policies` post-cleanup still shows it).

### Secret deletion scheduled

```
ARN: arn:aws:secretsmanager:us-east-1:134607809447:secret:turion-satellite/production/supabase-jwt-secret-sWnNlr
Name: turion-satellite/production/supabase-jwt-secret
DeletedDate: 2026-05-14T01:36:33.673000-07:00
DeletionDate: 2026-05-21T01:36:33.666000-07:00 (7-day recovery window)
```

Recovery via `aws secretsmanager restore-secret` available through 2026-05-21.

## File deletions (`turion-space-demo`)

```
deleted: erp-auth.js                                       (2506 bytes, 74 LOC)
deleted: satellite/satellite-auth.js                       (2283 bytes)
deleted: erp-auth-callback.html                            (2844 bytes)
deleted: backend/scripts/migrate-supabase-users-to-cognito.ts  (7274 bytes, 186 LOC)
deleted: backend/scripts/README-cognito-migration.md       (4267 bytes, 86 LOC)
```

Pre-deletion grep confirmed no active page references them:
- `grep -rln '/erp-auth\.js' *.html` → only `erp-auth-callback.html` (also being deleted)
- `grep -rln '/satellite/satellite-auth\.js' satellite/*.html` → 0 matches

## npm uninstall result

```
$ npm uninstall @aws-sdk/client-cognito-identity-provider
removed 1 package, and audited 228 packages in 635ms
found 0 vulnerabilities
```

`package.json` no longer contains the dep; `package-lock.json` count of `client-cognito-identity-provider` strings: 0.

## TypeScript build check

```
$ npm run build
> turion-demo-api@1.0.0 build
> tsc -p tsconfig.json
(exit 0 — no errors)
```

## Frontend redeploy

```
./deploy-frontend.sh
delete: s3://turion-demo-static/erp-auth.js
delete: s3://turion-demo-static/erp-auth-callback.html
delete: s3://turion-demo-static/satellite/satellite-auth.js
upload: ./turion-config.js
upload: satellite/satellite-config.js
→ Invalidate CloudFront (E37R9PT8IL44L2) /*
  invalidation: I8SUS5M4KN4SO3T8ZDSXQHTJIJ
✓ Frontend deployed: https://turionspace.zietra.com
```

CloudFront invalidation `I8SUS5M4KN4SO3T8ZDSXQHTJIJ` reached `Completed` within ~20s.

(Bonus: the `--delete` sync also reaped ~40 stale `backend/node_modules/@aws-sdk/client-cognito-identity-provider/*` files that had been uploaded to S3 by previous deploys despite the `--exclude "backend/*"` in `deploy-frontend.sh` — apparently those got there through a different path. Inert clutter, now gone.)

## Final smoke matrix (verbatim — `/tmp/41-04-final-smoke.log`)

```
=== Phase 41-04 FINAL SMOKE ===
Date: 2026-05-14T08:39:27Z
Pool: us-east-1_KQuNS85nP  ClientId: 1tuq2a1eedd3hvdsl0kvtu55ih
IdToken length: 1232  Forged length: 1232

--- ERP (turion-demo-api) Cognito-only verify ---
(a) Valid Cognito IdToken          = 200  [expect 200]
(c) Forged Cognito (mutated sig)   = 401  [expect 401]
(e) Forged Supabase ES256 (junk)   = 401  [expect 401]

--- Satellite (turion-satellite-api) Cognito-only verify ---
(a) Valid Cognito IdToken          = 200  [expect 200]
(c) Forged Cognito (mutated sig)   = 401  [expect 401]
(e) Forged Supabase ES256 (junk)   = 401  [expect 401]

--- Phase 38 regression ---
ERP /api/health                    = 200  [expect 200]
ERP /api/data/all unauth           = 401  [expect 401]
Sat /api/health                    = 200  [expect 200]
Sat /api/satellites unauth         = 401  [expect 401]

=== END ===
```

10/10 cases PASS. The valid IdToken (1232 chars) was minted by manually running the Phase 40 CUSTOM_AUTH ping-pong (smoke-phase-40.sh harness still has the stale-nonce race documented in 41-03 — bypassed by snapshotting `START_MS` BEFORE `admin-initiate-auth` with a 15s sleep).

## Additional smoke cases

### Deleted helpers return 4xx from CDN

```
https://turionspace.zietra.com/erp-auth.js: 403
https://turionspace.zietra.com/satellite/satellite-auth.js: 403
https://turionspace.zietra.com/erp-auth-callback.html: 403
```

(S3 returns 403 not 404 for missing-object on a public bucket. Either way: non-200, file is gone.)

### `/cognito-auth-callback` still 200

```
https://turionspace.zietra.com/cognito-auth-callback: 200
```

CloudFront Function `turion-clean-urls` rewrite still routes to `cognito-auth-callback.html`.

### 10 representative pages still load `cognito-auth.js` + no Supabase refs

```
OK: /                          (cognito:1 supabase:0)
OK: /sales-index.html          (cognito:1 supabase:0)
OK: /finance-index.html        (cognito:1 supabase:0)
OK: /dashboard-ceo.html        (cognito:1 supabase:0)
OK: /netsuite-items.html       (cognito:1 supabase:0)
OK: /arena-bom.html            (cognito:1 supabase:0)
OK: /vendor-portal.html        (cognito:1 supabase:0)
OK: /satellite/                (cognito:1 supabase:0)
OK: /satellite/parts.html      (cognito:1 supabase:0)
OK: /satellite/work-orders.html (cognito:1 supabase:0)
fails=0
```

### Grep cleanliness across HTML

```
erpAuth.|satelliteAuth. matches in *.html + satellite/*.html: 0
@supabase/supabase-js matches in *.html + satellite/*.html:   0
```

### Grep cleanliness across backend source

```
turion-space-demo/backend/src/  SUPABASE_*|getSupabase* matches: 0
turion-satellite/backend/src/   SUPABASE_*|getSupabase* matches: 0 (after lambda.ts comment fix, was 1)
```

### audit-buttons

```
$ npm run audit-buttons
satellite: routes:75 onclick:16 satelliteApi:84 violations:0
erp:       pages:89 routes:213 onclick:517 api:69 violations:0
```

(ERP page count dropped from 90 → 89 due to `erp-auth-callback.html` deletion. Expected.)

## Goal-backward verification (must_have truths)

| Must-have truth | Evidence |
|----|----|
| Both Lambdas no longer have `SUPABASE_JWT_SECRET_ARN` env var | `aws lambda get-function-configuration --query 'Environment.Variables.SUPABASE_JWT_SECRET_ARN' --output text` → `None` on both. |
| `zietra-api-lambda-role` no longer has an inline policy granting `secretsmanager:GetSecretValue` on supabase-jwt-secret | Verified: no inline policy on the role mentions supabase (this was always true — the grant was on the secret's resource policy, now also deleted). |
| Secret `turion-satellite/production/supabase-jwt-secret-sWnNlr` scheduled for deletion | `aws secretsmanager describe-secret --query DeletionDate` → `2026-05-21T01:36:33.666000-07:00`. |
| `backend/scripts/migrate-supabase-users-to-cognito.ts` deleted | `! test -f` PASS; commit `2bb077d` shows `delete mode 100644`. |
| `@aws-sdk/client-cognito-identity-provider` dep removed from `backend/package.json` | `! grep -q 'client-cognito-identity-provider' backend/package.json` PASS. |
| Phase-38 helper files deleted (erp-auth.js, satellite/satellite-auth.js, erp-auth-callback.html) | `! test -f` PASS for all 3; CDN returns 403 for all 3. |
| Both Lambdas still serve valid Cognito IdToken with 200 | Smoke (a) on both ERP and Sat: 200. |
| Both Lambdas reject all Supabase ES256 (valid or forged) with 401 | Smoke (e) on both: 401. (Forged junk bearer; valid Supabase ES256 path was already proved gone in 41-02 + 41-03 via the bonus "valid-shape ES256 with Supabase iss" case.) |
| All 96 migrated pages still load + reference `cognito-auth.js` | 10/10 representative pages PASS (cognito match count ≥1, supabase match count =0). |
| Zero grep matches for `erpAuth.|satelliteAuth.|@supabase/supabase-js` in *.html | 0 matches across `*.html` and `satellite/*.html`. |
| Zero grep matches for `SUPABASE_JWT_PUBLIC_KEY|SUPABASE_JWT_SECRET` in backend source | 0 matches in both `turion-space-demo/backend/src/` and `turion-satellite/backend/src/` (after lambda.ts comment fix). |
| `audit-buttons` reports 0 violations on both frontends | satellite violations:0; erp violations:0. |
| `M1-COMPLETE.md` written + STATE/ROADMAP/REQUIREMENTS advanced | `.planning/phases/41-m1-.../M1-COMPLETE.md` created; STATE/ROADMAP/REQUIREMENTS updated in the planning commit landing after this SUMMARY. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Verify before assuming] Plan assumed inline policy on role, actual setup uses secret resource policy**

- **Found during:** Task 1 Step A (`aws iam list-role-policies --role-name zietra-api-lambda-role`).
- **Issue:** Plan said to delete an inline policy on `zietra-api-lambda-role` granting supabase-jwt-secret read. No such inline policy exists. The 5 inline policies on the role are `allow-zietra-demo-logs`, `asc606-store-s3-access`, `LambdaCloudWatchLogs`, `TurionSendVisitAlerts`, `zietra-cognito-config-secret-read` — none mention supabase. Grepping each policy's `Resource[]` returns 0 matches for `supabase`.
- **Root cause:** The grant was implemented as a **resource policy on the secret itself**, not as an inline policy on the role. `aws secretsmanager get-resource-policy` showed `Principal: arn:aws:iam::134607809447:role/zietra-api-lambda-role`, `Action: secretsmanager:GetSecretValue`, `Resource: *`. This is functionally equivalent to an inline role policy but lives in a different IAM surface.
- **Fix:** `aws secretsmanager delete-resource-policy --secret-id "<supabase-jwt-secret-arn>"`. Verified the resource policy is gone (subsequent `get-resource-policy` returns no `ResourcePolicy` key, only `ARN` and `Name`).
- **Outcome:** Same effective revocation. The role can no longer read the secret.
- **Files modified:** None (pure AWS state change).
- **Commit:** N/A.

**2. [Rule 5 — Dead code cleanup] Stale comment in turion-satellite/backend/src/lambda.ts**

- **Found during:** Task 2 final grep cleanliness check (`grep -rE 'SUPABASE_JWT_PUBLIC_KEY|SUPABASE_JWT_SECRET|…' /Users/jeet/turion-satellite/backend/src` returned 1 match).
- **Issue:** `backend/src/lambda.ts:7-8` had a comment `// loadSecrets is a no-op when DATABASE_URL / SUPABASE_JWT_SECRET are already set …` referencing the deleted env var.
- **Fix:** Updated comment to accurately describe new behavior: `// loadSecrets fetches DATABASE_URL + Cognito JWKS at cold start. Throws if // COGNITO_CONFIG_SECRET_ARN is missing - fail-loud is intentional (Phase 41).`
- **Mirror parity:** Plan 41-02 made the same fix on `turion-space-demo/backend/src/lambda.ts` (committed as `c7b5236`). 41-03's source-level change didn't touch lambda.ts; the stale comment slipped through. Caught now in 41-04 final cleanliness check.
- **Files modified:** `/Users/jeet/turion-satellite/backend/src/lambda.ts`.
- **Commit:** `79fc014` on `turion-satellite` `origin/main`.

### Out-of-scope discoveries

- **Smoke harness brittleness (`scripts/smoke-phase-40.sh` nonce-scrape race)** — recurred in this plan as expected (flagged in 41-03 deviation log). Bypassed by minting the IdToken manually with a tighter `START_MS` window. Fix deferred to a future hygiene phase per 41-03's recommendation.
- **`backend/node_modules/@aws-sdk/client-cognito-identity-provider/*` was somehow in S3** despite `deploy-frontend.sh` excluding `backend/*` — got reaped by the `--delete` sync. Inert (no HTML serves them, no CloudFront route points there); pre-existing from some earlier deploy. Not investigating root cause now.

## Auth gates encountered

None. All AWS CLI calls (Lambda update, IAM list-role-policies, Secrets Manager delete-resource-policy + delete-secret, S3 sync, CloudFront invalidation, Cognito admin-initiate-auth + admin-respond-to-auth-challenge) used the pre-configured AWS CLI session.

## Files NOT touched (per plan scope-guardrails)

- `DATABASE_URL` / `DATABASE_URL_ARN` on both Lambdas (M2 owns Postgres migration)
- 4 `zietra-cognito-*` trigger Lambdas (never touched — CONTEXT)
- `zietra-api-lambda-role` itself (still needs Cognito secret access; M1+ depends on it)
- `zietra/cognito-config` secret (load-bearing)
- KMS CMK `fd1706a7-…` (Cognito needs for custom-email-sender)
- Supabase `auth.users` rows (kept as read-only archive until M2 deletes)

## Next steps

- M2 (Phases 42-43): RDS Postgres migration. M1 is closed.
- Final actual deletion of `supabase-jwt-secret-sWnNlr` will happen automatically 2026-05-21 unless restored.
- SES production-access reopen + tenant_id multi-tenancy carry to M3.

## Self-Check: PASSED

- FOUND: `/Users/jeet/doordash-p2p/.planning/phases/41-m1-.../M1-COMPLETE.md`
- FOUND: `/Users/jeet/doordash-p2p/.planning/phases/41-m1-.../41-04-SUMMARY.md`
- FOUND deleted: `/Users/jeet/turion-space-demo/erp-auth.js` (not present — PASS)
- FOUND deleted: `/Users/jeet/turion-space-demo/satellite/satellite-auth.js` (not present — PASS)
- FOUND deleted: `/Users/jeet/turion-space-demo/erp-auth-callback.html` (not present — PASS)
- FOUND deleted: `/Users/jeet/turion-space-demo/backend/scripts/migrate-supabase-users-to-cognito.ts` (not present — PASS)
- FOUND deleted: `/Users/jeet/turion-space-demo/backend/scripts/README-cognito-migration.md` (not present — PASS)
- FOUND commit: `2bb077d` on `turion-space-demo` `origin/main` (`git log --all | grep 2bb077d` PASS)
- FOUND commit: `79fc014` on `turion-satellite` `origin/main` (`git log --all | grep 79fc014` PASS)
- FOUND AWS state: Lambda env var absent on both; secret scheduled for deletion; resource policy gone
- FOUND M1-COMPLETE.md references all 10 requirement IDs (CognitoUserPool, CognitoSesIntegration, UserMigrationFromSupabase, CognitoAuthCheckpoint, DualIssuerJwtMiddleware, CognitoJwksLoader, CognitoFrontendHelper, CognitoOnlyFrontend, CognitoOnlyBackend, SupabaseAuthDeprecation)
- FOUND STATE.md "M1 CLOSED" block at top
- FOUND ROADMAP.md "4/4 plans executed — COMPLETE"
- FOUND REQUIREMENTS.md: all 3 M1-Phase-41 reqs marked Complete
