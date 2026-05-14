# Phase 53 → Phase 54 Handoff CHECKPOINT

**Date:** 2026-05-14
**Phase 53 status:** 4/4 plans complete — all 5 requirement IDs closed
**Phase 53 requirements satisfied:** `WildcardACMCert`, `CloudFrontWildcardAlias`, `TenantSubdomainExtractor`, `BackendTenantContextMiddleware`, `TenantConfigEndpoint`
**Next milestone owner:** Phase 54 (M6 — modular UI shell + add-on catalog)
**Source-of-truth commits:**
- `turion-space-demo` HEAD: `31b9d5d` (smoke script live; deployed Lambda CodeSha256 `efb8d369…079695`)
- `turion-satellite`   HEAD: `b4afa6f` (tenantContext middleware mirror; deployed Lambda CodeSha256 `19c656b4…f7eee`)
- `doordash-p2p/.planning` HEAD: pending docs(53-04) commit (this file + 53-04-SUMMARY + STATE + ROADMAP)

**Smoke evidence (both runs PASS):**
- `/tmp/53-04-smoke-run1.log` — tenant `smoke53-5735` (`3f0d2a49-…`), 9 assertions + 3 regressions all PASS, cleanup OK
- `/tmp/53-04-smoke-run2.log` — tenant `smoke53-10917` (`efb6cb38-…`), idempotency proof — different random slug, same 9+3 PASS, cleanup OK
- Post-smoke orphan check: 0 `smoke53-%` tenant rows, 0 `phase53-smoke-%` Cognito users

---

## What Phase 54 inherits from Phase 53

### 1. Wildcard subdomain routing — LIVE
Every `<slug>.zietra.com` (where `<slug>` matches a row in `public.tenants` and is NOT in the 17-entry reserved list) returns a working HTTPS page from S3 via CloudFront E37R9PT8IL44L2.

| Layer | Resource | Identifier |
|---|---|---|
| ACM cert (us-east-1) | wildcard cert | `arn:aws:acm:us-east-1:134607809447:certificate/4a29032a-1e82-4393-824c-5b2a6fb70207` (SANs: `*.zietra.com`, `zietra.com`; Status ISSUED; NotAfter 2026-11-27) |
| Route 53 zone | `zietra.com` | `Z090201115UMJZ8TIAX5G` |
| Wildcard DNS | `*.zietra.com` ALIAS A+AAAA | → `d2bl7vqyf3n9m5.cloudfront.net` |
| CloudFront distribution | `E37R9PT8IL44L2` Aliases | `[turionspace.zietra.com, *.zietra.com]` (apex `zietra.com` deliberately NOT here — owned by marketing distro E1X82T89JWL8CA) |
| CloudFront Function | `turion-clean-urls` v53-02 LIVE | host → `x-tenant-slug` prologue + reserved-slug inline 404 + `turionspace → turion` alias; all Phase 36/37/41/52 URL rewrites preserved byte-for-byte |
| Provisioning script | `turion-space-demo/scripts/provision-wildcard-cert.sh` | Idempotent — re-run safely |
| Distribution-update script | `turion-space-demo/scripts/update-cloudfront-distribution.sh` | Idempotent — re-run safely |
| CF-Function update script | `turion-space-demo/scripts/update-cf-function.sh` | Idempotent — re-run safely |

### 2. Tenant resolution — BOTH backends
| Layer | Resource | Identifier |
|---|---|---|
| ERP Lambda | `turion-demo-api` | CodeSha256 `efb8d369…079695`, LastUpdateStatus Successful |
| Satellite Lambda | `turion-satellite-api` | CodeSha256 `19c656b4…f7eee`, LastUpdateStatus Successful |
| Tenant middleware | `backend/src/middleware/tenant.ts` (BOTH repos, mirror — diff = 2 lines comment pointer) | 60s positive cache + 5s negative cache per warm container; reads `x-tenant-slug` header (Express lowercases by default); 400 missing / 404 unknown / 500 DB-error with hardened catch |
| Tenants router | `backend/src/routes/tenants.ts` (ERP has POST /signup + GET /current; Sat has GET /current only) | `GET /api/tenants/current` is PUBLIC — mounted via `app.use('/api/tenants', tenants)` BEFORE any per-route requireAuth |

### 3. Public tenant-config endpoint — BOTH backends
`GET /api/tenants/current` returns:
```json
{
  "id": "<uuid>",
  "slug": "<slug>",
  "name": "<organization_name>",
  "plan": "trial|paid|disabled",
  "trial_ends_at": "<ISO8601 or null>",
  "features": ["crm","sales","purchase", ...]
}
```
**Public (no auth)** — tenant identifier comes from the `X-Tenant-Slug` request header, NOT from a JWT. Both Lambdas return byte-identical JSON for the same slug (same database, same query, same handler shape).

