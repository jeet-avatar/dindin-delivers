# Dollor.ai Roadmap

## Milestones

- ✅ **v1.0 Production Release** — iOS apps, QA, security rounds 1+2, scaling, staging infra (shipped pre-2026-02-20)
- ✅ **v1.1 Security Hardening + Stability** — Phases 01-04 + 03.1 (shipped 2026-02-20)
- ✅ **v1.2 App Store Ready** — Endpoint auth, API alignment, Android fixes, CI stability, ops security (shipped 2026-02-21)

## Phases

<details>
<summary>v1.1 Security Hardening + Stability (Phases 01-04) — SHIPPED 2026-02-20</summary>

- [x] Phase 01: Unit Test Fixes (1/1 plan) — 17 stale assertions fixed, CI green
- [x] Phase 02: Security Auth Fix (1/1 plan) — 170+ endpoints secured, auth_utils.py created
- [x] Phase 03: Deploy Security Auth (2/2 plans) — staging + production via CI/CD
- [x] Phase 03.1: Endpoint Validation Guardrails (1/1 plan) — API registry, CLAUDE.md rules
- [x] Phase 04: Documentation Overhaul (2/2 plans) — CLAUDE.md, GROUND_TRUTH, xcconfig fixed

Full archive: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>v1.2 App Store Ready (Phases 01-05) — SHIPPED 2026-02-21</summary>

- [x] Phase 01: Finish Endpoint Auth (3/3 plans) — 32 per-endpoint Depends() guards, 93 dead stubs deleted
- [x] Phase 02: API Endpoint Standardization (3/3 plans) — 9 route aliases, 3 iOS fixes, production deployed
- [x] Phase 03: Android Fixes (1/1 plan) — 5 path fixes, staging URLs, photo URL centralization
- [x] Phase 04: Fix CI + API Contract Tests (2/2 plans) — 208 contract tests, CI env vars fixed
- [x] Phase 05: Ops Security (3/3 plans) — credentials removed, 61 URL fixes, CLAUDE.md updated

Full archive: `.planning/milestones/v1.2-ROADMAP.md`

</details>

### v1.3 Platform Hardening (In Progress)

**Milestone Goal:** Complete per-endpoint auth coverage for all 78 remaining endpoints, expand rate limiting to sensitive operations, fix CloudFront server header leak, and finalize credential revocation.

- [x] **Phase 01: Customer + Driver Endpoint Auth** - Add per-endpoint Depends() auth with ownership checks to all customer and driver endpoints (completed 2026-02-21)
- [x] **Phase 02: Vendor + Admin Endpoint Auth** - Add per-endpoint Depends() auth to all vendor and admin endpoints, achieving zero middleware-only endpoints (completed 2026-02-22)
- [ ] **Phase 03: Rate Limiting Expansion** - Extend Redis-based rate limiting from login to password reset, payment, admin mutations, and registration endpoints
- [ ] **Phase 04: Infrastructure Security + Final Verification** - Fix CloudFront server header, finalize credential revocation, deploy all changes, verify end-to-end

## Phase Details

### Phase 01: Customer + Driver Endpoint Auth
**Goal**: Every customer and driver endpoint enforces role-specific authentication with ownership checks at the endpoint level
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02
**Success Criteria** (what must be TRUE):
  1. Every customer endpoint rejects requests without a valid customer JWT (returns 401)
  2. Customer endpoints with user-specific data verify the authenticated customer owns the requested resource (returns 403 on mismatch)
  3. Every driver endpoint rejects requests without a valid driver JWT (returns 401)
  4. Driver endpoints with user-specific data verify the authenticated driver owns the requested resource (returns 403 on mismatch)
  5. Existing contract tests still pass after auth additions (no regressions)
**Plans:** 3/3 plans complete

