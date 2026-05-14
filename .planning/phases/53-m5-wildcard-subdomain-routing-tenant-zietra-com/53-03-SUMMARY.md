---
phase: 53-m5-wildcard-subdomain-routing-tenant-zietra-com
plan: 03
subsystem: backend-tenant-context
tags: [m5, multi-tenant, middleware, express, tenant-context, mirror-change]
status: complete
requirements:
  - BackendTenantContextMiddleware
  - TenantConfigEndpoint
dependency-graph:
  requires:
    - 53-01 (acm-wildcard-cert + R53 wildcard alias — done)
    - 52-02 (tenants table + tenant_features table + signup endpoint — done)
    - 41-* (Cognito-only auth, requireAuth middleware — must remain intact)
  provides:
    - tenant-resolution-data-path
    - public-GET-api-tenants-current
    - browser-X-Tenant-Slug-injection
  affects:
    - 53-04 (end-to-end smoke can now exercise the full path)
    - 54-* (M6 app shell will call GET /api/tenants/current at boot)
tech-stack:
  added: []
  patterns:
    - 60s positive in-memory cache + 5s negative cache (Map<slug, {tenant, expiresAt}>) per warm Lambda container
    - Per-route middleware mount (NOT app-wide) — coexists with requireAuth, doesn't break public routes
    - Pre-SQL slug regex validation /^[a-z0-9-]{3,32}$/ — avoids DB load on malformed values
    - Hardened catch (no err.message leak)
    - Browser-side host→slug computation (mirrors CF Function logic — defense in depth)
key-files:
  created:
    - /Users/jeet/turion-space-demo/backend/src/middleware/tenant.ts (84 lines)
    - /Users/jeet/turion-satellite/backend/src/middleware/tenant.ts (84 lines, mirror — 2-line diff)
    - /Users/jeet/turion-satellite/backend/src/routes/tenants.ts (38 lines)
  modified:
    - /Users/jeet/turion-space-demo/backend/src/routes/tenants.ts (+31 lines — GET /current handler)
    - /Users/jeet/turion-satellite/backend/src/app.ts (+2 lines — public mount)
    - /Users/jeet/turion-space-demo/erp-api.js (+17 lines — computeTenantSlug + header injection)
    - /Users/jeet/turion-space-demo/satellite/satellite-api.js (+17 lines — mirror)
decisions:
  - Pre-SQL slug regex pre-check returns 404 (not 400) for invalid format — matches "unknown tenant" semantics from caller's perspective (research §Pitfall recommendation)
  - Public /api/tenants/current mounted via per-route middleware chain (tenantContext only) — no requireAuth — slug from header is sufficient identifier
  - Browser sends X-Tenant-Slug from window.location.hostname even though CloudFront Function would also set it — API calls go DIRECTLY to APIGW, bypassing CF (per research §"CRITICAL architectural fact")
  - Mirror discipline: middleware files differ only on the 'Mirror file:' comment-pointer line (2 lines of diff). Routes file diverges intentionally (signup is ERP-only).
metrics:
  duration_seconds: 520
  duration_human: 8m 40s
  tasks_completed: 3
  files_created: 3
  files_modified: 4
  completed_date: 2026-05-14
---

# Phase 53 Plan 03: Backend tenant middleware + GET /api/tenants/current (BOTH backends — mirror) + browser X-Tenant-Slug injection Summary

Both backend Lambdas (`turion-demo-api` + `turion-satellite-api`) now expose a public `GET /api/tenants/current` that resolves the tenant from the `X-Tenant-Slug` request header (60s positive / 5s negative cache, 400 missing / 404 unknown / 500 DB-error contract); both browser-side wrappers (`erp-api.js` + `satellite/satellite-api.js`) compute the slug from `window.location.hostname` at IIFE load and stamp the header on every `/api/*` fetch — closing the loop with Wave 2a (53-02) and unblocking Phase 54 (M6 app shell).

## What shipped

### Backend mirror change (Rule 4)
- **NEW** `/Users/jeet/turion-space-demo/backend/src/middleware/tenant.ts` — Express middleware that:
  - reads `req.headers['x-tenant-slug']` (Express lowercases by default — Pitfall 10)
  - returns `400 {error: "Missing X-Tenant-Slug header"}` on empty header
  - returns `404 {error: "Unknown tenant"}` on malformed-format slug (pre-SQL regex guard) or DB-row-not-found
  - returns `500 {error: "Tenant lookup failed"}` on DB error (hardened — no `err.message` echoed to client)
  - caches positive lookups for 60s (`CACHE_TTL_MS`) and negative lookups for 5s (`NEG_CACHE_TTL_MS`) in a module-scope `Map<slug, {tenant, expiresAt}>`
  - exposes `TenantContext` type and ambient `Request.tenant` augmentation
