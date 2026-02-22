# Dollor.ai Roadmap

## Milestones

- ✅ **v1.0 Production Release** — iOS apps, QA, security rounds 1+2, scaling, staging infra (shipped pre-2026-02-20)
- ✅ **v1.1 Security Hardening + Stability** — Phases 01-04 + 03.1 (shipped 2026-02-20)
- ✅ **v1.2 App Store Ready** — Endpoint auth, API alignment, Android fixes, CI stability, ops security (shipped 2026-02-21)
- ✅ **v1.3 Platform Hardening** — 276 endpoints auth-secured, 50 rate-limited, deployed to production (shipped 2026-02-22)

## Phases

<details>
<summary>v1.1 Security Hardening + Stability (Phases 01-04) — SHIPPED 2026-02-20</summary>

- [x] Phase 01: Unit Test Fixes (1/1 plan) — 17 stale assertions fixed, CI green
- [x] Phase 02: Security Auth Fix (1/1 plan) — 170+ endpoints secured, auth_utils.py created
- [x] Phase 03: Deploy Security Auth (2/2 plans) — staging + production via CI/CD
- [x] Phase 03.1: Endpoint Validation Guardrails (1/1 plan) — API registry, CLAUDE.md rules
- [x] Phase 04: Documentation Overhaul (2/2 plans) — CLAUDE.md, GROUND_TRUTH, xcconfig fixed

Full archive: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>v1.2 App Store Ready (Phases 01-05) — SHIPPED 2026-02-21</summary>

- [x] Phase 01: Finish Endpoint Auth (3/3 plans) — 32 per-endpoint Depends() guards, 93 dead stubs deleted
- [x] Phase 02: API Endpoint Standardization (3/3 plans) — 9 route aliases, 3 iOS fixes, production deployed
- [x] Phase 03: Android Fixes (1/1 plan) — 5 path fixes, staging URLs, photo URL centralization
- [x] Phase 04: Fix CI + API Contract Tests (2/2 plans) — 208 contract tests, CI env vars fixed
- [x] Phase 05: Ops Security (3/3 plans) — credentials removed, 61 URL fixes, CLAUDE.md updated

Full archive: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>v1.3 Platform Hardening (Phases 01-03) — SHIPPED 2026-02-22</summary>

- [x] Phase 01: Customer + Driver Endpoint Auth (3/3 plans) — 127 endpoints with role-specific Depends() + ownership checks
- [x] Phase 02: Vendor + Admin Endpoint Auth (4/4 plans) — 120+ vendor/admin endpoints, gap closure, AUTH-06 audit
- [x] Phase 03: Rate Limiting Expansion (2/2 plans) — 50 endpoints rate-limited via Redis (password reset, registration, payment, admin)
- [ ] Phase 04: Infrastructure Security (skipped) — INFRA items deferred to v1.4

Full archive: `.planning/milestones/v1.3-ROADMAP.md`

**Known gaps:** INFRA-01 (CloudFront header), INFRA-02 (key revocation), INFRA-03 (credential items)

</details>
