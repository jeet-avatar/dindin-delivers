# Dollor.ai Roadmap

## Current Milestone: v1.1 Security Hardening + Stability

### Active Phase
- **Phase 03: Deploy Security Auth** — PLANNED, Ready to Execute
  - Goal: Build, deploy, and verify security auth changes on staging then production
  - Depends on: Phase 02 (code complete)
  - Directory: `.planning/phases/03-deploy-security-auth/`
  - **Requirements:** [DEPLOY-01, DEPLOY-02, DEPLOY-03]
  - **Plans:** 2 plans
  - Plans:
    - [ ] 03-01-PLAN.md — Deploy to staging + E2E smoke test + human verification
    - [ ] 03-02-PLAN.md — Deploy to production + CloudWatch monitoring + human verification

### Completed Phases
- **Phase 02: Security Auth Fix** — CODE COMPLETE (2026-02-20)
  - 170+ endpoints secured with defense-in-depth auth (middleware + per-endpoint Depends)
  - 6 commits: `ad128e49`, `c3930fb4`, `ae6a3f15`, `f3c0eb31`, `87afad52`, `72dcb376`
  - 890 tests passing, zero regressions
  - Summary: `.planning/phases/02-security-auth-fix/02-SUMMARY.md`
- **Phase 01: Unit Test Fixes** — COMPLETE (2026-02-20)
  - 18 test fixes committed (17 stale assertions + 1 flaky caplog)
  - CI green: 1,002/1,002 tests pass (run 22213511181)
  - Verification: `.planning/phases/01-unit-test-fixes/01-VERIFICATION.md`
- **Phase 00: API Standardization** — paused at task 2/4

### Previous Milestone: v1.0 Production Release (COMPLETE)
- Customer/Driver/Restaurant iOS apps uploaded to TestFlight
- API contract verification complete
- 34-agent QA system: ALL PASSED
- Security hardening rounds 1 + 2 deployed
- Vertical scaling (4 phases) deployed
- Staging infrastructure built and verified

### Upcoming Phases
- **Phase 04: Documentation Overhaul** — Fix CLAUDE.md, GROUND_TRUTH, xcconfig, and all stale docs
  - Goal: Eliminate all wrong/stale/missing info across CLAUDE.md, .claude/docs/, and xcconfig (MEMORY.md Android section verified correct — no changes needed)
  - Depends on: Phase 02 (code changes that shifted docs)
  - Directory: `.planning/phases/04-docs-overhaul/`
  - **Requirements:** [DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06]
  - **Plans:** 2 plans
  - Plans:
    - [ ] 04-01-PLAN.md — Fix CLAUDE.md wrong info + iOS xcconfig
    - [ ] 04-02-PLAN.md — Re-verify GROUND_TRUTH line numbers + update API_ENDPOINTS + fix stale docs
