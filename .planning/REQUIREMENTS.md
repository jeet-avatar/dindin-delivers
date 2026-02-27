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

- [ ] **DBROT-01**: AWS Secrets Manager rotation Lambda enabled for RDS PostgreSQL (30-day cycle)
- [ ] **DBROT-02**: ECS force-redeployment triggered after each rotation to refresh credentials
- [ ] **DBROT-03**: Full rotation cycle validated on staging environment before production
- [ ] **DBROT-04**: Production rotation enabled after staging validation passes
- [ ] **DBROT-05**: Rotation runbook documented with monitoring and rollback procedures

### Rideshare E2E Testing

- [ ] **E2E-01**: Automated backend API test covering 12-step rideshare lifecycle (request, bid, accept, pickup, dropoff, payment, rating) against staging

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
| Real-device manual testing | Deferred to future — backend API E2E test covers business logic validation |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SSL-01 | — | Complete |
| SSL-02 | — | Complete |
| SSL-03 | — | Complete |
| SSL-04 | — | Complete |
| PLAY-01 | — | Pending |
| PLAY-02 | — | Complete |
| PLAY-03 | — | Pending |
| PLAY-04 | — | Complete |
| PLAY-05 | — | Pending |
| PLAY-06 | — | Complete |
| PLAY-07 | — | Pending |
| DBROT-01 | — | Pending |
| DBROT-02 | — | Pending |
| DBROT-03 | — | Pending |
| DBROT-04 | — | Pending |
| DBROT-05 | — | Pending |
| E2E-01 | — | Pending |

**Coverage:**
- v1.5 requirements: 17 total
- Mapped to phases: 0
- Unmapped: 17 (pending roadmap creation)

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after initial definition*
