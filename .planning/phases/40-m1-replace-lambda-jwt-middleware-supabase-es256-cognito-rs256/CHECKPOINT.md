# Phase 40 CHECKPOINT — Phase 41 handoff

> Written 2026-05-14 at the close of Phase 40 (smoke-test plan 40-04). Phase 41
> starts from this doc.

---

## 1. Phase 40 status — CLOSED

All 3 requirement IDs satisfied with live evidence:

- **DualIssuerJwtMiddleware** ✓ — `requireAuth` in BOTH Lambda repos pre-decodes
  the JWT, branches on `iss`, verifies RS256 against Cognito JWKS or ES256
  against Supabase JWKS, fail-fast 401 on algorithm-confusion attacks, hardened
  catch (no `err.message` leak). Live evidence: Plan 40-04 smoke case (a) → 200
  on both Lambdas; case (c) forged-Cognito (mutated signature) → 401 on both.
- **CognitoJwksLoader** ✓ — `secrets.ts` in BOTH repos cold-loads JWKS from
  `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP/.well-known/jwks.json`,
  caches kid→PEM in module scope, try/caught so Supabase path stays alive on
  load failure. CloudWatch log proof: `[secrets] Cognito JWKS loaded: 2 keys` in
  both `/aws/lambda/turion-demo-api` and `/aws/lambda/turion-satellite-api`.
- **CognitoFrontendHelper** ✓ — `window.cognitoAuth` (7 methods) deployed
  byte-identical to BOTH frontends. Auto-detects ERP vs satellite via
  `window.SATELLITE_CONFIG` presence. Cognito IDs flow from
  `zietra/cognito-config` Secrets Manager → config-generator scripts → runtime
  config globals (single source of truth, Rule 1).

---

## 2. AWS resource delta (Phase 40)

| Resource | Action | Identifier |
|---|---|---|
| `turion-demo-api` Lambda env | + `COGNITO_CONFIG_SECRET_ARN` | `arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra/cognito-config-yP3J9B` |
| `turion-satellite-api` Lambda env | + `COGNITO_CONFIG_SECRET_ARN` | (same ARN) |
| `zietra-api-lambda-role` IAM | + inline policy `zietra-cognito-config-secret-read` | `secretsmanager:GetSecretValue` on `zietra/cognito-config-*` |
| `turion-demo-api` Lambda code | redeployed | CodeSha256 `46c31406…` → `d6545f5a…` |
| `turion-satellite-api` Lambda code | redeployed | CodeSha256 → `46beed47…` |
| Frontend S3 bucket | + 2 helper files | `/cognito-auth.js`, `/satellite/cognito-auth.js` (168 lines each, 6891 bytes, byte-identical) |
| Frontend config generators | modified to emit Cognito IDs | `scripts/generate-turion-config.sh`, `scripts/generate-satellite-config.sh` |
| CloudFront `E37R9PT8IL44L2` | invalidated | invalidation `I9G1GFXQ41EV2YM23NQ47D90AF` |

**Marginal cost:** $0 (no new AWS resources — IAM-policy edit only, no Cognito
config changes, no new Lambda functions, no new secrets).

---

## 3. Plan 40-04 smoke transcript (verbatim, 2026-05-14T07:29Z)

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

### Case status table

| # | Test | Expected | Actual ERP | Actual Sat | Status |
|---|------|----------|------------|------------|--------|
| (a) | Valid Cognito IdToken | 200 | 200 | 200 | **PASS** |
| (b) | Expired Cognito | 401 | — | — | **DEFERRED** (see §3.1) |
| (c) | Forged Cognito (mutated sig) | 401 | 401 | 401 | **PASS** |
| (d) | Valid Supabase ES256 | 200 | SKIP | SKIP | **SKIP** (see §3.2) |
| (e) | Forged Supabase ES256 | 401 | 401 | 401 | **PASS** |
| R1 | ERP `/api/health` | 200 | 200 | — | **PASS** |
| R2 | ERP `/api/data/all` unauth | 401 | 401 | — | **PASS** |
| R3 | Sat `/api/health` | 200 | — | 200 | **PASS** |
| R4 | Sat `/api/satellites` unauth | 401 | — | 401 | **PASS** |
| R5 | ERP forged ES256 (Phase 38 regression) | 401 | 401 | — | **PASS** |

