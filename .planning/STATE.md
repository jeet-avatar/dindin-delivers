# GSD Project State

**Project**: Dollor.ai Platform
**Status**: Phase 02 IN PROGRESS — Plan 02 complete (2/3)
**Last activity**: 2026-02-21 — Plan 02-02 completed (iOS path fixes + staging deploy)

## Current Position

**Active Phase:** 02-api-endpoint-standardization
**Current Plan:** Plan 03 of 3
**Progress:** [████████░░] 83%

## Active Phase: 02-api-endpoint-standardization

- Plan 01 (COMPLETE): Backend route aliases + financial endpoints — 9 new routes, iOS chat fix, Android demo-login + financial stubs
- Plan 02 (COMPLETE): iOS client path fixes — vendor delete, order chat, duplicate completeRide removed, deployed to staging
- Plan 03: Android client path fixes

## Previous Phase: 01-finish-endpoint-auth (COMPLETE)

- Plan 01 (COMPLETE): Per-endpoint Depends() auth + allowlist fix — 23 endpoints secured, 7 manual auth blocks replaced
- Plan 02 (COMPLETE): Admin/AI endpoint auth — 9 endpoints secured with Depends(require_admin)
- Plan 03 (COMPLETE): Delete dead ERP proxy stubs + final audit — 93+ stubs deleted (~1021 lines), 4 stubs kept with auth

## Completed Milestone: v1.1 Security Hardening + Stability

- Phase 01: Unit Test Fixes — 17 stale assertions fixed, CI green
- Phase 02: Security Auth Fix — 170+ endpoints secured
- Phase 03: Deploy Security Auth — staging + production via CI/CD
- Phase 03.1: Endpoint Validation Guardrails — API registry, CLAUDE.md rules
- Phase 04: Documentation Overhaul — all docs verified and updated

Archive: `.planning/milestones/v1.1-ROADMAP.md`

## Carried Forward

- Phase 00: API Standardization — paused at task 2/4

## Decisions

- Moved auth_utils import to top of main_new.py (was at line 14919, needed at line 33)
- Used _auth_driver/_auth_vendor naming convention to avoid variable shadowing
- Kept authorization Header on orders endpoint alongside Depends() for ownership checks
- [Phase 01-02]: Used Depends(require_admin) for all 9 endpoints — admin-only, not require_any_auth
- [Phase 01-02]: GET /api/vendors confirmed as admin listing (distinct from public /api/vendors/published)
- [Phase 01-03]: Kept 4 proxy stubs with iOS callers instead of deleting (added require_any_auth)
- [Phase 01-03]: Kept real endpoints embedded in proxy section (restaurant detail, payment intent, FCM tokens, AI analytics)
- [Phase 01-03]: 78 endpoints remain middleware-only (no per-endpoint Depends) — documented for future work
- [Phase 02-01]: Used app.add_api_route() for chat aliases -- backend-side fix is lower-risk than iOS deploy
- [Phase 02-01]: Financial endpoints use graceful degradation (zero balances) instead of 500 on Stripe errors
- [Phase 02-01]: Demo-login endpoints gated by ADMIN_SECRET_KEY, added to public path allowlist
- [Phase 02]: Used app.add_api_route() for chat aliases; financial endpoints use Depends(require_driver/vendor) + ownership checks
- [Phase 02-02]: Removed completeRide() entirely rather than delegating -- updated DeliveryViewModel caller directly
- [Phase 02-02]: Driver/customer delete paths kept with /delete suffix -- matches their backend routes (only vendor was wrong)

## Quick Reference
- Production API: `https://api.dollor.ai`
- Staging API: `https://d34u5ixl0bulv4.cloudfront.net`
- Production task-def: `dollor-api:372` (2/2 HEALTHY)
- Staging task-def: `dollor-api-staging:31`

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 9 | Commit CLAUDE.md deploy-must-be-in-GSD-phase rule | 2026-02-21 | d515a606 | [9-commit-claude-md-deploy-must-be-in-gsd-p](./quick/9-commit-claude-md-deploy-must-be-in-gsd-p/) |
| 10 | Push and deploy to production via CI/CD | 2026-02-21 | run:22247776514 | [10-push-and-deploy-to-production-via-ci-cd](./quick/10-push-and-deploy-to-production-via-ci-cd/) |

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 02-02-PLAN.md — iOS path fixes + staging deploy