Sample Turion payload (verified live):
```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "slug": "turion",
  "name": "Turion Space",
  "plan": "paid",
  "trial_ends_at": "2026-06-13T17:56:28.364Z",
  "features": ["ai-agents","asc606","crm","dropship","items","lean-erp-pro","mes","plm","purchase","qb-migration","quality","royalty","sales"]
}
```

### 4. Frontend X-Tenant-Slug injection — LIVE
Both `erp-api.js` + `satellite/satellite-api.js` compute the slug from `window.location.hostname` at IIFE load (mirrors the CF Function host-extraction logic — defense in depth):
- `turionspace.zietra.com` → `turion` (legacy alias)
- `<anything>.zietra.com` → strip `.zietra.com` suffix
- localhost / non-zietra → `turion` (dev default)

`X-Tenant-Slug: <slug>` is sent on every `/api/*` fetch from both wrappers. Verified live on `turionspace.zietra.com/erp-api.js` and `/satellite/satellite-api.js`.

### 5. Reserved slugs — STILL the canonical list (mirrors Phase 52 contract)
17 values: `www, admin, app, api, static, mail, turion, zietra, marquee, asc606, meet, docs, support, turionspace, campaigns-api, login, signup`.

The CloudFront Function returns inline 404 HTML with a CTA to `https://zietra.com/signup` for any reserved slug that hits THIS distribution. Note `turion` is special-cased — the `turionspace → turion` alias map happens BEFORE the reserved check, so the legacy host continues to resolve to the Turion tenant.

Other-tenant subdomains (`marquee.zietra.com`, `asc606.zietra.com`, `meet.zietra.com`, etc.) stay on their own distributions via more-specific Route 53 alias precedence — the wildcard does NOT shadow them. Verified in smoke A8+A9.

### 6. Caveats / limitations

- **No RLS yet** — `tenantContext` stamps `req.tenant`, but NO SQL query in either Lambda filters by `req.tenant.id`. Cross-tenant data is still readable by any authenticated user. **M3 owns isolation.**
- **No CF cache key on Host** — `Managed-CachingOptimized` ignores headers. Today's static HTML is identical across tenants, which is fine for M5/M6 (read-only shell). Phase 54 must switch to a custom cache policy if it ships per-tenant HTML.
- **In-memory cache lag** — fresh signup is invisible to warm Lambda containers for up to 60s (positive cache TTL). Smoke waits 90s to cover this. Phase 54 should expect this lag too.
- **Apex zietra.com stays on marketing distro** — Route 53 A-record still points to `E1X82T89JWL8CA` (marketing). The apex SAN on the wildcard cert is future-proofing only; nothing in the Turion distro serves the apex.
- **SES still sandbox** — magic-link emails will bounce for non-verified recipients. Case `176066476400763` (production-access reopen) is open with AWS. Not blocking M5/M6.

---

## Resources Phase 54 will use

| Resource | Identifier |
|---|---|
| ERP API base | `https://lo254mvukl.execute-api.us-east-1.amazonaws.com` |
| Sat API base | `https://rjydekliee.execute-api.us-east-1.amazonaws.com` |
| GET /api/tenants/current | both APIs above — same JSON shape |
| ERP S3 bucket | `turion-demo-static` |
| CF distribution | `E37R9PT8IL44L2` |
| CF Function | `turion-clean-urls` (LIVE, 7645 B, 2595 B headroom under 10 KB cap) |
| Cognito user pool | `us-east-1_KQuNS85nP` |
| Cognito app client | `1tuq2a1eedd3hvdsl0kvtu55ih` |
| Public.tenants table | live — 3 tenants today (turion + brandmonkz + dollor + future signups append rows) |
| Public.tenant_features table | 13 rows per tenant, all 13 enabled on trial signup |
| Wildcard cert ARN | `arn:aws:acm:us-east-1:134607809447:certificate/4a29032a-…` |
| Smoke script (re-runnable) | `turion-space-demo/scripts/smoke-phase-53.sh` |
| Lambda IAM role | `zietra-api-lambda-role` (shared by both Lambdas) |

---

## Phase 54 scope (refresher from ROADMAP)

