# Dollor.ai Roadmap

## Milestones

- ✅ **v1.0 Production Release** — iOS apps, QA, security rounds 1+2, scaling, staging infra (shipped pre-2026-02-20)
- ✅ **v1.1 Security Hardening + Stability** — Phases 01-04 + 03.1 (shipped 2026-02-20)
- ✅ **v1.2 App Store Ready** — Endpoint auth, API alignment, Android fixes, CI stability, ops security (shipped 2026-02-21)
- ✅ **v1.3 Platform Hardening** — 276 endpoints auth-secured, 50 rate-limited, deployed to production (shipped 2026-02-22)
- [ ] **v1.4 App Release + INFRA** — API verification, app distribution, infrastructure cleanup (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 01: Infrastructure Cleanup** - Resolve deferred INFRA items from v1.3 (CloudFront header, key revocation, credentials)
- [x] **Phase 02: iOS API Verification** - Verify every API call in all 3 iOS apps against actual backend routes (completed 2026-02-23)
- [x] **Phase 03: Android API Verification** - Verify every API call in all 3 Android apps against actual backend routes (completed 2026-02-25)
- [x] **Phase 04: iOS Distribution** - Bump versions, build, and upload all 3 iOS apps to TestFlight (completed 2026-02-26)
- [ ] **Phase 05: Android Distribution** - Bump versions, build, and upload all 3 Android apps to Firebase App Distribution

## Phase Details

### Phase 01: Infrastructure Cleanup
**Goal**: All deferred infrastructure security items from v1.3 are resolved or formally dispositioned
**Depends on**: Nothing (first phase, independent of app work)
**Requirements**: INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. HTTP responses from api.dollor.ai no longer expose "uvicorn" in the Server header
  2. App Store Connect key JFVA7628SX is confirmed revoked, non-existent, or documented with rationale for keeping
  3. Every credential item listed under MEMORY.md "Remaining Security Items" has a resolution (fixed, rotated, or deferred with written rationale)
**Plans**: 1 plan

Plans:
- [x] 01-01-PLAN.md -- CloudFront response headers policy + key revocation + credential resolution

### Phase 02: iOS API Verification
**Goal**: Every API call in all 3 iOS apps is verified to hit an existing backend route with correct method, path, and auth
**Depends on**: Nothing (can run parallel to Phase 01 in theory, but sequential for solo dev)
**Requirements**: API-01, API-02, API-03
**Success Criteria** (what must be TRUE):
  1. Every URL path constructed in P2PAPIService.swift (Customer) matches a registered backend route in main_new.py or router files
  2. Every URL path constructed in the Driver app's API service matches a registered backend route
  3. Every URL path constructed in the Restaurant app's API service matches a registered backend route
  4. Any mismatches found are documented with fix plan (backend alias or client fix)
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md -- Verify iOS Customer app API calls (P2PAPIService + TripBoardService + ChatService + NegotiationService + CallService + LegalService + DollorV3Service + ACHPaymentService)
- [x] 02-02-PLAN.md -- Verify iOS Driver app API calls (P2PAPIService driver functions + direct ViewModel/View API calls)
- [x] 02-03-PLAN.md -- Verify iOS Restaurant app API calls (P2PAPIService vendor functions + AIEmployeeService) + consolidated FIX_PLAN.md

### Phase 03: Android API Verification
**Goal**: Every API call in all 3 Android apps is verified to hit an existing backend route with correct method, path, and auth
**Depends on**: Nothing (independent of iOS verification)
**Requirements**: API-04, API-05, API-06
**Success Criteria** (what must be TRUE):
  1. Every Retrofit endpoint in the Customer app's API service matches a registered backend route
  2. Every Retrofit endpoint in the Driver app's API service matches a registered backend route
  3. Every Retrofit endpoint in the Partner (Restaurant) app's API service matches a registered backend route
  4. Any mismatches found are documented with fix plan (backend alias or client fix)
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md -- Verify Android Customer app API calls (DollorApiService customer sections + CustomerRideshareApiService OkHttp)
- [x] 03-02-PLAN.md -- Verify Android Driver app API calls (DollorApiService driver sections + DocumentsViewModel direct calls)
- [x] 03-03-PLAN.md -- Verify Android Partner (Restaurant) app API calls + consolidated FIX_PLAN.md

### Phase 04: iOS Distribution
**Goal**: All 3 iOS apps have bumped version/build numbers and are uploaded to TestFlight for testing
**Depends on**: Phase 02 (iOS API verification must pass before shipping builds)
**Requirements**: DIST-01, DIST-02, DIST-03
**Success Criteria** (what must be TRUE):
  1. Customer app build number is incremented and the build is visible in TestFlight
  2. Driver app build number is incremented and the build is visible in TestFlight
  3. Restaurant app build number is incremented and the build is visible in TestFlight
  4. All 3 builds point to production API URL (api.dollor.ai)
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md -- Apply iOS API fixes (8 P2PAPIService fixes) + backend fixes (driver doc alias, vendor self-delete)
- [ ] 04-02-PLAN.md -- Bump build numbers (Customer 1096, Driver 204, Restaurant 173), deploy backend, archive + upload to TestFlight

### Phase 05: Android Distribution
**Goal**: All 3 Android apps have bumped version/build numbers and are uploaded to Firebase App Distribution
**Depends on**: Phase 03 (Android API verification must pass before shipping builds)
**Requirements**: DIST-04, DIST-05, DIST-06
**Success Criteria** (what must be TRUE):
  1. Customer app versionCode is incremented and the APK/AAB is uploaded to Firebase App Distribution
  2. Driver app versionCode is incremented and the APK/AAB is uploaded to Firebase App Distribution
  3. Restaurant (Partner) app versionCode is incremented and the APK/AAB is uploaded to Firebase App Distribution
  4. All 3 builds point to production API URL (api.dollor.ai)
**Plans**: TBD

Plans:
- [ ] 05-01: Bump, build, and upload Android Customer app
- [ ] 05-02: Bump, build, and upload Android Driver app
- [ ] 05-03: Bump, build, and upload Android Restaurant (Partner) app

<details>
<summary>v1.3 Platform Hardening (Phases 01-03) -- SHIPPED 2026-02-22</summary>

- [x] Phase 01: Customer + Driver Endpoint Auth (3/3 plans) -- 127 endpoints with role-specific Depends() + ownership checks
- [x] Phase 02: Vendor + Admin Endpoint Auth (4/4 plans) -- 120+ vendor/admin endpoints, gap closure, AUTH-06 audit
- [x] Phase 03: Rate Limiting Expansion (2/2 plans) -- 50 endpoints rate-limited via Redis (password reset, registration, payment, admin)
- [ ] Phase 04: Infrastructure Security (skipped) -- INFRA items deferred to v1.4

Full archive: `.planning/milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>v1.2 App Store Ready (Phases 01-05) -- SHIPPED 2026-02-21</summary>

- [x] Phase 01: Finish Endpoint Auth (3/3 plans) -- 32 per-endpoint Depends() guards, 93 dead stubs deleted
- [x] Phase 02: API Endpoint Standardization (3/3 plans) -- 9 route aliases, 3 iOS fixes, production deployed
- [x] Phase 03: Android Fixes (1/1 plan) -- 5 path fixes, staging URLs, photo URL centralization
- [x] Phase 04: Fix CI + API Contract Tests (2/2 plans) -- 208 contract tests, CI env vars fixed
- [x] Phase 05: Ops Security (3/3 plans) -- credentials removed, 61 URL fixes, CLAUDE.md updated

Full archive: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>v1.1 Security Hardening + Stability (Phases 01-04) -- SHIPPED 2026-02-20</summary>

- [x] Phase 01: Unit Test Fixes (1/1 plan) -- 17 stale assertions fixed, CI green
- [x] Phase 02: Security Auth Fix (1/1 plan) -- 170+ endpoints secured, auth_utils.py created
- [x] Phase 03: Deploy Security Auth (2/2 plans) -- staging + production via CI/CD
- [x] Phase 03.1: Endpoint Validation Guardrails (1/1 plan) -- API registry, CLAUDE.md rules
- [x] Phase 04: Documentation Overhaul (2/2 plans) -- CLAUDE.md, GROUND_TRUTH, xcconfig fixed

Full archive: `.planning/milestones/v1.1-ROADMAP.md`

</details>

## Progress

**Execution Order:** 01 -> 02 -> 03 -> 04 -> 05

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 01. Infrastructure Cleanup | 1/1 | Complete    | 2026-02-22 |
| 02. iOS API Verification | 3/3 | Complete   | 2026-02-23 |
| 03. Android API Verification | 3/3 | Complete    | 2026-02-25 |
| 04. iOS Distribution | 2/2 | Complete   | 2026-02-26 |
| 05. Android Distribution | 0/3 | Not started | - |

---
*Roadmap created: 2026-02-21*
*Last updated: 2026-02-25*
