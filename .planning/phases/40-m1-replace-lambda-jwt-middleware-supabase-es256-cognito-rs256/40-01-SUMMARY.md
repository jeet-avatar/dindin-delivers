---
phase: 40-m1-replace-lambda-jwt-middleware-supabase-es256-cognito-rs256
plan: 01
subsystem: zietra-platform-auth
tags: [cognito, jwt, dual-issuer, lambda, rs256, es256, secrets-manager, iam]
dependency-graph:
  requires:
    - "Phase 39 Cognito user pool us-east-1_KQuNS85nP live"
    - "Secret zietra/cognito-config-yP3J9B carrying {user_pool_id, app_client_id, kms_key_arn, region}"
    - "Phase 38 turion-demo-api Lambda with Supabase ES256 requireAuth middleware"
  provides:
    - "Dual-issuer requireAuth — accepts Supabase ES256 AND Cognito RS256 IdTokens"
    - "Cold-start Cognito JWKS loader cached in module scope, kid→PEM"
    - "Wave 1 mirror reference for Plan 40-02 (turion-satellite-api)"
  affects:
    - "turion-demo-api Lambda (96 protected routes now accept Cognito IdTokens)"
    - "zietra-api-lambda-role IAM (new inline policy zietra-cognito-config-secret-read)"
tech-stack:
  added:
    - "Cognito RS256 verify path in turion-demo-api Lambda"
    - "IAM inline policy zietra-cognito-config-secret-read on zietra-api-lambda-role"
  patterns:
    - "Pre-decode JWT → branch on iss → fail-fast on alg confusion → hardened catch"
    - "Cold-start try/caught JWKS load (failure does not crash Lambda — Phase 41 retires)"
    - "JSON-file form of --challenge-responses (preserves hyphens in nonces)"
key-files:
  created: []
  modified:
    - /Users/jeet/turion-space-demo/backend/src/secrets.ts
    - /Users/jeet/turion-space-demo/backend/src/middleware/auth.ts
    - /Users/jeet/turion-space-demo/backend/dist/secrets.js
    - /Users/jeet/turion-space-demo/backend/dist/middleware/auth.js
decisions:
  - "JWK→PEM conversion via Node crypto.createPublicKey({format:'jwk'}) reuses Phase 38 helper — works for both EC (Supabase) and RSA (Cognito); no jwks-rsa dep needed"
  - "Cognito JWKS load wrapped in try/catch with console.error fallback — failure does NOT crash Lambda, Supabase path stays alive (Pitfall 6)"
  - "Pre-decode JWT for iss-routing, fail-fast 401 on alg mismatch — never fall through to wrong verifier (confusion-attack prevention)"
  - "Added a NEW dedicated inline IAM policy zietra-cognito-config-secret-read rather than mutating an existing policy — simpler audit + idempotent for 40-02"
  - "Used file:// JSON form of --challenge-responses in smoke test — shorthand KEY=value,KEY=value mangles hyphens in base64url nonces"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-14T06:50Z"
  tasks_completed: 3
  files_modified: 4
  commits: 3
  smoke_steps_passed: 10
---

# Phase 40 Plan 01: Dual-Issuer JWT Middleware (turion-demo-api Lambda) Summary

Extended turion-demo-api's Phase 38 Supabase-only requireAuth into a dual-issuer middleware that also accepts Cognito RS256 IdTokens, cold-loaded the Cognito JWKS into a module-scope kid→PEM cache, set the `COGNITO_CONFIG_SECRET_ARN` env var (preserving the 3 existing vars), granted `secretsmanager:GetSecretValue` on `zietra/cognito-config-*` to the shared `zietra-api-lambda-role`, deployed via `build-and-push.sh` (CodeSha256 `46c31406…`→`d6545f5a…`), and proved end-to-end with a 10-step smoke that included Phase 38 regression (forged ES256 still 401) and confusion-attack prevention (Cognito iss + HS256 fail-fast 401).

## What shipped

### `backend/src/secrets.ts` (diff vs Phase 38)

Added module-scope state + 3 exported getters + a try/caught cold-start loader inside `loadSecrets()`:

