# Phase 52 → Phase 53 Handoff CHECKPOINT

**Date:** 2026-05-14
**Phase 52 status:** 4/4 plans complete — all 5 requirement IDs closed
**Phase 52 requirements satisfied:** `TenantSignupFlow`, `TenantsTable`, `TenantFeaturesTable`, `MinimalTenantIdBackfill`, `WelcomeEmailViaSES`
**Next milestone owner:** Phase 53 (wildcard subdomain routing — `<tenant>.zietra.com`)
**Source-of-truth commits:**
- `turion-space-demo` HEAD: `192acb6` (smoke script live, deployed Lambda CodeSha256 `70f2a2bf…`)
- `doordash-p2p/.planning` HEAD: `eddabf0c` (52-03-SUMMARY) — final 52-04-SUMMARY adds this CHECKPOINT.md

---

## What Phase 53 inherits from Phase 52

### 1. `public.tenants` table — LIVE on Supabase Postgres

```sql
column              type             constraints / notes
------------------  ---------------  -------------------------------------------------
id                  uuid PK          default gen_random_uuid()
                                     fixed `00000000-0000-0000-0000-000000000001` for Turion
slug                text UNIQUE      3-32 chars, `^[a-z0-9-]+$`, no leading/trailing/double hyphen
name                text NOT NULL    organization display name (1-100 chars)
owner_cognito_sub   text NOT NULL    forward-link to Cognito user (NOT a Supabase sub)
plan                text NOT NULL    CHECK IN ('trial','paid','disabled'); default 'trial'
created_at          timestamptz      default now()
trial_ends_at       timestamptz      default now() + interval '30 days'
```

**Indexes:** `tenants_owner_cognito_sub_idx`, `tenants_plan_idx`, plus implicit PK + UNIQUE(slug).

**Subdomain router input (Phase 53):** `SELECT id, plan, trial_ends_at FROM public.tenants WHERE slug = $1`. Returns 1 row or 0 — if 0, route → 404 page (not the tenant app shell).

### 2. `public.tenant_features` table — LIVE

```sql
column        type             notes
------------  ---------------  --------------------------------------------------
tenant_id     uuid             FK → public.tenants(id) ON DELETE CASCADE
module_code   text             13 allowed values (see list below); CHECK constraint
enabled       boolean NOT NULL default true (Phase 52 sets all 13 to true on signup)
enabled_at    timestamptz      default now()
expires_at    timestamptz      NULL — M4 fills this for paid-add-on expiry
PRIMARY KEY (tenant_id, module_code)
```

**Allowed `module_code` values (13):** `crm`, `sales`, `purchase`, `items`, `plm`, `mes`, `quality`, `lean-erp-pro`, `asc606`, `royalty`, `dropship`, `ai-agents`, `qb-migration`.

**App shell query (Phase 54):** `SELECT module_code FROM public.tenant_features WHERE tenant_id = $1 AND enabled = true` (drives dynamic nav).

### 3. `tenant_id UUID NULL` columns on 105 existing tables

