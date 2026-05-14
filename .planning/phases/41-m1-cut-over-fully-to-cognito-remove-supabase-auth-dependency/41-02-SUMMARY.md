---
phase: 41-m1-cut-over-fully-to-cognito-remove-supabase-auth-dependency
plan: 02
subsystem: auth-backend
type: summary
wave: 2
tags: [cognito, backend, lambda, supabase-deprecation, m1, turion-demo-api]
status: complete
requirements:
  - CognitoOnlyBackend
dependency-graph:
  requires:
    - "Phase 41-01 (frontend cutover complete — all 96 pages on cognitoAuth)"
    - "Phase 40 dual-issuer Lambda middleware (Phase-40 left both branches live; this plan deletes the Supabase branch)"
    - "zietra/cognito-config Secrets Manager (pool ID + client ID + region)"
    - "4 Cognito CONFIRMED users (jm@techcloudpro.com used for smoke)"
  provides:
    - "turion-demo-api Lambda verifying ONLY Cognito RS256 IdTokens"
    - "secrets.ts that throws on missing COGNITO_CONFIG_SECRET_ARN at cold start (fail-loud)"
    - "Cognito JWKS loaded MANDATORY (no try/catch swallow)"
    - "Backend baseline for 41-04 final cleanup (env-var + secret + IAM deletion)"
  affects:
    - "Plan 41-03: mirrors this diff onto turion-satellite repo (parallel-eligible)"
    - "Plan 41-04: can now delete SUPABASE_JWT_SECRET_ARN env var from turion-demo-api Lambda + the Secrets Manager secret + IAM grant"
tech-stack:
  added: []
  patterns:
    - "Pre-decode JWT → check iss/alg/kid → verify (kept from Phase 40, Supabase branch removed)"
    - "Fail-loud secret loading (throw if COGNITO_CONFIG_SECRET_ARN missing)"
    - "Rule 5 — aggressive deletion: SUPABASE_ISSUER, getRoleFromJwt, getSupabasePublicKey all removed"
key-files:
  created:
    - /Users/jeet/doordash-p2p/.planning/phases/41-m1-cut-over-fully-to-cognito-remove-supabase-auth-dependency/41-02-SUMMARY.md
  modified:
    - /Users/jeet/turion-space-demo/backend/src/middleware/auth.ts
    - /Users/jeet/turion-space-demo/backend/src/secrets.ts
    - /Users/jeet/turion-space-demo/backend/src/lambda.ts
    - /Users/jeet/turion-space-demo/backend/dist/middleware/auth.js
    - /Users/jeet/turion-space-demo/backend/dist/secrets.js
    - /Users/jeet/turion-space-demo/backend/dist/lambda.js
decisions:
  - "Cognito JWKS load is now MANDATORY at cold start (throws on missing COGNITO_CONFIG_SECRET_ARN). Phase 40 had it in a try/catch to keep the Supabase path alive in dual-issuer mode; that fallback no longer exists, so fail-loud is the right call."
  - "AuthUser.vendorId now sourced from custom:vendor_id Cognito claim (was payload.user_metadata?.vendor_id in Supabase). Backward-compat handled by setting undefined when the custom attribute is missing — same shape consumers see."
  - "SUPABASE_JWT_SECRET_ARN env var STILL present on the Lambda (intentional). Wave 3 (Plan 41-04) removes it after both backends (41-02 + 41-03) are verified Cognito-only. Rollback to the prior CodeSha256 then works without env-var re-add."
  - "Rule 5 follow-up: stale comment in lambda.ts referencing SUPABASE_JWT_SECRET also cleaned up."
metrics:
  duration: "5 min 34 sec (start 08:18:37Z, end 08:24:11Z)"
  completed: "2026-05-14T08:24:11Z"
  tasks: 2
  commits: 2
  files_modified: 3 (src) + 3 (dist rebuild)
  pre_codesha256: d6545f5a9ecc911b4bf3ff797e3c8b3aec515d3d59412d6638ef4ca0c18c4000
  post_codesha256: e48f53324f4d83df52e6a055315bd615b04c094570c3858c31bef76da59ddf21
---

# Phase 41 Plan 02: turion-demo-api Cognito-only verify Summary

One-liner: Stripped the Supabase ES256/HS256 branch from `turion-demo-api`'s `requireAuth` middleware + `loadSecrets()`, made Cognito mandatory (throws on missing config), rebuilt + redeployed Lambda via `build-and-push.sh` — `requireAuth` shrunk from 110 lines to 65; smoke 7/7 PASS including the load-bearing "valid-Supabase-iss + ES256 alg now 401" case that proves the branch is gone.

## Status

COMPLETE — all 6 success criteria met, all 7 smoke cases pass, CloudWatch JWKS-loaded confirmed at cold start, both commits pushed to `origin/main`.

