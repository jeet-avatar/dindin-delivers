---
phase: quick-100
plan: 100
subsystem: android-apps
tags: [android, parity, support-phone, phase-10]
dependency_graph:
  requires: [quick-58]
  provides: [android-phase10-parity]
  affects: [driver-app, partner-app]
tech_stack:
  patterns: [ACTION_DIAL intent, AppConfig.Legal.SUPPORT_PHONE]
key_files:
  modified:
    - /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/profile/ProfileScreen.kt
    - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/settings/RestaurantSettingsScreen.kt
decisions:
  - Follow existing fully-qualified android.content.Intent pattern in Driver ProfileScreen (no new import)
  - Partner already imports Intent/Uri so used short form
metrics:
  duration: 106s
  completed: 2026-03-05T16:45:32Z
---

# Quick Task 100: Phase 10 Android Parity - Call Support Summary

**One-liner:** Added Call Support phone dial option (+1-800-365-5671) to Driver ProfileScreen and Partner RestaurantSettingsScreen, completing Phase 10 iOS-Android parity across all 3 apps.

## Changes Made

### Task 1: Add support phone to Driver and Partner help sections + verify compilation

**Driver ProfileScreen** (`driver/.../ui/profile/ProfileScreen.kt`):
- Added `ProfileMenuItem` with `Icons.Default.Phone`, title "Call Support", subtitle "+1-800-365-5671"
- onClick opens `ACTION_DIAL` intent with `tel:${AppConfig.Legal.SUPPORT_PHONE}`
- Placed below existing "Help & Support" email option

**Partner RestaurantSettingsScreen** (`partner/.../ui/settings/RestaurantSettingsScreen.kt`):
- Added `NavigationRow` with `Icons.Default.Phone`, title "Call Support"
- onClick opens `ACTION_DIAL` intent with `tel:${AppConfig.Legal.SUPPORT_PHONE}`
- Placed between "Contact Support" (email) and "FAQs" rows

**Verification:**
- All 3 apps compile: `./gradlew :app:assembleDebug :driver:assembleDebug :partner:assembleDebug` -- BUILD SUCCESSFUL (144 tasks, 1m 6s)
- grep confirms SUPPORT_PHONE in both modified files

### Audit Checklist (all items verified existing)

| Feature | App | File | Status |
|---------|-----|------|--------|
| OrderChatScreen | Customer | app/.../ui/chat/OrderChatScreen.kt | EXISTS |
| ChatViewModel | Customer | app/.../ui/chat/ChatViewModel.kt | EXISTS |
| OrderChatScreen | Driver | driver/.../ui/deliveries/OrderChatScreen.kt | EXISTS |
| LiveChatScreen | Customer | app/.../ui/help/LiveChatScreen.kt | EXISTS |
| SHOW_AI_FEATURES=false | Partner | MainScreen.kt + RestaurantSettingsScreen.kt | EXISTS |
| Call Support | Customer | HelpScreen.kt | EXISTS (pre-existing) |
| Call Support | Driver | ProfileScreen.kt | ADDED |
| Call Support | Partner | RestaurantSettingsScreen.kt | ADDED |

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | ae4342f3 | feat(quick-100): add Call Support phone option to Driver and Partner help sections |

**Note:** Commit is in the eatfair-android repo (`/Users/jeet/StudioProjects/eatfair-android`), not the doordash-p2p repo.

## Self-Check: PASSED

All files found, all commits verified.