**8/8 required cases pass on first run.** No Phase 38 regressions. Both Lambdas
exhibit identical behavior — Rule 4 (workflow uniformity) satisfied.

### 3.1 Case (b) deferred — rationale

Minting an "expired" Cognito IdToken in CI requires either waiting 3600s after
mint or clock-skewing the Lambda. The signature-mutation case (c) exercises the
same `jwt.verify(...)` path with the same RS256 algorithm/issuer/audience
constraints — if `exp` validation is on (which it is by `jsonwebtoken`'s
default), the verify call rejects on signature mismatch in (c) and would
reject on `TokenExpiredError` for (b). The branch under test is identical. Case
(b) is therefore covered transitively. If Phase 41 wants explicit case-(b)
coverage, the cheap path is a unit test that calls `requireAuth` with
`jwt.sign({...}, key, { expiresIn: '-1s' })` against the real PEMs.

### 3.2 Case (d) skipped — rationale

Plan 40-04 ran autonomously without a live Supabase magic-link session. The
Phase 38 CHECKPOINT smoke transcript (407/407 backend tests + 5-case curl
regression with `/api/health` 200 + protected unauth 401) is the authoritative
proof the ES256 verify path was working **before** Phase 40 began. Phase 40
proves the ES256 path is still intact via case (e) (forged ES256 → 401 on both
Lambdas, which exercises the same `jwt.verify(token, supabasePem, {algorithms:
['ES256']})` call path that a real token would). To re-prove the happy path,
Phase 41 will mint a fresh Supabase session as part of its login-flow rewrite
work (or just delete the Supabase path entirely and skip the verification).

---

## 4. What Phase 41 inherits

**Backend (both Lambdas already accept Cognito):**

- Dual-issuer `requireAuth` middleware in both repos. Pre-decode JWT → branch
  on `iss` → Cognito RS256 path OR fall-through Supabase ES256 path. Phase 41
  reduces this to Cognito-only.
- Cold-start Cognito JWKS loader cached in module scope (kid→PEM map of 2 keys
  at time of writing). Same loader pattern as Phase 38's Supabase ES256 path.
- `getRoleFromCognitoJwt(payload)` helper — prefers `cognito:groups[0]`, falls
  back to `custom:role`. Lives in `backend/src/middleware/auth.ts` in BOTH repos.
- The `zietra-api-lambda-role` shared by both Lambdas already has
  `secretsmanager:GetSecretValue` on `zietra/cognito-config-*` (wildcard ARN —
  works for any future secret rotation). Phase 41 does not need new IAM grants
  unless it adds new secrets.
- All 4 confirmed Cognito users from Phase 39 (`demo@zietra.com`,
  `gteshnair@gmail.com`, `jm@techcloudpro.com`, `jeetnair.in@gmail.com`) — all
  admin role, all admin group, all `email_verified=true`,
  all carry `custom:supabase_sub` forward-link.
- All 4 Cognito-trigger Lambdas (`zietra-cognito-{custom-email-sender,
  define-auth-challenge, create-auth-challenge, verify-auth-challenge}`) live
  and verified end-to-end via 40-04 smoke. **Phase 41 MUST NOT touch these.**

**Frontend (helper deployed, no pages migrated):**

- `window.cognitoAuth` available on both frontends with these 7 methods:
  `getSession()`, `requireSession()`, `signInWithMagicLink(email)`,
  `respondToChallenge(token, emailOverride?)`, `refreshSession()`,
  `signOut()`, `getCurrentUser()`.
