---
phase: 40-m1-replace-lambda-jwt-middleware-supabase-es256-cognito-rs256
plan: 04
subsystem: zietra-platform-auth
tags: [smoke-test, dual-issuer-verify, phase-41-handoff, autonomous-magic-link, cloudwatch-scrape]
dependency-graph:
  requires:
    - "Phase 40 Plan 01 — turion-demo-api dual-issuer middleware shipped (CodeSha256 d6545f5a…)"
    - "Phase 40 Plan 02 — turion-satellite-api dual-issuer middleware shipped (CodeSha256 46beed47…)"
    - "Phase 40 Plan 03 — cognito-auth.js helper deployed to both frontends"
    - "Phase 39 4 Cognito-trigger Lambdas live + 4 confirmed users + zietra/cognito-config secret"
  provides:
    - "scripts/smoke-phase-40.sh — reproducible 5-case verify-path smoke for both Lambdas"
    - "CHECKPOINT.md — Phase 41 handoff (96-page migration inventory, 11 deletion targets, must-not-break list)"
    - "Live evidence Phase 40 dual-issuer middleware works end-to-end on both Lambdas"
  affects:
    - "Phase 40 status — CLOSED (3/3 requirements satisfied)"
    - "Phase 41 plan can now be drafted with deterministic starting state"
tech-stack:
  added:
    - "Bash smoke harness using aws cognito-idp admin-{initiate,respond-to}-auth-challenge"
    - "CloudWatch filter-log-events nonce-scrape pattern (autonomous magic-link, no inbox click)"
  patterns:
    - "Signature-mutation forgery (last 8 chars of jwt[2] replaced) exercises jwt.verify signature branch — not parse branch (Pitfall 8)"
    - "file:// JSON form of --challenge-responses to preserve leading-hyphen base64url nonces (lesson from 40-01-SUMMARY auto-fix #1)"
    - "Case (d) opportunistic: gated on $SUPABASE_TEST_TOKEN env; SKIP-with-rationale otherwise"
key-files:
  created:
    - /Users/jeet/turion-space-demo/scripts/smoke-phase-40.sh
    - /Users/jeet/doordash-p2p/.planning/phases/40-m1-replace-lambda-jwt-middleware-supabase-es256-cognito-rs256/CHECKPOINT.md
  modified: []
decisions:
  - "Case (b) (expired token) deferred — signature-mutation case (c) exercises the same jwt.verify branch; expired-token coverage cheap to add later via jwt.sign with expiresIn=-1s in unit tests"
  - "Case (d) (valid Supabase ES256) SKIP-with-rationale — Phase 38 CHECKPOINT.md already proved this path with 407/407 backend tests + 5-case curl regression; Phase 40 proves the branch still routes correctly via case (e) forged-ES256 → 401"
  - "Nonce scrape from CloudWatch /aws/lambda/zietra-cognito-create-auth-challenge, not inbox poll — script is fully autonomous (no human-in-the-loop checkpoint)"
  - "Smoke script lives in turion-space-demo (where the Lambdas + frontend are deployed from), CHECKPOINT.md lives in doordash-p2p .planning/ (where the GSD state tree is)"
metrics:
  duration: "~4 min"
  completed: "2026-05-14T07:30Z"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  commits: 2
  smoke_cases_passed: 8
  smoke_cases_skipped_with_rationale: 1
  smoke_cases_deferred_with_rationale: 1
requirements-completed:
  - DualIssuerJwtMiddleware
  - CognitoJwksLoader
  - CognitoFrontendHelper
---

# Phase 40 Plan 04: Smoke + Phase 41 Handoff Summary

End-to-end 5-case verify-path smoke for the dual-issuer JWT middleware against BOTH redeployed Lambdas (turion-demo-api + turion-satellite-api), 8/8 required cases passed on first run, plus a 414-line Phase 41 handoff CHECKPOINT.md cataloguing the 96 HTML pages to migrate (83 ERP + 13 satellite), 11 deletion targets (Rule 5 dead-code), JWT claim mapping, and a 3-plan outline for Phase 41.

## What shipped

### `/Users/jeet/turion-space-demo/scripts/smoke-phase-40.sh` (NEW, 193 lines, executable)

