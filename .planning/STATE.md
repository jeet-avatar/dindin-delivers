# GSD Project State

**Project**: Dollor.ai Platform
**Status**: v1.3 Platform Hardening — Phase 01 COMPLETE (all 3 plans), ready for Phase 02
**Last activity**: 2026-02-21 — Plan 01-02 complete (driver + shared ride endpoint auth)

## Current Position

**Active Phase:** Phase 01 of 4 (Customer + Driver Endpoint Auth) -- COMPLETE
**Current Plan:** Plan 3 of 3 (all plans complete)
**Progress:** [██████████] 100%

## Wave Status

| Plan | Wave | File | Status | Commits |
|------|------|------|--------|---------|
| 01-01 | Wave 1 | main_new.py (customer) | COMPLETE | 88fe4f96, e61d0eba, 776c6714 |
| 01-03 | Wave 1 | bid_routes.py | COMPLETE | 17613d66, 78f9015d |
| 01-02 | Wave 2 | main_new.py (driver + shared ride) | COMPLETE | 0683a7c6, 85af5717 |

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Drivers keep 100% of delivery fees and tips
**Current focus:** Phase 01 — Customer + Driver Endpoint Auth

## Completed Milestones

- **v1.0** Production Release — shipped pre-2026-02-20
- **v1.1** Security Hardening + Stability — shipped 2026-02-20 (archive: `milestones/v1.1-ROADMAP.md`)
- **v1.2** App Store Ready — shipped 2026-02-21 (archive: `milestones/v1.2-ROADMAP.md`)

## Quick Reference
- Production API: `https://api.dollor.ai`
- Staging API: `https://d34u5ixl0bulv4.cloudfront.net`
- Production task-def: `dollor-api:372` (2/2 HEALTHY)
- Staging task-def: `dollor-api-staging:31`

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 18 min
- Total execution time: 55 min

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table.

- v1.3 roadmap: 4 phases — auth split by role (customer+driver / vendor+admin), rate limiting separate, infra+deploy final
- 01-01: Converted 49 customer endpoints to Depends(require_customer), kept shared ride endpoints on get_current_user for Plan 02/03
- 01-01: Removed admin bypass from customer tip endpoint (admin uses admin endpoints)
- 01-01: Removed vendor fallback from customer cancel endpoint (vendor cancel is separate)
- 01-03: Added auth_utils imports to bid_routes.py, converted 35 endpoints to Depends(require_customer/require_driver/require_any_auth)
- 01-03: Removed admin bypass from customer/driver ownership checks -- admin uses admin endpoints
- 01-03: Prevented customer_id spoofing on ride creation and driver_id spoofing on bid submission by overriding client-provided IDs
- 01-02: Removed admin-or-owner JWT bypass from all driver Stripe/payout/status endpoints -- admin uses admin-specific endpoints
- 01-02: Converted ERP driver proxy endpoints from require_any_auth to require_driver with ownership checks
- 01-02: Used JWT payload customer_id/driver_id for ride participant verification instead of manual JWT decode
- 01-02: Ignored client-provided driver_id query param in /api/driver/bids to prevent IDOR -- always uses authenticated driver.id

### Pending Todos

None yet.

### Blockers/Concerns

- INFRA-02 (key revocation) requires user action in App Store Connect console — not automatable by Claude

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 9 | Commit CLAUDE.md deploy-must-be-in-GSD-phase rule | 2026-02-21 | d515a606 | [9-commit-claude-md-deploy-must-be-in-gsd-p](./quick/9-commit-claude-md-deploy-must-be-in-gsd-p/) |
| 10 | Push and deploy to production via CI/CD | 2026-02-21 | run:22247776514 | [10-push-and-deploy-to-production-via-ci-cd](./quick/10-push-and-deploy-to-production-via-ci-cd/) |

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 01-02-PLAN.md (driver + shared ride endpoint auth). Phase 01 fully complete (3/3 plans).
Resume: Phase 01 complete. Next: `/gsd:execute-phase 02` for vendor+admin endpoint auth, or deploy Phase 01 changes first.
