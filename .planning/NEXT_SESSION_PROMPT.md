# Next Session Prompt

> Run `/gsd:resume-work` to restore context, then work through items below.

---

## Session Summary (Mar 5, 2026)

### Completed This Session (8 tasks)
| Task | What | Commit |
|------|------|--------|
| Quick-92 | Deploy Wave 1 Payment Safety to staging+prod | CI/CD runs 22708997795 / 22709289493 |
| Quick-93 | **Wave 2 Gap #3**: Customer not at door — 5-min timer, leave at door, cancel with photo proof | `ec4a8607` |
| Quick-94 | **Wave 2 Gap #7**: Driver offline mid-delivery — stale GPS detection, auto-reassign | `7099c15a` |
| Quick-95 | **Wave 2 Gap #15**: Address validation at checkout + address-unreachable | `56c49af5` |
| Quick-96 | **Wave 2 Gap #17**: Driver approaching notification — 500m proximity push | `4b6396f1` |
| Quick-97 | Wave 2 pre-deploy audit — iOS OK, Android lat/lng fix, staging+prod deployed | `9a124947` |
| Quick-98 | **HOTFIX**: Email notification loop — scheduler dedup, Stripe webhook idempotency | `0ac64022` |
| Quick-99 | Wave 1+2 E2E recheck — 15 smoke + 15 lifecycle tests, all pass | `1c247b9f` |

### Also Fixed (not separate task)
- **$9 fare estimate bug**: `/api/rides/estimate` was returning 401 (auth required) → iOS/Android fell back to $8 min fare + $1 fee = $9 always. Fixed: added to allowlist + removed endpoint-level `Depends(require_any_auth)`. Commits `90700164` + `2f1f321c`.

### Wave 1 + Wave 2 COMPLETE (all 8 gaps closed)
- [x] #1 Double charge prevention (Stripe idempotency keys)
- [x] #2 Payment fails after food prepared (rollback + refund endpoint)
- [x] #5 Price change detection at checkout (409 response)
- [x] #6 Restaurant offline at checkout + auto-cancel (400 response)
- [x] #3 Customer not at door (5-min timer, leave at door, cancel with photo)
- [x] #7 Driver offline mid-delivery (stale GPS, auto-reassign)
- [x] #15 Address validation (geocode verify, address unreachable)
- [x] #17 Driver approaching notification (500m proximity push)

---

## PRIORITY 1: Phase 10 Android Parity

Phase 10 (Automated Support System) is complete on iOS but Android apps are MISSING these features:

| Feature | iOS | Android | What to add |
|---------|-----|---------|-------------|
| OrderChatView | Done | MISSING | Customer + Driver apps — in-order chat for delivery communication |
| LiveChatView | Done | MISSING | Customer app — live support chat with AI |
| AI feature hiding | Done | MISSING | Partner app — hide aspirational AI features with SHOW_AI_FEATURES=false |
| Support phone | Done | MISSING | All 3 apps — fix phone number to +1-800-365-5671 |
| Live Chat button | Done | MISSING | Customer app — wire "Live Chat" in Help screen |

**Android repo:** `/Users/jeet/StudioProjects/eatfair-android/`
**Use:** `/gsd:quick` for each feature

### After Android parity:
1. Build + distribute all 6 apps (iOS TestFlight + Android Firebase)
2. Do NOT submit to App Store yet

---

## PRIORITY 2: Check App Store Review

Customer build 1111 was WAITING_FOR_REVIEW (submitted Mar 4).
- Check status via ASC API
- If approved: submit Driver (214) + Restaurant (184) for review
- If rejected: read rejection notes, fix, rebuild
- Note: Build 1112 is now on TestFlight (includes Wave 1+2 fixes)

---

## PRIORITY 3: Wave 3 Safety & Trust (4 items)

| # | Gap | What to build | Effort |
|---|-----|---------------|--------|
| 4 | **Emergency SOS button** | In-app panic → 911 + share live location | 8h |
| 8 | **GPS spoofing detection** | Impossible speed check, teleportation detection | 8h |
| 11 | **Route deviation detection** | Compare actual GPS vs optimal route, alert if >20% | 8h |
| 13 | **Driver deactivation** | Auto-suspend if avg rating <4.0 after 50 rides | 3h |

---

## Current Build Versions

| Platform | App | Build | Distribution |
|----------|-----|-------|-------------|
| iOS | Customer | 1112 | TestFlight Mar 5 |
| iOS | Driver | 214 | TestFlight Mar 5 |
| iOS | Restaurant | 184 | TestFlight Mar 5 |
| Android | Customer | vC=35 (1.0.34) | Firebase Mar 5 |
| Android | Driver | vC=32 (1.0.31) | Firebase Mar 5 |
| Android | Partner | vC=28 (1.0.27) | Firebase Mar 5 |

**Note:** Android APKs need rebuild after lat/lng fix (Quick-97) + any Phase 10 Android work.

## Test Health
- **1385 backend tests** passing, 0 failures
- **30 E2E tests** (Wave 1+2) all passing
- **15 smoke tests** passing on staging + production

---

## Remaining v1.5 Phases

| Phase | Status | What's Left |
|-------|--------|-------------|
| 06 SSL Pinning | Done | - |
| 07 Play Store | 1/3 plans done | 07-02 (Play Console setup), 07-03 (upload+submit) |
| 08 DB Rotation | Not started | Secrets Manager Lambda, staging test, production enable |
| 09 Rideshare E2E | Not started | 12-step lifecycle test against staging |
| 10 Support System | iOS done, Android MISSING | See Priority 1 above |

---

## Suggested Session Flow

```
/gsd:resume-work
→ /gsd:quick Phase 10 Android: OrderChatView (Customer + Driver)
→ /gsd:quick Phase 10 Android: LiveChatView (Customer)
→ /gsd:quick Phase 10 Android: AI feature hiding + support phone fix (Partner)
→ /gsd:quick Build + distribute all 6 apps
→ Check App Store review status
→ /gsd:pause-work
```
