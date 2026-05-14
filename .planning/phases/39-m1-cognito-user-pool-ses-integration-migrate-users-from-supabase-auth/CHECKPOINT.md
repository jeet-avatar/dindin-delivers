# Phase 39 CHECKPOINT — Phase 40 handoff

> Written 2026-05-14 at the end of Phase 39 (smoke-test plan 39-04). Phase 40 starts from this doc.

## Phase 39 status — CLOSED

All 4 requirement IDs satisfied:

- ✅ **CognitoUserPool** — pool `zietra-platform-users` (`us-east-1_KQuNS85nP`) exists in us-east-1 with 4 Groups (admin/customer/driver/vendor) + custom attributes `custom:role` (mutable) and `custom:supabase_sub` (immutable, audit forward-link).
- ✅ **CognitoSesIntegration** — 4 Cognito-trigger Lambdas wired (`zietra-cognito-{custom-email-sender,define-auth-challenge,create-auth-challenge,verify-auth-challenge}`), IAM role `zietra-cognito-email-sender-role` with inline SES + KMS + CloudWatch policy, KMS CMK `arn:aws:kms:us-east-1:134607809447:key/fd1706a7-f70a-4464-bfa7-991f5c52537a` (alias `alias/zietra-cognito-email-sender`).
- ✅ **UserMigrationFromSupabase** — 4 confirmed Supabase users (`demo@zietra.com`, `gteshnair@gmail.com`, `jm@techcloudpro.com`, `jeetnair.in@gmail.com`) migrated to Cognito, all CONFIRMED, all `admin` role + `admin` Group, all `email_verified=true`, all carry `custom:supabase_sub` forward-link.
- ✅ **CognitoAuthCheckpoint** — `admin-initiate-auth CUSTOM_AUTH` for `jm@techcloudpro.com` → Create-Auth-Challenge Lambda fired → SES SendEmail logged in CloudWatch → `admin-respond-to-auth-challenge` returned IdToken+AccessToken+RefreshToken → IdToken decoded with all 7 expected claims (email, custom:role=admin, cognito:groups=[admin], iss, email_verified, aud, token_use).

## What Phase 40 inherits

### AWS resources (all live in us-east-1, account 134607809447)

| Resource | Identifier | Where to read |
|---|---|---|
| User pool ID | `us-east-1_KQuNS85nP` | Secrets Manager `zietra/cognito-config.user_pool_id` |
| App client ID | `1tuq2a1eedd3hvdsl0kvtu55ih` | Secrets Manager `zietra/cognito-config.app_client_id` |
| KMS CMK ARN | `arn:aws:kms:us-east-1:134607809447:key/fd1706a7-f70a-4464-bfa7-991f5c52537a` | Secrets Manager `zietra/cognito-config.kms_key_arn` |
| Cognito JWKS URL | `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP/.well-known/jwks.json` | Derived from pool ID |
| Cognito Issuer | `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP` | Same |
| 4 Cognito-trigger Lambdas | `zietra-cognito-{custom-email-sender,define-auth-challenge,create-auth-challenge,verify-auth-challenge}` | `aws lambda list-functions --region us-east-1` |
| IAM role for trigger Lambdas | `arn:aws:iam::134607809447:role/zietra-cognito-email-sender-role` | `aws iam get-role` |
| Migrated users (4) | `demo@zietra.com`, `gteshnair@gmail.com`, `jm@techcloudpro.com`, `jeetnair.in@gmail.com` (all CONFIRMED, all `admin` group + `custom:role=admin`) | `aws cognito-idp list-users --user-pool-id us-east-1_KQuNS85nP` |

> **Rule 1 reminder:** Phase 40 code MUST read pool_id + client_id + region from `zietra/cognito-config` Secrets Manager at cold start. Never hardcode the literals in source — copy the secret ARN to env, not the IDs.

### JWT algorithm + claim mapping (for Phase 40 middleware)

