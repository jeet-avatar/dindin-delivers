# GSD Project State

**Project**: Dollor.ai Platform
**Status**: Phase 01 in progress — finishing endpoint auth
**Last activity**: 2026-02-20 — Plan 01-01 completed (per-endpoint Depends() auth)

## Current Position

**Active Phase:** 01-finish-endpoint-auth
**Current Plan:** 2 of 3
**Progress:** [==========..........] 1/3 plans complete

## Active Phase: 01-finish-endpoint-auth

- Plan 01 (COMPLETE): Per-endpoint Depends() auth + allowlist fix — 23 endpoints secured, 7 manual auth blocks replaced
- Plan 02 (PENDING): ERP proxy stubs
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

## Quick Reference
- Production API: `https://api.dollor.ai`
- Staging API: `https://d34u5ixl0bulv4.cloudfront.net`
- Production task-def: `dollor-api:372` (2/2 HEALTHY)
- Staging task-def: `dollor-api-staging:31`

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 01-01-PLAN.md (per-endpoint Depends() auth)
