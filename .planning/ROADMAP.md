# Dollor.ai Roadmap

## Current Milestone: v1.1 Security Hardening + Stability

### Active Phase
- **Phase 02: Security Auth Fix** — CODE COMPLETE, Deployment Pending
  - Status: 8/11 tasks complete (code tasks done; deployment 2D.1-2D.3 deferred)
  - 170+ endpoints secured with defense-in-depth auth (middleware + per-endpoint Depends)
  - 6 commits: `ad128e49`, `c3930fb4`, `ae6a3f15`, `f3c0eb31`, `87afad52`, `72dcb376`
  - 890 tests passing, zero regressions
  - Summary: `.planning/phases/02-security-auth-fix/02-SUMMARY.md`
  - Remaining: Docker build, staging deploy, E2E test, production deploy

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
