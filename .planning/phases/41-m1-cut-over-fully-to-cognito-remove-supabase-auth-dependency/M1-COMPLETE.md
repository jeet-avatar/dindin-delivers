# M1 COMPLETE — Cognito Auth Foundation (Phases 39 + 40 + 41)

**Closed:** 2026-05-14T08:41:03Z
**Scope:** Zietra Platform Milestone M1 — Auth foundation on AWS Cognito.
**Phases:** 39 (Cognito provisioning + user migration) → 40 (dual-issuer Lambda middleware) → 41 (Cognito-only cutover).
**Outcome:** Supabase Auth fully retired across the full stack; Supabase Postgres preserved as the data tier until M2.

---

## Summary

- **Phase 39** — Stood up AWS Cognito user pool `us-east-1_KQuNS85nP`, app client `1tuq2a1eedd3hvdsl0kvtu55ih`, KMS CMK `fd1706a7-f70a-4464-bfa7-991f5c52537a`, 4 Cognito-trigger Lambdas, SES + magic-link CUSTOM_AUTH flow, 4 admin Groups, migrated 4 Supabase Auth users with forward-link preserved on `custom:supabase_sub`.
- **Phase 40** — Extended both API Lambdas (`turion-demo-api`, `turion-satellite-api`) to verify Cognito RS256 IdTokens alongside Supabase ES256 (dual-issuer). Deployed byte-identical `cognito-auth.js` helper to both frontends.
- **Phase 41 Wave 1** — Migrated 96 HTML pages (81 ERP + 12 satellite + new `cognito-auth-callback.html`), rewrote 2 login pages, rewired 2 API wrappers, stripped Supabase fields from config generators, added CloudFront `/cognito-auth-callback` clean-URL rewrite.
- **Phase 41 Wave 2** — Collapsed both Lambdas to Cognito-only. Stripped Supabase ES256 verify branch from `requireAuth`; made Cognito JWKS load mandatory (`throw` on missing `COGNITO_CONFIG_SECRET_ARN`); migrated 36 unit-test files in `turion-satellite` from ES256 to a Cognito RS256 mint helper.
- **Phase 41 Wave 3 (this plan)** — Removed `SUPABASE_JWT_SECRET_ARN` env var from both Lambdas; deleted the Secrets Manager resource policy granting `zietra-api-lambda-role` read access to the supabase-jwt-secret; scheduled `turion-satellite/production/supabase-jwt-secret-sWnNlr` for deletion (7-day recovery window); deleted 5 dead-code files (`erp-auth.js`, `satellite/satellite-auth.js`, `erp-auth-callback.html`, `migrate-supabase-users-to-cognito.ts`, `README-cognito-migration.md`); dropped `@aws-sdk/client-cognito-identity-provider` npm dep; redeployed frontend with `--delete`; ran final cross-cutting smoke; wrote this doc.

User-facing magic-link UX is preserved exactly — same email-prompt landing page, same magic-link click, same dashboard arrival. The change is entirely operational (issuer + JWKS source + frontend helper).

---

## Requirements Closed (10 total)