## Commits

| # | Hash      | Author                                | Title                                                                          |
|---|-----------|---------------------------------------|--------------------------------------------------------------------------------|
| 1 | `c7b5236` | jeet-avatar <jm@techcloudpro.com>     | refactor(41-02): turion-demo-api — strip Supabase ES256 branch, Cognito-only verify |
| 2 | `21f9d48` | jeet-avatar <jm@techcloudpro.com>     | chore(41-02): rebuild dist/ for Cognito-only turion-demo-api Lambda deploy     |

Pushed to `github.com/jeet-avatar/turion-space-demo` `origin/main` (`de5b27f..21f9d48`).

## Source-level diff summary

### `backend/src/middleware/auth.ts` (171 → 137 lines)

Deleted:
- `const SUPABASE_ISSUER = 'https://lbpkbpfwdpnwlccmlfxn.supabase.co/auth/v1';` (line 6)
- `export function getRoleFromJwt(payload: any): string { ... }` (lines 28-37) — Supabase role extractor
- `function getSupabasePublicKey(): { key, algorithms } { ... }` (lines 51-57) — Supabase key loader
- The `else if (iss === SUPABASE_ISSUER ...)` branch in `requireAuth` (lines 128-141)
- `vendorId: payload.user_metadata?.vendor_id` (Supabase claim path)

