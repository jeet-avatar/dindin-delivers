# Next Session Prompt

> Run `/gsd:resume-work` to restore context, then work through items below.

---

## Session Summary (Mar 12, 2026 — Night Session)

### Completed This Session (Quick Tasks 157-158)

**9 bugs fixed, 2 CR tickets, backend deployed to production, iOS Restaurant build 201 on TestFlight:**

| Quick | CR | What | Commits |
|-------|-----|------|---------|
| 157 | CR-0020 | 7 iOS Restaurant bugs: promotion save button white-on-white, earnings $0 fallback, Toast POS "coming soon" removed, online/offline backend sync, legal pages 404 (Dockerfile fix) | `45fa75db` |
| 158 | CR-0021 | Restaurant ID blank (Firebase UID → P2P vendor ID), "Estimated" earnings label, EnhancedMenuView Firebase UID hardcode | `f93006ad`, `4e389b1e` |

**Deployments:**
- Backend staging: Succeeded (run 22987175534) — legal pages return 200
- Backend production: Succeeded (run 22987503974) — `api.dollor.ai/terms` + `/privacy` both 200
- iOS Restaurant build 201: Uploaded to TestFlight

**GSD Verification:**
- All 8 original fixes verified by GSD recheck agent — ALL PASS
- 1 additional bug found during verification: `EnhancedMenuView.swift:799` hardcoded Firebase UID — fixed in `4e389b1e`
- Phase 10 (Automated Support System) fully audited — all components implemented, no gaps

**Key Root Causes Found & Fixed:**
- **Restaurant ID blank**: `RestaurantSettingsView.swift:670` used `Auth.auth().currentUser?.uid` — nil for OAuth users. Fixed to use P2P vendor ID first.
- **Legal pages 404**: `Dockerfile.optimized` production stage only copied `*.py` files — `legal/` directory never in container. Added `COPY legal/ ./legal/`.
- **Promotion button invisible**: `.listRowBackground()` was inside button label HStack, not on the row level.

---

## PRIORITY 1: Build iOS Restaurant 202 → TestFlight

**Build 201 on TestFlight has ALL fixes EXCEPT the EnhancedMenuView Firebase UID fix** (`4e389b1e`).
- Bump to build 202, archive, upload to TestFlight
- This ensures menu loading works correctly for OAuth-logged-in users
- Quick task: bump version in project.pbxproj, archive, export+upload

---

## PRIORITY 2: Apple App Store Cleanup → Customer Build → TestFlight (NOT submit)

From `.planning/todos/pending/2026-03-09-apple-app-store-ios-cleanup-for-next-builds.md`:

Code changes (need new Customer build):
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

---

## PRIORITY 3: iOS Restaurant Screenshots + Submit

**Screenshots are the ONLY blocker** for Restaurant app submission. 0 screenshot sets exist.
- Build 202 (once uploaded) will have ALL fixes
- Minimum: iPhone 6.7" display screenshots
- Key screens: Dashboard, Menu, Orders, Settings, Documents, Promotions

---

## PRIORITY 4: iOS Driver App — Prepare + Submit

Same ASC metadata audit needed for Driver app (com.dollorai.delivery, build 215).
- Demo: demo.driver@dollor.ai / DemoDriver2025!
- State: PREPARE_FOR_SUBMISSION

---

## PRIORITY 5: Release iOS Customer App

Build 1111 is approved (PENDING_DEVELOPER_RELEASE). Wait for Apple's business papers confirmation.

---

## PRIORITY 6: Continue v1.5 Roadmap

| Phase | Status | Next Step |
|-------|--------|-----------|
| 06 SSL Pinning | Complete | — |
| 07 Play Store | Not started | `/gsd:plan-phase 7` |
| 08 DB Rotation | Not started | `/gsd:plan-phase 8` |
| 09 Rideshare E2E | Not started | `/gsd:plan-phase 9` |
| 10 Support System | **Complete** (audited this session) | — |
| 11 Change Mgmt | Complete | — |
| 12 Admin Portal | Complete | — |

---

## Current Build Versions (Updated Mar 12, 2026)

| Platform | App | Build | Distribution |
|----------|-----|-------|-------------|
| iOS | Customer | 1113 | TestFlight Mar 6, **Build 1111 APPROVED** |
| iOS | Driver | 215 | TestFlight Mar 6 |
| iOS | Restaurant | **201** | TestFlight Mar 12 (needs 202 for menu fix) |
| Android | Customer | vC=38 (1.0.37) | Firebase Mar 11 |
| Android | Driver | vC=33 (1.0.32) | Firebase Mar 6 |
| Android | Partner | vC=33 (1.0.32) | Firebase Mar 11 |

---

## Suggested Session Flow

```
/gsd:resume-work
→ Bump iOS Restaurant to 202, archive, upload TestFlight
→ /gsd:quick "Apple cleanup items 1-4 for iOS Customer app"
→ Bump Customer build → archive → TestFlight (DO NOT submit)
→ ASC metadata items 5-7 via API
→ Take Restaurant screenshots → upload to ASC
→ Submit Restaurant app for review
→ /gsd:plan-phase 7 (Play Store Publishing)
```