| Phase | Requirement | Evidence |
|---|---|---|
| 39-01 | `CognitoUserPool` | User pool `us-east-1_KQuNS85nP`, app client `1tuq2a1eedd3hvdsl0kvtu55ih`, 4 Groups (admin, customer, driver, vendor), KMS CMK `arn:aws:kms:us-east-1:134607809447:key/fd1706a7-f70a-4464-bfa7-991f5c52537a`, secret `zietra/cognito-config` carrying pool/client/kms/region. SUMMARY: `.planning/phases/39-m1-.../39-01-SUMMARY.md`. |
| 39-02 | `CognitoSesIntegration` | 4 Cognito-trigger Lambdas live (`zietra-cognito-custom-email-sender`, `…-define-auth-challenge`, `…-create-auth-challenge`, `…-verify-auth-challenge`); SES domain `zietra.com` verified, DKIM SUCCESS, MAIL FROM `mail.zietra.com` SUCCESS; user pool LambdaConfig has all 5 slots populated. SUMMARY: `.planning/phases/39-m1-.../39-02-SUMMARY.md`. |
| 39-03 | `UserMigrationFromSupabase` | 4 Supabase `auth.users` rows migrated to Cognito with `email_verified=true`, `custom:role=admin`, `custom:supabase_sub=<original UUID>`, admin Group membership, CONFIRMED, Enabled. Idempotent script `backend/scripts/migrate-supabase-users-to-cognito.ts` (deleted in 41-04 — Rule 5). SUMMARY: `.planning/phases/39-m1-.../39-03-SUMMARY.md`. |
| 39-04 | `CognitoAuthCheckpoint` | End-to-end `admin-initiate-auth CUSTOM_AUTH` → `admin-respond-to-auth-challenge` round-trip returns IdToken with all 7 expected claims. CloudWatch: `[create-auth-challenge] nonce=…` + `magic-link sent`. SUMMARY: `.planning/phases/39-m1-.../39-04-SUMMARY.md`. |
| 40 | `DualIssuerJwtMiddleware` | Both Lambdas (`turion-demo-api`, `turion-satellite-api`) pre-decode JWT, branch on `iss`, verify Cognito RS256 with `audience=app_client_id`+`token_use==='id'` OR Supabase ES256/HS256 (Phase 38 path). Wave 3 of M1 (41-02 + 41-03) deleted the Supabase branch — middleware is now Cognito-only RS256, but the dual-issuer machinery was the load-bearing M1 invariant. SUMMARIES: `.planning/phases/40-m1-.../40-{01,02}-SUMMARY.md`. |
| 40 | `CognitoJwksLoader` | `loadSecrets()` on both Lambdas fetches `zietra/cognito-config`, derives Cognito issuer URL, GETs `/.well-known/jwks.json`, converts each JWK to PEM, caches by `kid`. CloudWatch logs `[secrets] Cognito JWKS loaded: 2 keys, issuer=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KQuNS85nP` on every cold start (verified post-Wave-3 cleanup). |
| 40 | `CognitoFrontendHelper` | `cognito-auth.js` (168 LOC, vanilla JS, 6.9KB) deployed byte-identical to `/cognito-auth.js` (ERP) and `/satellite/cognito-auth.js`. Exports `window.cognitoAuth` with `getSession`/`requireSession`/`signInWithMagicLink`/`respondToChallenge`/`refreshSession`/`signOut`/`getCurrentUser`. Distinct localStorage keys per app (`zietra-cognito-{erp,satellite}`). SUMMARY: `.planning/phases/40-m1-.../40-03-SUMMARY.md`. |
| 41 | `CognitoOnlyFrontend` | 96 HTML pages migrated to `cognitoAuth.*` (81 ERP + 12 satellite + 2 login rewrites + cognito-auth-callback.html). Zero grep matches for `erpAuth.|satelliteAuth.|@supabase/supabase-js` across `*.html` and `satellite/*.html`. Config generators emit only Cognito fields. SUMMARY: `.planning/phases/41-m1-.../41-01-SUMMARY.md`. |
| 41 | `CognitoOnlyBackend` | Both Lambdas redeployed (CodeSha256 `turion-demo-api` `d6545f5a…` → `e48f5332…`, `turion-satellite-api` `46beed47…` → `10b9ecb4…`) with Supabase branch deleted from `auth.ts` + Supabase JWKS load deleted from `secrets.ts`. Both throw on missing `COGNITO_CONFIG_SECRET_ARN`. Final smoke 10/10 PASS (valid Cognito IdToken 200, forged Cognito mutated-sig 401, junk bearer 401, health 200, unauth 401 on both Lambdas). SUMMARIES: `.planning/phases/41-m1-.../41-{02,03}-SUMMARY.md`. |
| 41 | `SupabaseAuthDeprecation` | `SUPABASE_JWT_SECRET_ARN` env var removed from both Lambdas (verified `--output text` returns `None`). Secret `turion-satellite/production/supabase-jwt-secret-sWnNlr` scheduled for deletion 2026-05-21 (`DeletedDate=2026-05-14T08:36:33Z`, 7-day recovery window). Secret resource policy granting `zietra-api-lambda-role` read access deleted. 5 dead-code files removed. `@aws-sdk/client-cognito-identity-provider` npm dep dropped. SUMMARY: `.planning/phases/41-m1-.../41-04-SUMMARY.md`. |

