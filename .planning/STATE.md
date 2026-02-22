# GSD Project State

**Project**: Dollor.ai Platform
**Status**: v1.3 Platform Hardening -- Phase 03 COMPLETE (2/2 plans done)
**Last activity**: 2026-02-22 -- Plan 03-02 complete (rate limiting on payment + admin mutation endpoints)

## Current Position

**Active Phase:** Phase 04 of 4 (Infrastructure Security + Final Verification)
**Current Plan:** Not started
**Progress:** [█████████░] 93%

## Wave Status

| Plan | Wave | File | Status | Commits |
|------|------|------|--------|---------|
| 01-01 | Wave 1 | main_new.py (customer) | COMPLETE | 88fe4f96, e61d0eba, 776c6714 |
| 01-03 | Wave 1 | bid_routes.py | COMPLETE | 17613d66, 78f9015d |
| 01-02 | Wave 2 | main_new.py (driver + shared ride) | COMPLETE | 0683a7c6, 85af5717 |
| 02-01 | Wave 1 | main_new.py (vendor) | COMPLETE | d4a940d8, 4a535aea |
| 02-02 | Wave 1 | main_new.py (admin) | COMPLETE | 2b79095f, 12d3bd15 |
| 02-03 | Wave 2 | main_new.py (admin portal/ERP + AUTH-06) | COMPLETE | 1308ca73, 3dbc3f82 |
| 02-04 | Wave 1 | main_new.py (gap closure: 17 endpoints + IDOR) | COMPLETE | 9c5f9cb5, 6d0f046f |
| 03-01 | Wave 1 | cache.py + main_new.py (rate limiting: pwd reset + registration) | COMPLETE | 1f1579cd, 43c2636c |
| 03-02 | Wave 2 | 5 files (rate limiting: payment + admin mutation) | COMPLETE | f920bcdb, a53d03cd |

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Drivers keep 100% of delivery fees and tips
**Current focus:** Phase 04 -- Infrastructure Security + Final Verification

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
- Total plans completed: 9
- Average duration: 14 min
- Total execution time: 127 min

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01 | 01-01 | 22 min | 3 | 1 |
| 01 | 01-03 | 15 min | 2 | 1 |
| 01 | 01-02 | 18 min | 2 | 1 |
| 02 | 02-01 | 19 min | 2 | 2 |
| 02 | 02-02 | 16 min | 2 | 1 |
| 02 | 02-03 | 13 min | 2 | 2 |
| 02 | 02-04 | 4 min | 2 | 2 |
| 03 | 03-01 | 8 min | 2 | 2 |
| 03 | 03-02 | 15 min | 2 | 6 |

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
- 02-01: Converted 31 vendor endpoints to Depends(require_vendor) with ownership checks + 5 admin-only to require_admin
- 02-01: Converted 7 vendor Stripe/location/register endpoints from manual JWT decode to Depends(require_vendor)
- 02-01: Fixed test_save_vendor_fcm_token to pass _auth_vendor parameter after auth conversion
- 02-02: Converted 24 admin endpoints to Depends(require_admin), removed manual JWT decode blocks
- 02-02: admin_delete_customer_by_email included for consistency (not in original plan)
- 02-02: ADMIN_SECRET_KEY endpoints deliberately unchanged (backfill-payouts, migrate, set-document-status)
- 02-02: Defense-in-depth: admin_auth_middleware + per-endpoint Depends(require_admin) coexist by design
- 02-03: GET /api/orders uses require_any_auth with JWT payload role check (admin sees all, non-admin sees own)
- 02-03: Chat endpoints use require_any_auth, delivery decisions use require_vendor, modifications use require_any_auth
- 02-03: AUTH-06 verified: every non-public endpoint has explicit Depends() auth
- 02-03: Added /privacy, /terms, /api/erp/restaurants/{id} to global middleware public path allowlist
- 02-04: Kept oauth2_scheme in 4 internal helper functions (not endpoint signatures) -- used by auth_utils.py
- 02-04: IDOR protection on notification endpoints verifies JWT customer_id/driver_id matches request user_id
- 03-01: Moved RateLimiter + check_rate_limit to cache.py so bid_routes.py and order_flow.py can import them
- 03-01: Used IP-based rate limiting for /api/auth/password-reset/confirm (no email in request body)
- 03-01: Registration window changed from 5 min to 1 hour per user decision from research phase
- 03-02: Used http_request: Request param name when endpoint already uses request for body data (avoiding naming conflict)
- 03-02: Payment endpoints use user-ID-based rate limiting, admin mutations use IP-based
- 03-02: Fixed test_order_flow.py confirm_payment tests to pass mock Request/auth after signature change

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

Last session: 2026-02-22
Stopped at: Completed 03-02-PLAN.md (rate limiting on payment + admin mutation endpoints). Phase 03 complete (2/2 plans done).
Resume: Plan Phase 04 (Infrastructure Security + Final Verification).
