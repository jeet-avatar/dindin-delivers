# GSD Project State

**Project**: Dollor.ai Platform
**Status**: Phase 01 COMPLETE — all 3 plans finished
**Last activity**: 2026-02-20 — Quick-9 completed (CLAUDE.md GSD deploy enforcement committed)

## Current Position

**Active Phase:** 01-finish-endpoint-auth (COMPLETE)
**Current Plan:** Not started
**Progress:** [██████████] 100%

## Active Phase: 01-finish-endpoint-auth (COMPLETE)

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
Stopped at: Production deploy succeeded — Phase 01 endpoint auth + staging fix + GSD enforcement live