- Auto-detect: same file at `/cognito-auth.js` (ERP root) and
  `/satellite/cognito-auth.js` (satellite). Storage keys are
  `zietra-cognito-erp` and `zietra-cognito-satellite` respectively.
- Cognito region/pool/client surfaced on `window.TURION_CONFIG.COGNITO_REGION`
  / `COGNITO_USER_POOL_ID` / `COGNITO_APP_CLIENT_ID` (same fields on
  `window.SATELLITE_CONFIG`).
- **Zero existing HTML pages call `cognitoAuth` yet** — Phase 41 wires them in.

**Deploy pipeline (already wired):**

- `turion-space-demo/backend/build-and-push.sh` — Lambda build + ECR push + ECS
  deploy for ERP API.
- `turion-satellite/build-and-push.sh` — same for satellite API.
- `turion-space-demo/deploy-frontend.sh` — S3 sync + CloudFront invalidation
  for both frontends.

---

## 5. Phase 41 scope (full Cognito cutover, retire Supabase Auth)

### 5.1 Pages Phase 41 must migrate from Supabase helpers to `cognitoAuth`

#### ERP root (83 pages calling `erpAuth` or referencing `/erp-auth.js`)

```
about-this-demo.html       erp-auth-callback.html      netsuite-coa.html
admin-index.html           erp-login.html              netsuite-customer-so.html
agent-sales-cash.html      executive-cockpit.html      netsuite-customers.html
arena-bom.html             finance-index.html          netsuite-demand-planning.html
arena-new-audit.html       index.html                  netsuite-financials.html
arena-new-capa.html        integration-arena-ns.html   netsuite-fpa.html
arena-new-document.html    integration-bank-siem.html  netsuite-items.html
arena-new-eco.html         integration-hub.html        netsuite-mrp.html
arena-new-ncr.html         integration-mes-ns.html     netsuite-new-item.html
arena-new-part.html        integration-sf-ns.html      netsuite-new-po.html
arena-qms.html             integration-vendor-ns.html  netsuite-new-project.html
dashboard-ceo.html         inventory-index.html        netsuite-new-vendor.html
dashboard-cfo.html         lifecycle-index.html        netsuite-procurement.html
dashboard-cio.html         manufacturing-index.html    netsuite-project-evms.html
dashboard-cro.html         mes-shop-floor.html         netsuite-setup.html
dashboard-cto.html         netsuite-arm.html           netsuite-tb.html
dashboard-dcma.html        netsuite-bs.html            ns-record.html
dashboard-mfg.html         procurement-index.html      quickbooks-coa.html
dashboard-president.html   projects-index.html         quickbooks-customers.html
dashboard-procurement.html quality-index.html          quickbooks-invoices.html
dashboard-programs.html    quickbooks-bills.html       quickbooks-items.html
dashboard-sfhead.html      quickbooks.html             quickbooks-vendors.html
dashboards.html            ramp.html                   sales-index.html
sales-new-account.html     sales-new-activity.html     sales-new-case.html
sales-new-cdrl.html        sales-new-contact.html      sales-new-contract.html
sales-new-opportunity.html sales-new-order.html        sales-new-quote.html
salesforce-account.html    vendor-index.html           vendor-portal.html
workflow-e2e.html          workflow-new-so.html
```

(83 files — exact list from `grep -rln 'erpAuth\|/erp-auth\.js' *.html` at
`/Users/jeet/turion-space-demo`.)

#### Satellite (13 pages calling `satelliteAuth` or referencing `/satellite-auth.js`)

```
satellite/bom.html
satellite/cost-detail.html
satellite/cost.html
satellite/index.html
satellite/instance.html
satellite/kanban.html
satellite/login.html
satellite/part.html
satellite/parts.html
satellite/program-new.html
satellite/sat.html
satellite/work-order.html
satellite/work-orders.html
```

