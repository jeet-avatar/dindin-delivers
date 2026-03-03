---
phase: quick-58
plan: 01
subsystem: android-apps, ios-apps, shared-api
tags: [phase-10-parity, android, ios, order-chat, live-chat, ai-hiding, build-distribution]
dependency-graph:
  requires: [Phase 10 iOS completion (10-01, 10-02, 10-03)]
  provides: [Android Phase 10 parity, 6-app distribution]
  affects: [customer-android, driver-android, partner-android, customer-ios, driver-ios, restaurant-ios]
tech-stack:
  added: [SupportChatRequest/Response models, LiveChatViewModel, OrderChatViewModel]
  patterns: [SHOW_AI_FEATURES flag pattern, route-based tab mapping]
key-files:
  created:
    - app/src/main/java/ai/dollor/customer/ui/chat/OrderChatScreen.kt
    - app/src/main/java/ai/dollor/customer/ui/help/LiveChatScreen.kt
    - driver/src/main/java/ai/dollor/driver/ui/deliveries/OrderChatScreen.kt
  modified:
    - shared/src/main/java/ai/dollor/shared/config/AppConfig.kt
    - shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt
    - shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
    - shared/src/main/java/ai/dollor/shared/model/ApiModels.kt
    - app/src/main/java/ai/dollor/customer/ui/navigation/Navigation.kt
    - app/src/main/java/ai/dollor/customer/ui/navigation/NavigationGraph.kt
    - driver/src/main/java/ai/dollor/driver/ui/navigation/DriverNavGraph.kt
    - partner/src/main/java/ai/dollor/partner/ui/settings/RestaurantSettingsScreen.kt
    - partner/src/main/java/ai/dollor/partner/ui/main/MainScreen.kt
    - app/build.gradle.kts
    - driver/build.gradle.kts
    - partner/build.gradle.kts
    - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    - apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    - apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
decisions:
  - "SHOW_AI_FEATURES=false constant pattern instead of BuildConfig flag (simpler, no build system changes needed)"
  - "LiveChatViewModel as @HiltViewModel with DollorRepository injection (clean DI, testable)"
  - "Driver OrderChatViewModel with SavedStateHandle for orderId/customerName (same pattern as customer ChatViewModel)"
  - "Route-based tab mapping in MainScreen instead of hardcoded indices (resilient to tab filtering)"
metrics:
  duration: 26m
  completed: 2026-03-03
  tasks: 2
  files-created: 3
  files-modified: 15
---

# Quick Task 58: Add Phase 10 Features to Android Apps and Build All 6 Apps

Phase 10 Android parity with iOS, plus 6-app distribution (3 TestFlight + 3 Firebase)

## One-liner

Customer/Driver OrderChatScreen + AI LiveChatScreen + Partner AI hiding ported to Android, all 6 apps built and distributed

## What Was Done

### Task 1: Add Phase 10 features to all 3 Android apps

**Shared API layer:**
- Added `SUPPORT_PHONE = "+18003655671"` to `AppConfig.Legal`
- Added `sendSupportChat` endpoint to `DollorApiService` (POST `support/chat`)
- Added `SupportChatRequest`/`SupportChatResponse` data classes to `ApiModels.kt`
- Added `sendSupportChat()` method to `DollorRepository` with customer auth

**Customer App:**
- Created `OrderChatScreen.kt` - food delivery chat with driver, using existing `ChatViewModel` (Hilt/SavedStateHandle), quick messages (6 options), 3s polling, blue customer/green driver bubbles
- Created `LiveChatScreen.kt` - AI support chat with `LiveChatViewModel`, greeting message, 4 suggestion buttons, typing indicator (3 animated dots), Dollor orange branding
- Wired `HelpSupportScreen` callbacks: Chat With Us navigates to LiveChatScreen, Call Support dials SUPPORT_PHONE, Email Support opens mailto:support@dollor.ai
- Added `OrderChat` and `LiveChat` to `Screen` sealed class with navigation routes

**Driver App:**
- Created `OrderChatScreen.kt` with `OrderChatViewModel` - delivery chat with customer, 6 delivery-specific quick messages, 3s polling, green driver/blue customer bubbles
- Added `order_chat/{orderId}/{customerName}` route to `DriverNavGraph`

**Partner App:**
- Added `SHOW_AI_FEATURES = false` constant to `RestaurantSettingsScreen` and `MainScreen`
- Wrapped AI Features settings section with `if (SHOW_AI_FEATURES)` guard
- Filtered AI tab from `bottomNavItems` when flag is false
- Changed tab content selection from index-based `when` to route-based `when` for resilience

**Version bumps:**
- Customer: vC 28 -> 29, v1.0.27 -> 1.0.28
- Driver: vC 25 -> 26, v1.0.24 -> 1.0.25
- Partner: vC 21 -> 22, v1.0.20 -> 1.0.21

All 3 apps compiled successfully: `BUILD SUCCESSFUL in 1m 17s`

### Task 2: Build and distribute all 6 apps

**Android (Firebase App Distribution):**
- Customer v1.0.28 (vC=29) - uploaded successfully
- Driver v1.0.25 (vC=26) - uploaded successfully
- Partner v1.0.21 (vC=22) - uploaded successfully

**iOS (TestFlight):**
- Customer Build 1103 - archived and uploaded
- Driver Build 208 - archived and uploaded
- Restaurant Build 178 - archived and uploaded

**MEMORY.md** updated with new build versions.

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Repository | Description |
|------|--------|------------|-------------|
| 1 | `030c8aac` | eatfair-android | Phase 10 features added to all 3 Android apps |
| 2 | `7523e93b` | doordash-p2p | iOS build number bumps + all 6 apps distributed |

## Verification Results

- All 3 Android debug builds pass: `BUILD SUCCESSFUL`
- All 3 Android release APKs built and uploaded to Firebase
- All 3 iOS archives succeeded and uploaded to TestFlight
- Customer OrderChatScreen exists with quick messages and ChatViewModel integration
- Customer LiveChatScreen exists with AI support, suggestions, and typing indicator
- Driver OrderChatScreen exists with delivery-specific quick messages
- Partner AI Features section hidden (SHOW_AI_FEATURES = false)
- Partner AI tab hidden from bottom navigation
- HelpSupportScreen phone/email/chat callbacks all wired
- SUPPORT_PHONE constant set to +18003655671
- Version codes incremented for all 6 apps

## Self-Check: PASSED

All files verified present, all commits found, all APKs and archives exist.
