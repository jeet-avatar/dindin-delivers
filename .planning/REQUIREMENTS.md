# Requirements: Dollor.ai v1.3 Platform Hardening

**Defined:** 2026-02-21
**Core Value:** Drivers keep 100% of delivery fees and tips

## v1.3 Requirements

### Endpoint Auth Completion

- [x] **AUTH-01**: All customer endpoints have per-endpoint Depends(require_customer) with ownership checks
- [x] **AUTH-02**: All driver endpoints have per-endpoint Depends(require_driver) with ownership checks
- [ ] **AUTH-03**: All vendor endpoints have per-endpoint Depends(require_vendor) with ownership checks
- [ ] **AUTH-04**: All admin endpoints have per-endpoint Depends(require_admin) role checks
- [ ] **AUTH-05**: All remaining middleware-only endpoints converted to per-endpoint Depends()
- [ ] **AUTH-06**: Zero endpoints rely solely on global middleware for auth (all have explicit Depends)

### Rate Limiting

- [ ] **RATE-01**: Password reset endpoint rate-limited (prevent abuse)
- [ ] **RATE-02**: Payment/checkout endpoints rate-limited (prevent duplicate charges)
- [ ] **RATE-03**: Admin mutation endpoints rate-limited (prevent accidental mass operations)
- [ ] **RATE-04**: Registration endpoints rate-limited (prevent bot signups)
- [ ] **RATE-05**: Rate limit responses return proper 429 status with Retry-After header

### Infrastructure Security

- [ ] **INFRA-01**: CloudFront response headers policy suppresses uvicorn server header
- [ ] **INFRA-02**: App Store Connect key JFVA7628SX confirmed revoked or non-existent
- [ ] **INFRA-03**: All credential items from MEMORY.md "Remaining Security Items" addressed or explicitly deferred with rationale

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
| Production DB password rotation | Requires coordinated ECS+RDS downtime window — deferred |
| Play Store publishing | Separate milestone — different scope (app metadata, screenshots, review process) |
| New feature development | v1.3 is hardening only — no new user-facing features |
| Git history rewrite for .p8 keys | Key revocation makes history copies useless per v1.2 decision |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 01 | Complete |
| AUTH-02 | Phase 01 | Complete |
| AUTH-03 | Phase 02 | Pending |
| AUTH-04 | Phase 02 | Pending |
| AUTH-05 | Phase 02 | Pending |
| AUTH-06 | Phase 02 | Pending |
| RATE-01 | Phase 03 | Pending |
| RATE-02 | Phase 03 | Pending |
| RATE-03 | Phase 03 | Pending |
| RATE-04 | Phase 03 | Pending |
| RATE-05 | Phase 03 | Pending |
| INFRA-01 | Phase 04 | Pending |
| INFRA-02 | Phase 04 | Pending |
| INFRA-03 | Phase 04 | Pending |

**Coverage:**
- v1.3 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-02-21*
*Last updated: 2026-02-21 after roadmap creation*