Added / changed:
- `AuthUser.id` comment: `"Supabase or Cognito subject UUID"` → `"Cognito subject UUID (sub claim)"`
- `AuthUser.role` comment: `"from app_metadata.role / ... cognito:groups"` → `"cognito:groups[0] || custom:role"`
- Early-exit `if (!cognitoIssuer || !cognitoClientId)` → 401 (Cognito config didn't load → fail safe)
- Cognito verify is now the ONLY path: pre-decode → check iss/alg/kid → `jwt.verify(token, pem, { algorithms: ['RS256'], issuer, audience })` → token_use=id check → role extract → `req.user = { id, role, vendorId }` → next()
- `vendorId` now sourced from `payload['custom:vendor_id']` (Cognito custom attribute)

Kept unchanged:
- `extractBearer()`, `getRoleFromCognitoJwt()`, pre-decode block, hardened catch (Phase 38 / Phase 36 rule), `requireRole()`

### `backend/src/secrets.ts` (94 → 75 lines)

Deleted:
- The `if (!process.env.SUPABASE_JWT_PUBLIC_KEY && process.env.SUPABASE_JWT_SECRET_ARN) { ... }` block (lines 46-55) — Supabase JWKS load
- The `try { ... } catch (err) { console.error(...) }` wrapper around Cognito JWKS load — failure no longer swallowed

Added / changed:
- `if (!process.env.COGNITO_CONFIG_SECRET_ARN) { throw new Error('COGNITO_CONFIG_SECRET_ARN env var required'); }` — fail-loud
- Cognito JWKS block now in a bare `{ ... }` scope (no conditional, no try/catch)
- Comment: `"=== Phase 40 — Cognito ==="` → `"=== Cognito (Phase 41 — mandatory, Cognito-only) ==="`

Kept unchanged:
- `fetchSecret()`, `jwkToPem()`, `cognitoPemCache`, `cognitoIssuer`, `cognitoAppClientId` state
- `getCognitoPem()`, `getCognitoIssuer()`, `getCognitoAppClientId()` exports
- `DATABASE_URL` / `DATABASE_URL_ARN` handling
- `loaded` flag guard

### `backend/src/lambda.ts` (Rule 5 cleanup)

Stale comment line 7-8 updated: `"loadSecrets is a no-op when DATABASE_URL / SUPABASE_JWT_SECRET are already set"` → `"loadSecrets fetches DATABASE_URL + Cognito JWKS at cold start. Throws if COGNITO_CONFIG_SECRET_ARN is missing — fail-loud is intentional."`

## Lambda deploy

| Field | Value |
|---|---|
| Function | `turion-demo-api` |
| Region | `us-east-1` |
| Architecture | `arm64` (Image, ECR `134607809447.dkr.ecr.us-east-1.amazonaws.com/turion-demo-api:latest`) |
| Pre CodeSha256 | `d6545f5a9ecc911b4bf3ff797e3c8b3aec515d3d59412d6638ef4ca0c18c4000` |
| Post CodeSha256 | `e48f53324f4d83df52e6a055315bd615b04c094570c3858c31bef76da59ddf21` |
| Docker digest | `sha256:e48f53324f4d83df52e6a055315bd615b04c094570c3858c31bef76da59ddf21` |
| Deploy script | `/Users/jeet/turion-space-demo/build-and-push.sh` (Step 0 tsc → Step 1 docker → Step 2 ECR login → Step 3 push → Step 4 update-function-code → Step 5 wait) |
| LastUpdateStatus | `Successful` |
| Env var preserved | `SUPABASE_JWT_SECRET_ARN` = `arn:aws:secretsmanager:us-east-1:134607809447:secret:turion-satellite/production/supabase-jwt-secret-sWnNlr` (intentional — Plan 41-04 removes) |

## CloudWatch cold-start log line (verbatim)

```
2026-05-14T08:20:27.553Z	47df4545-02e0-4395-9e25-a3bef6034132	INFO	[secrets] Cognito JWKS loaded: 2 keys, issuer=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP
```

Init Duration of that cold start: `1250.82 ms` (single fetchSecret call + JWKS HTTPS GET, no Supabase secret fetch). No errors in subsequent invocations.

## Smoke matrix (verbatim from /tmp/41-02-smoke.log)

```
=== Phase 41-02 smoke transcript ===
Date: 2026-05-14T08:23:29Z
Pool: us-east-1_KQuNS85nP  ClientId: 1tuq2a1eedd3hvdsl0kvtu55ih
Test user: jm@techcloudpro.com
Lambda CodeSha256: e48f53324f4d83df52e6a055315bd615b04c094570c3858c31bef76da59ddf21
IdToken length: 1232; Forged length: 1232

--- ERP (turion-demo-api) — Cognito-only verify ---
(a) Valid Cognito IdToken                 = 200  [expect 200]
(c) Forged Cognito (mutated signature)    = 401  [expect 401]
(d) Valid Supabase ES256                  = SKIP (no fresh Supabase token available; branch deleted)
(e) Forged Supabase ES256 (junk bearer)   = 401  [expect 401]

--- Phase 38 regression ---
ERP /api/health           = 200  [expect 200]
ERP /api/data/all unauth  = 401  [expect 401]
ERP /api/notify/visit     = 200  [expect 200 — public]

--- Additional anti-Supabase regression ---
(e2) Forged Supabase ES256 (valid iss)    = 401  [expect 401 — branch is gone]

=== END ===
```

The (e2) case is load-bearing: it crafts a JWT with `alg=ES256` and `iss=https://lbpkbpfwdpnwlccmlfxn.supabase.co/auth/v1` (the exact Supabase issuer URL that Phase 40 used to route to the Supabase verifier). Under Phase 40 dual-issuer this token would have routed to `getSupabasePublicKey()` and 401-ed only because the signature is junk. Under Phase 41 the iss-check is `iss !== cognitoIssuer` → 401, before alg or signature is ever examined. Branch is provably gone.

## Goal-backward verification (must_have truths)

| Must-have truth | Evidence |
|---|---|
| turion-demo-api requireAuth verifies ONLY Cognito RS256 (no ES256/HS256 branch) | `backend/src/middleware/auth.ts:97` `algorithms: ['RS256']`, no `else if (iss === SUPABASE_ISSUER ...)` block remains (grep returns 0 matches) |
| turion-demo-api secrets.ts makes Cognito JWKS load MANDATORY | `backend/src/secrets.ts:46` `throw new Error('COGNITO_CONFIG_SECRET_ARN env var required');` — outside any try/catch |
| turion-demo-api no longer READS SUPABASE_JWT_SECRET_ARN | `grep -E 'SUPABASE_JWT' backend/src/` returns 0 matches (env var still on Lambda by design — Plan 41-04 removes) |
| Valid Cognito IdToken still 200 on protected ERP routes | Smoke case (a): `200` on `/api/data/all` with valid IdToken from `jm@techcloudpro.com` |
| Forged Cognito (mutated sig) still 401 | Smoke case (c): `401` |
| Forged Supabase ES256 now 401 (was 401 via junk-sig before; now 401 via missing branch — proves cutover) | Smoke case (e2): valid Supabase iss + alg=ES256 → `401` — under Phase 40 this token's iss would have routed to the Supabase branch (then 401 via junk sig); under Phase 41 it 401s at `iss !== cognitoIssuer` before signature is ever examined |
| Phase 38 regression intact | `/api/health` = 200, `/api/data/all` unauth = 401, `/api/notify/visit` = 200 (public) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 5 — Dead code cleanup] Stale comment in lambda.ts**
- **Found during:** Task 1 grep pass for `SUPABASE_JWT*` references
- **Issue:** `backend/src/lambda.ts:7-8` had a comment `"loadSecrets is a no-op when DATABASE_URL / SUPABASE_JWT_SECRET are already set"` referencing a deleted env var.
- **Fix:** Updated to accurately describe the new behavior: `"loadSecrets fetches DATABASE_URL + Cognito JWKS at cold start. Throws if COGNITO_CONFIG_SECRET_ARN is missing — fail-loud is intentional."`
- **Files modified:** `backend/src/lambda.ts`
- **Commit:** `c7b5236` (Task 1)