A single app shell at `<tenant>.zietra.com` with dynamic top-nav rendered from the tenant's `tenant_features` rows. Each module shows as a nav tile if `enabled=true`, greyed-out "+ Add to plan" CTA otherwise. `/catalog` page lists every available add-on (13 module codes) with "Try it free" / "Subscribe" stub CTAs. The shell wraps existing satellite + ERP pages (do NOT rewrite pages — just inject a shell wrapper at top + bottom slots).

**Phase 54 plan outline (suggested — for `/gsd:plan-phase 54` to refine):**

- **54-01** — app-shell HTML/CSS framework (header w/ tenant logo+name, dynamic top-nav, footer) + shell-bootstrap JS (calls `GET /api/tenants/current` at boot, renders nav from `features[]`)
- **54-02** — `/catalog` page (lists 13 module_codes, shows enabled state, "Add to plan" CTAs stub to placeholder)
- **54-03** — Migration script: wrap existing ~96 HTML pages (81 ERP + ~12 satellite + auth/signup) with the shell (top + bottom slots; preserve existing page content byte-identical). Skip `signup.html` (M5 contract: standalone) and `cognito-auth-callback.html`.
- **54-04** — End-to-end smoke (≥8 assertions + 3 regressions; tenant subdomain renders shell + nav matches features + catalog reachable + auth gating preserved) + Phase 55 (M7 marketing) CHECKPOINT.md handoff

---

## Must-not-break checklist (Phase 54)

- ✅ Wildcard `<tenant>.zietra.com` continues to serve 200 (TLS + DNS + CF still wired)
- ✅ `turionspace.zietra.com` → `turion` legacy alias still works
- ✅ Other-tenant aliases (`marquee.zietra.com`, `asc606.zietra.com`, `meet.zietra.com`, `app/api/www/campaigns-api`) NOT shadowed
- ✅ `GET /api/tenants/current` returns the same JSON shape — Phase 54 consumes it
- ✅ Phase 41 Cognito-only auth UNCHANGED. Phase 54 may gate the shell on session, but CANNOT remove/change `requireAuth`.
- ✅ Phase 52 `POST /api/tenants/signup` still public — `signup.html` continues to work standalone (NOT wrapped in shell)
- ✅ Cognito user pool + IAM grants + Lambda env vars NOT modified
- ✅ Wildcard ACM cert + CF Function source NOT replaced (extended only if needed; CF size has 2595 B headroom)
- ✅ The 4 `zietra-cognito-*` trigger Lambdas NOT touched (Phase 39 stack remains stable)

---

## Files Phase 54 will probably touch

| File | Purpose |
|---|---|
| `turion-space-demo/app-shell.html` | NEW — root template for all wrapped pages |
| `turion-space-demo/shell-bootstrap.js` | NEW — calls `GET /api/tenants/current` at boot, renders dynamic nav |
| `turion-space-demo/app-shell.css` | NEW — shell chrome styling (header/nav/footer) |
| `turion-space-demo/catalog.html` | NEW — add-on catalog page (13 module codes) |
| `turion-space-demo/scripts/wrap-pages-with-shell.mjs` | NEW — migration script for ~96 existing HTML pages |
| `turion-space-demo/cf-function-source/turion-clean-urls.js` | Maybe extend with `/catalog` rewrite (current Function has 2595 B headroom) |
| `turion-space-demo/signup.html` | NOT touched — standalone (M5 contract) |
| `turion-space-demo/cognito-auth-callback.html` | NOT touched — standalone (Phase 41 contract) |
| `turion-space-demo/deploy-frontend.sh` | NOT touched — S3 sync + invalidation pattern unchanged |

---

## Phase 53 deferred items (carried to M6/M7/M8)

- **ACM cert NotAfter (2026-11-27)** — auto-renews via permanent Route 53 validation CNAME from 53-01. CloudWatch DaysToExpiry alarm deferred to M8 (compliance phase).
- **Old single-host cert `45e1fb37-…`** (covered only `turionspace.zietra.com`) — not deleted; expires 2026-12-19 anyway. M8 cleanup.
- **`/api/*` flowing through CloudFront** — out of scope. APIs stay direct browser→APIGW.
- **CF Function apex-redirect branch** — explicitly NOT shipped (CONTEXT.md Open Q 1 + global rule 6: apex Route 53 points to marketing distro, so any branch here = dead code).
- **In-memory cache invalidation on tenant updates** — 60s TTL accepted; M8 can add SNS-based bust.
- **SES production-access reopen** — case `176066476400763` (denied previously). USER follow-up; non-blocking for M5/M6.
- **Resend API key rotation** (security follow-up from earlier phases) — non-blocking.
- **M2 RDS migration** (Phases 42-43) — Supabase Postgres still in use; M2 owns the migration.
- **M3 RLS for real data isolation** (Phases 44-48) — tenant_id columns exist; SET NOT NULL + FK + RLS policies deferred to M3.
- **M4 Stripe wiring** (Phases 49-51) — `tenant_features` rows have `expires_at` NULL; M4 fills them.

