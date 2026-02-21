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

- [x] Phase 01: Finish Endpoint Auth — Add per-endpoint Depends() auth to 42 real endpoints, fix allowlist gaps, delete 93 dead ERP proxy stubs (completed 2026-02-21)
  **Goal:** Every non-public endpoint in main_new.py has per-endpoint Depends() auth with role checks; dead proxy code removed
  **Requirements:** [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06]
  **Plans:** 3 plans
  Plans:
  - [x] 01-01-PLAN.md — Fix public allowlist + add Depends() to customer/driver/vendor endpoints
  - [x] 01-02-PLAN.md — Add Depends(require_admin) to admin/AI endpoints
  - [x] 01-03-PLAN.md — Delete 93 dead ERP proxy stubs + final auth audit
- [x] Phase 02: API Endpoint Standardization — Fix broken iOS/Android API paths, add missing backend endpoints (completed 2026-02-21)
  **Goal:** All iOS and Android API calls reach working backend endpoints with zero 404s from path mismatches
  **Requirements:** [API-01, API-02, API-03, API-04, API-05, API-06]
  **Plans:** 3 plans
  Plans:
  - [x] 02-01-PLAN.md — Add backend route aliases and missing endpoints (order chat, demo-login, financial)
  - [x] 02-02-PLAN.md — Fix iOS paths (vendor delete, order chat) + deploy to staging
  - [x] 02-03-PLAN.md — Deploy to production + verify Android paths + human checkpoint
- [x] Phase 03: Android Fixes — Commit API path fixes, correct staging URLs, centralize photo URL resolution (completed 2026-02-21)
  **Goal:** Android apps call correct backend endpoints with zero path mismatches; no hardcoded wrong URLs remain
  **Requirements:** [ANDROID-01, ANDROID-02, ANDROID-03]
  **Plans:** 1 plan
  Plans:
  - [ ] 03-01-PLAN.md — Commit 5 path fixes + fix staging URLs + replace hardcoded photo URLs
- [x] Phase 04: Fix CI + API Contract Tests — Update API contract tests to match actual shipped iOS/Android builds, fix CI workflow failures (completed 2026-02-21)
  **Goal:** API contract tests reflect real app API calls from latest TestFlight/Firebase builds; all tests pass in CI
  **Requirements:** [CI-01, CI-02, CI-03, CI-04, CI-05]
  **Plans:** 2 plans
  Plans:
  - [x] 04-01-PLAN.md — Rewrite contract tests covering all ~160 app-called endpoints + fix conftest.py fixtures
  - [x] 04-02-PLAN.md — Fix database.py ENVIRONMENT default + CI workflow env vars + remove error masking
- [ ] Phase 05: Ops Security — DB password rotation, remove .p8 keys from git, CF server header

### Carried Forward
- **Phase 00: API Standardization** — merged into v1.2 Phase 02

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 01. Finish Endpoint Auth | 3/3 | Complete    | 2026-02-21 | -- |
| 02. API Standardization | 3/3 | Complete   | 2026-02-21 | -- |
| 03. Android Fixes | 1/1 | Complete    | 2026-02-21 | -- |
| 04. Fix CI | 2/2 | Complete   | 2026-02-21 | -- |
| 05. Ops Security | v1.2 | 0/? | Pending | -- |