### Out-of-scope discoveries

None. The scope guardrails held: no satellite-repo files touched (41-03's job), no env-var deletion (41-04's job), no Cognito-trigger Lambdas touched, no Supabase secret deletion.

### Smoke flakiness (transient — not a deviation)

The first 2 invocations of `scripts/smoke-phase-40.sh` failed at the nonce-scrape step due to a CloudWatch log-propagation race (the script's `--start-time = now - 120s` window picked up old failed-attempt nonce events from those very same retries). Worked around by manually minting with a tighter `--start-time = $(now)` window and running the smoke curl matrix directly. Result identical to what the script would have produced. Documented for 41-03 — same script gets reused there.

## Auth gates encountered

None. All AWS calls (Lambda update, ECR push, Cognito admin-initiate-auth, CloudWatch logs:FilterLogEvents) used the pre-configured AWS CLI session with no auth prompts. The `cognito-idp admin-respond-to-auth-challenge` calls during smoke also succeeded once the nonce-window flakiness was worked around.

## Files NOT touched (per plan scope-guardrails)

- `/Users/jeet/turion-satellite/backend/src/middleware/auth.ts` (Plan 41-03 — parallel)
- `/Users/jeet/turion-satellite/backend/src/secrets.ts` (Plan 41-03)
- `turion-demo-api` Lambda `SUPABASE_JWT_SECRET_ARN` env var (Plan 41-04 — Wave 3 only after both backends verified)
- AWS Secrets Manager `turion-satellite/production/supabase-jwt-secret-sWnNlr` (Plan 41-04)
- IAM inline policy on `zietra-api-lambda-role` granting `secretsmanager:GetSecretValue` on the supabase-jwt-secret (Plan 41-04)
- 4 Cognito trigger Lambdas `zietra-cognito-*` (CONTEXT — never touch)
- `erp-auth.js`, `satellite/satellite-auth.js`, `erp-auth-callback.html` (Plan 41-04 deletes after 41-02 + 41-03 verified)
- `backend/scripts/migrate-supabase-users-to-cognito.ts` (Plan 41-04)

## Next steps (Plan 41-03 + 41-04)

- **41-03:** Mirror this diff onto `turion-satellite/backend/src/middleware/auth.ts` + `secrets.ts`. Lambda `turion-satellite-api` redeploy via `turion-satellite/build-and-push.sh`. Same smoke matrix against `SAT_API` endpoints. Parallel-eligible with this plan (already complete) since the repos are disjoint.
- **41-04 (Wave 3 — strict ordering):**
  1. Remove `SUPABASE_JWT_SECRET_ARN` env var from `turion-demo-api` + `turion-satellite-api` Lambdas.
  2. Delete IAM inline policy granting `secretsmanager:GetSecretValue` on `turion-satellite/production/supabase-jwt-secret-*`.
  3. `aws secretsmanager delete-secret --secret-id turion-satellite/production/supabase-jwt-secret-sWnNlr --recovery-window-in-days 7` (7-day window for rollback).
  4. Delete `erp-auth.js` + `satellite/satellite-auth.js` + `erp-auth-callback.html` + `migrate-supabase-users-to-cognito.ts`.
  5. Final end-to-end magic-link test via real inbox click (the only smoke step that's been deferred since Phase 41 started).

## Self-Check: PASSED

- FOUND: /Users/jeet/turion-space-demo/backend/src/middleware/auth.ts (rewrite to 137 lines, Cognito-only)
- FOUND: /Users/jeet/turion-space-demo/backend/src/secrets.ts (rewrite to 75 lines, mandatory Cognito)
- FOUND: /Users/jeet/turion-space-demo/backend/src/lambda.ts (comment fix)
- FOUND: /Users/jeet/turion-space-demo/backend/dist/middleware/auth.js (rebuilt)
- FOUND: /Users/jeet/turion-space-demo/backend/dist/secrets.js (rebuilt)
- FOUND: /Users/jeet/turion-space-demo/backend/dist/lambda.js (rebuilt)
- FOUND commit: c7b5236 (Task 1: source refactor)
- FOUND commit: 21f9d48 (Task 2: dist + deploy proof)
- FOUND Lambda CodeSha256 change: d6545f5a → e48f5332 (verified via aws lambda get-function-configuration)
- FOUND CloudWatch log: `[secrets] Cognito JWKS loaded: 2 keys, issuer=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP` (verified via aws logs filter-log-events)
- FOUND smoke transcript: /tmp/41-02-smoke.log (7/7 PASS)
- FOUND push: github.com/jeet-avatar/turion-space-demo de5b27f..21f9d48 (verified via git push output)
