# Dollor.ai Roadmap

## Current Milestone: v1.1 Security Hardening + Stability

### Active Phase
- **Phase 02: Security Auth Fix** — Protect ~280 unauthenticated endpoints
  - Status: PLANNED (verified via code audit, not assumptions)
  - Evidence: `.planning/SECURITY_AUDIT_2026-02-20.md` (verified against code)
  - Plan: `.planning/phases/02-security-auth-fix/PLAN.md`

### Completing
- **Phase 01: Unit Test Fixes** — Commit and push 17 test fixes to unblock CI
  - Status: Code fixed locally, needs commit + CI verification
  - Goal: CI pipeline green on main (run-tests job passes)
  - **Plans:** 1 plan
  - Plans:
    - [ ] 01-01-PLAN.md — Commit fixes, push to main, verify CI green
  - Verification: `.planning/phases/01-unit-test-fixes/VERIFICATION.md`

### Completed Phases
- **Phase 00: API Standardization** — paused at task 2/4

### Previous Milestone: v1.0 Production Release (COMPLETE)
- Customer/Driver/Restaurant iOS apps uploaded to TestFlight
- API contract verification complete
- 34-agent QA system: ALL PASSED
- Security hardening rounds 1 + 2 deployed
- Vertical scaling (4 phases) deployed
- Staging infrastructure built and verified
