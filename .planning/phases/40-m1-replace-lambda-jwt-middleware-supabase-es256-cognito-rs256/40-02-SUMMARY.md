---
phase: 40-m1-replace-lambda-jwt-middleware-supabase-es256-cognito-rs256
plan: 02
subsystem: auth
tags: [cognito, jwt, rs256, es256, dual-issuer, lambda, aws-secrets-manager, turion-satellite]

# Dependency graph
requires:
  - phase: 38-turion-erp-auth
    provides: Phase 38 requireAuth middleware (Supabase ES256) + zietra-api-lambda-role
  - phase: 39-m1-cognito-user-pool-ses-integration-migrate-users-from-supabase-auth
    provides: Cognito user pool us-east-1_KQuNS85nP, app client 1tuq2a1eedd3hvdsl0kvtu55ih, zietra/cognito-config Secrets Manager entry, 4 confirmed users
provides:
  - turion-satellite-api Lambda accepts Cognito RS256 IdTokens AND Supabase ES256 tokens (dual-issuer)
  - Cold-start JWKS loader in secrets.ts with module-scope kid→PEM cache (try/caught — failure does not crash Lambda)
  - getRoleFromCognitoJwt helper (prefers cognito:groups[0], falls back to custom:role)
  - Phase 38 contract preserved (no auth → 401, forged → 401, /api/health → 200, existing test suite 407/407 pass)
affects: [phase-40-01-turion-demo-mirror, phase-41-supabase-retirement, future-cognito-protected-routes]

# Tech tracking
tech-stack:
  added:
    - jwt.decode pre-decode pattern (no signature verify, just read iss claim)
    - global fetch() for Cognito JWKS (no jwks-rsa dep — node 20 built-in)
  patterns:
    - "Dual-issuer JWT middleware: pre-decode → iss-branch → algorithm + audience verify → role-extract → user-shape"
    - "Cold-start JWKS load wrapped in try/catch so Supabase path stays alive when Cognito misconfigured (assistant.ts:11 fault-tolerance rule)"
    - "Issuer routing is exact-match opt-in; fall-through is the Phase 38 Supabase path (preserves test tokens lacking iss claim)"

key-files:
  created: []
  modified:
    - /Users/jeet/turion-satellite/backend/src/secrets.ts
    - /Users/jeet/turion-satellite/backend/src/middleware/auth.ts

key-decisions:
  - "Use exact iss-match for Cognito; everything else (including iss-absent test tokens) falls through to Phase 38 Supabase path — preserves 407 existing backend tests with zero changes."
  - "No IAM put-role-policy call needed: zietra-api-lambda-role already grants secretsmanager:GetSecretValue on Cognito secret (verified via successful cold-start JWKS load on first deploy)."
  - "Removed legacy SECRET_MAP constant (Rule 5) — was defined but never referenced anywhere in backend/src/."
  - "fetch() global instead of jwks-rsa npm dep — Node 20 runtime has both fetch and crypto.createPublicKey({format:'jwk'}), no new dependency added."

patterns-established:
  - "Phase 40 Cognito-state block: module-scope cognitoPemCache + cognitoIssuer + cognitoAppClientId + three exported getters. Byte-identical between turion-satellite and turion-space-demo (Rule 4 mirror — 40-02 sets the canonical shape; 40-01 will mirror it)."
  - "Phase 40 dual-issuer requireAuth: jwt.decode → branch on iss → Cognito RS256 path (algorithm guard + kid lookup + audience verify + token_use==='id' assert) OR fall-through Supabase path."

requirements-completed:
  - DualIssuerJwtMiddleware
  - CognitoJwksLoader

# Metrics
duration: 13 min
completed: 2026-05-14
---

# Phase 40 Plan 02: Dual-issuer JWT middleware in turion-satellite-api Summary

**turion-satellite-api Lambda now verifies Cognito RS256 IdTokens (against zietra/cognito-config JWKS) in addition to existing Supabase ES256 tokens, with a try/caught cold-start JWKS load that keeps the Supabase path alive if Cognito secrets ever fail to load.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-05-14T06:33:00Z
- **Completed:** 2026-05-14T06:46:42Z
- **Tasks:** 3
- **Files modified:** 2 (secrets.ts, middleware/auth.ts)

## Accomplishments

