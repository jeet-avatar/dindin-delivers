# GSD Project State

**Project**: Dollor.ai Platform
**Status**: Active — Security Auth Fix (Code Complete, Deployment Pending)
**Last activity**: 2026-02-20 — Phase 02 code changes COMPLETE (170+ endpoints secured, 890 tests pass)

## Current Phase: 02 — Security Auth Fix

### Status: CODE COMPLETE — Deployment Pending

**What**: Added authentication to ~280 previously-unprotected API endpoints
**How**: Hybrid approach — global middleware safety net + router/endpoint-level auth
**Result**: 170+ endpoints with explicit Depends() auth + global middleware catching the rest

### Completed Tasks
| Task | Description | Commit |
|------|-------------|--------|
| 2C.1 | iOS auth headers (guard-let) | `ad128e49` |
| 2C.2 | Android interceptor verified | (no code changes) |
| 2A.1 | auth_utils.py created | `c3930fb4` |
| 2A.2 | Router-level auth (3 routers, 25 endpoints) | `ae6a3f15` |
| 2A.3 | Per-endpoint auth (8 routers, 78 endpoints) | `f3c0eb31` |
| 2B.1+2B.2 | Global middleware + allowlist | `87afad52` |
| 2B.3 | Per-endpoint auth (main_new.py, 67 endpoints) | `72dcb376` |

### Remaining Tasks
| Task | Description | Blocker |
|------|-------------|---------|
| 2D.1 | Deploy to staging | Needs docker build + ECR push |
| 2D.2 | Test E2E flows on staging | Needs 2D.1 |
| 2D.3 | Deploy to production | Needs 2D.2 approval |

### Key Decisions
- Hybrid auth: global middleware safety net + per-endpoint Depends()
- auth_utils.py uses auto_error=False for better error messages
- iOS strengthened from if-let to guard-let (hard fail without token)
- Android verified: per-call auth via DollorRepository, no changes needed
- Deployment deferred: code complete, needs staging deploy + monitoring

### Key Files
- NEW: `apps/web/p2p-platform/backend/auth_utils.py`
- MODIFIED: `main_new.py`, `order_flow.py`, `stripe_integration.py`, `promotions.py`, `matchmaking_routes.py`, `rideshare_payments.py`, `verification_routes.py`, `auto_onboarding.py`, `investor_tracking.py`, `P2PAPIService.swift`

## Previous Phase: 01 — Unit Test Fixes (COMPLETE)
- 18 fixes committed: `26ca1312` (17 assertions) + `9688c0cd` (1 flaky caplog)
- CI green: 1,002/1,002 tests pass (run 22213511181)
- Verification: `.planning/phases/01-unit-test-fixes/01-VERIFICATION.md`

## Roadmap Evolution
- Phase 03 added: Deploy Security Auth to Staging and Production
- Phase 04 added: Documentation Overhaul — fix CLAUDE.md, GROUND_TRUTH, xcconfig, all stale docs

## Quick Reference
- Production API: `https://api.dollor.ai`
- Staging API: `https://d34u5ixl0bulv4.cloudfront.net`
- ECR: `134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api`
- ECS cluster: `dollor-production`
- Summary: `.planning/phases/02-security-auth-fix/02-SUMMARY.md`