- **NEW** `/Users/jeet/turion-satellite/backend/src/middleware/tenant.ts` — byte-mirror of the ERP version (2-line diff in the "Mirror file:" comment-pointer only).
- **EXTENDED** `/Users/jeet/turion-space-demo/backend/src/routes/tenants.ts` with `r.get('/current', tenantContext, …)` — queries `public.tenant_features WHERE enabled=true ORDER BY module_code` and returns `{id, slug, name, plan, trial_ends_at, features: [...]}`.
- **NEW** `/Users/jeet/turion-satellite/backend/src/routes/tenants.ts` — same `/current` handler, NO signup (Phase 52 single-source-of-truth contract).
- **EDITED** `/Users/jeet/turion-satellite/backend/src/app.ts` — mounted `/api/tenants` publicly alongside `/api/health`. (Satellite never used app-level `requireAuth`; it uses per-route `requireAuth` inside individual routers — no ordering risk.)

### Frontend mirror change
- `erp-api.js` + `satellite/satellite-api.js` both got:
  1. `computeTenantSlug()` helper at IIFE load (mirrors the CF Function host-extraction logic):
     - `turionspace.zietra.com` → `'turion'` (legacy alias preserved)
     - `<anything>.zietra.com` → strip `.zietra.com` suffix
     - localhost / non-zietra → `'turion'` (dev fallback)
  2. `var TENANT_SLUG = computeTenantSlug();` (stamped once per page load, not per request — hostname is stable)
  3. `'X-Tenant-Slug': TENANT_SLUG,` line in the `doFetch` headers object (between `Content-Type` and `...opts.headers` so test overrides still work).
- `signup.html` left untouched — signup happens BEFORE the tenant exists, no slug to send (Phase 52 contract preserved).

## Deployment

| Lambda | Pre CodeSha256 | Post CodeSha256 | LastUpdateStatus |
|---|---|---|---|
| `turion-demo-api` (ERP) | `9c440e43…721526` | `efb8d369…079695` | Successful |
| `turion-satellite-api` (Sat) | `10b9ecb4…039dc9` | `19c656b4…f7eee` | Successful |

Both Lambdas deployed via `./build-and-push.sh` (per CLAUDE.md — NEVER raw `aws lambda update-function-code`). Frontend deployed via `./deploy-frontend.sh` from `turion-space-demo` (owns the static bucket). CloudFront invalidation `ICBO9X1FA5ZNCHA3M8DYRSB9HG` → Completed.

## Smoke transcript

### ERP Lambda (`lo254mvukl.execute-api.us-east-1.amazonaws.com`)

| Case | Request | Expected | Actual |
|---|---|---|---|
| A — valid slug | `GET /api/tenants/current` + `X-Tenant-Slug: turion` | 200 + `{slug:"turion", plan:"paid", features:[13 codes]}` | **200**, shape OK, `len(features)=13` |
| B — missing header | `GET /api/tenants/current` (no header) | 400 + `Missing X-Tenant-Slug header` | **400** `{"error":"Missing X-Tenant-Slug header"}` |
| C — unknown slug | `GET /api/tenants/current` + `X-Tenant-Slug: nonexistent-slug-53-03` | 404 + `Unknown tenant` | **404** `{"error":"Unknown tenant"}` |
| D — Phase 52 regression | `POST /api/tenants/signup` empty `{}` | 400 + `Valid email required` (signup mount must NOT have tenantContext) | **400** `{"error":"Valid email required"}` |
| E — Phase 41 regression | `GET /api/data/all` (no bearer) | 401 (requireAuth still enforced) | **401** |

### Satellite Lambda (`rjydekliee.execute-api.us-east-1.amazonaws.com`)

| Case | Request | Expected | Actual |
|---|---|---|---|
| A — valid slug | `GET /api/tenants/current` + `X-Tenant-Slug: turion` | 200 + same payload as ERP | **200**, IDENTICAL JSON to ERP (proves Rule 4 mirror works at runtime) |
| B — missing header | `GET /api/tenants/current` (no header) | 400 | **400** `{"error":"Missing X-Tenant-Slug header"}` |
| C — unknown slug | `GET /api/tenants/current` + `X-Tenant-Slug: nonexistent-slug-53-03` | 404 | **404** `{"error":"Unknown tenant"}` |
| D — Phase 41 regression | `GET /api/satellites` (no bearer) | 401 (per-route requireAuth still enforced) | **401** |
| E — Phase 38 regression | `GET /api/health` | 200 (no tenant required for health) | **200** |