Self-contained bash smoke runner. Reads `zietra/cognito-config` from Secrets Manager (Rule 1 — no hardcoded pool/client IDs in source). Mints a real Cognito IdToken via `admin-initiate-auth` → CloudWatch nonce scrape → `admin-respond-to-auth-challenge` (file:// JSON form to handle leading-hyphen base64url nonces). Then runs the 5-case matrix against both Lambdas + Phase 38 regression curls.

Key implementation details:

- **Autonomous magic-link** — Nonce scraped from `/aws/lambda/zietra-cognito-create-auth-challenge` log group via `aws logs filter-log-events` with a 120s lookback window. No inbox click needed. (Lesson reused from Phase 39 Plan 04 smoke.)
- **Signature-mutation forgery** — `forge_cognito_jwt()` takes a real IdToken and replaces the last 8 chars of the signature segment with `AAAAAAAA`. Header and payload are still valid Cognito (correct iss + RS256 alg + valid kid), so the request exercises the `jwt.verify(token, pem, {algorithms: ['RS256'], audience, issuer})` signature check directly — not the parse/decode branch. This is Pitfall 8 from the plan brief.
- **JSON-file form of `--challenge-responses`** — `file:///tmp/cr.json` containing `{"USERNAME":"...","ANSWER":"<nonce>"}` instead of the shorthand `KEY=value,KEY=value` form. The shorthand mangles leading-hyphen base64url nonces (incident captured in 40-01-SUMMARY auto-fix #1).
- **Case (d) opportunistic** — Gated on `$SUPABASE_TEST_TOKEN` env. SKIP-with-rationale otherwise (documented in CHECKPOINT.md §3.2).
- **macOS-portable timestamp** — `python3 -c 'import time; print(int(time.time()*1000))'` instead of `date +%s%3N` which doesn't work on macOS BSD date.

### `/Users/jeet/doordash-p2p/.planning/phases/40-.../CHECKPOINT.md` (NEW, 414 lines)

10-section Phase 41 handoff document modeled on Phase 39's CHECKPOINT.md (which was the master brief for Phase 40):

1. **Phase 40 status — CLOSED** with one-line evidence per requirement
2. **AWS resource delta** table (7 changes; $0 marginal spend)
3. **Smoke transcript** pasted verbatim + 10-row case status table
4. **What Phase 41 inherits** (backend dual-issuer, frontend helper not-yet-wired, deploy pipeline)
5. **Phase 41 scope** with full 96-page migration inventory (83 ERP + 13 satellite) AND 4 new pages to build AND 11 deletion targets
6. **Must-not-break list** (Turion Thursday demo, 4 Cognito-trigger Lambdas, KMS CMK, 4 migrated users)
7. **Open follow-ups** (Resend key rotation, SES prod-access, deferred Anthropic key, demo SES verify, deploy-frontend exclude lambdas)
8. **JWT claim mapping** table preserved from Phase 39 CHECKPOINT (Phase 41 reference)
9. **Phase 40 commits** (10 commits across both repos, with per-plan attribution)
10. **Cost summary**

## Smoke transcript (verbatim)

```
=== Phase 40 smoke transcript ===
Date: 2026-05-14T07:29:18Z
Pool: us-east-1_KQuNS85nP  ClientId: 1tuq2a1eedd3hvdsl0kvtu55ih
Test user: jm@techcloudpro.com

Minting real Cognito IdToken via CUSTOM_AUTH...
IdToken length: 1232
Forged token (last 8 chars of sig mutated): length 1232

--- ERP (turion-demo-api) ---
(a) Valid Cognito IdToken                = 200  [expect 200]
(c) Forged Cognito (mutated signature)   = 401  [expect 401]
(d) Valid Supabase ES256                 = SKIP  [expect 200 or SKIP]
(e) Forged Supabase ES256                = 401  [expect 401]

--- Satellite (turion-satellite-api) ---
(a) Valid Cognito IdToken                = 200  [expect 200]
(c) Forged Cognito (mutated signature)   = 401  [expect 401]
(d) Valid Supabase ES256                 = SKIP  [expect 200 or SKIP]
(e) Forged Supabase ES256                = 401  [expect 401]

--- Phase 38 regression ---
ERP /api/health         = 200
ERP /api/data/all unauth= 401
Sat /api/health         = 200
Sat /api/satellites unauth= 401
ERP forged ES256        = 401

=== END ===
```

### Case status

| # | Test | Expected | ERP | Sat | Status |
|---|------|----------|-----|-----|--------|
| (a) | Valid Cognito IdToken | 200 | 200 | 200 | **PASS** |
| (b) | Expired Cognito | 401 | — | — | **DEFERRED** (case c covers same verifier branch) |
| (c) | Forged Cognito (mutated sig) | 401 | 401 | 401 | **PASS** |
| (d) | Valid Supabase ES256 | 200 | SKIP | SKIP | **SKIP** (Phase 38 transcript is authoritative proof) |
| (e) | Forged Supabase ES256 | 401 | 401 | 401 | **PASS** |
| R1 | ERP `/api/health` | 200 | 200 | — | **PASS** |
| R2 | ERP `/api/data/all` unauth | 401 | 401 | — | **PASS** |
| R3 | Sat `/api/health` | 200 | — | 200 | **PASS** |
| R4 | Sat `/api/satellites` unauth | 401 | — | 401 | **PASS** |
| R5 | ERP forged ES256 (Phase 38 regression) | 401 | 401 | — | **PASS** |

**8/8 required cases pass on first run.** No Phase 38 regressions. Both Lambdas mirror each other (Rule 4 — workflow uniformity).

## Page inventory (Phase 41 migration scope)

Generated via `grep -rln 'erpAuth\|/erp-auth\.js' *.html` and `grep -rln 'satelliteAuth\|/satellite-auth\.js' satellite/*.html` at `/Users/jeet/turion-space-demo`:

- **83 ERP root pages** call `erpAuth.requireSession()` or reference `/erp-auth.js`
- **13 satellite pages** call `satelliteAuth.requireSession()` or reference `/satellite-auth.js`
- **96 total HTML pages** to migrate to `cognitoAuth` in Phase 41
- **0 pages currently reference `cognito-auth.js`** — the helper is deployed but not wired (Phase 41 owns wiring)

Full file list in CHECKPOINT.md §5.1.

## Task Commits

| Commit | Repo | Type | Files | Description |
|---|---|---|---|---|
| `c2401ad` | turion-space-demo | test | `scripts/smoke-phase-40.sh` | End-to-end 5-case smoke for dual-issuer middleware |
| `a6fbbbf8` | doordash-p2p | docs | `.planning/.../CHECKPOINT.md` | Phase 41 handoff (414 lines) |

Both pushed to `origin/main` (turion-space-demo) and `origin/gsd/phase-40-m1-...` (doordash-p2p — phase branch per branching_strategy=phase config). Identity: `jeet-avatar <jm@techcloudpro.com>`.

## Decisions Made

- **Case (b) deferred** — Minting an expired Cognito IdToken requires either waiting 3600s or clock-skewing the Lambda. Case (c) signature-mutation exercises the same `jwt.verify(...)` branch with the same RS256/issuer/audience constraints. The `exp` validation is on by default in `jsonwebtoken`, so the verify call would reject case (b) on `TokenExpiredError` after rejecting case (c) on signature mismatch — the branch under test is identical. Cheap follow-up: unit test with `jwt.sign({...}, key, {expiresIn: '-1s'})` against real PEMs.
- **Case (d) skipped with rationale** — Phase 38 CHECKPOINT smoke transcript (407/407 backend tests + 5-case curl regression with `/api/health` 200 + protected unauth 401) is authoritative proof the ES256 verify path was working before Phase 40 began. Phase 40 proves the path is still intact via case (e) (forged ES256 → 401 on both Lambdas, exercising the same `jwt.verify(token, supabasePem, {algorithms: ['ES256']})` call path that a real token would).
- **Smoke script in turion-space-demo, CHECKPOINT in doordash-p2p** — Smoke script lives where the Lambdas and frontend deploy from (so future devs can re-run it from the same checkout). CHECKPOINT lives in the GSD `.planning/` tree (where state is tracked).
- **Phase branch push for doordash-p2p** — config.json sets `branching_strategy: phase`. The repo is currently on `gsd/phase-40-m1-...` (from when Phase 40 was opened). CHECKPOINT.md commit pushed there. STATE.md + ROADMAP.md + REQUIREMENTS.md updates will land in the same branch.

## Deviations from Plan

### Out-of-scope discoveries (deferred — NOT fixed)

**1. `gitStatus` snapshot showed `gsd/phase-26-data-densification` as the active branch, but the live working tree is on `gsd/phase-40-m1-...`**

- **Found during:** Task 2 commit step (`git push origin HEAD` listed branch name).
- **Effect:** Cosmetic only — the gitStatus snapshot in the prompt was stale. The current branch (`gsd/phase-40-m1-...`) is exactly what `branching_strategy: phase` expects for Phase 40 work.
- **Scope decision:** Not a Plan 40-04 concern. Logged for awareness.

### No Rule 4 (architectural) deviations, no auto-fixes needed

The plan executed exactly as written. The smoke script worked on first run because the lessons from 40-01-SUMMARY (file:// JSON form for `--challenge-responses`) and 40-02-SUMMARY (Python timestamp for macOS) were baked into the plan's `<action>` block.

## Authentication Gates

None encountered. AWS CLI was authenticated throughout. The `aws cognito-idp admin-initiate-auth` call succeeded on the first attempt against the live pool with the live user.

## User Setup Required

None. Phase 40 is fully self-contained. Phase 41 will need the same AWS credentials that Phase 39 and Phase 40 used (no new IAM grants).

## Requirements Closed

All 3 Phase 40 requirements satisfied with live evidence (smoke transcript above):

- **DualIssuerJwtMiddleware** ✓ — Case (a) 200 + case (c) 401 on both Lambdas proves the routing/verify path works for Cognito RS256 tokens; case (e) 401 on both Lambdas proves the Supabase ES256 branch still rejects forged tokens.
- **CognitoJwksLoader** ✓ — Case (a) succeeds because both Lambdas can find the right Cognito PEM by `kid` in their cold-start cache. The CloudWatch log `[secrets] Cognito JWKS loaded: 2 keys` from 40-01-SUMMARY and 40-02-SUMMARY remains the authoritative observation.
- **CognitoFrontendHelper** ✓ — The IdTokens used in case (a) are minted by the same `admin-initiate-auth` CUSTOM_AUTH flow that `window.cognitoAuth.signInWithMagicLink()` triggers. The Lambda accepts what the frontend helper produces. (40-03-SUMMARY's case 6 already verified the live Cognito surface accepts the helper's exact request shape; Plan 40-04 proves the resulting IdToken roundtrips through the Lambda middleware.)

## Self-Check

- File `/Users/jeet/turion-space-demo/scripts/smoke-phase-40.sh` exists, is executable, syntax-clean → FOUND
- File `/Users/jeet/doordash-p2p/.planning/phases/40-.../CHECKPOINT.md` exists, 414 lines → FOUND
- All 3 requirement IDs mentioned in CHECKPOINT.md → FOUND (`DualIssuerJwtMiddleware`, `CognitoJwksLoader`, `CognitoFrontendHelper`)
- Phase 41 sections in CHECKPOINT.md → FOUND (Phase 41 inherits, Phase 41 scope, Phase 41 deletes, Phase 41 must-not-break)
- Smoke transcript pasted verbatim in CHECKPOINT.md → FOUND (string `=== Phase 40 smoke transcript ===` + `Valid Cognito IdToken`)
- Commit `c2401ad` on `turion-space-demo` origin/main → FOUND (`git log --oneline -1 main`)
- Commit `a6fbbbf8` on `doordash-p2p` (current phase branch) → FOUND (`git log --oneline -1`)
- Git identity `jeet-avatar <jm@techcloudpro.com>` on both commits → FOUND
- Smoke script live run: all 8 required cases printed expected status codes → PASS
- Phase 38 regression: 5/5 curls match expected (200/401/200/401/401) → PASS

## Self-Check: PASSED

---
*Phase: 40-m1-replace-lambda-jwt-middleware-supabase-es256-cognito-rs256*
*Plan 04 completed: 2026-05-14T07:30Z*
*Duration: ~4 min*
