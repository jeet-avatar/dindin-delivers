# Phase 53 CONTEXT — Wildcard subdomain routing `<tenant>.zietra.com`

> Successor to Phase 52 (signup creates `tenants` rows). Phase 53 wires `<slug>.zietra.com` so the row a user just signed up for becomes a working URL.

---

## Phase 53 scope (verbatim from ROADMAP)

Every signed-up tenant gets a working subdomain. Provision wildcard ACM cert (`*.zietra.com` in us-east-1, required by CloudFront), update the `turion-demo-static` CloudFront distribution to accept the wildcard alias OR create a new distribution for tenants. CloudFront Function (or Lambda@Edge) reads the subdomain from `Host` header, sets it as a custom header forwarded to the origin (S3 static + APIGW Lambda). Backend Lambdas read the tenant slug from the header on every authenticated request and stamp `req.tenant_id` for downstream handlers. Frontend tenant-specific config (e.g., logo, name, plan) loaded from `GET /api/tenants/current` at app shell init. Existing `turionspace.zietra.com` stays as the Turion tenant (alias for `turion.zietra.com`); new tenants reach the same S3/APIGW with a different subdomain.

**Requirement IDs (all 5 must be covered):**
- `WildcardACMCert`
- `CloudFrontWildcardAlias`
- `TenantSubdomainExtractor`
- `BackendTenantContextMiddleware`
- `TenantConfigEndpoint`

---

## LOCKED DECISIONS

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

---

## Critical scope boundaries

**IN:**
- 1 ACM cert (`*.zietra.com` + `zietra.com`)
- Update existing CloudFront distribution to use the new cert + add wildcard alias
- Update CloudFront Function `turion-clean-urls` (or split into a separate `tenant-router` function) to set `x-tenant-slug` based on Host
- Backend Lambda middleware: `tenant.ts` reads `x-tenant-slug` → loads tenant from DB → attaches to `req.tenant`
- Backend endpoint: `GET /api/tenants/current` (public, returns tenant summary)
- Route 53 records: wildcard `*.zietra.com` ALIAS + apex `zietra.com` ALIAS (keep existing turionspace alias)
- Smoke: provision a fresh tenant via signup, then verify `<slug>.zietra.com` returns 200 + correct tenant context

**OUT:**
- RLS on the DB (M3 — tenant_id column is just a label)
- Data isolation enforcement in queries (M3)
- Per-tenant DB connection / pgbouncer (M2 owns DB infrastructure)
- Stripe billing / paid plan logic (M4)
- App shell that uses `/api/tenants/current` (Phase 54 / M6)
- Marketing pages on apex `zietra.com` (M7)

**ABSOLUTELY OUT:**
- Touching the 4 `zietra-cognito-*` trigger Lambdas
- Modifying the Cognito user pool config
- Changing Phase 41 auth middleware (only ADD a tenant middleware that runs AFTER requireAuth)

---

## Pre-conditions

| Resource | State |
|---|---|
| Route 53 hosted zone | `zietra.com` → `Z090201115UMJZ8TIAX5G` (live) |
| CloudFront distribution | `E37R9PT8IL44L2` serving `turionspace.zietra.com` (live) |
| CloudFront Function | `turion-clean-urls` (live, has `/signup → /signup.html` rewrite from Phase 52) |
| ACM existing cert | Currently in distribution — covers ONLY `turionspace.zietra.com` (need to replace OR re-issue) |
| Other zietra.com tenants on the account | `marquee.zietra.com`, `asc606.zietra.com`, `meet.zietra.com` — these are on OTHER CloudFront distributions; the wildcard must NOT intercept them. Wildcard alias on this distribution is fine because each CloudFront distro is independently routed by ALIAS — DNS only resolves matching aliases. |
| Existing Route 53 records | `turionspace.zietra.com` ALIAS, `marquee.zietra.com` ALIAS (to its own CF), `asc606.zietra.com`, `meet.zietra.com`. Adding `*.zietra.com` ALIAS doesn't override the more-specific A/AAAA records — Route 53 picks the most-specific match. |
| Phase 52 signup endpoint | Live; creates `tenants` rows. Verified end-to-end. |
| Backend Lambdas | ERP `turion-demo-api` + satellite `turion-satellite-api` (both Cognito-only as of Phase 41) |

---

## Engineering rules (PERMANENT)

- **Rule 1:** No hardcoded slug→tenant_id maps. All lookups via `tenants` table.
- **Rule 2:** Every link works — typing `<random>.zietra.com` returns a 404 page (not a CloudFront generic error), and there's a CTA back to `/signup`.
- **Rule 3:** Smoke must prove: (a) Turion still works at `turionspace.zietra.com`; (b) a fresh-signed-up tenant's subdomain works; (c) random unknown subdomain returns 404 cleanly; (d) reserved-slug subdomain stays routed to its own existing CF distribution (marquee.zietra.com still serves marquee).
- **Rule 4:** Both backends (`turion-demo-api` + `turion-satellite-api`) get the SAME tenant-context middleware. Mirror change.
- **Rule 5:** No dead code from Phase 52 left over.
- **Rule 6:** No backup paths "in case wildcard fails." No fallback to a second CF distribution. One distribution, one cert, one CF Function.

