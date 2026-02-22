# GSD Project State

**Project**: Dollor.ai Platform
**Status**: v1.3 Platform Hardening -- Phase 02 in progress (2/3 plans complete)
**Last activity**: 2026-02-21 -- Plan 02-02 complete (admin endpoint auth)

## Current Position

**Active Phase:** Phase 02 of 4 (Vendor + Admin Endpoint Auth)
**Current Plan:** Plan 2 of 3 COMPLETE -- next: Plan 02-03
**Progress:** [██████░░░░] 60%

## Wave Status

| Plan | Wave | File | Status | Commits |
|------|------|------|--------|---------|
| 01-01 | Wave 1 | main_new.py (customer) | COMPLETE | 88fe4f96, e61d0eba, 776c6714 |
| 01-03 | Wave 1 | bid_routes.py | COMPLETE | 17613d66, 78f9015d |
| 01-02 | Wave 2 | main_new.py (driver + shared ride) | COMPLETE | 0683a7c6, 85af5717 |
| 02-01 | Wave 1 | main_new.py (vendor) | COMPLETE | d4a940d8 |
| 02-02 | Wave 1 | main_new.py (admin) | COMPLETE | 2b79095f, 12d3bd15 |

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Drivers keep 100% of delivery fees and tips
**Current focus:** Phase 02 -- Vendor + Admin Endpoint Auth

## Completed Milestones

- **v1.0** Production Release -- shipped pre-2026-02-20
- **v1.1** Security Hardening + Stability -- shipped 2026-02-20 (archive: `milestones/v1.1-ROADMAP.md`)
- **v1.2** App Store Ready -- shipped 2026-02-21 (archive: `milestones/v1.2-ROADMAP.md`)

## Quick Reference
- Production API: `https://api.dollor.ai`
- Staging API: `https://d34u5ixl0bulv4.cloudfront.net`
- Production task-def: `dollor-api:372` (2/2 HEALTHY)
- Staging task-def: `dollor-api-staging:31`

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 17 min
- Total execution time: 87 min

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01 | 01-01 | 22 min | 3 | 1 |
| 01 | 01-03 | 15 min | 2 | 1 |
| 01 | 01-02 | 18 min | 2 | 1 |
| 02 | 02-01 | 16 min | 2 | 1 |
| 02 | 02-02 | 16 min | 2 | 1 |

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table.

- v1.3 roadmap: 4 phases -- auth split by role (customer+driver / vendor+admin), rate limiting separate, infra+deploy final
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
- 02-01: Converted 25 vendor endpoints to Depends(require_vendor) with ownership checks
- 02-02: Converted 24 admin endpoints to Depends(require_admin), removed manual JWT decode blocks
- 02-02: admin_delete_customer_by_email included for consistency (not in original plan)
- 02-02: ADMIN_SECRET_KEY endpoints deliberately unchanged (backfill-payouts, migrate, set-document-status)
- 02-02: Defense-in-depth: admin_auth_middleware + per-endpoint Depends(require_admin) coexist by design

### Pending Todos

None yet.

### Blockers/Concerns

- INFRA-02 (key revocation) requires user action in App Store Connect console -- not automatable by Claude

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 9 | Commit CLAUDE.md deploy-must-be-in-GSD-phase rule | 2026-02-21 | d515a606 | [9-commit-claude-md-deploy-must-be-in-gsd-p](./quick/9-commit-claude-md-deploy-must-be-in-gsd-p/) |
| 10 | Push and deploy to production via CI/CD | 2026-02-21 | run:22247776514 | [10-push-and-deploy-to-production-via-ci-cd](./quick/10-push-and-deploy-to-production-via-ci-cd/) |

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 02-02-PLAN.md (admin endpoint auth). Phase 02 has 2/3 plans complete.
Resume: Next is Plan 02-03 (deploy/verification) or continue with remaining Phase 02 plans.