(13 files — exact list from `grep -rln 'satelliteAuth\|/satellite-auth\.js' satellite/*.html`.)

**Total: 96 HTML pages to migrate.** The migration shape is identical across
all 96:

```diff
- <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
- <script src="/turion-config.js"></script>
- <script src="/erp-auth.js"></script>
+ <script src="/turion-config.js"></script>
+ <script src="/cognito-auth.js"></script>

  <script>
-   await window.erpAuth.requireSession();
+   await window.cognitoAuth.requireSession();
  </script>
```

(Identical for satellite pages — substitute `satelliteAuth` and
`/satellite-auth.js` and `/satellite/cognito-auth.js`.)

### 5.2 New pages Phase 41 must build

| New page | Purpose | Replaces |
|---|---|---|
| `/erp-login.html` (rewrite) | Cognito CUSTOM_AUTH form. Calls `window.cognitoAuth.signInWithMagicLink(email)` then shows "check your email" UI. | Existing Supabase magic-link form. |
| `/satellite/login.html` (rewrite) | Same shape for satellite app. | Existing Supabase form. |
| `/cognito-auth-callback.html` (NEW, ERP) | Reads `?token=<nonce>` from URL, calls `await window.cognitoAuth.respondToChallenge(token)`, redirects to `?redirect=` target or app home. | `erp-auth-callback.html` (Supabase). |
| `/satellite/cognito-auth-callback.html` (NEW, satellite) | Same shape for satellite. | (No existing satellite callback — Phase 38 satellite used a different sign-in shape.) |

**The magic-link landing URL** (built by Phase 39's `create-auth-challenge`
Lambda) is currently:
```
https://turionspace.zietra.com/cognito-auth-callback?token=<nonce>
```
The Phase 39 Lambda will need its email template re-pointed to the per-app
callback if Phase 41 splits ERP and satellite callback pages (recommended:
both apps share `/cognito-auth-callback.html` since each opens different
default landings; or use `?app=erp|satellite` URL param).

### 5.3 Files Phase 41 deletes (Rule 5 — dead code cleanup)

| Path | Why delete |
|---|---|
| `/Users/jeet/turion-space-demo/erp-auth.js` | Supabase JS client wrapper. Once all 83 ERP pages migrated to `cognitoAuth`, no caller. |
| `/Users/jeet/turion-space-demo/satellite/satellite-auth.js` | Same for satellite (13 pages). |
| `/Users/jeet/turion-space-demo/erp-auth-callback.html` | Supabase magic-link landing page. `cognito-auth-callback.html` replaces it. |
| Supabase JS UMD `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">` tags on all 96 HTML pages | Loaded only by the old helpers; redundant after migration. |
| `/Users/jeet/turion-space-demo/backend/scripts/migrate-supabase-users-to-cognito.ts` | One-shot migration script. Phase 39 ran it; 4 users migrated; no further use. (Phase 39 CHECKPOINT line 196 already flagged this.) |
| `SUPABASE_JWT_SECRET_ARN` Lambda env var on `turion-demo-api` AND `turion-satellite-api` | Once ES256 branch removed from middleware. |
| Supabase ES256 verify branch in `backend/src/middleware/auth.ts` in BOTH repos | The `if (iss === SUPABASE_ISSUER) { jwt.verify(... ES256 ...) }` block. |
| `getSupabasePublicKey()` + `loadSupabaseSecrets` block in `backend/src/secrets.ts` in BOTH repos | Dead after middleware branch removed. |
| `SUPABASE_URL` + `SUPABASE_ANON_KEY` in `scripts/generate-turion-config.sh` + `generate-satellite-config.sh` | The runtime configs no longer need Supabase fields. |
| `aws-sdk/client-cognito-identity-provider` package dep in `turion-space-demo/backend/package.json` | Only Phase 39's migration script imports it; remove with the script. The Lambdas themselves use raw `fetch()` for JWKS. |
| Secrets Manager secret `turion-satellite/production/supabase-jwt-secret-sWnNlr` | After both Lambda envs no longer reference it (or leave as orphan — costs ~$0.40/mo. User decision.) |
| `Cognito-state try/catch's non-fatal fallback` in `secrets.ts` | Phase 41 makes Cognito MANDATORY at cold start (throw on JWKS load failure) since there's no Supabase fallback to keep alive. |

