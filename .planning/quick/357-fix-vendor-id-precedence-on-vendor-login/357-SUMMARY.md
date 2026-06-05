---
title: Quick-357 — fix vendor-id precedence on vendor login
date: 2026-06-05
status: deployed-to-production
commits:
  - a569e7df fix(quick-357): prefer user.vendor_id over user.id in getCurrentVendorId
  - 6acd8223 fix(quick-357): merge top-level vendor_id + business_name into stored user on vendor login
---

# Quick-357 Summary

## Problem
`getCurrentVendorId()` in `apps/web/p2p-platform/frontend/src/app/api/api.ts` preferred `user.id` (auth User table PK = 125 for demo restaurant) over `user.vendor_id` (Vendor table PK = 40). All vendor screens — Profile, MenuManagement, Earnings, AIInsights, and the orders list — queried the wrong id and showed "No orders" / "No menu" even when DOLL... orders existed for vendor 40.

## Files changed
- `apps/web/p2p-platform/frontend/src/app/api/api.ts:18-37` — precedence swap: `user.vendor_id` wins over `user.id`.
- `apps/web/p2p-platform/frontend/src/app/screens/auth/VendorLogin.tsx:140-150` — merge top-level `vendor_id` + `business_name` from `/api/auth/vendor/login` response into the stored user object so `getCurrentVendorId()` has the field to read.

## Verification (production)

### Backend login response shape — correct
```
POST https://api.dollor.ai/api/auth/vendor/login (form data)
HTTP 200
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "vendor_id": 40,                    ← top-level
  "business_name": "Apple Test Restaurant",
  "email": "demo.restaurant@dollor.ai",
  "user": {
    "id": 125,
    "vendor_id": 40,                  ← also nested (backend already does this; the frontend fix uses either path)
    "role": "vendor",
    ...
  }
}
```

### Frontend code path
- `getCurrentVendorId()` now returns `user.vendor_id` (= 40) first, falling back to `user.id` only if missing.
- `VendorLogin.tsx` merges `response.data.vendor_id` (40) into the stored `user` object before `localStorage.setItem('user', ...)`.
- 4 consumer screens (Profile, MenuManagement, Earnings, AIInsights) now hit `/api/vendors/40/...` instead of `/api/vendors/125/...`.

## Deploy

| Workflow | Run ID | Result |
|----------|--------|--------|
| Deploy to Dollor.ai (production, auto-trigger on push) | 26987576494 | ✅ success (7m38s) — Run Tests ✓, Deploy Backend ECS ✓, Deploy Frontend CloudFront ✓ |
| Deploy to Staging (manual dispatch) | 26987577590 | ❌ Wait-for-ECS timed out at 900s. Service was actually healthy ~54s after the timeout window closed (eventual 1/1 running, target registered). The 900s gate is too tight for staging. |
| CI/CD Pipeline | 26987576509 | ❌ Lint failures in **backend** files (`main_new.py`, `bid_routes.py`, alembic migration). API contract job died on `sqlite3.OperationalError`. **Pre-existing** — same failures present on every run for at least 5 prior commits going back to 2026-06-04. |
| Full-Stack Integration Tests | 26987576512 | ❌ Postgres container init: `role "root" does not exist`. **Pre-existing CI infra bug**. |

Production health: `https://api.dollor.ai/health` → `200 healthy`, db connected, version 1.0.18.

## Known issues (NOT caused by quick-357)

1. **Staging DB disconnected** — `https://d34u5ixl0bulv4.cloudfront.net/health` returns `unhealthy` with `database: disconnected (psycopg2.OperationalError)`. Likely the AWS Secrets Manager ↔ RDS drift pattern from the Jun 4 outage memory. Vendor login on staging returns 500 because the DB layer is unreachable. **Production is unaffected** — same code, same secret, different RDS endpoint. Recommend separate debug session: `/gsd:debug staging db disconnected`.
2. **`/erp/orders/vendor/{id}` returns 500 on production** — separate pre-existing backend bug in the route handler. The route exists (`main_new.py:16142`), the vendor_id resolves correctly, the response is just 500. Separate from quick-357. Vendors using the orders screen will still see "No orders" because the endpoint is broken, but the frontend is now passing the *right* id; the prior path was passing the wrong id AND the route was broken.
3. **CI/CD pipeline has been red on every commit for at least 5 days** — backend lint debt (~20 errors in `main_new.py` + `bid_routes.py`) blocking the quality gate. Worth a cleanup phase.

## Audit trail
- Branch: main (quick-mode commits to main per GSD config)
- Commits: `a569e7df`, `6acd8223`
- Working tree at quick task start: 2 untracked file modifications matching the planned diff (no surprise files)
- No backend changes in this task — frontend-only fix.

## Next
Phase B (insurance screenshot capture) starts next per user direction.