---

## AWS Resources at M1 Close

### Active

| Resource | Identifier |
|---|---|
| Cognito User Pool | `us-east-1_KQuNS85nP` (zietra-platform-users) |
| Cognito App Client | `1tuq2a1eedd3hvdsl0kvtu55ih` (zietra-platform-web) |
| Cognito Groups | `admin`, `customer`, `driver`, `vendor` |
| KMS CMK (Cognito custom-email-sender) | `arn:aws:kms:us-east-1:134607809447:key/fd1706a7-f70a-4464-bfa7-991f5c52537a` (alias `alias/zietra-cognito-email-sender`) |
| Trigger Lambda — custom-email-sender | `zietra-cognito-custom-email-sender` |
| Trigger Lambda — define-auth-challenge | `zietra-cognito-define-auth-challenge` |
| Trigger Lambda — create-auth-challenge | `zietra-cognito-create-auth-challenge` |
| Trigger Lambda — verify-auth-challenge | `zietra-cognito-verify-auth-challenge` |
| API Lambda — ERP | `turion-demo-api` (CodeSha256 `e48f5332…`) |
| API Lambda — Satellite | `turion-satellite-api` (CodeSha256 `10b9ecb4…`) |
| Secret — Cognito config | `zietra/cognito-config` (pool ID + client ID + KMS ARN + region) |
| Secret — SES SMTP credentials | `zietra/ses-smtp-credentials-RsRKSm` (legacy, still used elsewhere) |
| IAM role — API Lambdas | `zietra-api-lambda-role` (inline policy `zietra-cognito-config-secret-read` grants read on `zietra/cognito-config-*`) |
| IAM role — Cognito trigger Lambdas | `zietra-cognito-email-sender-role` (KMS Decrypt + SES SendEmail + CloudWatch logs) |
| SES domain | `zietra.com` (DKIM verified, MAIL FROM `mail.zietra.com`, DMARC `p=none`) |

### Removed in Phase 41

| Resource | Status |
|---|---|
| Env var `SUPABASE_JWT_SECRET_ARN` on `turion-demo-api` | Removed (this plan) |
| Env var `SUPABASE_JWT_SECRET_ARN` on `turion-satellite-api` | Removed (this plan) |
| Secret resource policy granting `zietra-api-lambda-role` read on supabase-jwt-secret | Deleted (this plan) |
| Secret `turion-satellite/production/supabase-jwt-secret-sWnNlr` | Scheduled for deletion 2026-05-21 (7-day window) |

### Files Deleted in Phase 41 (`turion-space-demo` repo)

| File | LOC at deletion | Reason |
|---|---:|---|
| `erp-auth.js` | 74 (2506 bytes) | Phase-38 helper, replaced by `cognito-auth.js` (41-01) |
| `satellite/satellite-auth.js` | (2283 bytes) | Phase-38 helper, replaced by `cognito-auth.js` (41-01) |
| `erp-auth-callback.html` | (2844 bytes) | Legacy Supabase magic-link callback, replaced by `cognito-auth-callback.html` (41-01) |
| `backend/scripts/migrate-supabase-users-to-cognito.ts` | 186 (7274 bytes) | Phase-39 one-shot done, Rule 5 |
| `backend/scripts/README-cognito-migration.md` | 86 (4267 bytes) | Operator README for deleted script |
| `@aws-sdk/client-cognito-identity-provider` npm dep | n/a | Was used only by deleted migration script |

