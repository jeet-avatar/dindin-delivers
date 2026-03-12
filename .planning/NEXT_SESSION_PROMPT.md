# Next Session Prompt

> Run `/gsd:resume-work` to restore context, then work through items below.

---

## Session Summary (Mar 12, 2026 — Evening)

### Completed This Session (Quick Tasks 152-156)

**11 bugs fixed, 3 CR tickets, 5 iOS builds uploaded:**

| Quick | What | Commits |
|-------|------|---------|
| 152 | Demand forecast graph not showing — sample forecast data fallback | `c8fab1c0`, `904d44f9` |
| 153 | Earnings $0.00 + recommendations empty + promotions decode crash (missing vendor_id) | `0fe85ee8`, `cb7f7937` |
| 154 | Promotions quick-create decode crash + smart recommendations now tappable | `dbdf0862`, `9d1bcee4` |
| 155 | (merged into 156) | — |
| 156 | Business hours not saving + promotion edit response + delivery photo E2E investigation | `6f859382`, `dea9cf37` |

**Deployments:**
- Backend staging + production: Both succeeded (runs 22983744090, 22983968002)
- iOS Restaurant builds 197-200 all uploaded to TestFlight
- **Build 200** is the latest on TestFlight with ALL fixes

**CR Tickets Created:**
- CR-0017: Promotion edit update_promotion response fix (Verified)
- CR-0018: Delivery photo E2E investigation — customer app display gap (Verified)
- CR-0019: Business hours save — Firebase guard removed (Verified)

### Key Findings

**Delivery Photo Gap (CR-0018):**
- Driver capture + backend storage EXISTS and WORKS (12-hour retention, proof gate)
- Customer apps (iOS + Android) have NO UI to display delivery photo
- Added as item 8 in `.planning/todos/pending/2026-03-09-apple-app-store-ios-cleanup-for-next-builds.md`

**Promotion Backend Fixes (all deployed):**
- `list_promotions` — was missing `vendor_id` field → iOS decode crash
- `create_promotion` — was returning success message, not full promotion object → quick-create crash
- `update_promotion` — same issue, returning minimal dict → edit not saving
- All 3 now return full promotion object matching `P2PPromotion` iOS model

---

## PRIORITY 1: Apple App Store Cleanup → TestFlight (NOT submit)

User wants to prepare the next Customer app build addressing Apple requirements, upload to TestFlight only, do NOT submit for review yet.

**Items from todo** (`.planning/todos/pending/2026-03-09-apple-app-store-ios-cleanup-for-next-builds.md`):

Code changes (need new build):
1. Remove `NSContactsUsageDescription` from Info.plist (unused)
2. Remove `NSLocationAlwaysAndWhenInUseUsageDescription` from Info.plist (unused)
3. Set `ENABLE_AI_FEATURES=NO` in Production.xcconfig (dead flag)
4. Delete `ACHPaymentService.swift` (dead code)

ASC metadata (no build needed):
5. Verify ASC privacy labels match actual SDK data collection
6. Fill "What's New" text in ASC
7. Set privacy URL in version localization

Feature gap (needs implementation):
8. Add delivery photo display to Customer app order tracking + history

**Approach:** Run items 1-4 as `/gsd:quick`, bump Customer build, archive → TestFlight. Then do items 5-7 via ASC API. Item 8 is a larger feature task.

---

## PRIORITY 2: iOS Restaurant Screenshots + Submit

**Screenshots are the ONLY blocker** for Restaurant app submission. 0 screenshot sets exist.
- Build 200 on TestFlight has all fixes from this session
- Minimum: iPhone 6.7" display screenshots
- Key screens: Dashboard, Menu, Orders, Settings, Documents, Promotions

---

## PRIORITY 3: iOS Driver App — Prepare + Submit

Same ASC metadata audit needed for Driver app (com.dollorai.delivery, build 215).
- Demo: demo.driver@dollor.ai / DemoDriver2025!
- State: PREPARE_FOR_SUBMISSION

---

## PRIORITY 4: Release iOS Customer App

Build 1111 is approved (PENDING_DEVELOPER_RELEASE). Wait for Apple's business papers confirmation.

---

## PRIORITY 5: Continue v1.5 Roadmap

| Phase | Status | Next Step |
|-------|--------|-----------|
| 07 Play Store | 1/3 plans | Customer on internal, need production track |
| 08 DB Rotation | Not started | `/gsd:plan-phase 8` |
| 09 Rideshare E2E | Not started | `/gsd:plan-phase 9` |
| 10 Support System | 2/3 plans | Plan 10-03 remaining |

---

## Current Build Versions (Updated Mar 12, 2026)

| Platform | App | Build | Distribution |
|----------|-----|-------|-------------|
| iOS | Customer | 1113 | TestFlight Mar 6, **Build 1111 APPROVED** |
| iOS | Driver | 215 | TestFlight Mar 6 |
| iOS | Restaurant | **200** | TestFlight Mar 12 |
| Android | Customer | vC=38 (1.0.37) | Firebase Mar 11 |
| Android | Driver | vC=33 (1.0.32) | Firebase Mar 6 |
| Android | Partner | vC=33 (1.0.32) | Firebase Mar 11 |

---

## Suggested Session Flow

```
/gsd:resume-work
→ /gsd:quick "Apple cleanup items 1-4 for iOS Customer app"
→ Bump Customer build → archive → TestFlight (DO NOT submit)
→ ASC metadata items 5-7 via API
→ Take Restaurant screenshots → upload to ASC
→ Submit Restaurant app for review
→ /gsd:pause-work
```
