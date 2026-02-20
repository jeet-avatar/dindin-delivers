# Dollor.ai - Food Delivery & Rideshare Platform

## What This Is

Dollor.ai is a **matchmaking platform** connecting customers with restaurants and drivers for food delivery, and riders with drivers for rideshare services. We are NOT a delivery company or TNC - we facilitate connections and charge flat matchmaking fees ($1-$3) instead of commissions. All API endpoints are secured with JWT authentication via defense-in-depth (global middleware + per-endpoint auth).

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

### Active
- [ ] Android apps (Customer, Driver, Restaurant)
- [ ] Rideshare bidding system
- [ ] AI employee automation
- [ ] Investor portal
- [ ] API endpoint standardization (iOS/Android path alignment)

### Out of Scope
- **Commission-based pricing** — We use flat fees only, this is legally critical
- **Operating as TNC/delivery company** — We are matchmaking service only

## Context

- **Legal positioning**: Matchmaking service, not delivery company or TNC
- **Pricing model**:
  - Food: $1 platform fee from customer + $1 from restaurant
  - Rideshare: $1 (≤$35), $2 ($35-70), $3 (>$70)
- **Drivers keep**: 100% of delivery fees + 100% of tips
- **Security**: 170+ endpoints secured with global JWT middleware + per-endpoint Depends()
- **Production**: `dollor-api:372` (2/2 HEALTHY), staging `dollor-api-staging:31`
- **Codebase**: 62 files changed in v1.1, +9,828/-4,659 lines

## Constraints

- **Tech Stack**: iOS (SwiftUI), Android (Kotlin), Backend (Python FastAPI)
- **Payment**: Stripe only (Apple Pay + cards)
- **Maps**: Google Maps SDK
- **Auth**: P2P backend JWT (no Firebase Auth)
- **Deployment**: CI/CD only — never manual docker/ecs commands

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
| Reactive milestone (no REQUIREMENTS.md) (v1.1) | Security was urgent, formal planning would slow response | ⚠️ Revisit — use REQUIREMENTS.md for v1.2 |

---
*Last updated: 2026-02-20 after v1.1 milestone*