---

## Autonomous mode

User authorized full autonomy through end of M5+M6. No human-action checkpoints. The only step that could request user input is **DNS validation of the ACM cert** — but that's automated (we add the validation CNAME via `aws route53` ourselves; ACM auto-detects).

---

## Open questions for the researcher

1. **Existing CF distribution config:** dump current `E37R9PT8IL44L2` config (`aws cloudfront get-distribution`). What's the current Aliases list, what cert ARN is attached, what cache behaviors exist, what origins are configured? Need this to plan the surgical update.
2. **Existing CF Function source:** dump current `turion-clean-urls` source. Plan 53 adds `x-tenant-slug` header logic — needs to coexist with existing URL rewrites (`/signup`, `/quickbooks`, `/satellite/*`, etc.).
3. **CloudFront Function size limit:** 10KB compiled. Make sure the new logic fits.
4. **Cert provisioning timing:** `aws acm request-certificate` + DNS validation typically takes 1-5min for `ISSUED` status. Plan should poll-wait, not hardcode a sleep.
5. **Lookup table inventory:** what tenants exist today? `SELECT slug, id, name, plan FROM public.tenants` — almost certainly just Turion (id=`00000000-...-001`) from Phase 52's seed.
6. **APIGW custom domain:** is `lo254mvukl.execute-api.us-east-1.amazonaws.com` reachable via a custom domain like `api.zietra.com`? If so, that's a separate APIGW custom domain step. If not, frontend calls the APIGW directly via the long URL (which is what `turion-config.js` already configures). Probably out-of-scope for Phase 53 — but flag it.
7. **In-memory cache TTL on Lambda:** 60s suggested. Should it invalidate on tenant updates? For Phase 53 demo-grade, 60s is fine (signup just-created tenants will work after at most one Lambda cold-start, which is ~1-2min). M8 can add cache-busting via an SNS topic.
8. **Frontend behavior:** existing pages don't know about tenants. For Phase 53, the simplest "tenant config endpoint" is just `GET /api/tenants/current` returning JSON — Phase 54 wires the app shell to consume it. Until then, every tenant subdomain serves the same Turion HTML (just with the right tenant context in the API responses if any code uses it — currently none do, which is fine).
9. **Backend `tenantContext` middleware ordering:** runs BEFORE `requireAuth` or AFTER? Recommended AFTER — `requireAuth` validates the JWT first, then `tenantContext` reads `x-tenant-slug` and stamps `req.tenant`. If user's JWT has a `custom:supabase_sub`/`custom:role` that ties to a specific tenant, the middleware can also verify match → 403 on mismatch. For Phase 53 demo-grade, accept any authenticated user on any tenant — strict isolation is M3.
10. **Edge case: user types `dollor.zietra.com` BEFORE the ACM cert reaches ISSUED.** Should serve a clear error page, not a TLS handshake failure. Provisioning ACM is synchronous-ish; once we move on to updating CF, the cert is already ISSUED.

---

## Recommended wave structure (researcher will refine)

- **Wave 1 (1 plan):** **53-01 — ACM cert + DNS records.** Request wildcard cert, validate, add Route 53 wildcard ALIAS + apex ALIAS. Cert reaches `ISSUED` before this plan completes. This plan must complete before the CF distribution can use it.
- **Wave 2 (parallel, 2 plans):**
  - **53-02 — CloudFront distribution + Function update.** Replace distribution's cert with new wildcard cert. Add `*.zietra.com` + `zietra.com` to Aliases. Update CF Function to compute `x-tenant-slug` from Host header.
  - **53-03 — Backend tenant middleware + GET /api/tenants/current endpoint** (both Lambdas, mirror change). Tenant resolver caches 60s. Public `/api/tenants/current` returns tenant summary.
- **Wave 3 (1 plan):** **53-04 — End-to-end smoke + Phase 54 CHECKPOINT.md.** Sign up a fresh tenant `smoke53-N`, verify `smoke53-N.zietra.com` returns 200, verify `/api/tenants/current` returns the right tenant, verify Turion's `turionspace.zietra.com` still works, verify random subdomain returns clean 404. Clean up. Write CHECKPOINT for Phase 54.

---

## Reference paths

- ROADMAP entry: `.planning/ROADMAP.md` Phase 53
- Phase 52 CHECKPOINT (input contract): `.planning/phases/52-m5-self-serve-signup-sandbox-provisioning-minimal-multi-tenancy-scaffolding/CHECKPOINT.md`
- ERP backend: `/Users/jeet/turion-space-demo/backend/`
- Satellite backend: `/Users/jeet/turion-satellite/backend/`
- CloudFront Function source: `/Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js`
- Deploy scripts: `/Users/jeet/turion-space-demo/build-and-push.sh`, `/Users/jeet/turion-space-demo/deploy-frontend.sh`
- Cognito secret: `zietra/cognito-config-yP3J9B`
- Global engineering rules: `/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/feedback_global_engineering_rules.md`

---

*Written 2026-05-14 for the autonomous M5 build. Researcher next.*
