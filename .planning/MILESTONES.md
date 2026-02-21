# Milestones

## v1.2 App Store Ready (Shipped: 2026-02-21)

**Phases completed:** 5 phases (01-05), 12 plans, 66 commits
**Files modified:** 154 | **Lines:** +17,272 / -2,851

**Key accomplishments:**
- Added 32 per-endpoint Depends() auth guards, deleted 93 dead ERP proxy stubs (~1021 lines)
- Fixed 3 iOS + 5 Android broken API paths, added 9 backend route aliases, deployed to production
- Rewrote 208 API contract tests from actual shipped TestFlight/Firebase builds (up from 19)
- Removed 3 tracked .p8 keys + backend/.env, installed pre-commit secret detection hook
- Replaced wrong staging URL across 61 files, achieving zero-reference verification
- Updated CLAUDE.md with Secrets Manager docs, credential rules, and prevention mechanisms

**Known gaps:**
- 78 endpoints remain middleware-only auth (no per-endpoint Depends) — documented
- Key JFVA7628SX revocation pending user action in App Store Connect
- No formal REQUIREMENTS.md for v1.2 (reactive milestone, requirements tracked in ROADMAP.md)

---

## v1.1 Security Hardening + Stability (Shipped: 2026-02-20)

**Phases completed:** 5 phases (01-04 + 03.1), 7 plans, 44 commits
**Files modified:** 62 | **Lines:** +9,828 / -4,659

**Key accomplishments:**
- Secured 170+ endpoints with defense-in-depth auth (global middleware + per-endpoint Depends)
- Deployed security auth to staging + production via CI/CD (dollor-api:372, 2/2 HEALTHY)
- Fixed 17 stale unit tests, unblocked CI pipeline (890 passing)
- Created 641-route API registry + mandatory endpoint verification guardrails
- Fixed all stale docs (CLAUDE.md, GROUND_TRUTH, xcconfig, API_ENDPOINTS, QA_KNOWLEDGE_BASE)
- Eliminated hallucinated endpoint references from planning files

**Known gaps:**
- Phase 00 (API Standardization) paused at task 2/4 — carried to v1.2
- No formal REQUIREMENTS.md for v1.1 (reactive milestone, not pre-planned)

---

## v1.0 Production Release (COMPLETE)

- Customer/Driver/Restaurant iOS apps uploaded to TestFlight
- API contract verification complete
- 34-agent QA system: ALL PASSED
- Security hardening rounds 1 + 2 deployed
- Vertical scaling (4 phases) deployed
- Staging infrastructure built and verified

---