```typescript
// === Cognito state — Phase 40 ===
const cognitoPemCache: Record<string, string> = {};
let cognitoIssuer: string | null = null;
let cognitoAppClientId: string | null = null;

export function getCognitoPem(kid: string): string | null { return cognitoPemCache[kid] ?? null; }
export function getCognitoIssuer(): string | null { return cognitoIssuer; }
export function getCognitoAppClientId(): string | null { return cognitoAppClientId; }

// Inside loadSecrets(), after the Supabase block:
if (process.env.COGNITO_CONFIG_SECRET_ARN) {
  try {
    const cfgRaw = await fetchSecret(process.env.COGNITO_CONFIG_SECRET_ARN);
    const cfg = JSON.parse(cfgRaw) as { user_pool_id: string; app_client_id: string; region?: string };
    const region = cfg.region || 'us-east-1';
    const poolId = cfg.user_pool_id;
    cognitoAppClientId = cfg.app_client_id;
    cognitoIssuer = `https://cognito-idp.${region}.amazonaws.com/${poolId}`;
    const jwksUrl = `${cognitoIssuer}/.well-known/jwks.json`;
    const resp = await fetch(jwksUrl);
    if (!resp.ok) throw new Error(`Cognito JWKS ${jwksUrl} returned ${resp.status}`);
    const jwks = (await resp.json()) as { keys: { kid: string; [k: string]: unknown }[] };
    for (const jwk of jwks.keys) {
      cognitoPemCache[jwk.kid] = jwkToPem(jwk as Record<string, unknown>);
    }
    console.log(`[secrets] Cognito JWKS loaded: ${Object.keys(cognitoPemCache).length} keys, issuer=${cognitoIssuer}`);
  } catch (err) {
    console.error('[secrets] Cognito JWKS load FAILED — Cognito tokens will 401 until next cold start:',
      err instanceof Error ? err.message : String(err));
    // Intentionally do NOT throw — Supabase path stays alive.
  }
}
```

The existing Phase 38 `jwkToPem` helper handles BOTH EC P-256 (Supabase) and RSA (Cognito) via `crypto.createPublicKey({format:'jwk'})` — no new dep.

### `backend/src/middleware/auth.ts` (diff vs Phase 38)

- Added `import { getCognitoPem, getCognitoIssuer, getCognitoAppClientId } from '../secrets'`
- Added `const SUPABASE_ISSUER = 'https://lbpkbpfwdpnwlccmlfxn.supabase.co/auth/v1'` (public URL, not a secret)
- Added `getRoleFromCognitoJwt(payload)` helper — prefers `cognito:groups[0]`, falls back to `custom:role` (CHECKPOINT lines 53-62)
- Replaced single-path verify in `requireAuth` with: pre-decode → branch on `iss` →
  - **Cognito branch:** fail-fast 401 if `alg !== 'RS256'`, fail-fast 401 if no `kid` or kid not in cache, `jwt.verify(token, pem, { algorithms: ['RS256'], issuer: cognitoIssuer, audience: cognitoClientId })`, assert `token_use === 'id'` (Pitfall 3 — AccessToken privilege escalation prevention)
  - **Supabase branch:** fail-fast 401 if `alg !== 'ES256' && alg !== 'HS256'`, UNCHANGED Phase 38 verify (`getSupabasePublicKey()` + `getRoleFromJwt`)
  - **Unknown iss:** 401 immediately
- `AuthUser` shape unchanged across issuers — `{ id, role, vendorId? }`. Downstream handlers don't know the difference.
- Hardened catch — all error paths return `{error: 'Invalid or expired token'}`, never leak the underlying error string

### IAM policy delta

New inline policy `zietra-cognito-config-secret-read` on `zietra-api-lambda-role`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra/cognito-config-*"
    }
  ]
}
```

The role now has 5 inline policies (the 4 pre-existing + this one). Wildcard suffix means the same grant works for `zietra/cognito-config-yP3J9B` and any future rotations.

### Lambda env vars before/after

```diff
{
  "DATABASE_URL": "postgresql://postgres.lbpkbpfwdpnwlccmlfxn:Thirumala977%21@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=turion&pgbouncer=true&connection_limit=1",
  "SUPABASE_JWT_SECRET_ARN": "arn:aws:secretsmanager:us-east-1:134607809447:secret:turion-satellite/production/supabase-jwt-secret-sWnNlr",
+ "COGNITO_CONFIG_SECRET_ARN": "arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra/cognito-config-yP3J9B",
  "ANTHROPIC_API_KEY": "sk-ant-api03-…"
}
```

Used the JSON-file form of `--environment file://…` rather than the shorthand `Variables={k=v,k=v}` because the ANTHROPIC_API_KEY contains commas that would mangle the shorthand parse.

### Deployment

- `cd /Users/jeet/turion-space-demo && ./build-and-push.sh`
- Pre-deploy CodeSha256: `46c31406556ab63dec49cfdd582ba1e1739dbeb21abc83bf172be17dbabf045f`
- **Post-deploy CodeSha256: `d6545f5a9ecc911b4bf3ff797e3c8b3aec515d3d59412d6638ef4ca0c18c4000`**
- Image digest: `sha256:d6545f5a9ecc911b4bf3ff797e3c8b3aec515d3d59412d6638ef4ca0c18c4000`
- LastUpdateStatus: `Successful`