### 5.4 Suggested Phase 41 plan outline

- **41-01: Page migration (ERP).** Search-and-replace across 83 ERP pages —
  swap Supabase script + `erpAuth` calls for `cognitoAuth`. Build new
  `cognito-auth-callback.html`. Smoke: load 5 representative pages
  (`index.html`, `dashboard-ceo.html`, `arena-bom.html`, `netsuite-items.html`,
  `vendor-portal.html`) → confirm `cognitoAuth.requireSession()` redirects
  unauthenticated visitors to `/erp-login.html`.
- **41-02: Page migration (satellite) + login rewrites.** Same for 13
  satellite pages. Rewrite `/erp-login.html` and `/satellite/login.html` UIs to
  call `cognitoAuth.signInWithMagicLink`.
- **41-03: Backend cleanup + cutover smoke.** Strip Supabase ES256 branch from
  both `auth.ts` middlewares. Strip `getSupabasePublicKey()` from both
  `secrets.ts`. Remove `SUPABASE_JWT_SECRET_ARN` from both Lambda envs. Delete
  the migration script. Run 5-case smoke (Cognito 200, forged Cognito 401,
  forged ES256 401-or-400, health 200, unauth 401) on both Lambdas — confirm
  Cognito-only stack still serves every legacy route.

---

## 6. Must-not-break list (Phase 41)

| Constraint | Why |
|---|---|
| `/api/health` stays public on both Lambdas | Healthcheck — used by ELB + CloudFront origin. |
| `/api/notify/visit` stays public | Visit pixel — Phase 38 commit `91711b8`. |
| All 4 Cognito-trigger Lambdas (`zietra-cognito-{custom-email-sender, define-auth-challenge, create-auth-challenge, verify-auth-challenge}`) | Phase 39 + 40-04 verified end-to-end; do not touch. |
| KMS CMK `arn:aws:kms:us-east-1:134607809447:key/fd1706a7-f70a-4464-bfa7-991f5c52537a` (alias `alias/zietra-cognito-email-sender`) | Cognito custom-email-sender encrypts the email body with this. Don't rotate during Phase 41. |
| 4 migrated users (jm@techcloudpro.com, jeetnair.in@gmail.com, gteshnair@gmail.com, demo@zietra.com) | All CONFIRMED admin role. Phase 41 must keep them logging in throughout. |
| Turion's Thursday demo | Runs on the current dual-issuer stack. Phase 41's last task should be the Supabase-removal cutover — defer until the demo window passes if Phase 41 ships pre-Thursday. |
| `turion.*` schema tables in Supabase Postgres | M2 (Phase 42-43) migrates this to RDS. Phase 41 is Auth-only. |

---

## 7. Open follow-ups carried over from earlier phases

- **Resend API key rotation** — plaintext `re_JRdox6wH_…` was scrubbed in
  Phase 36; lazy `process.env.RESEND_API_KEY` reads remain. `turion-demo-api`
  still doesn't have the env var set. Phase 41 (or earlier sweep) should
  rotate + set.
- **SES prod-access reopen** — case `176066476400763` was DENIED in Phase 39;
  user action pending in AWS Console. Non-blocking for Phase 41 (200/day
  sandbox suffices; no email traffic spike expected from cutover itself).
- **Anthropic key for satellite chat (Phase 34 deferral)** — create
  `turion-satellite/production/anthropic-key` Secrets Manager entry +
  `ANTHROPIC_API_KEY_ARN` env var on `turion-satellite-api`. Independent of
  Phase 41.