- Cognito JWKS cold-start loader (2 keys cached as kid→PEM) — verified in CloudWatch: `[secrets] Cognito JWKS loaded: 2 keys, issuer=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP`
- Dual-issuer `requireAuth` middleware: routes by JWT `iss` claim with fail-fast on algorithm mismatch
- Cognito IdToken (real, minted via CUSTOM_AUTH) on `/api/satellites` returned **HTTP 200** with the live satellite list
- Phase 38 regression intact: unauth 401, forged 401, `/api/health` 200, full 407-test backend suite passes
- New CodeSha256: `46beed474f23027f980a58d9e59524efea8dfe5341716accad88a75fa9126ce2`

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend secrets.ts with Cognito JWKS cold-start loader** — `d5baa39` (feat)
2. **Task 2: Extend middleware/auth.ts with dual-issuer routing** — `200775d` (feat)
3. **Task 3: Set env var on Lambda, deploy via build-and-push.sh, smoke test** — `b1a9ca7` (chore, empty)

Pushed to `github.com/jeet-avatar/turion-satellite` `origin/main` (and feature branch `gsd/phase-40-cognito-rs256-middleware`).

## Files Created/Modified

- `/Users/jeet/turion-satellite/backend/src/secrets.ts` — Added Cognito state block (cognitoPemCache + cognitoIssuer + cognitoAppClientId + 3 getters) and a try/caught Cognito branch inside `loadSecrets()`. Removed dead `SECRET_MAP` constant per Rule 5.
- `/Users/jeet/turion-satellite/backend/src/middleware/auth.ts` — Imported Cognito getters from `../secrets`. Added `SUPABASE_ISSUER` constant + `getRoleFromCognitoJwt` helper. Rewrote `requireAuth` body to pre-decode JWT and branch on `iss`: Cognito RS256 path (alg guard, kid lookup, audience verify, `token_use === 'id'` assert) vs Supabase fall-through path (Phase 38 contract — unchanged for legacy + test tokens).

## Decisions Made

- **Exact-match Cognito routing.** The plan as drafted made `iss` required and rejected tokens that didn't match either issuer. That broke 245 existing backend tests whose tokens (jwt.sign with no `iss` claim) flowed through the Phase 38 ES256 path. Fixed by making Cognito an exact-match opt-in branch and letting everything else fall through to the existing Supabase verify path. The Cognito branch is fully sound (RS256 + iss + aud + token_use all enforced); the Supabase branch retains its Phase 38 catch-all guarantee.
- **No new IAM policy.** The `zietra-api-lambda-role` already permits `secretsmanager:GetSecretValue` on the Cognito secret (verified empirically: the very first cold-start logged `Cognito JWKS loaded: 2 keys` without any policy change). The plan's idempotent `put-role-policy` step would have been a no-op in this account configuration. IAM commands are blocked at the sandbox layer in this environment, so executing the plan's `put-role-policy` was impossible anyway — but the verification confirmed it wasn't needed.
- **Use built-in fetch + node crypto for JWK→PEM.** The Phase 38 secrets.ts already does `crypto.createPublicKey({format:'jwk'})`. Reusing that helper rather than adding `jwks-rsa` keeps Rule 6 (no unnecessary code) clean.
- **Branching: `gsd/phase-40-cognito-rs256-middleware` + main fast-forward.** The plan asked for `git push origin main`; the project's planner config says branching_strategy=phase. Honored both by creating the phase branch, pushing it, then fast-forwarding main on top of it (no merge commit). Both refs are now on `origin`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Initial dual-issuer logic broke 245 pre-existing tests**

