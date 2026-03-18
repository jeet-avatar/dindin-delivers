---
phase: quick-186
plan: 01
subsystem: ios-driver
tags: [refactor, online-status, shared-state, ios, driver-app]
dependency_graph:
  requires: []
  provides: [OnlineStatusManager singleton, AppConfig driver constants]
  affects: [DeliveryViewModel, RideBiddingViewModel, EarningsViewModel]
tech_stack:
  added: [OnlineStatusManager.swift]
  patterns: [singleton-source-of-truth, computed-proxy, optimistic-update-with-revert]
key_files:
  created:
    - apps/ios/delivery/eatffairdelivery/ViewModels/OnlineStatusManager.swift
  modified:
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
    - apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift
    - apps/ios/delivery/eatffairdelivery/ViewModels/RideBiddingViewModel.swift
    - apps/ios/delivery/eatffairdelivery/ViewModels/EarningsViewModel.swift
decisions:
  - "OnlineStatusManager uses in-flight guard (isRequestInFlight) to prevent duplicate API calls when both ViewModels attempt toggle simultaneously"
  - "Computed proxy pattern (var isOnline: Bool { OnlineStatusManager.shared.isOnline }) preserves existing View bindings without any View changes"
  - "EarningsViewModel Firebase write preserved as best-effort cache for session tracking backward compatibility"
  - "fetchOnlineStatus cold-launch bootstrap is one-way (Firebase->manager) and only applies if manager is still false"
  - "markOnlineLocally/markOfflineLocally avoid duplicate API calls in session flow (updateOnlineStatus already calls the backend)"
metrics:
  duration: 244s
  completed: 2026-03-17
  tasks_completed: 2
  files_modified: 5
  files_created: 1
---

# Phase quick Plan 186: iOS Driver App Online/Offline State Refactor Summary

Single-line summary: Eliminated three independent isOnline states across DeliveryViewModel, RideBiddingViewModel, and EarningsViewModel by creating OnlineStatusManager as the singleton source of truth, wiring all six hardcoded timing/distance literals to AppConfig constants.

## What Was Built

### Problem
The iOS Driver app had three separate `@Published var isOnline: Bool = false` properties across DeliveryViewModel, RideBiddingViewModel, and EarningsViewModel. This caused:

1. **Split-brain bug**: Toggling online in the Delivery tab did not change the Rideshare tab's polling state. A driver could go offline on one tab and the other tab would continue to poll — or show a stale online indicator.
2. **Duplicate API calls**: Both DeliveryViewModel.setOnlineStatus() and EarningsViewModel.updateOnlineStatus() each called `P2PAPIService.shared.setDriverOnlineStatus(isOnline:)` independently. If both were triggered in close succession, the backend would receive two PUT /api/auth/driver/online calls.
3. **Double location tracking**: Both ViewModels called LocationManager.shared.startTracking() / stopTracking() independently, risking double-start or double-stop.
4. **Magic literals**: 5s poll interval, 3s location min interval, 2s rate-limit window, 3 failure threshold, 100km radius were all hardcoded inline — impossible to adjust remotely via AppConfig.

### Solution

**Task 1: AppConfig constants + OnlineStatusManager singleton**

Added to `AppConfig.swift` (after `nearbyDistanceMeters`):
- `driverPollingInterval: TimeInterval = 5.0`
- `locationUpdateMinInterval: TimeInterval = 3.0`
- `orderAcceptanceRateLimitInterval: TimeInterval = 2.0`
- `maxPollingFailuresBeforeWarning: Int = 3`
- `rideshareSearchRadiusKm: Double = 100.0`

Created `OnlineStatusManager.swift`:
- Singleton `ObservableObject` at `apps/ios/delivery/eatffairdelivery/ViewModels/OnlineStatusManager.swift`
- Single `@Published private(set) var isOnline: Bool = false`
- `setOnlineStatus(_:)`: in-flight guard, optimistic update, single API call, revert-on-failure, location tracking start/stop
- `markOnlineLocally()` / `markOfflineLocally()`: for session flow that already calls the API separately

**Task 2: Wire three ViewModels**

All three ViewModels updated identically:
- `@Published var isOnline` removed
- `var isOnline: Bool { OnlineStatusManager.shared.isOnline }` computed proxy added
- `setOnlineStatus(_:)` replaced with delegation to `OnlineStatusManager.shared.setOnlineStatus(online)`

Additional per-ViewModel changes:
- **DeliveryViewModel**: `rateLimitInterval` and `locationUpdateMinInterval` now read from AppConfig; timer interval from `AppConfig.shared.driverPollingInterval`
- **RideBiddingViewModel**: `maxFailuresBeforeWarning` from AppConfig; `radiusKm` from AppConfig; polling guard comment added noting WS handler also reads shared state via proxy; timer interval from AppConfig
- **EarningsViewModel**: `updateOnlineStatus` delegates API call to OnlineStatusManager, preserves Firebase best-effort write; `fetchOnlineStatus` now cold-launch bootstrap (Firebase→manager, one-way, only if manager is false); `startSession` uses `markOnlineLocally()`; `endSession` uses `markOfflineLocally()`; `loadMockData` (DEBUG) uses `markOnlineLocally()`

## Verification

```
@Published var isOnline grep: zero lines across all 3 ViewModels
OnlineStatusManager.shared grep: 18 references across 3 ViewModels (all expected)
Build: ** BUILD SUCCEEDED ** (iOS Simulator, Debug, eatffairdelivery scheme)
```

## Deviations from Plan

None — plan executed exactly as written. All constraint notes from the plan checker incorporated:
1. WS guard comment added at RideBiddingViewModel wsManager.onNewBid (line 136)
2. fetchOnlineStatus comment added: "Only syncs Firebase→manager for true state. Manager is authoritative."
3. Firebase write in EarningsViewModel.updateOnlineStatus documented as best-effort cache

## Self-Check: PASSED

Files verified:
- [FOUND] apps/ios/delivery/eatffairdelivery/ViewModels/OnlineStatusManager.swift
- [FOUND] apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift (driverPollingInterval present)
- [FOUND] Zero @Published var isOnline in 3 ViewModels
- [FOUND] OnlineStatusManager.shared in all 3 ViewModels

Commits verified:
- d6d8e266: feat(quick-186): add driver timing constants to AppConfig + create OnlineStatusManager
- fbdf26dd: feat(quick-186): wire DeliveryViewModel, RideBiddingViewModel, EarningsViewModel to OnlineStatusManager

Build verified: ** BUILD SUCCEEDED **
