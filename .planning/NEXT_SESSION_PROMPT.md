# Next Session Prompt

> Run `/gsd:resume-work` to restore context, then work through items below.

---

## Session Summary (Mar 5, 2026)

### Completed This Session
| Task | What | Commit |
|------|------|--------|
| Quick-89 | **Wave 1 Payment Safety (backend)** — 8 Stripe idempotency keys, refund endpoint, price change detection (409), vendor offline blocking (400), auto-cancel on vendor offline | `903a43d0` |
| Quick-90 | **Wave 1 client-side handling** — iOS/Android 409+400 error UX, push notifications for auto-cancel and refund | `39758703` |
| Quick-91 | **Build+distribute all 6 apps** — iOS 1112/214/184 to TestFlight, Android vC=35/32/28 to Firebase | `b74dc56a` |

### Wave 1 Payment Safety is COMPLETE (4/4 CRITICAL gaps closed)
- [x] #1 Double charge prevention (Stripe idempotency keys)
- [x] #2 Payment fails after food prepared (rollback + refund endpoint)
- [x] #5 Price change detection at checkout (409 response)
- [x] #6 Restaurant offline at checkout + auto-cancel (400 response)

---

## Priority Items for Next Session

### 1. Pending Todos (check first)

**App Store Review** — Customer build 1111 was WAITING_FOR_REVIEW (submitted Mar 4).
- Check status: generate ASC JWT, GET version `30ad500d-cdf6-47fb-98e2-314fe6fd68dc`
- If approved: submit Driver (214) + Restaurant (184) for review
- If rejected: read rejection notes, fix, rebuild
- Note: Build 1112 is now on TestFlight too (includes Wave 1 fixes)

**Phase 10 Android Parity** — iOS has Phase 10 features, Android does NOT:
- OrderChatView (Customer + Driver Android)
- LiveChatView (Customer Android)
- AI feature hiding (Partner Android)
- Support phone number fix (Android)
- Already tracked in `.planning/todos/pending/`

### 2. Wave 2: Delivery Reliability (~12h, 4 items)

| # | Gap | What to build | Effort |
|---|-----|---------------|--------|
| 3 | **Customer not at door** | 5-min wait timer, "leave at door" option, driver cancel with photo proof | 6h |
| 7 | **Driver offline mid-delivery** | Detect stale location (>10min no update), auto-reassign to next driver | 6h |
| 15 | **Address validation** | Geocode verify at checkout, "address unreachable" driver flow | 6h |
| 17 | **Driver approaching notification** | Push "Driver 2 min away" when within 500m | 3h |

Use `/gsd:quick` for each item.

### 3. Wave 3: Safety & Trust (~19h, 4 items)

| # | Gap | What to build | Effort |
|---|-----|---------------|--------|
| 4 | **Emergency SOS button** | In-app panic → 911 + share live location with emergency contacts | 8h |
| 8 | **GPS spoofing detection** | Impossible speed check, teleportation detection | 8h |
| 11 | **Route deviation detection** | Compare actual GPS vs optimal route, alert if >20% | 8h |
| 13 | **Driver deactivation** | Auto-suspend if avg rating <4.0 after 50 rides | 3h |

### 4. Wave 4: UX & Revenue (~23h, 5 items)

| # | Gap | What to build | Effort |
|---|-----|---------------|--------|
| 9 | Scheduled orders | Order now, deliver at 7pm | 12h |
| 10 | Reorder / order again | One-tap from order history | 4h |
| 12 | Customer rating by driver | Drivers rate customers 1-5 | 3h |
| 14 | Auto refund SLA | Auto-approve <$10 after 24h | 4h |
| 16 | Real-time ETA updates | Recalc ETA every 60s | 6h |

### 5. Remaining v1.5 Phases (from ROADMAP.md)

| Phase | Status | What's Left |
|-------|--------|-------------|
| 06 SSL Pinning | Done | - |
| 07 Play Store | 1/3 plans done | 07-02 (Play Console setup), 07-03 (upload+submit) |
| 08 DB Rotation | Not started | Secrets Manager Lambda, staging test, production enable |
| 09 Rideshare E2E | Not started | 12-step lifecycle test against staging |
| 10 Support System | iOS done, Android NOT | See Phase 10 Android parity todo above |

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

## Test Health
- **1346 backend tests** passing, 0 failures
- **15 smoke tests** passing on staging
- **15 new payment safety tests** (Quick-89)

---

## Suggested Session Flow

```
/gsd:resume-work
→ Check App Store review status (build 1111)
→ /gsd:quick Wave 2 item: Customer not at door (timer + leave at door)
→ /gsd:quick Wave 2 item: Driver offline detection + reassign
→ /gsd:quick Wave 2 item: Driver approaching notification
→ Build + distribute if Wave 2 complete
→ /gsd:pause-work
```