---

## Phase 53 closure evidence

| Requirement ID | Evidence | Source |
|---|---|---|
| `WildcardACMCert` | ACM cert `arn:…:certificate/4a29032a-1e82-4393-824c-5b2a6fb70207` in us-east-1, SANs `[*.zietra.com, zietra.com]`, Status ISSUED, NotAfter 2026-11-27, Route 53 wildcard A+AAAA aliases live | 53-01-SUMMARY |
| `CloudFrontWildcardAlias` | E37R9PT8IL44L2 Aliases = `[turionspace.zietra.com, *.zietra.com]`, ViewerCertificate=`4a29032a-…`, Status Deployed | 53-02-SUMMARY |
| `TenantSubdomainExtractor` | LIVE `turion-clean-urls` source contains host→`x-tenant-slug` prologue + 17-entry RESERVED filter + `turionspace→turion` alias. Smoke A6 proves bogus slug → 404. Phase 52/41/37/36 URL rewrites preserved byte-for-byte. | 53-02-SUMMARY + 53-04 run1+run2 |
| `BackendTenantContextMiddleware` | Both Lambdas mount `tenantContext` per route; smoke A4+A5 prove correct slug→tenant resolution on BOTH endpoints (byte-identical UUID returned); smoke A6 proves 404 on unknown slug on both; middleware files are byte-mirrors (diff = 2 lines comment pointer only) | 53-03-SUMMARY + 53-04 run1+run2 |
| `TenantConfigEndpoint` | Both Lambdas expose `GET /api/tenants/current` returning `{id, slug, name, plan, trial_ends_at, features[]}` — verified for both Turion (`paid`, 13 features) and fresh smoke53-NNNNN signup (`trial`, 13 features). Public route (no auth). | 53-03-SUMMARY + 53-04 run1+run2 |

---

## Smoke matrix (Run 1 + Run 2 — both PASS)

| Check | Run 1 (`smoke53-5735`) | Run 2 (`smoke53-10917`) | Notes |
|---|---|---|---|
| A1 signup | 200 + tenant.id `3f0d2a49-…` | 200 + tenant.id `efb6cb38-…` | Fresh random slugs each run |
| A2 TLS handshake | 200 (ssl_verify=20) | 200 (ssl_verify=20) | Wildcard cert covers both |
| A3 / serves HTML | 200 + 28921 B | 200 + 28921 B | Same S3 origin |
| A4 ERP `/api/tenants/current` | slug match, plan=trial, 13 features | slug match, plan=trial, 13 features | tenantContext + DB lookup OK |
| A5 Sat `/api/tenants/current` | Same UUID as ERP | Same UUID as ERP | Mirror discipline holds at runtime |
| A6 bogus slug | ERP=404, Sat=404 | ERP=404, Sat=404 | Negative cache works |
| A7 turionspace legacy | 200 + turion lookup OK | 200 + turion lookup OK | Alias intact |
| A8 marquee not shadowed | 200, 357755 B (marquee/anni/larc keywords) | 200, 357755 B (same) | More-specific Route 53 wins |
| A9 asc606 not shadowed | 307 (pre-existing redirect) | 307 (pre-existing redirect) | ASC606 Next.js default-redirect |
| R1 signup `{}` | 400 "Valid email required" | 400 "Valid email required" | Phase 52 contract |
| R2 unauth `/api/data/all` | 401 | 401 | Phase 41 requireAuth |
| R3 `/api/health` | ERP=200, Sat=200 | ERP=200, Sat=200 | Phase 38 baseline |
| Cleanup Cognito | Deleted | Deleted | Anchor guard never tripped |
| Cleanup tenants row | Deleted (CASCADE) | Deleted (CASCADE) | 0 orphan `smoke53-%` rows post-run |

Post-smoke DB state: 0 `smoke53-%` tenants. Post-smoke Cognito state: 0 `phase53-smoke-%` users. Anchor resources (`jm@techcloudpro.com`, `turion` tenant) untouched across both runs.

---

*Written 2026-05-14 by the autonomous Phase 53 Plan 04 executor.*
*Smoke transcripts: `/tmp/53-04-smoke-run1.log` + `/tmp/53-04-smoke-run2.log` — both PASS, all 9 assertions + 3 regressions.*
