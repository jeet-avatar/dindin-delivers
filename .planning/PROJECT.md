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

- ✓ iOS API verification — 256 calls audited, 11 mismatches fixed across 3 apps — v1.4
- ✓ Android API verification — all 3 apps verified, Retrofit/Gson fixes applied — v1.4
- ✓ CloudFront server header suppression (INFRA-01) — v1.4
- ✓ App Store Connect key JFVA7628SX audit (INFRA-02) — v1.4
- ✓ Remaining credential items finalized (INFRA-03) — v1.4
- ✓ iOS TestFlight distribution (Customer 1095, Driver 203, Restaurant 172) — v1.4
- ✓ Android Firebase distribution (Customer vC=27, Driver vC=24, Partner vC=20) — v1.4

### Active
- [ ] Android Play Store publishing
- [ ] Production DB password rotation
- [ ] SSL certificate pinning rotation strategy
- [ ] Rideshare E2E flow testing with real devices

### Out of Scope
- **Commission-based pricing** — We use flat fees only, this is legally critical
- **Operating as TNC/delivery company** — We are matchmaking service only
- **AI employee automation** — Deferred to future milestone
- **Investor portal** — Deferred to future milestone

## Context

- **Legal positioning**: Matchmaking service, not delivery company or TNC
- **Pricing model**:
  - Food: $1 platform fee from customer + $1 from restaurant
  - Rideshare: $1 (≤$35), $2 ($35-70), $3 (>$70)
- **Drivers keep**: 100% of delivery fees + 100% of tips
- **Security**: 276 endpoints with role-specific Depends() auth, global middleware safety net, 50 endpoints rate-limited via Redis, SSL pinning (iOS), jailbreak detection (iOS), VAPT audited (iOS + Android), WebSocket auth, Swagger lockdown, bot protections
- **Production**: v1.4 shipped 2026-02-26, all 6 apps distributed (TestFlight + Firebase)
- **Testing**: 1289 backend tests, 223 UI tests (110 iOS + 113 Android), 208 API contract tests
- **Performance**: 6 DB bottlenecks fixed (indexes, geo-filter, async push, batch queries)

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
| Skip Phase 04 INFRA (v1.3) | INFRA items are ops tasks not code — defer to v1.4 | ✓ Resolved in v1.4 |
| iOS API verification before distribution (v1.4) | Never ship apps without verifying API calls match backend | ✓ Good |
| Parallel Android distribution (v1.4) | All 3 apps independent — build and upload simultaneously | ✓ Good |
| db.flush() over double-commit (v1.4) | Single commit per operation, get auto-increment ID via flush | ✓ Good |
| Geo-filtered push notifications (v1.4) | 25km bounding box + haversine reduces driver table scan | ✓ Good |

## Current Milestone: v1.5 Production Readiness

**Goal:** Graduate Android apps to Google Play, harden production infrastructure (DB rotation, SSL strategy), and validate rideshare E2E with real devices.

**Target features:**
- Android Play Store publishing (all 3 apps)
- Production DB password rotation
- SSL certificate pinning rotation strategy
- Rideshare E2E flow testing with real devices

## Current State

**v1.4 App Store Distribution shipped 2026-02-26.** All 6 apps (3 iOS + 3 Android) verified, built, and distributed. 53 quick tasks completed covering security audits, UI tests, OAuth, and DB performance.

---
*Last updated: 2026-02-26 after v1.5 milestone start*