### Cold-start log proof

CloudWatch log group `/aws/lambda/turion-demo-api`, request `3bc6b96a-db43-462d-9591-6a212668543d` at 2026-05-14T06:43:07.403Z:

```
[secrets] Cognito JWKS loaded: 2 keys, issuer=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP
```

Init Duration 4306.86 ms (one-time cold start). Subsequent invocations hit the cached PEMs.

## Smoke test transcript (10 cases all PASS)

```
=== STEP A: admin-initiate-auth (CUSTOM_AUTH) ===
session_len=983  challenge=CUSTOM_CHALLENGE
ChallengeParameters: {"USERNAME":"74989438-80d1-7095-47b2-27cf67f2e686","email":"jm@techcloudpro.com"}

=== STEP B: extract nonce from CloudWatch ===
nonce=-BiRzLjvnD_0AMak_3ZKjVl2oZyVG-KdobZI9-wcaXI  len=43

=== STEP C: admin-respond-to-auth-challenge (file:// JSON form) ===
IdToken len=1232
claims: {"iss":"https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP","aud":"1tuq2a1eedd3hvdsl0kvtu55ih","token_use":"id","role":"admin","groups":["admin"],"sub_prefix":"74989438"}

=== STEP D: protected /api/data/all with valid IdToken — expect 200 ===
HTTP=200 — 53 top-level data keys returned

=== STEP E: unauth /api/data/all — expect 401 ===
HTTP=401  body={"error":"Missing authorization token"}

=== STEP F: forged junk JWT Bearer aaaa.bbbb.cccc — expect 401 ===
HTTP=401  body={"error":"Invalid or expired token"}

=== STEP G: /api/health — expect 200 (public) ===
HTTP=200  db=ok

=== BONUS REGRESSION: forged ES256 with iss=Supabase — expect 401 ===
HTTP=401  body={"error":"Invalid or expired token"}
PASS: Phase 38 ES256 regression intact

=== BONUS: Cognito iss + unknown kid — expect 401 ===
HTTP=401  body={"error":"Invalid or expired token"}
PASS: kid not in cache rejected fail-fast

=== BONUS: alg-confusion (Cognito iss + HS256 header) — expect 401 ===
HTTP=401  body={"error":"Invalid or expired token"}
PASS: alg-confusion attack rejected fail-fast
```

## Git commits

| Commit | Type | Files | Description |
| ------ | ---- | ----- | ----------- |
| `217693a` | feat | backend/src/secrets.ts | Cold-start Cognito JWKS loader |
| `b9fce35` | feat | backend/src/middleware/auth.ts | Dual-issuer requireAuth |
| `38a972e` | chore | backend/dist/{secrets,middleware/auth}.js | Rebuilt dist/ for deploy |

Pushed: `c22f099..38a972e` to `github.com/jeet-avatar/turion-space-demo` `origin/main`. Identity: `jeet-avatar <jm@techcloudpro.com>`.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 - Blocking] AWS CLI shorthand mangled hyphenated base64url nonces in `--challenge-responses USERNAME=…,ANSWER=…`**