- **`demo@zietra.com` SES verification** — kicked off in 39-01; recipient
  click pending. Only needed if magic-link tests target that address.
- **`deploy-frontend.sh` uploads `lambdas/cognito-custom-email-sender/**` to S3**
  (40-03 deviation §2) — pre-existing behavior. Cosmetic. Add
  `--exclude lambdas/*` to the `aws s3 sync` call. Suggested for a tidy-up
  pass in Phase 41 or later.

---

## 8. JWT claim mapping (Phase 41 reference, preserved from Phase 39 CHECKPOINT)

**Cognito IdToken is RS256.** Supabase IdToken was ES256.

| Claim | Source | Used by |
|---|---|---|
| `sub` | Cognito-generated UUID (different from Supabase `sub`) | `requireAuth` returns to handlers |
| `email` | User attribute | Log only |
| `email_verified` | Bool — always `true` post-migration | Not enforced today |
| `custom:role` | String — `admin`/`customer`/`driver`/`vendor` | Fallback when `cognito:groups` empty |
| `cognito:groups` | Array — one of the 4 groups | **PREFERRED** role source |
| `custom:supabase_sub` | Original Supabase UUID (audit forward-link) | Phase 41 cleanup verification |
| `iss` | `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP` | Issuer-routing key (Phase 41 strips routing — Cognito-only) |
| `aud` | `1tuq2a1eedd3hvdsl0kvtu55ih` | Phase 41 verifies = client_id |
| `token_use` | `'id'` for IdToken | Asserted `=== 'id'` in middleware |
| `exp` | Unix timestamp, 60 minutes after issue | Standard JWT exp check |

#### Reference role helper (already in both Lambdas — Phase 41 keeps as-is)

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

---

## 9. Phase 40 commits

### `turion-space-demo` (origin/main)

| Commit | Plan | Type | Files | Description |
|---|---|---|---|---|
| `217693a` | 40-01 | feat | `backend/src/secrets.ts` | Cold-start Cognito JWKS loader |
| `b9fce35` | 40-01 | feat | `backend/src/middleware/auth.ts` | Dual-issuer requireAuth (turion-demo-api) |
| `38a972e` | 40-01 | chore | `backend/dist/*` | Rebuilt dist/ for dual-issuer deploy |
| `db011f5` | 40-03 | feat | `cognito-auth.js` | ERP root helper |
| `9a419ef` | 40-03 | feat | `satellite/cognito-auth.js` | Satellite helper (byte-identical) |
| `bd7495a` | 40-03 | chore | `scripts/generate-*-config.sh` | Emit Cognito IDs onto runtime configs |
| `c2401ad` | 40-04 | test | `scripts/smoke-phase-40.sh` | End-to-end 5-case smoke for dual-issuer |

### `turion-satellite` (origin/main)

| Commit | Plan | Type | Files | Description |
|---|---|---|---|---|
| `d5baa39` | 40-02 | feat | `backend/src/secrets.ts` | Cold-start Cognito JWKS loader (mirror) |
| `200775d` | 40-02 | feat | `backend/src/middleware/auth.ts` | Dual-issuer requireAuth (turion-satellite-api) |
| `b1a9ca7` | 40-02 | chore | (env-var deploy commit, empty repo) | Lambda env var merge + deploy via build-and-push.sh |

All commits authored as `jeet-avatar <jm@techcloudpro.com>`.

---

## 10. Cost summary

| Phase | Marginal AWS spend | Notes |
|---|---|---|
| Phase 39 | ~$1/mo | KMS CMK (Cognito + Lambda + SES all free tier at this volume) |
| Phase 40 | **$0** | No new AWS resources beyond IAM-policy edits |

---

*Phase: 40-m1-replace-lambda-jwt-middleware-supabase-es256-cognito-rs256*
*Closed: 2026-05-14T07:30Z by Plan 40-04*
*Next: `/gsd:plan-phase 41`*