- **Found during:** Task 2 (middleware/auth.ts) — ran `npx vitest run` after the first write and saw 245 failures with `expected 400 to be 401`.
- **Issue:** My first implementation followed the plan literally — "if iss is missing, return 401." But existing test fixtures use `jwt.sign({ sub: 'u-1', app_metadata: { role: 'engineer' } }, privateKey, { algorithm: 'ES256' })` which has NO `iss` claim. These tokens (and legacy Supabase pre-iss tokens, if any exist) were now being rejected by my middleware before reaching the Supabase verify step. The Phase 38 contract did not require an `iss` claim.
- **Fix:** Made Cognito an exact-match opt-in branch. The dispatcher now reads: "if iss === cognitoIssuer → Cognito RS256 path; ELSE → existing Supabase path (which itself fails on bad signatures)." This restores the Phase 38 contract for all non-Cognito tokens — including test fixtures and legacy Supabase JWTs that may lack iss.
- **Files modified:** `/Users/jeet/turion-satellite/backend/src/middleware/auth.ts`
- **Verification:** Re-ran `npx vitest run` → 407/407 passed (1 pre-existing skip). Smoke test A still works (Cognito IdToken → 200). Smoke tests C/D (unauth 401, forged 401) still work.
- **Committed in:** `200775d` (Task 2 commit; the fix was applied before the first git add, so there's one commit containing the corrected logic and the fix-note in the commit body).

**2. [Rule 5 - Dead code] Removed legacy SECRET_MAP constant from secrets.ts**

- **Found during:** Task 1 — the plan explicitly said "if grep confirms zero refs, delete now."
- **Issue:** `const SECRET_MAP = { DATABASE_URL: 'DATABASE_URL_ARN', _SUPABASE_JWKS_RAW: 'SUPABASE_JWT_SECRET_ARN' }` was defined in secrets.ts but `grep -rn 'SECRET_MAP' backend/src/` returned only the definition line, no usages.
- **Fix:** Deleted the constant during the Task 1 Write. Net -7 lines.
- **Files modified:** `/Users/jeet/turion-satellite/backend/src/secrets.ts`
- **Verification:** `npx tsc --noEmit` clean. 407 tests still pass.
- **Committed in:** `d5baa39` (Task 1 commit).

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 5 cleanup)
**Impact on plan:** Both auto-fixes preserve correctness without expanding scope. The Rule 1 fix made the change strictly additive (Phase 38 behavior fully retained for every token shape the old middleware accepted). The Rule 5 fix removed 7 lines of debt the plan explicitly flagged.

## Issues Encountered

- **IAM commands sandbox-blocked.** `aws iam list-role-policies` / `aws iam put-role-policy` / `aws iam get-role` are all blocked at the harness sandbox layer in this environment. Made the "idempotent IAM grant" step unrunnable as written. Mitigation: confirmed the grant is already in place by observing the cold-start CloudWatch log `[secrets] Cognito JWKS loaded: 2 keys` — `loadSecrets()` calls `fetchSecret(COGNITO_CONFIG_SECRET_ARN)` which would have thrown an AccessDeniedException had the role lacked the grant. Empirically, the role already permits this Resource (likely via wildcard or a pre-existing Phase 38 policy that covers `zietra/*`). No action needed.
- **macOS `date +%s%3N` doesn't work.** Used `python3 -c 'import time; print(int(time.time()*1000))'` instead to capture millisecond timestamps for CloudWatch filter-log-events `--start-time`.
- **Two failed Cognito-mint attempts** before the third succeeded, due to nonce/CloudWatch-log timing races during the CUSTOM_AUTH ping-pong. Resolved by widening the sleep between `initiate-auth` and the `filter-log-events` poll to 8-10s. Not a code defect — Cognito demo plumbing only.

## Cognito-state diff-parity vs Plan 40-01 (Rule 4 mirror)

The plan asserts both repos' Cognito-state blocks should be byte-identical. **40-02 has shipped first** (40-01 has not been executed yet at time of this summary — `turion-space-demo/backend/src/secrets.ts` is still the 1636-byte Phase-38 file). The Cognito-state block and dual-issuer middleware block in this commit are the **canonical shape** that 40-01 must mirror when it runs:

- `secrets.ts` — Cognito state block lives between the comment `// === Cognito state — Phase 40 ===` and the line `export function getCognitoAppClientId() { return cognitoAppClientId; }`. The `loadSecrets()` branch lives between `// === Phase 40 — Cognito ===` and the closing `}` of the `if (process.env.COGNITO_CONFIG_SECRET_ARN)` block.
- `middleware/auth.ts` — The import line `import { getCognitoPem, getCognitoIssuer, getCognitoAppClientId } from '../secrets';`, the `SUPABASE_ISSUER` constant, the `getRoleFromCognitoJwt` helper, and the rewritten `requireAuth` body. The only repo-specific difference 40-01 will need (when it runs) is the optional Supabase URL fallback — both repos point at the same Supabase project, so even that should be identical.

**Diff-parity check command for the future 40-01 executor:**
```bash
diff <(awk '/Cognito state — Phase 40/,/^export function getCognitoAppClientId/' /Users/jeet/turion-space-demo/backend/src/secrets.ts) \
     <(awk '/Cognito state — Phase 40/,/^export function getCognitoAppClientId/' /Users/jeet/turion-satellite/backend/src/secrets.ts)
# expected exit 0 after 40-01 ships
```

