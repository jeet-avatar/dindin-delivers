# Requirements: Dollor.ai v1.4 App Release + INFRA

**Defined:** 2026-02-22
**Core Value:** Drivers keep 100% of delivery fees and tips

## v1.4 Requirements

### API Verification

- [x] **API-01**: All iOS Customer app API calls verified against actual backend routes
- [x] **API-02**: All iOS Driver app API calls verified against actual backend routes
- [x] **API-03**: All iOS Restaurant app API calls verified against actual backend routes
- [x] **API-04**: All Android Customer app API calls verified against actual backend routes
- [x] **API-05**: All Android Driver app API calls verified against actual backend routes
- [x] **API-06**: All Android Restaurant app API calls verified against actual backend routes

### App Distribution

- [x] **DIST-01**: iOS Customer app version bumped, built, and uploaded to TestFlight
- [x] **DIST-02**: iOS Driver app version bumped, built, and uploaded to TestFlight
- [x] **DIST-03**: iOS Restaurant app version bumped, built, and uploaded to TestFlight
- [x] **DIST-04**: Android Customer app version bumped, built, and uploaded to Firebase App Distribution
- [x] **DIST-05**: Android Driver app version bumped, built, and uploaded to Firebase App Distribution
- [x] **DIST-06**: Android Restaurant app version bumped, built, and uploaded to Firebase App Distribution

### Infrastructure Security

- [x] **INFRA-01**: CloudFront response headers policy suppresses uvicorn server header
- [x] **INFRA-02**: App Store Connect key JFVA7628SX confirmed revoked or non-existent
- [x] **INFRA-03**: All credential items from MEMORY.md "Remaining Security Items" addressed or deferred with rationale

## Future Requirements

### Play Store Publishing
- **PLAY-01**: Android customer app published to Play Store
- **PLAY-02**: Android driver app published to Play Store
- **PLAY-03**: Android restaurant app published to Play Store

### Revenue Features
- **REV-01**: Investor portal with financial dashboard
- **REV-02**: AI employee automation system

## Out of Scope

| Feature | Reason |
|---------|--------|
| Play Store publishing | Separate milestone -- different scope (store listing, screenshots, review) |
| New feature development | v1.4 is verification + distribution only |
| Production DB password rotation | Requires coordinated ECS+RDS downtime -- deferred |
| App UI redesign | No UI changes -- verify + bump + distribute |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| API-01 | Phase 02 | Complete |
| API-02 | Phase 02 | Complete |
| API-03 | Phase 02 | Complete |
| API-04 | Phase 03 | Complete |
| API-05 | Phase 03 | Complete |
| API-06 | Phase 03 | Complete |
| DIST-01 | Phase 04 | Complete |
| DIST-02 | Phase 04 | Complete |
| DIST-03 | Phase 04 | Complete |
| DIST-04 | Phase 05 | Complete |
| DIST-05 | Phase 05 | Complete |
| DIST-06 | Phase 05 | Complete |
| INFRA-01 | Phase 01 | Complete |
| INFRA-02 | Phase 01 | Complete |
| INFRA-03 | Phase 01 | Complete |

**Coverage:**
- v1.4 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-02-22*
*Last updated: 2026-02-26 -- All 15 requirements complete (DIST-06 marked complete)*