**Cognito IdToken is RS256.** Supabase IdToken is ES256. Phase 40's middleware MUST be dual-issuer.

> **Cognito region-bound endpoint base:** All Cognito JWKS / Issuer URLs use the regional pattern `cognito-idp.<region>.amazonaws.com`. For Zietra (us-east-1) the concrete base is `cognito-idp.us-east-1.amazonaws.com`. The AWS docs index page is `https://docs.aws.amazon.com/cognito-identity-provider/latest/APIReference/` which uses the `cognito-idp.amazonaws.com` short form for the SDK namespace; do not confuse the SDK namespace with the regional JWKS host (only the regional form is valid for actual JWKS lookups).

| Claim | Source | Used by Phase 40 |
|---|---|---|
| `sub` | Cognito-generated UUID (NEW — different from Supabase `sub`) | `requireAuth` returns `payload.sub` to handlers |
| `email` | User attribute | Optional — log only |
| `email_verified` | Bool (always `true` post-migration) | Not enforced today |
| `custom:role` | String — one of `admin`/`customer`/`driver`/`vendor` | Fallback when `cognito:groups` empty |
| `cognito:groups` | Array — one of the 4 groups | **PREFERRED** role source |
| `custom:supabase_sub` | String — original Supabase UUID (audit forward-link) | Phase 41 cleanup verification |
| `iss` | `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP` | **Issuer-routing key** in dual-issuer middleware |
| `aud` | `1tuq2a1eedd3hvdsl0kvtu55ih` | Phase 40 verifies = client_id |
| `token_use` | `'id'` for IdToken, `'access'` for AccessToken | Phase 40 verifies = `'id'` for protected routes |
| `exp` | Unix timestamp, 60 minutes after issue | Standard JWT exp check |

#### Reference role helper for Phase 40

```ts
function getRoleFromCognitoJwt(payload: any): string {
  if (Array.isArray(payload['cognito:groups']) && payload['cognito:groups'][0]) {
    return payload['cognito:groups'][0];   // PREFER groups
  }
  if (typeof payload['custom:role'] === 'string') {
    return payload['custom:role'];          // FALLBACK to custom attr
  }
  return 'unknown';
}
```

### Env vars Phase 40 must set on `turion-satellite-api` + `turion-demo-api` Lambdas

| Env var | Value | Why |
|---|---|---|
| `COGNITO_CONFIG_SECRET_ARN` | `arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra/cognito-config-<suffix>` | Cold-start reads `user_pool_id`, `app_client_id`, `region` |
| `COGNITO_ISSUER` | `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP` | Optional override (derivable from pool_id) — useful for local dev |
| **Existing** `SUPABASE_JWT_SECRET_ARN` | unchanged | KEEP — Phase 40 is DUAL-issuer, not Cognito-only. Phase 41 retires this. |
| **Existing** `DATABASE_URL` | unchanged | Phase 39 did not touch DB connection. |

Both Lambdas inherit the existing `zietra-api-lambda-role`. Add a new IAM grant `secretsmanager:GetSecretValue` on `arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra/cognito-config-*` via `aws iam put-role-policy`.

### Phase 40 high-level architecture

**`backend/src/secrets.ts` extension (both repos):**

