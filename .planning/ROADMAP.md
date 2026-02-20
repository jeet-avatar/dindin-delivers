# Dollor.ai Roadmap

## Current Milestone: v1.1 Security Hardening + Stability

### Active Phase
- **Phase 02: Security Auth Fix** — Protect ~280 unauthenticated endpoints
  - Status: PLANNED (verified via code audit, not assumptions)
  - Evidence: `.planning/SECURITY_AUDIT_2026-02-20.md` (verified against code)
  - Plan: `.planning/phases/02-security-auth-fix/PLAN.md`

### Completed Phases
- **Phase 01: Unit Test Fixes** — ✓ COMPLETE (2026-02-20)
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