## Sample successful `/api/tenants/current` payload (for Phase 54 consumption)

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "slug": "turion",
  "name": "Turion Space",
  "plan": "paid",
  "trial_ends_at": "2026-06-13T17:56:28.364Z",
  "features": [
    "ai-agents",
    "asc606",
    "crm",
    "dropship",
    "items",
    "lean-erp-pro",
    "mes",
    "plm",
    "purchase",
    "qb-migration",
    "quality",
    "royalty",
    "sales"
  ]
}
```

**Both Lambdas return byte-identical JSON for this payload** — same database, same query, same handler shape. Phase 54 can consume either endpoint and get the same data; the only difference is which APIGW URL the static page is configured against.

## Frontend (deployed `turionspace.zietra.com`)

```
curl https://turionspace.zietra.com/erp-api.js                | grep -c "X-Tenant-Slug"           # → 1
curl https://turionspace.zietra.com/satellite/satellite-api.js | grep -c "X-Tenant-Slug"           # → 1
curl https://turionspace.zietra.com/erp-api.js                | grep -c "function computeTenantSlug"  # → 1
curl https://turionspace.zietra.com/satellite/satellite-api.js | grep -c "function computeTenantSlug"  # → 1
```

## Mirror-diff evidence (Rule 4)

```
diff /Users/jeet/turion-space-demo/backend/src/middleware/tenant.ts \
     /Users/jeet/turion-satellite/backend/src/middleware/tenant.ts
6c6
< // Mirror file: /Users/jeet/turion-satellite/backend/src/middleware/tenant.ts
---
> // Mirror file: /Users/jeet/turion-space-demo/backend/src/middleware/tenant.ts
```

Total diff: 2 lines (1 deletion + 1 addition — the cross-repo comment pointer). Behavior identical, modulo file-path metadata.

## Git commits

| Repo | SHA | Subject |
|---|---|---|
| turion-space-demo | `a57c4e0` | feat(53-03): tenantContext middleware + GET /api/tenants/current (ERP) |
| turion-space-demo | `c723af5` | feat(53-03): browser sends X-Tenant-Slug on every /api/* fetch |
| turion-satellite  | `b4afa6f` | feat(53-03): tenantContext middleware + GET /api/tenants/current (mirror) |

Both repos pushed to `origin/main` (git author `jeet-avatar <jm@techcloudpro.com>` per PERMANENT memory rule).

## Deviations from Plan

None — plan executed exactly as written. Three Rule-3-style autonomous decisions worth noting:

1. **Satellite `app.ts` mount order:** the plan's verifier expected `tenantContext` to come BEFORE any `requireAuth` in app.ts. Satellite never uses `requireAuth` at the app-level — it's per-route inside each router (`bom.ts`, `parts.ts`, etc.). So the public `app.use('/api/tenants', tenants)` mount has no ordering risk; placed it right after `/api/health` for grouping clarity.
2. **Phase 52 signup imports:** added `import { tenantContext } from '../middleware/tenant';` to the existing ERP `routes/tenants.ts` (not just inline before the new handler) — keeps imports grouped at top, no behavioral change to signup.
3. **No verifier-script false-positive treated as failure:** the plan's Sub-step 1h regex-based mount-order check matched the word `requireAuth` inside my comment _"PUBLIC (no requireAuth)"_ — confirmed manually that satellite has no `requireAuth` in `app.ts` and the comment is the only mention, so the FAIL signal was a verifier-regex artifact.

No Rule-4 architectural changes. No checkpoints reached. No auth gates encountered.

## Hand-off for 53-04

53-04 end-to-end smoke can now exercise the full path:

1. Sign up a fresh tenant `smoke53-N` via `POST /api/tenants/signup` (Phase 52 endpoint, no tenant header needed)
2. Wait ~5s for the negative-cache entry (if any prior 404 was hit) to expire
3. From `<smoke53-N>.zietra.com` (now wildcard-routed thanks to 53-02), the browser computes `TENANT_SLUG='smoke53-N'` and sends it on every fetch
4. `curl -H 'X-Tenant-Slug: smoke53-N' https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/tenants/current` should return `{slug:"smoke53-N", plan:"trial", features:[13 codes from MODULE_CODES seed]}`
5. Turion itself (`turionspace.zietra.com`) still resolves to slug `turion` via the legacy-alias branch in `computeTenantSlug()`

## Self-Check: PASSED

Verified during execution:
- Both middleware files exist + export `tenantContext`
- ERP `routes/tenants.ts` has both `POST /signup` (Phase 52) and `GET /current` (Phase 53)
- Satellite `routes/tenants.ts` exists with ONLY `GET /current` (no Cognito imports)
- Satellite `app.ts` mounts `/api/tenants` publicly
- Both backends `npx tsc --noEmit` exit 0
- Both Lambda CodeSha256 changed + `LastUpdateStatus = Successful`
- All 10 smoke cases (5 ERP + 5 Sat) PASS
- Deployed frontend wrappers contain `X-Tenant-Slug` and `computeTenantSlug`
- 3 commits pushed to origin/main across both repos