- Keep Supabase JWKS PEM cold-start load (Phase 38).
- ADD: Cognito JWKS via `fetch('https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP/.well-known/jwks.json')` at cold start (cache the response — JWKS rotation is rare).
- Convert each JWK to PEM with `crypto.createPublicKey({ format: 'jwk', key })` (Node 20 supports this natively — same pattern as Phase 38's Supabase JWKS-to-PEM).
- Cache pool_id + client_id + region in module scope.

**`backend/src/middleware/auth.ts` extension (both repos, mirror change):**

- Pre-decode JWT header + payload (no signature verify) to read `iss` claim.
- If `iss === 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP'`:
  - Find the kid-matching PEM in the cached Cognito JWKS.
  - `jwt.verify(token, cognitoPem, { algorithms: ['RS256'], audience: clientId, issuer: cognitoIssuer })`.
  - Assert `token_use === 'id'` (or `'access'` if access tokens are used — research first).
- Else if `iss === 'https://lbpkbpfwdpnwlccmlfxn.supabase.co/auth/v1'`:
  - Existing ES256 verify path (unchanged).
- Else:
  - Return 401 with `{error: 'invalid issuer'}` (same shape as existing 401 responses — Phase 38 hardened-catch).

Both sub-apps (`turion-satellite-api` Lambda + `turion-demo-api` Lambda) get the same change. The 4 Cognito-trigger Lambdas are NOT touched in Phase 40.

### Lambdas that MUST NOT change in Phase 40

- `zietra-cognito-custom-email-sender` — correct as shipped
- `zietra-cognito-define-auth-challenge` — correct as shipped (fixed in 39-04 with package.json shim)
- `zietra-cognito-create-auth-challenge` — correct as shipped
- `zietra-cognito-verify-auth-challenge` — correct as shipped

Phase 40 reads Cognito tokens; it doesn't issue them.

### Files Phase 40 will probably touch

- `turion-space-demo/backend/src/secrets.ts` — add Cognito JWKS load
- `turion-space-demo/backend/src/middleware/auth.ts` — add dual-issuer routing
- `turion-space-demo/backend/src/lambda.ts` (or wherever env validation lives) — add `COGNITO_CONFIG_SECRET_ARN` check
- `turion-satellite/backend/src/secrets.ts` — same change (mirror)
- `turion-satellite/backend/src/middleware/auth.ts` — same change (mirror)
- `turion-satellite/backend/src/lambda.ts` — same change (mirror)
- IAM grant: `secretsmanager:GetSecretValue` on `zietra/cognito-config` for `zietra-api-lambda-role` — single `iam put-role-policy` call

### What Phase 40 does NOT cover

- Removing Supabase Auth — Phase 41
- Frontend changes — Phase 41 builds the new login flow + cognito-auth-callback.html
- Multi-tenancy (`tenant_id`) — M3 (Phases 44+)
- RDS migration — M2 (Phases 42-43)

## Phase 39 smoke test transcript

```
=== Phase 39 Plan 04 smoke test transcript ===
Date: 2026-05-14
Account: 134607809447
Region: us-east-1
Pool ID: us-east-1_KQuNS85nP
App Client ID: 1tuq2a1eedd3hvdsl0kvtu55ih
Test user: jm@techcloudpro.com (CONFIRMED, admin group, admin custom:role)

=== STEP 1 — admin-initiate-auth (CUSTOM_AUTH) ===
ChallengeName: CUSTOM_CHALLENGE
Session length: 983 chars
ChallengeParameters.USERNAME: 74989438-80d1-7095-47b2-27cf67f2e686 (Cognito sub UUID)
ChallengeParameters.email: jm@techcloudpro.com
=> PASS

=== STEP 2 — extract nonce from CloudWatch ===
LogGroup: /aws/lambda/zietra-cognito-create-auth-challenge
NONCE: 7A5ECvYz... (43 chars, base64url)
=> PASS (Lambda fired, logged nonce + magic-link sent)

=== STEP 3 — admin-respond-to-auth-challenge ===
USERNAME=jm@techcloudpro.com  ANSWER=<nonce>
Returned: AccessToken (RS256), IdToken (RS256), RefreshToken (RSA-OAEP+A256GCM)
ExpiresIn: 3600s
=> PASS — all 3 tokens issued

=== STEP 4 — Decode IdToken claims (base64url middle segment) ===
{
  "sub": "74989438-80d1-7095-47b2-27cf67f2e686",
  "cognito:groups": ["admin"],
  "email_verified": true,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP",
  "custom:supabase_sub": "21235658-909d-48c0-97c3-24edc5a822cd",
  "cognito:username": "74989438-80d1-7095-47b2-27cf67f2e686",
  "aud": "1tuq2a1eedd3hvdsl0kvtu55ih",
  "token_use": "id",
  "custom:role": "admin",
  "email": "jm@techcloudpro.com",
  "exp": 1778740242,
  "iat": 1778736642,
  "auth_time": 1778736642
}
CLAIM CHECK OK — email + custom:role + cognito:groups + iss + email_verified + aud + token_use all correct
custom:supabase_sub forward-link preserved (21235658-... matches Supabase auth.users.id)
=> PASS

=== STEP 5 — Create-Auth-Challenge SES SendEmail log ===
2026-05-14T05:30:10.315Z 8738a324-... INFO [create-auth-challenge] magic-link sent to jm@techcloudpro.com
=> PASS (Lambda actually called SES SendEmail, no MessageRejected)

=== STEP 6 — Phase 38 regression ===
ERP /api/health           = 200  (expect 200)
ERP /api/data/all unauth  = 401  (expect 401)
Sat /api/health           = 200  (expect 200)
Sat /api/satellites unauth= 401  (expect 401)
ERP forged ES256 JWT      = 401  (expect 401)
=> PASS — all 5 curls return expected status

=== END ===
```

## Cost

Phase 39 marginal AWS spend: ~$1/mo (KMS CMK). Cognito + Lambda + SES are all free tier at this volume.

## Open items for the next session (NON-BLOCKING)

- **`demo@zietra.com` SES verification** — kicked off in 39-01; recipient click pending. Only needed if magic-link tests target that address. The Phase 39 smoke test uses `jm@techcloudpro.com` (already SES-verified) so this is non-blocking.
- **SES prod-access reopen** — pending user action in AWS Console (case `176066476400763` was DENIED). Non-blocking for Phase 40 (200/day sandbox limit suffices; Phase 40 has no email traffic).
- **Phase 41 will delete `backend/scripts/migrate-supabase-users-to-cognito.ts`** per Rule 5 (dead-code cleanup), and may drop `@aws-sdk/client-cognito-identity-provider` from `backend/dependencies` (Phase 40 reads JWKS over plain HTTPS).
- **Inbox-arrival verification (Task 3 of 39-04)** — the magic-link email lands in jm@techcloudpro.com per CloudWatch + SES SendEmail success; user out-of-band verifies actual inbox arrival (`approved` or `missing`). Either way Phase 39 is closed; `missing` only flags a deliverability defect for Phase 41 (which builds the cognito-auth-callback page).

## Deviations during 39-04

**[Rule 1 - Bug] Define-Auth-Challenge Lambda crashed with `SyntaxError: Unexpected token 'export'`**

- **Found during:** Task 1 first `admin-initiate-auth` call (`UserLambdaValidationException: DefineAuthChallenge failed with error SyntaxError: Unexpected token 'export'`)
- **Root cause:** The TS compiler emits ES2022 `export` syntax (`tsconfig.json` `module: ES2022`), but the deployed zips for `define-auth-challenge`, `verify-auth-challenge`, `custom-email-sender`, and `create-auth-challenge` did NOT contain a root `package.json` with `"type": "module"`. Node 20 in Lambda defaults to CommonJS in absence of one → ESM `export` is a syntax error.
- **Fix:** In `deploy.sh`, write a minimal `{"type":"module"}` shim into `dist/package.json` before any zip is created, and include it in all 4 zips. Re-ran deploy.sh idempotently — all 4 Lambdas updated.
- **File modified:** `/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/deploy.sh` (deploy.sh-only — no Lambda source code touched)
- **Commit:** `c22f099` in `github.com/jeet-avatar/turion-space-demo` `origin/main`
- **Post-fix verification:** `admin-initiate-auth` returned `CUSTOM_CHALLENGE` + 983-char session, smoke test continued through all 6 steps to PASS.

This was a latent bug in 39-02's deploy artifact that 39-04's smoke test surfaced. The fix is contained to deploy.sh; no Cognito Lambda source code was changed, so the wiring guarantees from 39-02 still hold.