---

## Migrated Users (forward-link preserved)

| Email | Cognito Sub | Original Supabase Sub |
|---|---|---|
| `gteshnair@gmail.com` | `84b864c8-a091-70cc-9e9f-3a7aeac26443` | `b1ddd626-2d1e-4bba-8f75-8e74c742ca7c` |
| `jeetnair.in@gmail.com` | `d42844f8-e031-7075-3a97-ecbfcf8e0033` | `76d9f93b-b1fb-467a-870a-5b8fa3a66c2d` |
| `demo@zietra.com` | `04d83448-5071-70cd-f986-9987b8a4136d` | `2919d215-e3c2-4dcf-b14f-00f020b20665` |
| `jm@techcloudpro.com` | `74989438-80d1-7095-47b2-27cf67f2e686` | `21235658-909d-48c0-97c3-24edc5a822cd` |

All 4 users: `Status=CONFIRMED`, `Enabled=true`, `email_verified=true`, `custom:role=admin`, member of `admin` Group. `custom:supabase_sub` carries the original Supabase UUID for any future cross-reference (M2 will use this when migrating data referencing the legacy `auth.users` table).

---

## Costs

- M1 marginal AWS spend: **~$1/mo ongoing** (KMS CMK only — Cognito free tier 50K MAU, Lambda + SES well within free tier at 4 users).
- Pre-M1 cost on Supabase Auth tier: $0 (Supabase free tier).
- Net change: +$1/mo, with the value of AWS-native identity (no third-party JWT dependency, IAM-controlled blast radius, CloudWatch observability, RS256 vs ES256 = standard library support everywhere).

Future M2 (RDS Postgres) will add the database tier cost (db.t4g.micro multi-AZ ≈ $25/mo).

---

## Open Follow-ups (carried into M2)

- **Supabase `auth.users` rows preserved as read-only archive.** M2 will delete after RDS migration confirms no data path depends on them.
- **Supabase Postgres connection (`DATABASE_URL` / `DATABASE_URL_ARN`) stays.** M2 (Phases 42-43) migrates the `turion.*` schema to RDS Postgres in the same VPC as the API Lambdas, completing the AWS-native data tier.
- **SES production-access reopen still pending.** Current sandbox (200/day, verified recipients only) suffices for current user count. Reopen pre-tenant-onboarding (M3).
- **Lazy Cognito JWKS re-fetch on `kid` cache miss** — deferred. Build only if observed in CloudWatch metrics (zero `kid` misses since 41-02 deployment).
- **Multi-tenancy `tenant_id` column** — M3 scope. M1 left tenant model intentionally unimplemented (Turion is the implicit tenant_id=1).
- **`scripts/smoke-phase-40.sh` nonce-scrape race** — known brittleness (caught in 41-03 + 41-04 final smoke). Fix in a future hygiene phase: snapshot `START_MS` BEFORE `admin-initiate-auth` + bump sleep to 15s.

---

## Next Milestone (M2 — Postgres migration)

Phase 42-43 will migrate the `turion.*` schema from Supabase Postgres to RDS Postgres in the same VPC as the API Lambdas. The migration plan should preserve:

- All `turion.*` tables (parts, BOM, work orders, lifecycle, etc.) byte-identical
- All `custom:supabase_sub` forward-links in Cognito (used to remap legacy `auth.users` foreign keys during data migration)
- Both API Lambda env vars switched from `DATABASE_URL_ARN` pointing at Supabase Postgres to pointing at RDS Postgres
- Same VPC + security group for the Lambdas + RDS (no public endpoint)

After M2 the Supabase project can be fully retired.

---

*Closed 2026-05-14 by the autonomous Phase 41-04 executor. Identity `jeet-avatar <jm@techcloudpro.com>`. Commits — `turion-space-demo`: `2bb077d`; `turion-satellite`: `79fc014`; `doordash-p2p` (planning): pending.*