- **105 tables** total: 57 `turion.*` + 48 `turion_satellite.*` (full list in `52-RESEARCH.md` A2/A3 and `mig 025_tenant_id_columns_and_turion_seed.sql`).
- Every existing row has `tenant_id = '00000000-0000-0000-0000-000000000001'` (Turion's UUID) — verified 0 NULLs after 52-01 backfill.
- Column is **NULLABLE** with **no FK** to `public.tenants(id)`. Deferred to **M3 (RLS phase)** which owns SET NOT NULL + FK + RLS policies (CONTEXT.md Rule 6: no premature multi-tenancy hardening).

**Phase 53 caveat — NO RLS, NO row-level filtering:**
Tenants can technically read each other's data via the API. There is **NO RLS**, **NO code-level filtering** in any SQL query, **NO** `WHERE tenant_id = req.tenant_id` injection. Phase 53 is welcome to add tenant-context middleware that stamps `req.tenant_id` from the subdomain header, but query filtering is **OUT of scope until M3**. This is demo-grade only.

### 4. Signup endpoint contract — `POST /api/tenants/signup`

**Endpoint URL (LIVE):**
`https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/tenants/signup`
(ERP Lambda `turion-demo-api`, CodeSha256 `70f2a2bf7c5d05bdc862a1debac9ce09c7e51639c52edc5546148aca6b4e18c9`)

**Public route:** mounted BEFORE the `requireAuth` middleware in `app.ts` (no auth header required).

**Request body:**
```json
{
  "email": "user@example.com",
  "name": "User Full Name",
  "organization_name": "Org Name",
  "slug": "my-workspace"
}
```

**Success response — HTTP 200:**
```json
{
  "ok": true,
  "tenant": {
    "id": "<uuid>",
    "slug": "<slug>",
    "name": "<organization_name>"
  },
  "message": "Check your inbox at <email> to sign in."
}
```

**Error responses:**
- **HTTP 400** — invalid email / name / organization_name / slug regex / slug boundary rules
- **HTTP 405** — wrong HTTP method (only POST is wired) — handled by API Gateway, not the Lambda
- **HTTP 409** — slug taken, slug reserved, OR email already registered in Cognito
- **HTTP 500** — internal failure (Cognito create + SES send). Cognito user rolled back if DB transaction failed.

### 5. Reserved slugs — Phase 53 MUST NOT route these as tenant subdomains

17 reserved values (already enforced at the signup endpoint, must also be enforced at the subdomain router):

```
www, admin, app, api, static, mail, turion, zietra, marquee, asc606,
meet, docs, support, turionspace, campaigns-api, login, signup
```

**Phase 53 rule:** if the extracted subdomain matches one of these (case-insensitive), do NOT treat it as a tenant slug. Either route to a dedicated apex page (e.g., `www`, `app`, `marquee`) or return 404.

### 6. Welcome email — single-click magic-link flow

The signup endpoint does NOT call SES SendEmail directly. Instead it calls `AdminInitiateAuth AuthFlow=CUSTOM_AUTH` which fires the Phase 39 `zietra-cognito-create-auth-challenge` Lambda. That Lambda generates a nonce and SES-sends the magic-link email. The link in the email is `https://turionspace.zietra.com/cognito-auth-callback?token=<nonce>&email=<email>` — Phase 41-01's helper.

**SES sandbox limitation (live constraint):**
SES is still in sandbox mode (200/day, verified recipients only). New non-verified tenant emails will:
- ✅ Successfully create the Cognito user + DB rows + tenant_features
- ❌ NOT receive the welcome email (recipient bounces because not verified)
- ✅ Lambda logs `[create-auth-challenge] magic-link sent to <email>` regardless (proves the flow fired)

Signup endpoint treats SES send as **best-effort** — returns 200 even if the InitiateAuth step fails (welcome email can be re-sent from the login page).

**USER follow-up (still open):** SES production-access reopen — case `176066476400763` was DENIED on previous attempt. Pre-M3 reopen would lift the verified-recipient restriction.

---

## Resources Phase 53 will need

| Resource | Identifier |
|---|---|
| ERP Lambda | `turion-demo-api` (CodeSha256 `70f2a2bf…`) |
| ERP API base | `https://lo254mvukl.execute-api.us-east-1.amazonaws.com` |
| Satellite Lambda | `turion-satellite-api` (CodeSha256 `2984d8e9…`) |
| Satellite API base | `https://rjydekliee.execute-api.us-east-1.amazonaws.com` |
| Cognito user pool | `us-east-1_KQuNS85nP` |
| Cognito app client | `1tuq2a1eedd3hvdsl0kvtu55ih` |
| Cognito groups | `admin`, `customer`, `driver`, `vendor` — new tenants land in `customer` |
| ERP CloudFront distribution | `E37R9PT8IL44L2` (currently aliases `turionspace.zietra.com`) |
| ERP S3 bucket | `turion-demo-static` |
| ERP CF Function | `turion-clean-urls` (LIVE ETag `EN1VRQENFRJN5`, /signup → /signup.html) |
| `zietra.com` apex CF distribution | `E1X82T89JWL8CA` (Phase 53 may consolidate) |
| Route 53 hosted zone | `Z090201115UMJZ8TIAX5G` |
| ACM cert (wildcard `*.zietra.com`) | **DOES NOT EXIST YET — Phase 53 must provision in us-east-1** |
| Supabase Postgres | port 5432 (direct) for migrations; port 6543 (pgbouncer) for Lambda runtime |
| Lambda IAM role | `zietra-api-lambda-role` — has Cognito admin + SES send + secrets read |
| Cognito mutation IAM policy | `zietra-signup-cognito-ses` (inline on the Lambda role) |

---

## Phase 53 scope (refresher from ROADMAP)

Two-plan outline:

**53-01 — Wildcard cert + DNS + CloudFront alternate domain:**
- Provision `*.zietra.com` ACM cert in `us-east-1` (CloudFront requirement)
- Validate via DNS (Route 53 CNAME records auto-issued by ACM)
- Update CloudFront distribution `E37R9PT8IL44L2` to accept `*.zietra.com` as alternate domain (in addition to current `turionspace.zietra.com`) OR provision a new distribution dedicated to tenant subdomains
- Update Route 53 zone `Z090201115UMJZ8TIAX5G` with a wildcard A-alias `*.zietra.com → <distribution>.cloudfront.net`
- Smoke: `curl -sI https://<random-slug>.zietra.com/signup` → 200 (currently 404 / cert error)

**53-02 — Tenant-context middleware:**
- CloudFront Function (or Lambda@Edge): read `Host` header → extract subdomain → forward as `X-Tenant-Slug` header to origin. Drop reserved slugs (`www`, `admin`, ...). Case-fold to lowercase.
- Backend middleware in `turion-demo-api/src/middleware/tenant.ts` (NEW): read `X-Tenant-Slug` on every authenticated request → `SELECT id, plan, trial_ends_at FROM public.tenants WHERE slug = $1` → stamp `req.tenant = {id, slug, plan, trial_ends_at}`. Cache in-memory with 60s TTL (low cardinality).
- New endpoint `GET /api/tenants/current` returns `{ tenant_id, slug, name, plan, trial_ends_at, modules: [...] }` for app shell init (used by Phase 54).
- Smoke: signup via `signup.html`, then sign in via magic-link, verify `req.tenant.id` matches new tenant's UUID, verify `GET /api/tenants/current` returns the right shape.

---

## Must-not-break checklist (Phase 53)

- ✅ `turionspace.zietra.com` keeps working as Turion's tenant view (slug=`turion`). If consolidated under wildcard routing, ensure the new logic resolves `turionspace` → Turion's UUID. Today's content lives at `E37R9PT8IL44L2` (S3 `turion-demo-static`).
- ✅ 4 Cognito trigger Lambdas (`zietra-cognito-pre-signup`, `-define-auth-challenge`, `-create-auth-challenge`, `-verify-auth-challenge-response`) MUST NOT be touched. Phase 39 → 41 stack is stable.
- ✅ Phase 41 Cognito-only middleware (`requireAuth` on all `/api/*` except `/api/health`, `/api/notify/visit`, `/api/tenants/signup`) MUST stay intact.
- ✅ `POST /api/tenants/signup` MUST remain public (no auth header). Smoke verifies empty body → 400 (not 401).
- ✅ Existing 105 `turion.*` + `turion_satellite.*` tables — Phase 53 must NOT add `tenant_id` filtering to any query. That's M3's job.

---

## Files Phase 53 will probably touch

| File | Purpose |
|---|---|
| `turion-space-demo/cf-function-source/turion-clean-urls.js` | Add subdomain extraction + `X-Tenant-Slug` header injection (or split into a new CF function dedicated to tenant routing) |
| `turion-space-demo/backend/src/middleware/tenant.ts` | NEW — tenant context middleware |
| `turion-space-demo/backend/src/app.ts` | Mount tenant middleware after `requireAuth` |
| `turion-space-demo/backend/src/routes/tenants.ts` | Add `GET /api/tenants/current` endpoint |
| `turion-space-demo/backend/build-and-push.sh` | No change — same deploy path |
| `turion-space-demo/deploy-frontend.sh` | No change — S3 sync + invalidation pattern unchanged |

---

## Phase 52 deferred items (Phase 53+ owns or M3+ owns)

- Rate limiting on `POST /api/tenants/signup` (deferred to M8 — compliance phase)
- `noreply@zietra.com` as a separate SES identity (currently relying on `zietra.com` domain verification — works fine but is implicit)
- SES production-access reopen — case `176066476400763` was DENIED; USER follow-up
- Trial-expiry enforcement on `trial_ends_at` (deferred to M4 — Stripe phase)
- Code-level tenant filtering on queries (deferred to M3 — RLS phase)
- `tenant_id NOT NULL` + FK constraint to `public.tenants(id)` (deferred to M3)
- Tenant deletion / GDPR right-to-erasure (deferred to M8)
- Multi-user-per-tenant (currently 1 owner per tenant; multi-user deferred to M3)
- `deploy-frontend.sh` `--include "*.js"` overrides `--exclude "backend/*"` (pre-existing bug uploads `backend/node_modules/@aws-sdk/**` to S3 — logged in 52-03-SUMMARY)

---

## Phase 52 closure evidence

| Requirement ID | Evidence | Source |
|---|---|---|
| `TenantsTable` | `public.tenants` table live, 1 row (Turion), schema matches CONTEXT spec | mig `024_tenants_and_features.sql` applied; 52-01-SUMMARY |
| `TenantFeaturesTable` | `public.tenant_features` table live, 13 rows for Turion, composite PK enforced | mig `024_tenants_and_features.sql` applied; 52-01-SUMMARY |
| `MinimalTenantIdBackfill` | `tenant_id UUID NULL` column on all 105 turion+turion_satellite tables, 0 NULLs | mig `025_tenant_id_columns_and_turion_seed.sql` applied; 52-01-SUMMARY |
| `TenantSignupFlow` | `POST /api/tenants/signup` LIVE, smoke test passes 9/9 assertions including 5 side effects | 52-02-SUMMARY + 52-04-SUMMARY (this plan) |
| `WelcomeEmailViaSES` | Side effect 4 of smoke shows `[create-auth-challenge] magic-link sent to <email>` in CloudWatch | 52-04-SUMMARY (this plan) — runs 1 + 2 both PASS |

---

*Written 2026-05-14 by the autonomous Phase 52 Plan 04 executor.*
*Smoke evidence: `/tmp/52-04-smoke-run1.log` + `/tmp/52-04-smoke-run2.log` (both PASS, all 5 side effects + 3 negatives + regression).*
