# Milestones

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
