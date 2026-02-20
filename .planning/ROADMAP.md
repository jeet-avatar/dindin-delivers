# Dollor.ai Roadmap

## Milestones

- ✅ **v1.0 Production Release** — iOS apps, QA, security rounds 1+2, scaling, staging infra (shipped pre-2026-02-20)
- ✅ **v1.1 Security Hardening + Stability** — Phases 01-04 + 03.1 (shipped 2026-02-20)
- 📋 **v1.2 App Store Ready** — Complete endpoint auth, API alignment, Android fixes, CI stability, ops security

## Phases

<details>
<summary>✅ v1.1 Security Hardening + Stability (Phases 01-04) — SHIPPED 2026-02-20</summary>

- [x] Phase 01: Unit Test Fixes (1/1 plan) — 17 stale assertions fixed, CI green
- [x] Phase 02: Security Auth Fix (1/1 plan) — 170+ endpoints secured, auth_utils.py created
- [x] Phase 03: Deploy Security Auth (2/2 plans) — staging + production via CI/CD
- [x] Phase 03.1: Endpoint Validation Guardrails (1/1 plan) — API registry, CLAUDE.md rules
- [x] Phase 04: Documentation Overhaul (2/2 plans) — CLAUDE.md, GROUND_TRUTH, xcconfig fixed

Full archive: `.planning/milestones/v1.1-ROADMAP.md`

</details>

### v1.2 App Store Ready

- [ ] Phase 01: Finish Endpoint Auth — Add per-endpoint Depends() auth to 42 real endpoints, fix allowlist gaps, delete 93 dead ERP proxy stubs
  **Goal:** Every non-public endpoint in main_new.py has per-endpoint Depends() auth with role checks; dead proxy code removed
  **Requirements:** [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06]
  **Plans:** 3 plans
  Plans:
  - [ ] 01-01-PLAN.md — Fix public allowlist + add Depends() to customer/driver/vendor endpoints
  - [ ] 01-02-PLAN.md — Add Depends(require_admin) to admin/AI endpoints
  - [ ] 01-03-PLAN.md — Delete 93 dead ERP proxy stubs + final auth audit
- [ ] Phase 02: API Endpoint Standardization — Align 13 iOS/Android path divergences, fix Android recurring rides 404
- [ ] Phase 03: Android Fixes — Commit Gson response wrapper fixes, rideshare field mismatches
- [ ] Phase 04: Fix CI — Resolve integration test failures, fix 112 test_vendor_endpoints errors
- [ ] Phase 05: Ops Security — DB password rotation, remove .p8 keys from git, CF server header

### Carried Forward
- **Phase 00: API Standardization** — merged into v1.2 Phase 02

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 01. Finish Endpoint Auth | 1/3 | In Progress|  | — |
| 02. API Standardization | v1.2 | 0/? | Pending | — |
| 03. Android Fixes | v1.2 | 0/? | Pending | — |
| 04. Fix CI | v1.2 | 0/? | Pending | — |
| 05. Ops Security | v1.2 | 0/? | Pending | — |
