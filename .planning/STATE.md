# GSD Project State

**Project**: Dollor.ai Platform
**Status**: Phase 01 in progress — finishing endpoint auth
**Last activity**: 2026-02-20 — Plan 01-02 completed (admin/AI endpoint auth)

## Current Position

**Active Phase:** 01-finish-endpoint-auth
**Current Plan:** 3 of 3
**Progress:** [███████░░░] 67%

## Active Phase: 01-finish-endpoint-auth

- Plan 01 (COMPLETE): Per-endpoint Depends() auth + allowlist fix — 23 endpoints secured, 7 manual auth blocks replaced
- Plan 02 (COMPLETE): Admin/AI endpoint auth — 9 endpoints secured with Depends(require_admin)
- Plan 03 (PENDING): Remaining endpoints

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

## Quick Reference
- Production API: `https://api.dollor.ai`
- Staging API: `https://d34u5ixl0bulv4.cloudfront.net`
- Production task-def: `dollor-api:372` (2/2 HEALTHY)
- Staging task-def: `dollor-api-staging:31`

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 01-02-PLAN.md (admin/AI endpoint auth)
