# Dollor.ai - Food Delivery & Rideshare Platform

## What This Is

Dollor.ai is a **matchmaking platform** connecting customers with restaurants and drivers for food delivery, and riders with drivers for rideshare services. We are NOT a delivery company or TNC - we facilitate connections and charge flat matchmaking fees ($1-$3) instead of commissions.

## Core Value

**Drivers keep 100% of delivery fees and tips.** This is our key differentiator - we only charge flat platform fees, never commissions.

## Requirements

### Validated
- [x] Customer iOS app with multi-restaurant ordering (up to 3 restaurants)
- [x] Restaurant iOS app for order management
- [x] Driver iOS app for deliveries
- [x] P2P backend API (FastAPI/Python)
- [x] Stripe payment integration
- [x] Google/Apple Sign-In authentication
- [x] Real-time order tracking

### Active
- [ ] Android apps (Customer, Driver, Restaurant)
- [ ] Rideshare bidding system
- [ ] AI employee automation
- [ ] Investor portal

### Out of Scope
- **Commission-based pricing** — We use flat fees only, this is legally critical
- **Operating as TNC/delivery company** — We are matchmaking service only

## Context

- **Legal positioning**: Matchmaking service, not delivery company or TNC
- **Pricing model**:
  - Food: $1 platform fee from customer + $1 from restaurant
  - Rideshare: $1 (≤$35), $2 ($35-70), $3 (>$70)
- **Drivers keep**: 100% of delivery fees + 100% of tips

## Constraints

- **Tech Stack**: iOS (SwiftUI), Android (Kotlin), Backend (Python FastAPI)
- **Payment**: Stripe only (Apple Pay + cards)
- **Maps**: Google Maps SDK
- **Auth**: P2P backend (no Firebase Auth)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| P2P backend as source of truth | Firebase was causing sync issues | ✓ Good |
| Multi-restaurant cart (max 3) | User convenience vs complexity | ✓ Good |
| Flat fee vs commission | Legal and competitive positioning | ✓ Good |
| SwiftUI for iOS | Modern, declarative UI | ✓ Good |

---
*Last updated: January 29, 2026 after Build 1008*
