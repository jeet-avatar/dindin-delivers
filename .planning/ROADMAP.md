# Dollor.ai Roadmap

## Milestones

- ✅ **v1.0 Production Release** — iOS apps, QA, security rounds 1+2, scaling, staging infra (shipped pre-2026-02-20)
- ✅ **v1.1 Security Hardening + Stability** — Phases 01-04 + 03.1 (shipped 2026-02-20)
- ✅ **v1.2 App Store Ready** — Endpoint auth, API alignment, Android fixes, CI stability, ops security (shipped 2026-02-21)
- ✅ **v1.3 Platform Hardening** — 276 endpoints auth-secured, 50 rate-limited, deployed to production (shipped 2026-02-22)
- ✅ **v1.4 App Store Distribution** — API verification (iOS + Android), app distribution (TestFlight + Firebase), infra cleanup (shipped 2026-02-26)
- 🚧 **v1.5 Production Readiness** — SSL pin fix, Play Store publishing, DB rotation, rideshare E2E (in progress)

## Phases

<details>
<summary>v1.4 App Store Distribution (Phases 01-05) -- SHIPPED 2026-02-26</summary>

- [x] Phase 01: Infrastructure Cleanup (1/1 plan) -- CloudFront headers, key audit, credential cleanup
- [x] Phase 02: iOS API Verification (3/3 plans) -- 256 calls audited, 11 mismatches fixed
- [x] Phase 03: Android API Verification (3/3 plans) -- all 3 apps verified, Retrofit/Gson fixes
- [x] Phase 04: iOS Distribution (2/2 plans) -- 3 apps to TestFlight (Customer 1095, Driver 203, Restaurant 172)
- [x] Phase 05: Android Distribution (3/3 plans) -- 3 apps to Firebase (Customer vC=27, Driver vC=24, Partner vC=20)

Full archive: `.planning/milestones/v1.4-ROADMAP.md`

</details>

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

### v1.5 Production Readiness (In Progress)

**Milestone Goal:** Graduate Android apps to Google Play, harden production infrastructure (DB rotation, SSL strategy), and validate rideshare E2E with real devices.

- [ ] **Phase 06: SSL Pinning Rotation Fix** - Migrate iOS from leaf pins to Amazon Root CA pins and ship updated builds
- [ ] **Phase 07: Play Store Publishing** - Set up Google Play Console and publish all 3 Android apps
- [ ] **Phase 08: DB Password Rotation** - Enable automated Secrets Manager rotation for RDS credentials
- [ ] **Phase 09: Rideshare E2E Validation** - Automated backend test covering full 12-step rideshare lifecycle

## Phase Details

### Phase 06: SSL Pinning Rotation Fix
**Goal**: iOS apps survive ACM certificate renewals without breaking API connectivity
**Depends on**: Nothing (urgent, first phase of v1.5)
**Requirements**: SSL-01, SSL-02, SSL-03, SSL-04
**Success Criteria** (what must be TRUE):
  1. iOS apps connect to api.dollor.ai using Amazon Root CA SPKI pins instead of leaf/intermediate pins
  2. Updated iOS builds are available on TestFlight with the corrected SSL pin configuration
  3. CloudWatch alarm fires when the dollor.ai ACM certificate is within 30 days of expiry
  4. A runbook exists with step-by-step instructions for handling future SSL pin changes
**Plans**: 2 plans (Wave 1 -- parallel)

Plans:
- [ ] 06-01-PLAN.md -- Replace leaf/intermediate SSL pins with 5 Amazon Root CA pins, build and upload all 3 iOS apps to TestFlight
- [ ] 06-02-PLAN.md -- Add CloudWatch ACM expiry alarms (30-day + 7-day) to Terraform, write rotation runbook

### Phase 07: Play Store Publishing
**Goal**: All 3 Android apps are publicly available on Google Play Store
**Depends on**: Phase 06 (sequential for milestone clarity, but no technical dependency)
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04, PLAY-05, PLAY-06, PLAY-07
**Success Criteria** (what must be TRUE):
  1. Google Play Developer account is active with organization verification complete
  2. All 3 Android apps (Customer, Driver, Partner) are signed with Play App Signing and AAB bundles are uploaded
  3. Data Safety forms accurately declare all SDK data collection for each app
  4. Content rating and CSAE compliance are approved for all 3 apps
  5. All 3 apps are published and installable from the Google Play Store
**Plans**: TBD

Plans:
- [ ] 07-01: Google Play Console setup and account verification
- [ ] 07-02: AAB builds, Play App Signing, Data Safety forms, content ratings
- [ ] 07-03: Store listing assets and app submission for all 3 apps

### Phase 08: DB Password Rotation
**Goal**: Production database credentials rotate automatically every 30 days with zero downtime
**Depends on**: Phase 06 (sequential for milestone clarity, but no technical dependency -- can parallel with Phase 07)
**Requirements**: DBROT-01, DBROT-02, DBROT-03, DBROT-04, DBROT-05
**Success Criteria** (what must be TRUE):
  1. Secrets Manager rotation Lambda successfully rotates the RDS password on a 30-day schedule
  2. ECS tasks automatically pick up new credentials via force-redeployment after each rotation
  3. A full rotation cycle has been validated on staging with zero service interruption
  4. Production rotation is active and has completed at least one successful cycle
  5. A runbook documents the rotation process, monitoring checks, and rollback procedure
**Plans**: TBD

Plans:
- [ ] 08-01: Configure rotation Lambda and staging validation
- [ ] 08-02: Enable production rotation and write runbook

### Phase 09: Rideshare E2E Validation
**Goal**: Rideshare business logic is continuously validated through automated lifecycle testing
**Depends on**: Phase 06, Phase 08 (runs after infrastructure changes are stable)
**Requirements**: E2E-01
**Success Criteria** (what must be TRUE):
  1. An automated test executes the full 12-step rideshare lifecycle (request, bid, accept, pickup, dropoff, payment, rating) against staging and passes
  2. The test can be run on-demand to verify rideshare integrity after any backend deployment
**Plans**: TBD

Plans:
- [ ] 09-01: Build and verify 12-step rideshare E2E test against staging

## Progress

**Execution Order:**
Phase 06 (SSL fix, urgent) -> Phase 07 (Play Store) -> Phase 08 (DB rotation) -> Phase 09 (E2E validation)

Note: Phases 07 and 08 are technically independent and could run in parallel.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 06. SSL Pinning Rotation Fix | v1.5 | 0/2 | Not started | - |
| 07. Play Store Publishing | v1.5 | 0/3 | Not started | - |
| 08. DB Password Rotation | v1.5 | 0/2 | Not started | - |
| 09. Rideshare E2E Validation | v1.5 | 0/1 | Not started | - |

---
*Roadmap created: 2026-02-21*
*Last updated: 2026-02-26 -- v1.5 roadmap created*