Plans:
- [x] 01-01-PLAN.md -- Convert all customer endpoints in main_new.py to Depends(require_customer)
- [x] 01-02-PLAN.md -- Convert all driver + shared ride endpoints in main_new.py to Depends(require_driver) / Depends(require_any_auth)
- [x] 01-03-PLAN.md -- Add per-endpoint auth to all bid_routes.py endpoints + fix test regressions

### Phase 02: Vendor + Admin Endpoint Auth
**Goal**: Every vendor and admin endpoint enforces role-specific authentication, completing the transition from middleware-only to per-endpoint auth across the entire API surface
**Depends on**: Phase 01
**Requirements**: AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. Every vendor endpoint rejects requests without a valid vendor JWT (returns 401)
  2. Vendor endpoints with user-specific data verify the authenticated vendor owns the requested resource (returns 403 on mismatch)
  3. Every admin endpoint rejects requests without an admin JWT or ADMIN_SECRET_KEY (returns 401/403)
  4. Zero endpoints in the codebase rely solely on global middleware for auth -- every endpoint has an explicit Depends() declaration
  5. A grep/audit of the codebase confirms no endpoint handler function lacks an auth dependency parameter
**Plans:** 4/4 plans complete

Plans:
- [x] 02-01-PLAN.md -- Convert all vendor endpoints to Depends(require_vendor) with ownership checks
- [x] 02-02-PLAN.md -- Convert all admin endpoints to Depends(require_admin)
- [x] 02-03-PLAN.md -- Convert admin portal/ERP endpoints + final AUTH-06 verification audit
- [x] 02-04-PLAN.md -- Gap closure: convert 17 remaining oauth2_scheme endpoints + fix IDOR + test regression

### Phase 03: Rate Limiting Expansion
**Goal**: Sensitive operations beyond login are protected by rate limiting, preventing abuse of password reset, payment, admin, and registration endpoints
**Depends on**: Phase 01 (rate limiting is independent of auth completion, but Phase 01 establishes the auth pattern that rate-limited endpoints will use)
**Requirements**: RATE-01, RATE-02, RATE-03, RATE-04, RATE-05
**Success Criteria** (what must be TRUE):
  1. Password reset endpoint returns 429 after exceeding threshold (e.g., 5 requests/hour per email)
  2. Payment and checkout endpoints return 429 after exceeding threshold (e.g., 10 requests/minute per user)
  3. Admin mutation endpoints return 429 after exceeding threshold (e.g., 30 requests/minute per admin)
  4. Registration endpoints return 429 after exceeding threshold (e.g., 5 requests/hour per IP)
  5. All 429 responses include a Retry-After header with seconds until the limit resets
**Plans**: TBD

### Phase 04: Infrastructure Security + Final Verification
**Goal**: CloudFront stops leaking the uvicorn server header, all credential items are resolved, and the full v1.3 changeset is deployed and verified on staging then production
**Depends on**: Phase 02, Phase 03
**Requirements**: INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. Curl to api.dollor.ai returns a non-uvicorn Server header (or no Server header at all)
  2. App Store Connect key JFVA7628SX is confirmed revoked in App Store Connect console, or confirmed non-existent/already-revoked
  3. Every item in MEMORY.md "Remaining Security Items" section is either fixed or explicitly deferred with rationale in PROJECT.md
  4. All v1.3 changes are deployed to staging, smoke-tested, then deployed to production via CI/CD
  5. Production health check confirms 2/2 tasks HEALTHY after deployment
**Plans**: TBD

## Progress

**Execution Order:** Phase 01 -> Phase 02 -> Phase 03 -> Phase 04

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 01. Customer + Driver Endpoint Auth | 3/3 | Complete    | 2026-02-21 |
| 02. Vendor + Admin Endpoint Auth | 4/4 | Complete    | 2026-02-22 |
| 03. Rate Limiting Expansion | 0/TBD | Not started | - |
| 04. Infrastructure Security + Final Verification | 0/TBD | Not started | - |
