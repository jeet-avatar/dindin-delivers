# Requirements: Dollor.ai v1.5 Production Readiness

**Defined:** 2026-02-26
**Core Value:** Drivers keep 100% of delivery fees and tips

## v1.5 Requirements

Requirements for production readiness milestone. Each maps to roadmap phases.

### SSL Pinning Rotation

- [x] **SSL-01**: iOS NetworkSecurity.swift migrated from leaf+intermediate pins to Amazon Root CA SPKI pins
- [x] **SSL-02**: New iOS builds uploaded to TestFlight with corrected SSL pins
- [x] **SSL-03**: CloudWatch alarm configured for ACM certificate DaysToExpiry metric on dollor.ai
- [x] **SSL-04**: SSL pinning rotation runbook documented with step-by-step procedures

### Play Store Publishing

- [ ] **PLAY-01**: Google Play Developer account created and verified (organization type)
- [x] **PLAY-02**: AAB release bundles built and signed for all 3 Android apps
- [ ] **PLAY-03**: Play App Signing configured with existing keystore as upload key
- [x] **PLAY-04**: Data Safety forms completed for all 3 apps (SDK data audit included)
- [ ] **PLAY-05**: Content rating (IARC) and CSAE compliance questionnaires completed for all 3 apps
- [x] **PLAY-06**: Store listing assets created (screenshots, feature graphics, descriptions) for all 3 apps
- [ ] **PLAY-07**: All 3 apps submitted for review and published on Google Play Store

### DB Password Rotation

- [x] **DBROT-01**: AWS Secrets Manager rotation Lambda enabled for RDS PostgreSQL (30-day cycle)
- [x] **DBROT-02**: ECS force-redeployment triggered after each rotation to refresh credentials
- [x] **DBROT-03**: Full rotation cycle validated on staging environment before production
- [x] **DBROT-04**: Production rotation enabled after staging validation passes
- [x] **DBROT-05**: Rotation runbook documented with monitoring and rollback procedures

### Rideshare E2E Testing

- [x] **E2E-01**: Automated backend API test covering 12-step rideshare lifecycle (request, bid, accept, pickup, dropoff, payment, rating) against staging

### Admin Portal UI

- [x] **ADMIN-01**: Vendor management screens (Main, DocumentReview, MenuReview) use `api` axios instance with auth interceptor -- no raw `fetch()` calls
- [x] **ADMIN-02**: Mock ERP dashboard tabs (Jira, NetSuite, ZIP, ProcessUtility, NetSuiteWolt) removed from dashboard and sidebar
- [x] **ADMIN-03**: Main dashboard wired to real `/api/dashboard/stats` and `/api/dashboard/recent-activity` endpoints
- [x] **ADMIN-04**: Sidebar navigation cleaned -- no links to nonexistent screens (JiraDashboard, NetsuiteDashboard, Transactions)
- [x] **ADMIN-05**: All mock data removed (mockData.ts, mockNetSuiteTransactions.ts, _mockVendors state)
- [x] **ADMIN-06**: VendorManagement data mapping aligned with actual backend Vendor model fields

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Real-Device Testing

- **RDEV-01**: Manual real-device testing protocol for 2-device rideshare E2E (customer + driver on cellular)
- **RDEV-02**: Push notification delivery verification for all 12 rideshare notification types on real devices
- **RDEV-03**: GPS tracking accuracy verification during active rides on real devices

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Client-side secret caching in database.py | ECS force-redeployment sufficient for 30-day rotation cycle; adds unnecessary code complexity |
| iOS App Store submission | TestFlight distribution for SSL pin fix; full App Store submission in future milestone |
| Alternating-user DB rotation strategy | Overkill for current scale (db.t3.micro, 2 ECS tasks); single-user rotation sufficient |
| Play Store paid app pricing | All apps are free; monetization is through platform matchmaking fees |
| Real-device manual testing | Deferred to future -- backend API E2E test covers business logic validation |
| Coupa Dashboard rewrite | Backend Coupa endpoints exist but may serve static data; audit deferred to future phase |
| Stripe Transactions screen | Finance section already covers revenue/payouts; separate transaction view not needed now |
| AI Dashboard | Not in sidebar, partially working -- leave as-is |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SSL-01 | 06 | Complete |
| SSL-02 | 06 | Complete |
| SSL-03 | 06 | Complete |
| SSL-04 | 06 | Complete |
| PLAY-01 | 07 | Pending |
| PLAY-02 | 07 | Complete |
| PLAY-03 | 07 | Pending |
| PLAY-04 | 07 | Complete |
| PLAY-05 | 07 | Pending |
| PLAY-06 | 07 | Complete |
| PLAY-07 | 07 | Pending |
| DBROT-01 | 08-01 | Complete |
| DBROT-02 | 08-01 | Complete |
| DBROT-03 | 08-01 | Complete |
| DBROT-04 | 08-02 | Complete |
| DBROT-05 | 08-02 | Complete |
| E2E-01 | 09 | Complete |
| ADMIN-01 | 12 | Complete |
| ADMIN-02 | 12 | Complete |
| ADMIN-03 | 12 | Complete |
| ADMIN-04 | 12 | Complete |
| ADMIN-05 | 12 | Complete |
| ADMIN-06 | 12 | Complete |

**Coverage:**
- v1.5 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

## Zietra Platform Milestone (M1–M8) Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CognitoUserPool | 39-01 | Complete |
| CognitoSesIntegration | 39-02 | Complete |
| UserMigrationFromSupabase | 39-03 | Complete |
| CognitoAuthCheckpoint | 39-04 | Complete |
| DualIssuerJwtMiddleware | 40 | Complete |
| CognitoJwksLoader | 40 | Complete |
| CognitoFrontendHelper | 40 | Complete |
| CognitoOnlyFrontend | 41 | Complete |
| CognitoOnlyBackend | 41 | Complete |
| SupabaseAuthDeprecation | 41 | Complete |
| TenantsTable | 52-01 | Complete |
| TenantFeaturesTable | 52-01 | Complete |
| MinimalTenantIdBackfill | 52-01 | Complete |
| TenantSignupFlow | 52-02 + 52-03 + 52-04 | Complete (E2E smoke 9/9 PASS) |
| WelcomeEmailViaSES | 52-02 + 52-04 | Complete (CloudWatch hit confirmed) |

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-05-14T18:33Z -- Phase 52 (M5) COMPLETE. Plan 52-04 end-to-end smoke 2/2 PASS verifies all 5 side effects (Cognito user + customer group + custom:role=customer, public.tenants row with plan=trial + matching owner_cognito_sub, 13 enabled tenant_features rows, CloudWatch `magic-link sent` log hit, 409-on-duplicate-slug + 409-on-reserved-slug + 400-on-empty-body). Turion baseline + M1 admin (jm@techcloudpro.com) intact via anchor-guarded cleanup. Phase 53 handoff CHECKPOINT.md ready for `/gsd:plan-phase 53` (wildcard subdomain routing).*
