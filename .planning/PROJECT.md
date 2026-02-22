# Dollor.ai - Food Delivery & Rideshare Platform

## What This Is

Dollor.ai is a **matchmaking platform** connecting customers with restaurants and drivers for food delivery, and riders with drivers for rideshare services. We are NOT a delivery company or TNC - we facilitate connections and charge flat matchmaking fees ($1-$3) instead of commissions. All 276 API endpoints are secured with role-specific JWT authentication (require_customer, require_driver, require_vendor, require_admin, require_any_auth). 50 sensitive endpoints are rate-limited via Redis. Zero secrets tracked in git — all credentials managed via AWS Secrets Manager.

## Core Value

**Drivers keep 100% of delivery fees and tips.** This is our key differentiator - we only charge flat platform fees, never commissions.

## Requirements

### Validated
- ✓ Customer iOS app with multi-restaurant ordering (up to 3 restaurants) — v1.0
- ✓ Restaurant iOS app for order management — v1.0
- ✓ Driver iOS app for deliveries — v1.0
- ✓ P2P backend API (FastAPI/Python) — v1.0
- ✓ Stripe payment integration — v1.0
- ✓ Google/Apple Sign-In authentication — v1.0
- ✓ Real-time order tracking — v1.0
- ✓ JWT authentication on all API endpoints (170+ secured) — v1.1
- ✓ CI/CD deployment pipeline (staging + production) — v1.1
- ✓ API endpoint registry and verification guardrails — v1.1
- ✓ Documentation accuracy (CLAUDE.md, GROUND_TRUTH, xcconfig) — v1.1
- ✓ Per-endpoint Depends() auth with role checks (32 endpoints) — v1.2
- ✓ Dead ERP proxy stub cleanup (93 stubs, ~1021 lines removed) — v1.2
- ✓ iOS/Android API path alignment (3 iOS + 5 Android fixes) — v1.2
- ✓ API contract tests from shipped builds (208 tests covering ~160 endpoints) — v1.2
- ✓ Credential removal from git (.p8 keys, backend/.env) — v1.2
- ✓ Staging URL correction (61 files, zero wrong references) — v1.2
- ✓ Secret detection pre-commit hook — v1.2
- ✓ CLAUDE.md production security state documentation — v1.2
- ✓ All 276 endpoints secured with role-specific Depends(require_*) auth — v1.3
- ✓ auth_utils.py with 5 reusable auth functions (no manual JWT decode) — v1.3
- ✓ Global auth middleware safety net — v1.3
- ✓ IDOR protection with ownership checks on all role-specific endpoints — v1.3
- ✓ Rate limiting on 50 sensitive endpoints (password reset, registration, payment, admin) — v1.3
- ✓ RateLimiter centralized in cache.py with multi-key support and Retry-After headers — v1.3

### Active
- [ ] CloudFront server header suppression (deferred from v1.3 INFRA-01)
- [ ] App Store Connect key JFVA7628SX revocation (deferred from v1.3 INFRA-02)
- [ ] Remaining credential items finalization (deferred from v1.3 INFRA-03)
- [ ] Android Play Store publishing
- [ ] Production DB password rotation

### Out of Scope
- **Commission-based pricing** — We use flat fees only, this is legally critical
- **Operating as TNC/delivery company** — We are matchmaking service only
- **Rideshare E2E testing** — Deferred to future milestone
- **AI employee automation** — Deferred to future milestone
- **Investor portal** — Deferred to future milestone

## Context

- **Legal positioning**: Matchmaking service, not delivery company or TNC
- **Pricing model**:
  - Food: $1 platform fee from customer + $1 from restaurant
  - Rideshare: $1 (≤$35), $2 ($35-70), $3 (>$70)
- **Drivers keep**: 100% of delivery fees + 100% of tips
- **Security**: 276 endpoints with role-specific Depends() auth, global middleware safety net, 50 endpoints rate-limited via Redis (ElastiCache), all secrets in AWS Secrets Manager, pre-commit hook blocking credential commits
- **Production**: Deployed v1.3 2026-02-22, staging verified before production
- **Codebase**: 196 files changed in v1.3, +23,993/-4,495 lines

## Constraints

- **Tech Stack**: iOS (SwiftUI), Android (Kotlin), Backend (Python FastAPI)
- **Payment**: Stripe only (Apple Pay + cards)
- **Maps**: Google Maps SDK
- **Auth**: P2P backend JWT (no Firebase Auth)
- **Deployment**: CI/CD only — never manual docker/ecs commands
- **Secrets**: AWS Secrets Manager only — never in codebase

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| P2P backend as source of truth | Firebase was causing sync issues | ✓ Good |
| Multi-restaurant cart (max 3) | User convenience vs complexity | ✓ Good |
| Flat fee vs commission | Legal and competitive positioning | ✓ Good |
| SwiftUI for iOS | Modern, declarative UI | ✓ Good |
| Defense-in-depth auth (v1.1) | Global middleware + per-endpoint for safety net | ✓ Good |
| CI/CD mandatory for deploys (v1.1) | Prevent manual deploy accidents | ✓ Good |
| API registry + endpoint verification (v1.1) | Prevent hallucinated endpoints in plans | ✓ Good |
| Per-endpoint Depends() auth (v1.2) | Role-based access beyond middleware blanket auth | ✓ Good |
| app.add_api_route() for backward compat (v1.2) | Lower risk than client deploys for path alignment | ✓ Good |
| Contract tests from shipped builds (v1.2) | TestFlight/Firebase builds = ground truth, not source | ✓ Good |
| Shell pre-commit hook (v1.2) | Zero deps, immediate protection for single developer | ✓ Good |
| git rm over filter-repo for .p8 (v1.2) | Key revocation makes history copies useless | ✓ Good |
| auth_utils.py reusable functions (v1.3) | Consistent auth patterns, eliminates manual JWT decode | ✓ Good |
| Role-specific Depends() over generic auth (v1.3) | Prevents cross-role access, enforces ownership | ✓ Good |
| RateLimiter in cache.py (v1.3) | Avoids circular imports, importable by all router files | ✓ Good |
| Identifier-based rate limit keys (v1.3) | Per-email/user/IP scoping for different endpoint types | ✓ Good |
| Skip Phase 04 INFRA (v1.3) | INFRA items are ops tasks not code — defer to v1.4 | — Pending |

## Current Milestone: v1.4 App Release + INFRA

**Goal:** Verify all iOS and Android apps call correct backend APIs (no assumptions), bump version numbers for all 6 apps, push iOS builds to TestFlight and Android builds to Firebase, and resolve deferred INFRA items (CloudFront header, key revocation, credentials).

**Target features:**
- Verify every API call in all 3 iOS apps and 3 Android apps against actual backend routes
- Bump build/version numbers for Customer, Driver, and Restaurant apps (iOS + Android)
- Push iOS builds to TestFlight
- Push Android builds to Firebase App Distribution
- Fix CloudFront server header leak (INFRA-01)
- Confirm App Store Connect key revocation status (INFRA-02)
- Address remaining credential items (INFRA-03)

---
*Last updated: 2026-02-22 after v1.4 milestone start*