## Authentication Gates

None. AWS CLI was authenticated throughout. The IAM-policy block was sandbox-restricted, not credential-restricted, and turned out not to be needed anyway (the existing role already had the grant).

## User Setup Required

None — no external service configuration required beyond what Phase 39 already provisioned. The Cognito user pool, app client, secret, and trigger Lambdas were all in place from Phase 39.

## Smoke Test Transcript

```
=== Cold-start CloudWatch (turion-satellite-api, post-deploy) ===
2026-05-14T06:43:17.421Z  [secrets] Cognito JWKS loaded: 2 keys,
                          issuer=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP

=== Lambda env vars (post-merge) ===
{
  "DATABASE_URL_ARN":         "...turion-satellite/production/database-url-NCbgX6",
  "S3_FILES_BUCKET":          "turion-satellite-files",
  "SUPABASE_JWT_SECRET_ARN":  "...turion-satellite/production/supabase-jwt-secret-sWnNlr",
  "COGNITO_CONFIG_SECRET_ARN":"...zietra/cognito-config-yP3J9B"
}

=== Cognito IdToken claims (jm@techcloudpro.com, minted via CUSTOM_AUTH) ===
iss:            https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP
aud:            1tuq2a1eedd3hvdsl0kvtu55ih
token_use:      id
cognito:groups: ["admin"]
custom:role:    admin
email:          jm@techcloudpro.com
exp:            1778744747

=== Smoke tests (against https://rjydekliee.execute-api.us-east-1.amazonaws.com) ===
A. GET /api/satellites + Authorization: Bearer <Cognito IdToken>   → HTTP 200 (returns satellite list)
B. GET /api/work-orders + Authorization: Bearer <Cognito IdToken>  → HTTP 400 (handler-level "satId required" — auth passed)
C. GET /api/satellites (no Authorization header)                   → HTTP 401  {"error":"Missing authorization token"}
D. GET /api/satellites + Authorization: Bearer aaaa.bbbb.cccc      → HTTP 401  (forged junk rejected)
E. GET /api/health                                                 → HTTP 200  (public)
```

## Next Phase Readiness

- **40-01 (turion-demo-api mirror) is ready to execute.** Its task list will be identical structurally. The canonical Cognito-state block and dual-issuer middleware live in `turion-satellite/backend/src/{secrets.ts,middleware/auth.ts}` post-commit `200775d` and should be byte-copied (modulo file path) into `turion-space-demo/backend/src/`. The IAM grant will (almost certainly) already be in place there too because both Lambdas share `zietra-api-lambda-role`.
- **40-03 (frontend cognitoAuth helper)** can proceed in parallel — no backend dependency.
- **40-04 (smoke + cleanup)** can proceed after 40-01 lands.
- **Phase 41 retirement of Supabase ES256** can now plan around a known-good Cognito path on at least one Lambda; once 40-01 lands, both Lambdas verify Cognito IdTokens identically.

## Self-Check: PASSED

- `[ -f /Users/jeet/turion-satellite/backend/src/secrets.ts ]` → FOUND
- `[ -f /Users/jeet/turion-satellite/backend/src/middleware/auth.ts ]` → FOUND
- Commits in `turion-satellite` `main`: `d5baa39`, `200775d`, `b1a9ca7` → all 3 present (`git log --oneline -3 main`)
- `npx tsc --noEmit` in `turion-satellite/backend` → exit 0
- `npx vitest run` in `turion-satellite/backend` → 407 passed, 1 skipped, 0 failed
- Lambda CodeSha256 active → `46beed474f23027f980a58d9e59524efea8dfe5341716accad88a75fa9126ce2`
- CloudWatch cold-start log present → `[secrets] Cognito JWKS loaded: 2 keys`
- Smoke test A (Cognito IdToken → 200) → PASS
- Smoke tests C/D/E (Phase 38 regression) → all PASS
- No hardcoded pool ID `us-east-1_KQuNS85nP` in source → `grep -rn` returned zero matches
- SECRET_MAP dead code removed → `grep -rn 'SECRET_MAP' backend/src/` returned zero matches

---
*Phase: 40-m1-replace-lambda-jwt-middleware-supabase-es256-cognito-rs256*
*Completed: 2026-05-14*
