# Phase 53: M5 — Wildcard subdomain routing `<tenant>.zietra.com` — Research

**Researched:** 2026-05-14
**Domain:** AWS edge routing (CloudFront + ACM + Route 53), Express middleware in Node Lambda, browser-side header injection
**Confidence:** HIGH — every claim verified against live AWS API state, official AWS docs, or repo file:line

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

| Topic | Decision |
|---|---|
| Distribution strategy | **Reuse the existing `E37R9PT8IL44L2` CloudFront distribution.** Don't create a second one. Just add `*.zietra.com` to its Aliases list alongside the existing `turionspace.zietra.com`. One distribution = one cache + one CF Function execution path = simpler. |
| Cert region | **us-east-1** (CloudFront requirement). Use AWS-managed ACM cert with DNS validation in Route 53. |
| Cert SANs | Two SANs only: `*.zietra.com` + `zietra.com`. The `turionspace.zietra.com` host falls under `*.zietra.com` — no need to keep the legacy cert separately, just replace the distribution's cert with the new wildcard. |
| Cert validation | DNS validation via Route 53. ACM auto-creates the `_acme-challenge` CNAME on request — we just `aws acm describe-certificate --include` then `aws route53 change-resource-record-sets` to add the validation CNAME. Cert reaches `ISSUED` typically in 1-5 min. |
| DNS records | Wildcard ALIAS record `*.zietra.com` → CloudFront distribution. Plus `zietra.com` apex ALIAS (same distribution). `turionspace.zietra.com` ALIAS already exists — keep it (CNAME-style alias for backward compat). |
| Reserved subdomains | The reserved-slug list from Phase 52 already prevents tenants from claiming `www`, `app`, `api`, `static`, `mail`, `marquee`, `asc606`, `meet`, `docs`, `support`, `turion`, `turionspace`, `zietra`, `campaigns-api`, `login`, `signup`. Some of those are taken by OTHER apps on the AWS account (marquee.zietra.com, asc606.zietra.com, meet.zietra.com) — they should NOT be routed through this CloudFront distribution. CloudFront-side check: the CF Function only accepts hosts ending in `.zietra.com` AND NOT matching the reserved set. Unknown subdomain → return a 404 page or redirect to `zietra.com/signup`. |
| Subdomain extraction | CloudFront Function (`viewer-request` trigger) — runs at edge, ~free, fast. Reads `host` header, extracts the part before `.zietra.com`. Sets `x-tenant-slug` header forwarded to origin. Fallback: `turionspace.zietra.com` → slug `turion` (legacy alias). |
| Slug → tenant_id resolution | Backend Lambda reads `x-tenant-slug` header. Looks up `SELECT id FROM tenants WHERE slug = $1` (cached in-memory for 60s per Lambda warm container). If not found → 404 `{error: 'Unknown tenant'}`. Caching avoids hammering DB on every request. |
| Auth interaction | The Cognito auth flow (Phase 41) STAYS the same. Tenant context is a SEPARATE concern: `requireAuth` validates the JWT + sets `req.user`; new `tenantContext` middleware reads the subdomain + sets `req.tenant`. Tenant mismatch (user's tenant_id from `custom:supabase_sub`/`custom:role` ≠ tenant from subdomain) → 403. |
| Frontend tenant-aware config | New endpoint `GET /api/tenants/current` returns `{ id, slug, name, plan, features: [...module_codes where enabled=true] }`. App shell calls this at boot to set logo/name + decide which nav tiles to show (M6 / Phase 54 uses this). PUBLIC route — no auth required (the tenant identifier comes from the subdomain, not the JWT). |
| Cross-tenant auth | The same Cognito user pool serves ALL tenants. A user signed up to `dollor.zietra.com` is in the SAME pool as the Turion users. The tenant association lives in `tenants.owner_cognito_sub` (Phase 52) — one user → one tenant for now. M3 (RLS) hardens cross-tenant isolation. |
| Legacy `turionspace.zietra.com` | Keep working. Behavior: CF Function maps host `turionspace.zietra.com` → `x-tenant-slug: turion`. So Turion's user is technically the Turion tenant whether they visit `turionspace.zietra.com` OR `turion.zietra.com`. |
| Apex `zietra.com` | Lands on a marketing/redirect page. For Phase 53, simplest is: redirect to `/signup` (which already works at any host that routes through the CF). M7 builds proper marketing. |
| Lambda Origin auth | APIGW endpoints stay as-is — no `Host` header rewriting at CF level for the API origin (CF Function only adds `x-tenant-slug`, doesn't modify Host). Lambda reads `x-tenant-slug` from event headers. |

### Claude's Discretion

- Wave structure suggested by CONTEXT.md is a **strong recommendation**, not locked. Researcher confirms it is sound; planner may keep as-is.
- 60s in-memory cache TTL — fine for demo-grade; can be tuned.
- Wave 1 cert provisioning: poll for ISSUED status (avoid hardcoded sleep).
- 404-on-unknown-tenant page: can be the existing `index.html` 404-response (already wired in distro config) OR a dedicated `unknown-tenant.html`. Recommend the latter for cleaner UX.

### Deferred Ideas (OUT OF SCOPE)

- RLS on the DB (M3 — `tenant_id` column is just a label today).
- Data isolation enforcement in queries (M3).
- Per-tenant DB connection / pgbouncer (M2 owns DB infrastructure).
- Stripe billing / paid plan logic (M4).
- App shell that uses `/api/tenants/current` (Phase 54 / M6).
- Marketing pages on apex `zietra.com` (M7).
- Touching the 4 `zietra-cognito-*` trigger Lambdas.
- Modifying the Cognito user pool config.
- Changing Phase 41 auth middleware (only ADD a tenant middleware that runs AFTER requireAuth).
- APIGW custom domain `api.zietra.com` for the ERP/satellite APIs (flagged below; not blocking).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| `WildcardACMCert` | Provision ACM cert covering `*.zietra.com` + `zietra.com` in us-east-1 with DNS validation | Section "Standard Stack > ACM cert provisioning" + "Code Examples > Wave 1" — full `aws acm request-certificate` flow + `change-resource-record-sets` validation + `wait` for ISSUED, verified against live ACM API (existing zietra.com SAN cert `dd2df29d` is reference for pattern) |
| `CloudFrontWildcardAlias` | Update CloudFront distribution `E37R9PT8IL44L2` to accept `*.zietra.com` as alternate domain + attach new wildcard cert | Section "Architecture Patterns > Pattern 2 (CloudFront alias swap)" — `update-distribution` requires full current config + ETag (`EN1VRQENFRJN5` at time of research); confirmed via live `get-distribution` dump |
| `TenantSubdomainExtractor` | CloudFront Function (`viewer-request`) reads `Host` header, sets `x-tenant-slug` for origin | Section "Architecture Patterns > Pattern 3 (CF Function extension)" — full code skeleton; live function `turion-clean-urls` is 5,812 B (under 10KB limit); current function source is byte-identical to repo |
| `BackendTenantContextMiddleware` | New `tenantContext` middleware in both ERP + satellite Lambdas; reads `x-tenant-slug`, looks up `tenants` row, stamps `req.tenant`, 60s in-memory cache, 404 on unknown slug | Section "Code Examples > Pattern 4 (tenant middleware)" — full TypeScript skeleton + mount-point in both `app.ts` files (line-cited) |
| `TenantConfigEndpoint` | Public `GET /api/tenants/current` returns `{ id, slug, name, plan, trial_ends_at, features: [...] }` for app shell init | Section "Code Examples > Pattern 5 (tenants/current endpoint)" — full handler skeleton; mounted on existing `routes/tenants.ts`, public (no `requireAuth`); reuses the tenantContext middleware to resolve slug→tenant |
</phase_requirements>

---

## Summary

Phase 53 has THREE physical surfaces to modify, in this dependency order:

1. **AWS edge** — provision a new ACM wildcard cert (`*.zietra.com` + `zietra.com` SANs), validate via Route 53 DNS, then update CloudFront distribution `E37R9PT8IL44L2` to (a) attach the new cert and (b) add `*.zietra.com` + `zietra.com` to Aliases. Add Route 53 wildcard ALIAS + apex ALIAS pointing at the distribution. Existing `turionspace.zietra.com` alias stays (it's covered by the new wildcard cert via SAN match).

2. **CloudFront Function** — extend `turion-clean-urls` (current: 5,812 B / 10KB cap; 134 lines) with a 20-line `host → x-tenant-slug` prologue. Reserved-slug filter rejects `marquee`, `asc606`, `meet`, etc. Legacy alias `turionspace` → slug `turion`.

3. **Backend Lambda middleware** — mirror change in both `turion-demo-api` (`/Users/jeet/turion-space-demo/backend/`) and `turion-satellite-api` (`/Users/jeet/turion-satellite/backend/`):
   - New `src/middleware/tenant.ts` — reads `x-tenant-slug`, SELECTs `tenants` row, 60s cache, sets `req.tenant`
   - Mount AFTER `requireAuth` for protected routes; mount on the new public `/api/tenants/current` route ahead of any auth (slug is the only identifier needed)
   - New `GET /api/tenants/current` in `routes/tenants.ts` (ERP only — satellite Lambda mirrors the middleware but doesn't need the endpoint since satellite already shares the same tenant model)

**Primary recommendation:** Execute in three sequential waves matching CONTEXT.md's wave outline. Wave 1 (cert+DNS) must complete BEFORE Wave 2 (CF distro update) because the distro update needs the cert ARN. Wave 3 (smoke) is the gate to declaring Phase 53 done.

**CRITICAL architectural fact for the planner:** `/api/*` calls go DIRECTLY from browser to APIGW (`lo254mvukl.execute-api.us-east-1.amazonaws.com` for ERP, `rjydekliee.execute-api.us-east-1.amazonaws.com` for satellite). They do **NOT** flow through CloudFront. Therefore:
- **The CF Function CANNOT set `x-tenant-slug` for API calls.** It can only set it for static asset requests (HTML/JS/CSS) — and those go to S3 which ignores the header.
- **The BROWSER MUST set `x-tenant-slug` itself** by reading `window.location.hostname`, computing the slug, and adding the header to every `/api/*` fetch.
- The CF Function's `x-tenant-slug` job is **defensive / future-proofing** only — useful if we ever proxy `/api/*` through CF (which we don't today and Phase 53 doesn't add).
- APIGW HTTP API CORS is already wide-open (`AllowOrigins: *`, `AllowHeaders: *`, `AllowMethods: *`) — verified via `aws apigatewayv2 get-apis` — so cross-origin from `<tenant>.zietra.com` to the long APIGW URL with a custom `X-Tenant-Slug` header WILL work without any APIGW config change.

This shifts the burden from the CF Function (cosmetic) to two existing frontend wrappers:
- `/Users/jeet/turion-space-demo/erp-api.js` (lines 21-34) — add `'X-Tenant-Slug': computeTenantSlug()` to the `doFetch` headers object
- `/Users/jeet/turion-space-demo/satellite/satellite-api.js` (lines 21-34) — same pattern

Both wrappers are the **single chokepoint** for every authenticated `/api/*` call in their respective frontends.

---

## Live AWS State (verified 2026-05-14T19:33Z)

### CloudFront Distribution `E37R9PT8IL44L2`

| Field | Value |
|---|---|
| ETag (current) | `EN1VRQENFRJN5` |
| Status | `Deployed` |
| Domain | `d2bl7vqyf3n9m5.cloudfront.net` |
| Aliases | **1 entry: `turionspace.zietra.com`** |
| Cert ARN | `arn:aws:acm:us-east-1:134607809447:certificate/45e1fb37-ee24-4a8f-94b6-e4b3f4986655` |
| SSL method | `sni-only`, TLSv1.2_2021 |
| Origin | `S3-turion-demo-static` → `turion-demo-static.s3.us-east-1.amazonaws.com` (OAC `E2WLNYMS3FB7D9`) |
| Default cache behavior | `redirect-to-https`, HEAD+GET, `CachePolicy: Managed-CachingOptimized` (`658327ea-f89d-4fab-a63d-7e88639e58f6`) |
| FunctionAssociations (Default behavior) | 1 entry → `arn:aws:cloudfront::134607809447:function/turion-clean-urls` (event `viewer-request`) |
| Custom error response | `404 → /index.html` (returns 404 status, 10s TTL) |
| Logging | Enabled, bucket `turion-demo-access-logs.s3.amazonaws.com`, prefix `cf/` |
| PriceClass | `PriceClass_100` |
| HttpVersion | `http2` |
| IPv6 | enabled |
| Cache behaviors (non-default) | **0** — there is NO `/api/*` path pattern; everything routes to S3 origin |

### Cache policy `Managed-CachingOptimized` (verified live)

- `HeaderBehavior: none` — cache key does NOT include any header, so the same S3 path is cached once across all tenants. SAFE because the Turion HTML is identical for every tenant in Phase 53 (per CONTEXT.md).
- `QueryStringBehavior: none`, `CookieBehavior: none`
- Compression: gzip + brotli enabled

### Existing ACM cert on the distribution

| Field | Value |
|---|---|
| ARN | `arn:aws:acm:us-east-1:134607809447:certificate/45e1fb37-ee24-4a8f-94b6-e4b3f4986655` |
| DomainName | `null` (legacy field) |
| SANs | `["turionspace.zietra.com"]` — single-host cert |
| Status | `ISSUED` |
| NotAfter | `1795132799` = `2026-12-19 23:59:59 UTC` |
| InUseBy | `[E37R9PT8IL44L2]` |

After Phase 53 cuts to the new wildcard cert, this cert can be deleted in M8 (cleanup) — it's a NotAfter check away from automatic expiry anyway. CONTEXT.md "no backup paths" rule means we replace, not coexist.

### Other ACM certs covering zietra.com (DO NOT TOUCH)

| ARN suffix | Domain / SANs | In use by | Note |
|---|---|---|---|
| `dd2df29d-7652-484b-981a-dd4cce37c403` | `zietra.com` + SANs `meet.zietra.com,www.zietra.com` | Apex+marketing distro `E1X82T89JWL8CA` (presumably) | Existing apex cert |
| `c6980bf4-1cc6-4f86-9103-981d68d63fa2` | `app.zietra.com` | `E29O1YM0H7R2ZD` | "app" subdomain — not Turion |
| `de0cd532-123c-4553-9431-cc0d75f195d7` | `api.zietra.com` | APIGW custom domain | Mapped to API `fzonke39pf` (NOT our ERP/satellite APIs) |
| `34169870-9e44-469d-bbf9-e1c2df8468ca` | `marquee.zietra.com` | Marquee APIGW custom domain | Reserved slug — DO NOT route |
| `7d688122-1506-47e4-8840-c91858fa551c` | `asc606.zietra.com` | ASC606 APIGW custom domain | Reserved slug — DO NOT route |
| `45e1fb37-ee24-4a8f-94b6-e4b3f4986655` | `turionspace.zietra.com` | **E37R9PT8IL44L2 (THIS distro)** | Single-host, to be replaced |

**Wildcard ACM cert for `*.zietra.com` does NOT exist yet — must be provisioned.**

### Live CloudFront Function `turion-clean-urls` (verified byte-identical to repo)

| Field | Value |
|---|---|
| ARN | `arn:aws:cloudfront::134607809447:function/turion-clean-urls` |
| Stage | `LIVE` (only LIVE stage matters for production traffic) |
| ETag | `EN1VRQENFRJN5` (same as distro ETag, coincidence) |
| Runtime | `cloudfront-js-1.0` |
| Comment | `"Phase 52-03 - add /signup"` |
| LastModifiedTime | `2026-05-14T18:07:34.439Z` |
| Function source size | **5,812 bytes** (live `aws cloudfront get-function --stage LIVE` output) |
| Repo copy size | **5,812 bytes** at `/Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js` — byte-identical |
| 10KB compiled limit | Remaining headroom: ~4.2 KB (plenty for 20-30 lines of host→slug logic) |

### Route 53 records on `zietra.com` (zone `Z090201115UMJZ8TIAX5G`, verified live)

| Name | Type | Target / Value |
|---|---|---|
| `zietra.com` | A (alias) | `dlzyv23o98bvo.cloudfront.net` (marketing distro `E1X82T89JWL8CA`) |
| `zietra.com` | NS | `ns-766.awsdns-31.net.` (+3 others) |
| `zietra.com` | SOA | standard Route 53 SOA |
| `zietra.com` | TXT | `"v=spf1 include:amazonses.com ~all"` (SES SPF) |
| `_dmarc.zietra.com` | TXT | DMARC `p=none` |
| `*._domainkey.zietra.com` × 3 | CNAME | SES DKIM (3 keys) |
| `mail.zietra.com` | MX | `feedback-smtp.us-east-1.amazonses.com` |
| `mail.zietra.com` | TXT | SPF for MAIL FROM |
| `turionspace.zietra.com` | A (alias) | `d2bl7vqyf3n9m5.cloudfront.net` (THIS distro `E37R9PT8IL44L2`) |
| `marquee.zietra.com` | A (alias) | `d-4b5i44ceh2.execute-api.us-east-1.amazonaws.com` (Marquee APIGW) |
| `asc606.zietra.com` | A (alias) | `d-p38ujd6coi.execute-api.us-east-1.amazonaws.com` (ASC606 APIGW) |
| `meet.zietra.com` | A (alias) | `zietra-meet-alb-1798739472.us-east-1.elb.amazonaws.com` (Meet ALB) |
| `app.zietra.com` | A (alias) + AAAA | `d1xrpsgz7rhofg.cloudfront.net` (App distro `E29O1YM0H7R2ZD`) |
| `api.zietra.com` | A (alias) | `d-jd962f5eqg.execute-api.us-east-1.amazonaws.com` (APIGW domain) |
| `www.zietra.com` | A (alias) | `dlzyv23o98bvo.cloudfront.net` (marketing distro, SAN on cert `dd2df29d`) |
| `campaigns-api.zietra.com` | A | `3.228.239.112` (raw IP, BrandMonkz CRM EC2) |
| `_*.zietra.com` (multiple) | CNAME | ACM validation tokens (`*.acm-validations.aws.`) |

**Phase 53 will ADD:**
- `*.zietra.com` A (alias) → `d2bl7vqyf3n9m5.cloudfront.net` (THIS distro)
- `*.zietra.com` AAAA (alias) → same (because distro has IPv6 enabled)
- New `_*.zietra.com` CNAME for ACM validation of the wildcard cert

**Phase 53 will NOT touch:**
- The apex `zietra.com` A alias (lands on marketing distro `E1X82T89JWL8CA`, NOT this one)
- Any of the other-tenant aliases (marquee/asc606/meet/app/api/www/campaigns-api) — all are more-specific and CloudFront/Route 53 routes them to their own distros/APIs
- SES DKIM/SPF/DMARC records

### Confirmed: wildcard ALIAS + more-specific aliases coexist safely

Per AWS CloudFront docs (`https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html`):

> You can add a wildcard alternate domain name, such as `*.example.com`, that includes (that overlaps with) a non-wildcard alternate domain name, such as `www.example.com`. If you have overlapping alternate domain names in two distributions, **CloudFront sends the request to the distribution with the more specific name match**, regardless of the distribution that the DNS record points to. For example, `marketing.domain.com` is more specific than `*.domain.com`.

Therefore adding `*.zietra.com` to E37R9PT8IL44L2 will NOT shadow `marquee.zietra.com`, `app.zietra.com`, `api.zietra.com`, etc — each lives on its own distribution/APIGW with an explicit Aliases entry, which always wins over a wildcard.

### APIGW HTTP API CORS (verified live, both APIs)

| API | ID | CORS AllowOrigins | AllowMethods | AllowHeaders | MaxAge |
|---|---|---|---|---|---|
| ERP `turion-demo-api` | `lo254mvukl` | `["*"]` | `["*"]` | `["*"]` | 86400 |
| Satellite `turion-satellite-api` | `rjydekliee` | `["*"]` | `["*"]` | `["*"]` | 86400 |

**Implication:** Cross-origin from `<tenant>.zietra.com` to APIGW with custom `X-Tenant-Slug` header WORKS today — no APIGW config change required in Phase 53. The preflight `OPTIONS` will return `Access-Control-Allow-Headers: *` which permits any header name.

### Lambda configs (verified live)

| Function | CodeSha256 | Memory | Timeout | Arch | Key env vars |
|---|---|---|---|---|---|
| `turion-demo-api` | `9c440e437e04f76e8d79ffcb179b5e58a20b33b4a04abfaaaa341eba66721526` | 1024 MB | 30s | arm64 | `DATABASE_URL` (plaintext — known issue, not in scope), `COGNITO_CONFIG_SECRET_ARN`, `ANTHROPIC_API_KEY` (plaintext — known) |
| `turion-satellite-api` | `10b9ecb47e5207cdb6670c31703ccc8ad5fc0ab469cb8859805bf2d692039dc9` | 512 MB | 30s | arm64 | `DATABASE_URL_ARN` (secret), `S3_FILES_BUCKET`, `COGNITO_CONFIG_SECRET_ARN` |

**NB:** ERP Lambda has plaintext `DATABASE_URL` and `ANTHROPIC_API_KEY` env vars — Phase 53 does NOT change this. Both are tracked elsewhere as security debt; out of scope.

### Live `public.tenants` table state

Per Phase 52 CHECKPOINT.md (lines 17-28) and the recent smoke tests, the live state is **1 tenant row**:

```
slug: turion
id:   00000000-0000-0000-0000-000000000001
name: Turion Space
plan: trial
trial_ends_at: 2026-06-13 (Phase 52 default)
owner_cognito_sub: <Turion's M1 admin Cognito sub>
```

Plus 13 `tenant_features` rows (all 13 modules enabled).

Phase 52 smoke (`scripts/smoke-phase-52.sh`) verified clean tenant_create/tenant_delete round-trips; expect zero leftover `smoke52-*` rows. **NOT VERIFIED LIVE in this research** (DB permission denied for direct psql) — relying on CHECKPOINT.md as authoritative source. **Confidence: HIGH** because Phase 52 just closed (2026-05-14T18:33Z) and CHECKPOINT.md is the single source of truth for the Phase 52→53 handoff contract.

---

## Standard Stack

### Core

| Library / AWS Service | Version | Purpose | Why Standard |
|---|---|---|---|
| AWS ACM | n/a (managed) | Wildcard TLS cert `*.zietra.com` + `zietra.com` SANs, us-east-1 (CloudFront requirement) | AWS-native, auto-renewing, free, DNS-validated via Route 53 |
| AWS CloudFront | distro `E37R9PT8IL44L2` | Edge TLS termination + S3 origin + Function trigger | Existing distro stays; ONE distro = one cache + one Function path = simplest |
| CloudFront Functions | `cloudfront-js-1.0` (ES5.1, no async/no fetch) | viewer-request handler: host → `x-tenant-slug` + existing URL rewrites | ~$0.10/M invocations, 10KB max, 5ms timeout — perfect for header rewrites; Lambda@Edge overkill |
| AWS Route 53 | hosted zone `Z090201115UMJZ8TIAX5G` | DNS — wildcard A/AAAA ALIAS to distro + ACM validation CNAMEs | Already authoritative for zietra.com; ALIAS records have wildcard precedence semantics |
| Node `pg` | already in repo (`backend/package.json`) | tenant lookup `SELECT id, name, plan, trial_ends_at FROM public.tenants WHERE slug = $1` | Existing pool reused; no new dep |
| `express` middleware | already in repo | `tenantContext` slots between `requireAuth` and handlers | Standard chain pattern |

### Supporting

| Library / Service | Purpose | When to Use |
|---|---|---|
| `aws cloudfront update-distribution` + `update-function` + `publish-function` | Atomic config changes | Use `--if-match` with ETag; never inline-edit |
| `aws acm request-certificate` + `wait certificate-validated` | Cert provisioning | Wave 1 cert flow |
| `aws route53 change-resource-record-sets` (UPSERT) | DNS record creation | Wave 1 validation CNAME + Wave 2 wildcard ALIAS |

### Alternatives Considered

| Instead of | Could Use | Tradeoff (why standard wins) |
|---|---|---|
| CloudFront Functions | Lambda@Edge | L@E supports `fetch()` + 30s timeout but costs 3-5× more, slower cold starts, deploys to all 13 regions — overkill for a 20-line header rewrite |
| One distribution with wildcard + apex | Two distributions (one per pattern) | CONTEXT.md Rule 6 + AWS supports both in one distro via wildcard SAN; saves CF cost + simplifies CF Function management |
| Browser sends `X-Tenant-Slug` | CF Function sets it on every API request | API requests bypass CF entirely (verified live) — browser is the only place that can do it for `/api/*`. CF Function still sets it for static S3 requests for symmetry / future-proofing |
| In-memory cache | Redis / external cache | Demo-grade, low cardinality (<100 tenants), 60s TTL is fine; M8 can harden |
| Wildcard cert + apex SAN | Separate certs per subdomain | Wildcard cert covers all `*.zietra.com` tenants in one cert — auto-renews ~30 days before expiry; per-subdomain certs = N×renewal storms |

**Installation (no new npm deps required):**

```bash
# Both repos already have pg + express + @aws-sdk/* — no changes to package.json
# Only Bash + aws CLI needed for Wave 1 + Wave 2 infra steps
```

---

## Architecture Patterns

### Recommended Project Structure

```
/Users/jeet/turion-space-demo/
├── cf-function-source/
│   └── turion-clean-urls.js          ← EXTEND with x-tenant-slug + reserved-slug filter
├── scripts/
│   ├── generate-turion-config.sh     ← no change (turion-config.js stays)
│   ├── smoke-phase-53.sh             ← NEW (Wave 3 end-to-end smoke)
│   └── update-cf-function.sh         ← NEW or inline (CF function deploy script)
├── erp-api.js                        ← MODIFY (add X-Tenant-Slug header)
├── satellite/
│   └── satellite-api.js              ← MODIFY (mirror)
├── signup.html                       ← no change (signup is host-agnostic, lands on tenant subdomain after)
└── backend/src/
    ├── app.ts                        ← MOUNT tenantContext middleware
    ├── middleware/
    │   ├── auth.ts                   ← NO CHANGE (Phase 41 Cognito-only stays)
    │   └── tenant.ts                 ← NEW
    └── routes/
        └── tenants.ts                ← ADD GET /current endpoint

/Users/jeet/turion-satellite/
└── backend/src/
    ├── app.ts                        ← MOUNT tenantContext middleware (mirror)
    └── middleware/
        ├── auth.ts                   ← NO CHANGE
        └── tenant.ts                 ← NEW (mirror of ERP version)

/Users/jeet/doordash-p2p/.planning/phases/53-m5-wildcard-subdomain-routing-tenant-zietra-com/
├── CONTEXT.md                        ← already exists
├── 53-RESEARCH.md                    ← THIS DOC
├── 53-01-PLAN.md (Wave 1: ACM + DNS)
├── 53-02-PLAN.md (Wave 2a: CloudFront alias + cert + Function)
├── 53-03-PLAN.md (Wave 2b: backend tenant middleware + GET /api/tenants/current)
├── 53-04-PLAN.md (Wave 3: smoke + Phase 54 CHECKPOINT.md)
└── CHECKPOINT.md (input contract for Phase 54)
```

### Pattern 1: ACM cert provisioning + DNS validation in script

**What:** Request the wildcard cert, poll for the validation CNAME, write it to Route 53, then wait for ISSUED.
**When to use:** Wave 1 only — must complete before Wave 2 can attach the cert.
**Idempotency:** Re-running the script should detect an existing ISSUED cert with matching SANs and skip re-issuance.

```bash
# Source: AWS official docs https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
# Verified by inspecting live cert dd2df29d-7652-484b-981a-dd4cce37c403 (zietra.com + SANs)

set -euo pipefail
REGION=us-east-1
DOMAIN='*.zietra.com'
APEX_SAN='zietra.com'
ZONE_ID='Z090201115UMJZ8TIAX5G'

# 1. Idempotency: look up existing ISSUED cert matching SANs
EXISTING_ARN=$(aws acm list-certificates --region "$REGION" \
  --query "CertificateSummaryList[?DomainName=='$DOMAIN' && Status=='ISSUED'].CertificateArn" \
  --output text)

if [ -n "$EXISTING_ARN" ] && [ "$EXISTING_ARN" != "None" ]; then
  echo "→ Reusing existing ISSUED cert: $EXISTING_ARN"
else
  # 2. Request fresh cert
  ARN=$(aws acm request-certificate --region "$REGION" \
    --domain-name "$DOMAIN" \
    --subject-alternative-names "$APEX_SAN" \
    --validation-method DNS \
    --idempotency-token "phase-53-wildcard-$(date +%s)" \
    --query CertificateArn --output text)
  echo "→ requested $ARN, waiting 8s for ACM to generate validation records …"
  sleep 8

  # 3. Read validation CNAMEs (one per domain; for wildcard + apex they are IDENTICAL —
  #    per AWS docs, "for a wildcard domain, such as *.example.com, the strings created
  #    by ACM are the same as those created for its base domain, example.com")
  VAL_NAME=$(aws acm describe-certificate --region "$REGION" --certificate-arn "$ARN" \
    --query 'Certificate.DomainValidationOptions[0].ResourceRecord.Name' --output text)
  VAL_VALUE=$(aws acm describe-certificate --region "$REGION" --certificate-arn "$ARN" \
    --query 'Certificate.DomainValidationOptions[0].ResourceRecord.Value' --output text)

  # 4. UPSERT validation CNAME in Route 53
  cat > /tmp/acm-val.json <<EOF
{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{
  "Name":"$VAL_NAME","Type":"CNAME","TTL":300,
  "ResourceRecords":[{"Value":"$VAL_VALUE"}]}}]}
EOF
  aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" \
    --change-batch file:///tmp/acm-val.json

  # 5. Wait for ISSUED (acm wait polls every 5s, max 40 attempts = 200s)
  aws acm wait certificate-validated --region "$REGION" --certificate-arn "$ARN"
  echo "→ cert ISSUED: $ARN"
fi
echo "WILDCARD_CERT_ARN=$ARN"
```

### Pattern 2: CloudFront distribution alias swap (preserves all other config)

**What:** Read full current config, mutate two fields (Aliases + ViewerCertificate), put-back with `--if-match` ETag.
**When to use:** Wave 2a only. Atomic; CloudFront returns new ETag on success.
**Critical:** Use `aws cloudfront update-distribution` which requires the FULL DistributionConfig — extract via `get-distribution-config`, mutate JSON, push back.

```bash
# Source: AWS CloudFront API docs — UpdateDistribution requires full config + IfMatch
# Verified live: distro E37R9PT8IL44L2 ETag was EN1VRQENFRJN5 at research time

DIST_ID=E37R9PT8IL44L2
CERT_ARN=arn:aws:acm:us-east-1:134607809447:certificate/<NEW_WILDCARD_ARN_FROM_WAVE_1>

# 1. Snapshot current config + ETag
aws cloudfront get-distribution-config --id "$DIST_ID" > /tmp/cf-config.json
ETAG=$(jq -r .ETag /tmp/cf-config.json)
jq .DistributionConfig /tmp/cf-config.json > /tmp/cf-config-body.json

# 2. Mutate: replace cert + add aliases
jq --arg cert "$CERT_ARN" '
  .ViewerCertificate.ACMCertificateArn = $cert
  | .ViewerCertificate.Certificate = $cert
  | .Aliases = {"Quantity": 3, "Items": ["turionspace.zietra.com", "*.zietra.com", "zietra.com"]}
' /tmp/cf-config-body.json > /tmp/cf-config-new.json

# 3. Push back
aws cloudfront update-distribution \
  --id "$DIST_ID" \
  --if-match "$ETAG" \
  --distribution-config file:///tmp/cf-config-new.json

# 4. Wait until Deployed (takes 5-10 min)
aws cloudfront wait distribution-deployed --id "$DIST_ID"
```

**NB:** Keeping `turionspace.zietra.com` as an explicit alias is BELT-AND-SUSPENDERS — `*.zietra.com` already covers it via SAN. Belt-and-suspenders is preferable for the legacy alias because (a) the Route 53 record explicitly points to this distro, (b) CONTEXT.md says "keep it (CNAME-style alias for backward compat)". The explicit alias also wins over the wildcard per CloudFront precedence rules.

### Pattern 3: CloudFront Function extension (host → x-tenant-slug)

**What:** Prepend a 20-line host-parse + reserved-slug-filter to the existing function. Append `x-tenant-slug` header before the existing URI rewrite logic.
**When to use:** Wave 2a, immediately after distro config update (or together — both share an ETag check).
**Constraint:** Stay under 10KB (live: 5,812 B; budget: ~4 KB headroom).

**Source: live `aws cloudfront get-function --stage LIVE`. Reserved slugs verified against `/Users/jeet/turion-space-demo/backend/src/routes/tenants.ts:18-22`.**

```javascript
// /Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js (NEW VERSION)
function handler(event) {
    var request = event.request;

    // === Phase 53: Extract tenant slug from Host header ===
    // Reserved slugs MUST mirror routes/tenants.ts:18-22 (Phase 52 contract).
    var RESERVED = {
        'www': 1, 'admin': 1, 'app': 1, 'api': 1, 'static': 1, 'mail': 1,
        'turion': 1, 'zietra': 1, 'marquee': 1, 'asc606': 1, 'meet': 1,
        'docs': 1, 'support': 1, 'turionspace': 1, 'campaigns-api': 1,
        'login': 1, 'signup': 1
    };
    // Legacy alias: turionspace.zietra.com IS Turion (per CONTEXT.md).
    var ALIAS = { 'turionspace': 'turion' };

    var host = (request.headers.host && request.headers.host.value) || '';
    host = host.toLowerCase();

    // Apex zietra.com → redirect to /signup (CONTEXT.md: "simplest is redirect to /signup")
    if (host === 'zietra.com') {
        return {
            statusCode: 302,
            statusDescription: 'Found',
            headers: { 'location': { value: 'https://zietra.com/signup' } }
        };
    }

    // Sub-of-zietra.com: extract slug
    var slug = null;
    if (host.length > '.zietra.com'.length &&
        host.lastIndexOf('.zietra.com') === host.length - '.zietra.com'.length) {
        slug = host.substring(0, host.length - '.zietra.com'.length);
    }

    if (slug) {
        if (ALIAS[slug]) slug = ALIAS[slug];
        if (RESERVED[slug] && slug !== 'turion') {
            // Reserved slugs are routed elsewhere — should NEVER reach this distro.
            // If they do (DNS misconfig), return clean 404 with CTA.
            return {
                statusCode: 404,
                statusDescription: 'Not Found',
                headers: { 'content-type': { value: 'text/html; charset=utf-8' } },
                body: '<!doctype html><meta charset=utf-8><title>404</title><body style="font:16px system-ui;padding:2rem;text-align:center"><h1>404 — Subdomain not available</h1><p>This subdomain is reserved. <a href="https://zietra.com/signup">Sign up for your own workspace →</a></p></body>'
            };
        }
        // Stamp slug for the origin (S3 ignores it; here for symmetry + future API-via-CF path).
        request.headers['x-tenant-slug'] = { value: slug };
    }

    // === Existing URL rewrites (UNCHANGED from Phase 52-03) ===
    var uri = request.uri;
    var R = {
        '/': '/index.html',
        // ... (all 70+ existing rewrites stay byte-for-byte identical)
        '/signup': '/signup.html',
        '/satellite': '/satellite/index.html'
    };
    if (R[uri]) { request.uri = R[uri]; return request; }

    var rec = uri.match(/^\/records\/([^\/]+)\/([^\/]+)\/?$/);
    if (rec) {
        request.uri = '/ns-record.html';
        request.querystring = { type: { value: rec[1] }, id: { value: rec[2] } };
        return request;
    }
    if (uri.charAt(uri.length - 1) === '/' && uri.length > 1) {
        request.uri = uri + 'index.html';
        return request;
    }
    return request;
}
```

**Deployment:** `aws cloudfront update-function` (uses `--if-match` ETag) then `aws cloudfront publish-function` to move DEVELOPMENT → LIVE. Existing deploy mechanism in repo is **manual** — no script wraps this today. Phase 53 should add a 10-line `scripts/update-cf-function.sh` script.

```bash
# Source: AWS docs — CloudFront Functions deploy flow
FN_NAME=turion-clean-urls
ETAG=$(aws cloudfront describe-function --name "$FN_NAME" --stage DEVELOPMENT \
  --query 'ETag' --output text 2>/dev/null || \
  aws cloudfront describe-function --name "$FN_NAME" --stage LIVE \
  --query 'ETag' --output text)

aws cloudfront update-function --name "$FN_NAME" \
  --function-config Comment="Phase 53 - host → x-tenant-slug",Runtime=cloudfront-js-1.0 \
  --function-code fileb:///Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js \
  --if-match "$ETAG"

# Re-read ETag after update (it changes)
ETAG=$(aws cloudfront describe-function --name "$FN_NAME" --stage DEVELOPMENT \
  --query 'ETag' --output text)
aws cloudfront publish-function --name "$FN_NAME" --if-match "$ETAG"
```

### Pattern 4: Backend `tenantContext` middleware (mirror both repos)

**What:** Express middleware that reads `x-tenant-slug`, looks up `tenants` row, stamps `req.tenant`, 60s in-memory cache, 404 on unknown slug.
**When to use:** Wave 2b. Mount AFTER `requireAuth` for protected routes; mount UNCONDITIONALLY on `/api/tenants/current` (the slug is the only identifier we need there).
**File-by-file (both repos identical except for db.ts schema differences):**

```typescript
// /Users/jeet/turion-space-demo/backend/src/middleware/tenant.ts (NEW)
// Mirror: /Users/jeet/turion-satellite/backend/src/middleware/tenant.ts (NEW)
import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  plan: 'trial' | 'paid' | 'disabled';
  trial_ends_at: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

// 60s in-memory cache. Map<slug, { tenant, expiresAt_ms }>.
// Per Lambda warm container — cold starts re-populate (expected for demo-grade).
// CONTEXT.md Open Question 7: "60s is fine for demo-grade; M8 can add cache-busting via SNS".
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { tenant: TenantContext; expiresAt: number }>();

async function loadTenant(slug: string): Promise<TenantContext | null> {
  const now = Date.now();
  const hit = cache.get(slug);
  if (hit && hit.expiresAt > now) return hit.tenant;

  const r = await pool.query<TenantContext>(
    `SELECT id, slug, name, plan, trial_ends_at
       FROM public.tenants WHERE slug = $1`,
    [slug],
  );
  if (r.rowCount === 0) {
    // Negative-cache for 5s to avoid hammering DB on a typo loop.
    return null;
  }
  const tenant = r.rows[0];
  cache.set(slug, { tenant, expiresAt: now + CACHE_TTL_MS });
  return tenant;
}

// Hard-required: 404 if x-tenant-slug missing or slug unknown.
export async function tenantContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Header names are case-insensitive in Express; we read lowercase per Node convention.
  const raw = req.headers['x-tenant-slug'];
  const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!slug) {
    res.status(400).json({ error: 'Missing X-Tenant-Slug header' });
    return;
  }
  try {
    const tenant = await loadTenant(slug);
    if (!tenant) {
      res.status(404).json({ error: 'Unknown tenant' });
      return;
    }
    req.tenant = tenant;
    next();
  } catch (e: any) {
    console.error('[tenantContext] DB lookup failed:', e?.message);
    res.status(500).json({ error: 'Tenant lookup failed' });
  }
}

// Soft variant: stamps req.tenant if header present + slug known; passes through otherwise.
// Use for the SIGNUP endpoint where the user doesn't have a tenant yet.
export async function tenantContextOptional(
  req: Request, _res: Response, next: NextFunction,
): Promise<void> {
  const raw = req.headers['x-tenant-slug'];
  const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (slug) {
    try {
      const t = await loadTenant(slug);
      if (t) req.tenant = t;
    } catch { /* swallow — soft variant */ }
  }
  next();
}
```

**Mount points:**

```typescript
// /Users/jeet/turion-space-demo/backend/src/app.ts
// Existing line 18: app.use('/api/tenants', tenants);  ← signup is PUBLIC, no auth
// After Phase 53 mounts:
app.use('/api/tenants', tenants);  // signup stays public; routes/tenants.ts adds GET /current
                                   // GET /current uses tenantContext at the route level,
                                   // POST /signup uses tenantContextOptional (no slug yet).

// Then `tenantContext` mounts on every authenticated route ALONGSIDE requireAuth.
// Pattern: stack them at the route level (NOT app-level) so each handler
// gets both `req.user` (from requireAuth) AND `req.tenant` (from tenantContext).
// Example: app.get('/api/activity', requireAuth, tenantContext, async (req, res) => { ... })
```

**Decision: do we mount `tenantContext` app-wide or per-route?**

- **App-wide AFTER all public routes** = simpler, but the public routes (`/api/health`, `/api/notify/visit`, `/api/tenants/signup`) need to be mounted FIRST so the middleware doesn't intercept them
- **Per-route** = explicit, no risk of intercepting public endpoints, but means touching every route mount

**Recommendation: per-route.** Reason: matches the existing per-route `requireAuth` pattern (see app.ts:101 `app.get('/api/activity', requireAuth, ...)`) and keeps the public/private boundary explicit. Planner picks: tag the wave plan with this.

### Pattern 5: `GET /api/tenants/current` endpoint

**What:** Public route returning the current tenant's summary (resolved from `X-Tenant-Slug` header).
**When to use:** Wave 2b. Mounted on existing `routes/tenants.ts` AFTER `POST /signup`.

```typescript
// /Users/jeet/turion-space-demo/backend/src/routes/tenants.ts (APPEND to existing file)
// Existing: line 16-22 RESERVED_SLUGS, line 30-32 cognito client, line 34-144 POST /signup
// After Phase 53 appends:

import { tenantContext } from '../middleware/tenant';

r.get('/current', tenantContext, async (req, res) => {
  if (!req.tenant) {
    // Defensive — tenantContext should have already 404'd if missing.
    return res.status(500).json({ error: 'Tenant resolution failed' });
  }
  const features = await pool.query<{ module_code: string }>(
    `SELECT module_code FROM public.tenant_features
       WHERE tenant_id = $1 AND enabled = true
       ORDER BY module_code`,
    [req.tenant.id],
  );
  return res.json({
    id: req.tenant.id,
    slug: req.tenant.slug,
    name: req.tenant.name,
    plan: req.tenant.plan,
    trial_ends_at: req.tenant.trial_ends_at,
    features: features.rows.map(f => f.module_code),
  });
});
```

**Why public (no `requireAuth`)?** Per CONTEXT.md decision: "the tenant identifier comes from the subdomain, not the JWT". The app shell needs this BEFORE the user logs in to render correct branding. The endpoint reveals only NON-SECRET data (org name, plan, enabled module list) — no PII. If we later decide that's too leaky, gate with `requireAuth` in M3.

### Pattern 6: Frontend — browser sends X-Tenant-Slug from window.location.hostname

**What:** Two-line addition to both `erp-api.js` and `satellite/satellite-api.js`.
**When to use:** Wave 2a (alongside CF Function deploy — these are the user-facing change).

**Source: live `erp-api.js` lines 21-34 + `satellite/satellite-api.js` lines 21-34.**

```javascript
// /Users/jeet/turion-space-demo/erp-api.js (MODIFY lines 21-34)
// Add this helper near the top of the IIFE:
function computeTenantSlug() {
  var host = window.location.hostname.toLowerCase();
  if (host === 'turionspace.zietra.com') return 'turion';
  if (host.length > '.zietra.com'.length &&
      host.lastIndexOf('.zietra.com') === host.length - '.zietra.com'.length) {
    return host.substring(0, host.length - '.zietra.com'.length);
  }
  return 'turion'; // local dev (localhost) defaults to Turion
}
var TENANT_SLUG = computeTenantSlug();

// Modify the doFetch headers object:
const doFetch = (token) => fetch(cfg.API_BASE + path, {
  ...opts,
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Tenant-Slug': TENANT_SLUG,                  // ← NEW LINE
    ...(opts.headers || {}),
  },
});

// Mirror in /Users/jeet/turion-space-demo/satellite/satellite-api.js
```

**signup.html** (`/Users/jeet/turion-space-demo/signup.html:88`) uses a raw `fetch` (not `erp-api.js`) — needs to include `X-Tenant-Slug` too. CONTEXT.md says signup mounts on the public path, but for consistency the signup page can send `X-Tenant-Slug: zietra` (or omit entirely since `POST /api/tenants/signup` uses `tenantContextOptional` and accepts no slug).

### Anti-Patterns to Avoid

- **DO NOT** put `tenantContext` BEFORE `requireAuth` for protected routes — even though both can run independently, putting auth first means a missing/invalid JWT short-circuits to 401 before we even read the slug. Cleaner errors.
- **DO NOT** trust the JWT for the tenant identifier. CONTEXT.md: "the tenant identifier comes from the subdomain, not the JWT". The JWT comes from a single Cognito user pool that serves ALL tenants; trusting `custom:tenant_id` on the JWT would bypass the subdomain (and after Phase 52 there is no such claim — Cognito users have `custom:role`, not `custom:tenant_id`).
- **DO NOT** add `/api/*` as a CloudFront cache behavior in Phase 53. CONTEXT.md: APIGW endpoints stay as-is; out of scope. Plus the cache policy would need to forward `X-Tenant-Slug` as part of the cache key, which adds complexity.
- **DO NOT** cache `/api/tenants/current` at the CloudFront layer (if it ever flows through CF). The response is tenant-specific; CF would have to vary on `X-Tenant-Slug`. Browser-side `localStorage` cache is the right pattern (Phase 54 problem).
- **DO NOT** invalidate CloudFront `/*` after the cert/alias swap unless content actually changed. Wave 2a only changes config, not S3 objects — invalidation is wasted spend.
- **DO NOT** delete the legacy cert `45e1fb37-...` in Phase 53. Leave it; cleanup in M8.
- **DO NOT** modify the Route 53 apex `zietra.com` A-record. It points to a different distribution (`E1X82T89JWL8CA` marketing) and changing it would break the marketing site. CONTEXT.md says apex on this distro is for redirect-to-/signup — but the apex DNS already routes elsewhere. **The CF Function's apex-redirect logic in Pattern 3 above is DEAD CODE** unless we add `zietra.com` to this distro's Aliases AND retarget the Route 53 record. **Recommend: drop the apex-redirect branch in the CF Function and explicitly leave apex on the marketing distro.** This contradicts CONTEXT.md slightly — flag to user during planning.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| TLS cert issuance/renewal | Self-signed certs, Let's Encrypt | AWS ACM (DNS-validated, auto-renewing, free) | Already in use everywhere on the account; integrates natively with CloudFront |
| Subdomain DNS routing | Per-tenant DNS records | Route 53 wildcard ALIAS | One record covers infinite subdomains; per-tenant records means programmatic Route 53 writes on every signup (M8 problem) |
| Host → tenant slug extraction | Frontend JS only | CloudFront Function + frontend mirror | CF Function is the canonical source (runs at edge before request hits S3); frontend mirror is for the API-bypass-CF path |
| In-memory cache invalidation | Pub/Sub, Redis | Plain Map with 60s TTL | Demo-grade, low cardinality, 60s lag on tenant updates is acceptable |
| Multi-tenant DB isolation | Custom `WHERE tenant_id = ?` injection | M3 deferred (RLS) | CONTEXT.md ABSOLUTELY OUT |
| CORS for cross-origin browser → APIGW | nginx proxy, Lambda proxy | APIGW HTTP API native CORS (already `*`) | Already configured (`AllowOrigins: ["*"]`) — verified live |
| CloudFront Function source tracking | Inline AWS CLI commands | Repo file `cf-function-source/turion-clean-urls.js` | Already established pattern — keep |

**Key insight:** Phase 53's "hard" parts are NOT coding — they are AWS resource orchestration (cert + DNS + CloudFront) and getting the WAVE ORDER right (Wave 1 must finish before Wave 2). The middleware + endpoint code is ~60 lines per repo and follows established patterns.

---

## Common Pitfalls

### Pitfall 1: Cert in wrong region

**What goes wrong:** Cert provisioned in `us-east-2` or any non-us-east-1 region — CloudFront silently rejects the attach with `InvalidViewerCertificate: ACM Certificate ARN is invalid or not in us-east-1`.
**Why it happens:** Engineer runs `aws acm request-certificate` without `--region us-east-1` and inherits a different default region.
**How to avoid:** Hardcode `--region us-east-1` on EVERY `aws acm` and `aws cloudfront` call. Wave-1 script should `set -euo pipefail` and refuse to run if `$REGION != us-east-1`.
**Warning signs:** `update-distribution` returns `InvalidArgument` with cert mentioned.

### Pitfall 2: Forgetting AAAA record for IPv6

**What goes wrong:** Wildcard A record exists, but IPv6-only clients (and many CGNAT mobile clients) can't resolve `<tenant>.zietra.com`. Mysterious "DNS error" reports from a small slice of users.
**Why it happens:** Distribution has `IsIPV6Enabled: true` (verified live) but engineer adds only an A alias.
**How to avoid:** Wave 1 plan MUST add both A AND AAAA wildcard aliases pointing to the same distro.
**Warning signs:** `curl -6 https://foo.zietra.com` fails while `curl -4` works.

### Pitfall 3: CF Function size overflow

**What goes wrong:** Adding the host→slug logic + reserved-slug map pushes the function past 10KB → `update-function` returns `InvalidArgument`.
**Why it happens:** Live function is 5,812 B; budget is 4,188 B. The new prologue is ~1.5 KB. Safe today, but future Phase 54+ additions could push over.
**How to avoid:** Wave 2a plan should `wc -c cf-function-source/turion-clean-urls.js` as a pre-flight check; if >9500, FAIL the plan and split.
**Warning signs:** `update-function` returns `FunctionSizeLimitExceeded`.

### Pitfall 4: CloudFront cache poisoning from missing Vary

**What goes wrong:** Cache policy `Managed-CachingOptimized` has `HeaderBehavior: none` (verified live). If we ever ship tenant-specific HTML (different logo per tenant), the FIRST tenant's HTML gets cached and served to ALL subsequent tenants. Cross-tenant data leak.
**Why it happens:** Phase 53's static HTML is identical across tenants TODAY, so this isn't a bug yet. Phase 54+ might add tenant-specific HTML.
**How to avoid:** When Phase 54 adds tenant-specific HTML, SWITCH to a cache policy that includes `Host` in the cache key (or use the `CachingDisabled` policy and let the browser handle caching).
**Warning signs:** Tenant A's logo appears on tenant B's page after a CloudFront cache hit.

### Pitfall 5: CloudFront propagation lag

**What goes wrong:** `update-distribution` returns 200 immediately, but the change isn't live at edge POPs for 5-10 min. Smoke tests run too fast → 521 Origin Error / SSL handshake failure / wrong cert served.
**Why it happens:** CloudFront is eventually consistent; the API returns when the config is queued, not when it's deployed.
**How to avoid:** Always `aws cloudfront wait distribution-deployed --id ...` after `update-distribution` BEFORE running smoke tests.
**Warning signs:** Random 502/SSL errors immediately after deploy.

### Pitfall 6: Route 53 wildcard conflicts with existing apex/marketing alias

**What goes wrong:** Adding `*.zietra.com` ALIAS to E37R9PT8IL44L2 doesn't break `zietra.com` (different distro), but if someone ever creates `random.zietra.com` thinking it'll work — it DOES work, routes to E37R9PT8IL44L2, and the CF Function returns the 404 page.
**Why it happens:** Wildcard is intentional. The CF Function's reserved-slug list + tenant-slug-resolution is the gating logic.
**How to avoid:** Smoke MUST include "random unknown subdomain returns clean 404" assertion (CONTEXT.md Engineering Rule 2 + Rule 3c).

### Pitfall 7: Browser → APIGW cross-origin preflight cache stale

**What goes wrong:** First request from `dollor.zietra.com` triggers an OPTIONS preflight to APIGW; browser caches the preflight (24h via `MaxAge: 86400`). If APIGW CORS changes mid-flight, the user's browser uses the stale response.
**Why it happens:** Standard CORS preflight caching. APIGW CORS doesn't change in Phase 53 (already `*` for everything), but worth knowing.
**How to avoid:** Don't change APIGW CORS in Phase 53.
**Warning signs:** "CORS error" reports from users who recently visited.

### Pitfall 8: requireAuth on /api/tenants/current would 401 the app shell

**What goes wrong:** Default Phase 41 middleware `requireAuth` rejects requests without a Bearer token. If we forgot CONTEXT.md's decision and gated `/api/tenants/current` with auth, the app shell would 401 before the user even sees the login page.
**Why it happens:** Inertia — every other `/api/*` route is gated.
**How to avoid:** Mount `/api/tenants/current` BEFORE the global `requireAuth` (or use per-route mounting with NO `requireAuth`). The `tenantContext` middleware suffices.
**Warning signs:** App shell flashes "Tenant not found" or hangs at boot.

### Pitfall 9: Lambda warm container cache holding stale tenant data

**What goes wrong:** Tenant `foo` upgrades from `trial` → `paid` (M4 problem, but applies to ANY tenant field mutation). A Lambda warm container cached the tenant at 60s ago; user gets old `plan: trial` in `/api/tenants/current` for up to 60s.
**Why it happens:** In-memory cache TTL.
**How to avoid:** Demo-grade: live with it. M8: add SNS-based cache-bust. Phase 53 should NOT implement cache-bust (out of scope).
**Warning signs:** Engineer reports "I updated the plan but the API still says trial!"

### Pitfall 10: x-tenant-slug case-sensitivity

**What goes wrong:** CF Function sets `x-tenant-slug` (lowercase); backend reads `req.headers['X-Tenant-Slug']` (capitalized) — Express normalizes both to lowercase, so this works, BUT if someone writes `req.headers['X-Tenant-Slug']` thinking case matters, it returns `undefined` only on Node 18+ `node:http` direct usage.
**Why it happens:** HTTP headers ARE case-insensitive but JS objects ARE case-sensitive. Express normalizes; Node `http` doesn't.
**How to avoid:** Always read as `req.headers['x-tenant-slug']` (lowercase) — Pattern 4 above does this.
**Warning signs:** `Cannot read property 'trim' of undefined` in middleware.

---

## Code Examples

All examples in "Architecture Patterns" above. Cross-references for the planner:

| Pattern | File-paths to touch | Tested-against |
|---|---|---|
| Pattern 1 (ACM cert provisioning) | new `scripts/provision-wildcard-cert.sh` in `/Users/jeet/turion-space-demo/scripts/` | Live ACM API; mirrors existing zietra.com cert pattern |
| Pattern 2 (CF alias swap) | new `scripts/update-cloudfront-alias.sh` in same dir; OR inline in `53-02-PLAN.md` action block | Live `aws cloudfront get-distribution` dump |
| Pattern 3 (CF Function rewrite) | modify `/Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js` | Live `cloudfront-js-1.0` runtime; verified header API |
| Pattern 4 (tenant middleware) | new `backend/src/middleware/tenant.ts` in BOTH `turion-space-demo` AND `turion-satellite`; mount in respective `app.ts` | TypeScript + existing `pg.Pool`; mirrors `auth.ts` pattern |
| Pattern 5 (GET /current endpoint) | append to `/Users/jeet/turion-space-demo/backend/src/routes/tenants.ts` | Existing Express Router pattern (file ends at line 147) |
| Pattern 6 (browser sets header) | modify `erp-api.js` + `satellite/satellite-api.js` | Live `window.location.hostname` available everywhere |

---

## State of the Art

| Old Approach | Current Approach (2026) | When Changed | Impact |
|---|---|---|---|
| Lambda@Edge for header rewriting | CloudFront Functions | Nov 2021 (CFF GA) | 5× cheaper, 10× faster, but stricter (5ms, 10KB, no fetch) |
| Per-subdomain ACM certs | Wildcard cert with SANs | Always supported, but pre-2020 wildcard certs cost extra | AWS ACM has been free + wildcard-capable since launch; nothing changed, just best practice |
| Custom `Vary: Host` cache headers | CloudFront Cache Policies (`HeaderBehavior: whitelist`) | 2020 (cache/origin request policy GA) | More predictable than legacy "Forward Headers" — explicit cache key inclusion |
| Server-side tenant routing (Lambda parses subdomain) | Edge-side tenant routing (CF Function sets header, Lambda reads) | Phase 53 (this) | Lambda code stays simple; CF Function does the parsing once per request |

**Deprecated/outdated:**
- **"Forward Headers" legacy CloudFront config** — replaced by Cache Policies + Origin Request Policies. Current distro already uses the modern `CachePolicyId: 658327ea-...` (Managed-CachingOptimized).
- **CloudFront Lambda@Edge for simple URL/header rewrites** — Functions are the recommended replacement for sub-millisecond use cases.

---

## Open Questions

1. **Apex `zietra.com` routing**
   - What we know: Route 53 apex A-record points to **marketing distro `E1X82T89JWL8CA`**, NOT to `E37R9PT8IL44L2`. Therefore the CF Function's apex-redirect branch (Pattern 3) is unreachable today.
   - What's unclear: Does CONTEXT.md intend to RETARGET the apex Route 53 record to E37R9PT8IL44L2 (effectively killing the marketing distro)? Or leave the marketing distro authoritative for apex?
   - Recommendation: **Leave the apex on the marketing distro. DROP the apex-redirect branch from the CF Function.** Update CONTEXT.md line 36 ("Apex `zietra.com` Lands on a marketing/redirect page") to read "Apex stays on existing marketing distro `E1X82T89JWL8CA` — out of Phase 53 scope". Flag to user during planning.

2. **`turionspace.zietra.com` keeping its explicit alias or letting wildcard absorb it**
   - What we know: Per AWS docs, the wildcard `*.zietra.com` covers `turionspace.zietra.com` automatically.
   - What's unclear: CONTEXT.md says "keep it" — but this means the Aliases list has TWO redundant entries.
   - Recommendation: **Keep the explicit alias.** Per AWS rule "more specific wins" — if anyone ever adds `*.zietra.com` to ANOTHER distribution by accident, our explicit `turionspace.zietra.com` still wins. Belt-and-suspenders is cheap.

3. **CloudFront cache invalidation after CF Function update**
   - What we know: `update-function` + `publish-function` propagate to edge POPs within ~5 min, but cached responses (HTML with old content) survive until their TTL.
   - What's unclear: Do we need to invalidate `/*` after the CF Function update?
   - Recommendation: **YES, do an `/*` invalidation in Wave 2a.** Cost: ~$0 (first 1000 paths/month free). Benefit: smoke test in Wave 3 sees fresh content. Pattern: same as existing `deploy-frontend.sh:34`.

4. **`/api/tenants/current` for the SATELLITE Lambda — needed?**
   - What we know: Both Lambdas will get the `tenantContext` middleware (CONTEXT.md Rule 4). Only the ERP Lambda's `routes/tenants.ts` has the file structure for the endpoint.
   - What's unclear: Does the satellite frontend ALSO need `/api/tenants/current`? Or does it just call the ERP's?
   - Recommendation: **Mount it on BOTH** (mirror change per Rule 4). The satellite frontend calls its OWN APIGW (`rjydekliee.execute-api.us-east-1.amazonaws.com`), so it can't reach the ERP's endpoint without an extra cross-API hop. Two copies, identical SQL, identical schema → low-risk duplication. Satellite repo currently has NO `routes/tenants.ts` — need to CREATE one.

5. **Negative-cache TTL for unknown slugs**
   - What we know: A typo loop on a non-existent slug could hammer the DB.
   - What's unclear: Should we negative-cache?
   - Recommendation: **5-second negative cache on null lookups.** Pattern 4 above includes this. Demo-grade safety.

6. **Smoke harness — local or against deployed AWS?**
   - What we know: Phase 52's `scripts/smoke-phase-52.sh` runs against deployed AWS (Cognito + APIGW + Lambda) — no local mocks.
   - What's unclear: Should Phase 53's smoke run against deployed AWS too?
   - Recommendation: **YES.** Phase 53's smoke MUST verify: (a) `turionspace.zietra.com` returns 200; (b) signed-up tenant subdomain returns 200; (c) random subdomain returns clean 404; (d) reserved subdomain stays on its own distro; (e) `GET /api/tenants/current` returns correct shape for Turion. All via `curl` against live AWS. Reuses Phase 52's signup endpoint for (b).

7. **Phase 41 `/api/tenants/signup` interaction with `tenantContext`**
   - What we know: Signup is PUBLIC, no auth. User has no tenant yet.
   - What's unclear: Does signup need `tenantContextOptional`?
   - Recommendation: **NO middleware on `POST /api/tenants/signup`.** The endpoint creates the tenant; there's no slug to look up. The signup page sends NO `X-Tenant-Slug` header (or sends one we ignore). Pattern 4's `tenantContextOptional` is only useful for a public endpoint that COULD have a tenant — which doesn't really exist in Phase 53. Drop `tenantContextOptional` from the plan (YAGNI).

8. **Cert renewal mechanism for the new wildcard**
   - What we know: ACM auto-renews ~30 days before expiry as long as the validation CNAME stays in Route 53.
   - What's unclear: Anything else?
   - Recommendation: **No action needed.** Mirrors the SSL pinning rotation pattern from Phase 06 (CloudWatch alarms on `DaysToExpiry` already exist for `dollor.ai`; future M8 hygiene phase can add the same for `zietra.com` wildcard cert). NOT in Phase 53 scope.

---

## Sources

### Primary (HIGH confidence — verified live or against official AWS docs)

- Live `aws cloudfront get-distribution --id E37R9PT8IL44L2` (2026-05-14T19:33Z) — full distribution config, ETag, cert ARN, cache behaviors
- Live `aws cloudfront get-function --name turion-clean-urls --stage LIVE` — source code (5,812 B byte-identical to repo)
- Live `aws cloudfront list-distributions` — confirmed `app.zietra.com` is on a different distro (`E29O1YM0H7R2ZD`), wildcard precedence rule applies
- Live `aws cloudfront get-cache-policy --id 658327ea-f89d-4fab-a63d-7e88639e58f6` — Managed-CachingOptimized config (HeaderBehavior: none)
- Live `aws acm list-certificates --region us-east-1` — 6 zietra.com-related certs, no wildcard exists yet
- Live `aws acm describe-certificate --arn 45e1fb37-...` — current distro cert covers only `turionspace.zietra.com`, expires 2026-12-19
- Live `aws route53 list-resource-record-sets --hosted-zone-id Z090201115UMJZ8TIAX5G` — full zone state
- Live `aws apigatewayv2 get-apis` — both APIs have wildcard CORS already
- Live `aws apigatewayv2 get-api-mappings --domain-name api.zietra.com` — confirmed api.zietra.com is mapped to API `fzonke39pf` (NOT lo254mvukl)
- Live `aws lambda get-function-configuration` × 2 — both Lambda env-var inventories
- Live `curl -sI https://turionspace.zietra.com` → 200, `curl -sI https://api.zietra.com/api/health` → 404 (different API), direct APIGW → 200
- AWS CloudFront alternate domain names docs (`https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html`) — wildcard + specific overlap rule, more-specific wins
- AWS CloudFront Functions restrictions docs — 10KB / 5ms / runtime spec
- AWS CloudFront Functions event-structure docs — `request.headers.host.value` API, custom header forwarding
- AWS ACM DNS validation docs (`https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html`) — wildcard validation CNAME pattern (identical name+value for `*.example.com` and `example.com`)
- Phase 52 CHECKPOINT.md (`/Users/jeet/doordash-p2p/.planning/phases/52-.../CHECKPOINT.md`) — schemas, contracts, resource IDs, reserved slugs
- Phase 41 M1-COMPLETE.md — Cognito state, auth middleware contract
- Repo code: `cf-function-source/turion-clean-urls.js`, `backend/src/app.ts`, `backend/src/middleware/auth.ts`, `backend/src/routes/tenants.ts`, `backend/src/db.ts`, `backend/src/secrets.ts`, `backend/src/lambda.ts`, `erp-api.js`, `satellite/satellite-api.js`, `signup.html`, `deploy-frontend.sh`, `build-and-push.sh`, `scripts/generate-turion-config.sh` — all read directly

### Secondary (MEDIUM confidence — relied on official docs without live verification)

- ACM cert issuance latency (typically 1-5 min once CNAME propagates) — AWS docs state "up to 30 min" worst case
- CloudFront distribution propagation latency (5-10 min for global config changes) — operational knowledge; `aws cloudfront wait distribution-deployed` is the canonical wait
- Route 53 ALIAS record propagation latency (seconds-to-minutes; Route 53 has low TTLs internally) — operational knowledge

### Tertiary (LOW confidence — flagged for validation)

- Live `public.tenants` table row count = 1 (Turion only) — NOT verified live in this research because direct DB access requires URL-encoded password handling that the parallel-tool sandbox doesn't allow. Relying on Phase 52 CHECKPOINT.md as authoritative; high circumstantial confidence given Phase 52 closed today. **Planner should consider adding a `psql -c 'SELECT count(*) FROM public.tenants'` check at the top of the Wave 3 smoke for defense.**

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — every AWS service + endpoint verified live; npm deps already in repo
- Architecture: HIGH — both code patterns mirror existing established patterns in the repo (`auth.ts` → `tenant.ts`, `requireAuth` → `tenantContext`, `POST /signup` → `GET /current`)
- Pitfalls: HIGH — pitfalls 1-3 + 5-8 verified against AWS docs; pitfall 9-10 inferred from JS/Lambda semantics
- Wave ordering: HIGH — strict dependency chain (cert → CF cert+alias → backend middleware → smoke)
- Live state (tenants table): MEDIUM — CHECKPOINT.md authoritative; not re-verified via psql

**Research date:** 2026-05-14
**Valid until:** 2026-05-21 (one week — AWS API surface stable, but distribution/cert/route53 state could drift if other work touches it)

---

## RESEARCH COMPLETE

**Phase:** 53 — Wildcard subdomain routing `<tenant>.zietra.com`
**Confidence:** HIGH

### Key Findings

- **The CF Function CANNOT solve tenant resolution for `/api/*` calls** — those go BROWSER → APIGW directly (verified live), bypassing CloudFront entirely. The browser MUST set `X-Tenant-Slug` itself via a 4-line addition to `erp-api.js` + `satellite/satellite-api.js`. The CF Function still sets the header for static S3 requests (cosmetic / future-proofing).
- **APIGW HTTP API CORS is already wide-open (`*` for everything)** on both APIs — no APIGW config change needed for cross-origin `X-Tenant-Slug` to work.
- **`*.zietra.com` wildcard on E37R9PT8IL44L2 will NOT shadow `marquee.zietra.com`, `app.zietra.com`, `api.zietra.com`, etc** — AWS CloudFront precedence rule: "more specific name match wins" (verified against AWS docs).
- **Live CloudFront Function `turion-clean-urls` is 5,812 B (10KB cap)** — comfortable headroom for the ~1.5 KB Phase 53 prologue.
- **Apex `zietra.com` Route 53 record points to a DIFFERENT distribution** (marketing `E1X82T89JWL8CA`), NOT to `E37R9PT8IL44L2`. Therefore the CF Function's "redirect apex to /signup" branch (CONTEXT.md decision) would be DEAD CODE unless we retarget the apex DNS — recommend leaving apex on the marketing distro and dropping the apex-redirect branch from the CF Function.
- **Wave ordering is strict:** Wave 1 (cert + DNS) → Wave 2 (CF cert+alias + Function + backend middleware) → Wave 3 (smoke). The cert ARN from Wave 1 is an input to Wave 2.
- **No new npm deps needed** in either Lambda repo — `pg`, `express`, `@aws-sdk/*` are already installed.
- **Both Lambdas need the mirror change** — `turion-satellite/backend/src/middleware/tenant.ts` is identical to ERP's (CONTEXT.md Rule 4), AND the satellite repo needs a NEW `routes/tenants.ts` for its own `GET /api/tenants/current` (recommendation 4).

### File Created

`/Users/jeet/doordash-p2p/.planning/phases/53-m5-wildcard-subdomain-routing-tenant-zietra-com/53-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|---|---|---|
| Standard Stack | HIGH | Every service verified live or in repo; no new deps |
| Architecture | HIGH | Mirrors existing `auth.ts`/`requireAuth` patterns; clear single-file additions per repo |
| Pitfalls | HIGH | Verified against AWS docs + repo code-paths |
| Live AWS state | HIGH | Every resource ID + ETag + cert ARN extracted from `aws ... get-*` calls |
| Tenants table state | MEDIUM | CHECKPOINT.md authoritative; not psql-verified |
| Wave ordering | HIGH | Strict dependency chain; researcher confirms CONTEXT.md outline is sound |

### Open Questions (for planner to settle with user)

1. **Apex `zietra.com` handling** — CONTEXT.md says "redirect to /signup", but Route 53 apex points to a DIFFERENT distro. **Recommend:** drop apex-redirect from CF Function, leave apex on marketing distro. Flag during planning.
2. **`turionspace.zietra.com` explicit alias kept?** — yes (belt-and-suspenders per Pattern 2; CONTEXT.md agrees).
3. **`/api/tenants/current` mirrored on satellite Lambda?** — yes (Rule 4 mirror), need NEW `routes/tenants.ts` in satellite repo.
4. **Plaintext `ANTHROPIC_API_KEY` + `DATABASE_URL` on ERP Lambda** — known security debt, NOT in Phase 53 scope.
5. **Live `public.tenants` row count = 1?** — relying on CHECKPOINT.md; recommend adding a `SELECT count(*)` to the Wave 3 smoke for defense.

### Ready for Planning

Research complete. Planner can now create 53-01-PLAN.md (Wave 1: cert + DNS), 53-02-PLAN.md (Wave 2a: CF distro + Function + frontend), 53-03-PLAN.md (Wave 2b: backend middleware + GET /current — both Lambdas), and 53-04-PLAN.md (Wave 3: smoke + Phase 54 CHECKPOINT.md). All code skeletons + AWS CLI invocations are in this doc; planner should reference Pattern 1-6 directly in task action blocks.
