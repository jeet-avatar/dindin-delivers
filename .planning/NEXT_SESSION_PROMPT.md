# Next Session Prompt

> Run `/gsd:resume-work` to restore context, then work through items below.

---

## Session Summary (Mar 5-6, 2026)

### Completed This Session (5 tasks)
| Task | What | Commit |
|------|------|--------|
| Quick-100 | Phase 10 Android parity — Call Support added to Driver + Partner apps | `ae4342f3` (android), `d998fe21` (docs) |
| Quick-101 | Phase 10 test coverage — 24 new tests (order chat, support chat, voice agent) | `55e3f93b`, `4394298d` |
| Quick-102 | Full backend test suite run — 1439 passed, 0 failed, 11 skipped | `e6841e86` |
| Quick-103 | E2E UI audit — 153 screens, 441 handlers, 45 E2E tests, 23 issues found | `d13a325a` |
| Quick-104 | Root cause analysis of 23 issues — 10 false positives, 9 real bugs, 4 no-fix | ISSUE_TRACKER.md written, needs commit |

### Key Discovery
**10 of 23 UI audit issues are FALSE POSITIVES.** The audit agents missed backend route aliases registered via `app.add_api_route()` at the bottom of `main_new.py` (lines 21300+). These aliases were added during v1.2 API Standardization.

---

## PRIORITY 1: Fix 5 Real Bugs (Waves 1-3, ~40 min)

From `ISSUE_TRACKER.md` in `.planning/quick/104-detailed-fix-plan-for-23-ui-audit-issues/`:

### Wave 1 — Backend (HIGH, 5 min)
| ID | Issue | File | Fix |
|----|-------|------|-----|
| BUG-01 | `complete_delivery()` function at line 20273 shadows the order_flow import at line 14277 | `main_new.py:20273` | Rename to `complete_delivery_v2()` |

### Wave 2 — Android Missing Handlers (MEDIUM, 15 min)
| ID | Issue | File | Fix |
|----|-------|------|-----|
| BUG-02 | `onCallPartner` receives phone but no dialer Intent launched | `NavigationGraph.kt:320` | Add `Intent(ACTION_DIAL)` |
| BUG-03 | `onAddInstructions` empty lambda, confusing UX | `OrderTrackingScreen.kt:483` | Remove clickable row (backend doesn't support post-checkout instructions) |

### Wave 3 — iOS Missing UX (MEDIUM, 20 min)
| ID | Issue | File | Fix |
|----|-------|------|-----|
| BUG-04 | No pull-to-refresh on OrderHistoryView | `OrderHistoryView.swift` | Add `.refreshable` modifier |
| BUG-05 | No "Chat" button on DeliveryTrackingView | `DeliveryTrackingView.swift` | Add OrderChatView sheet button |

### After fixes:
- Run full test suite (`pytest tests/ -v`)
- Build + distribute all 6 apps (TestFlight + Firebase)

---

## PRIORITY 2: Commit Quick-104 Artifacts

Quick-104 ISSUE_TRACKER.md and SUMMARY are written but STATE.md update was interrupted. Need to:
1. Update STATE.md "Last activity" and quick tasks table with row 104
2. `git add` and commit the artifacts

---

## PRIORITY 3: Check App Store Review

Customer build 1111 was WAITING_FOR_REVIEW (submitted Mar 4).
- Check status via ASC API
- If approved: submit Driver (214) + Restaurant (184) for review
- If rejected: read rejection notes, fix, rebuild
- Build 1112 is on TestFlight (includes Wave 1+2 safety fixes)

---

## PRIORITY 4: Wave 4 Low-Priority Fixes (Optional, 85 min)

| ID | Issue | Effort |
|----|-------|--------|
| BUG-06 | Driver old ChatView uses Firebase, not REST | 20 min |
| BUG-08 | `onCategoryClick` empty lambda (Android Customer) | 10 min |
| BUG-09 | `onFoodItemClick` empty lambda (Android Customer) | 10 min |
| BUG-10 | `onEditPromotion` empty lambda (Android Partner) | 45 min |

---

## PRIORITY 5: Wave 3 Safety & Trust (Future)

| # | Gap | What to build | Effort |
|---|-----|---------------|--------|
| 4 | Emergency SOS button | In-app panic -> 911 + share live location | 8h |
| 8 | GPS spoofing detection | Impossible speed check, teleportation detection | 8h |
| 11 | Route deviation detection | Compare actual GPS vs optimal route, alert if >20% | 8h |
| 13 | Driver deactivation | Auto-suspend if avg rating <4.0 after 50 rides | 3h |

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

**Note:** Android APKs need rebuild after Quick-100 Call Support fix.

## Test Health
- **1439 backend tests** passing, 0 failures (Quick-102 verified)
- **45 E2E tests** (Quick-103) all passing
- **24 Phase 10 tests** (Quick-101) all passing

---

## Remaining v1.5 Phases

| Phase | Status | What's Left |
|-------|--------|-------------|
| 06 SSL Pinning | Done | - |
| 07 Play Store | 1/3 plans done | 07-02 (Play Console setup), 07-03 (upload+submit) |
| 08 DB Rotation | Not started | Secrets Manager Lambda, staging test, production enable |
| 09 Rideshare E2E | Not started | 12-step lifecycle test against staging |
| 10 Support System | Complete (iOS + Android) | - |

---

## Suggested Session Flow

```
/gsd:resume-work
→ Commit Quick-104 artifacts (STATE.md + ISSUE_TRACKER.md)
→ /gsd:quick Fix BUG-01 through BUG-05 (Waves 1-3)
→ /gsd:quick Build + distribute all 6 apps
→ Check App Store review status
→ /gsd:pause-work
```