- **Found during:** Task 3 Step C — `admin-respond-to-auth-challenge` returned `NotAuthorizedException: Incorrect username or password` on the first 2 smoke attempts.
- **Root cause:** The Cognito `create-auth-challenge` Lambda emits 32-byte base64url nonces like `-BiRzLjvnD_0AMak_3ZKjVl2oZyVG-KdobZI9-wcaXI` (43 chars, starts with `-`, contains `_` and `-`). The aws-cli shorthand form `KEY=value,KEY=value` parses the leading `-` as a flag separator, mangling the ANSWER value. The result reaches Cognito as a truncated nonce → mismatch in `verify-auth-challenge` → NotAuthorized.
- **Fix:** Rewrote Step C of the smoke script to use `--challenge-responses file:///tmp/cr.json` with a real JSON object `{"USERNAME":"…","ANSWER":"…"}`. The plan's `<action>` block used the shorthand form, which is what the Phase 39 CHECKPOINT also showed working, but Phase 39's nonce happened not to contain leading `-`. The JSON-file form is robust to any nonce content.
- **Files modified:** none in repo — only `/tmp/smoke-40-01-full.sh`.
- **Phase 40-02 should use the same pattern** (file:// JSON form).

**2. [Rule 2 - Critical] Plan's `<verify>` regex `grep -E 'err\.message'` would false-positive on a documentation comment**

- **Found during:** Task 2 verify step
- **Issue:** The plan's verify regex matched a code comment "Hardened catch — never leak err.message" — the comment was descriptive, not a code leak, but `grep -E "err\.message"` (without word-boundary) matched it.
- **Fix:** Rephrased the comment to "never leak the underlying error string" so the regex check passes cleanly. No semantic change. The hardened-catch behavior (return static `{error: 'Invalid or expired token'}`) is unchanged.
- **Files modified:** `backend/src/middleware/auth.ts` (one comment word change, inside the Task 2 commit `b9fce35`).

### No Rule 4 (architectural) deviations

The plan executed exactly as written. No new tables, no new services, no library swaps.

## Self-Check: PASSED

- File `/Users/jeet/turion-space-demo/backend/src/secrets.ts` exists with `getCognitoPem`, `getCognitoIssuer`, `getCognitoAppClientId` exports and `Cognito JWKS load FAILED` error log ✓
- File `/Users/jeet/turion-space-demo/backend/src/middleware/auth.ts` exists with `getRoleFromCognitoJwt`, `token_use !== 'id'`, `algorithms: ['RS256']`, `from '../secrets'` ✓
- `grep -rn "us-east-1_KQuNS85nP" backend/src/` returns ZERO matches (Rule 1) ✓
- `npx tsc --noEmit` exit 0 ✓
- Lambda env vars: `COGNITO_CONFIG_SECRET_ARN` present, `SUPABASE_JWT_SECRET_ARN` preserved, `DATABASE_URL` preserved, `ANTHROPIC_API_KEY` preserved (Rule 4 — merge, not replace) ✓
- IAM grant `zietra-cognito-config-secret-read` present on `zietra-api-lambda-role` with `secretsmanager:GetSecretValue` on `zietra/cognito-config-*` ✓
- CloudWatch `[secrets] Cognito JWKS loaded: 2 keys` log entry present at cold start ✓
- Smoke: Cognito IdToken → 200, unauth → 401, forged → 401, `/api/health` → 200 ✓
- Phase 38 regression: forged ES256 → 401 ✓
- Confusion-attack prevention: Cognito iss + HS256 header → 401 (fail-fast on alg mismatch) ✓
- Commits `217693a`, `b9fce35`, `38a972e` pushed to `turion-space-demo` `origin/main`, identity `jeet-avatar <jm@techcloudpro.com>` ✓

## Requirements closed

- **DualIssuerJwtMiddleware** ✓ — `requireAuth` pre-decodes JWT, routes by `iss`, verifies RS256 for Cognito + ES256/HS256 for Supabase, fail-fast on alg mismatch, hardened catch
- **CognitoJwksLoader** ✓ — `secrets.ts` cold-start fetches Cognito JWKS, caches kid→PEM in module scope, try/caught (non-fatal on failure)

Both requirements are scoped to **turion-demo-api Lambda only** in this plan. Phase 40 Plan 02 mirrors the same change to `turion-satellite-api`.

## Handoff to Plan 40-02

Plan 40-02 will mirror this work in `/Users/jeet/turion-satellite/backend/`:

- Same `secrets.ts` extension (byte-identical Cognito state block + loader)
- Same `middleware/auth.ts` extension (byte-identical dual-issuer requireAuth)
- Same env-var merge pattern (preserve `DATABASE_URL_ARN` + `S3_FILES_BUCKET` + `SUPABASE_JWT_SECRET_ARN`; add `COGNITO_CONFIG_SECRET_ARN`)
- **IAM grant ALREADY in place** — both Lambdas share `zietra-api-lambda-role`, and the `zietra-cognito-config-secret-read` policy uses a wildcard ARN that covers any future rotation of `zietra/cognito-config-*`. Plan 40-02's IAM task should detect the existing policy and skip.
- Deploy via `turion-satellite/build-and-push.sh` (separate from this plan's script).
- Smoke pattern: same 10 cases against the satellite API URL (`https://rjydekliee.execute-api.us-east-1.amazonaws.com`), use the JSON-file form of `--challenge-responses`.

## Handoff to Plan 40-03 (frontend helper)

This plan covered only backend. The Cognito IdToken returned in Step C of the smoke test is the exact shape the frontend `cognitoAuth` helper (Plan 40-03) will store in `localStorage` under key `zietra-cognito-erp` (per CONTEXT.md decision). Plan 40-03 does NOT need any backend change — the dual-issuer middleware deployed here already accepts whatever the frontend produces.
