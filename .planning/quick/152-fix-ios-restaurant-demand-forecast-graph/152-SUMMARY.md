---
phase: quick-152
plan: 01
subsystem: ios-restaurant
tags: [ios, restaurant, ai-insights, demand-forecast, earnings, swift]
dependency_graph:
  requires: [P2PAPIService.getAIInsights, P2PDemandForecast model]
  provides: [fallback forecast rendering, backend-sourced earnings]
  affects: [AIInsightsView chart, RestaurantSettingsView earnings display]
tech_stack:
  patterns: [sample data fallback, Firestore-to-backend migration]
key_files:
  created: []
  modified:
    - apps/ios/restaurant/eatffairrestaurant/ViewModels/AIInsightsViewModel.swift
    - apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
decisions:
  - Keep Firestore db property in SettingsViewModel since updateOnlineStatus and updateSettings still use it
  - Added public init to P2PDemandForecast in shared module for cross-module construction
metrics:
  duration: 217s
  completed: 2026-03-12
---

# Quick Task 152: Fix iOS Restaurant Demand Forecast Graph

Sample demand forecast generation + Firestore-to-backend earnings migration for restaurant AI insights and settings screens.

## Summary

Fixed two iOS Restaurant app bugs that made the AI Insights and Settings screens show empty/zero data for all vendors:

1. **Demand forecast chart** never rendered because backend returns empty `demandForecast` array for vendors with zero order history. Added `generateSampleForecast()` that produces realistic hourly entries (higher at lunch 11-14, dinner 17-21) so the chart always renders.

2. **Monthly earnings** always showed $0.00 because `fetchMonthlyEarnings()` queried Firestore (which has no orders data). Replaced with a call to `P2PAPIService.getAIInsights(period: "month")` which queries PostgreSQL via the P2P backend.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add fallback forecast data in AIInsightsViewModel | c8fab1c0 | AIInsightsViewModel.swift, P2PAPIService.swift |
| 2 | Switch monthly earnings from Firestore to P2P backend | 904d44f9 | RestaurantSettingsView.swift |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added public init to P2PDemandForecast**
- **Found during:** Task 1
- **Issue:** P2PDemandForecast is in EatFairShared module; its memberwise init is internal, preventing construction from the restaurant app module
- **Fix:** Added explicit `public init(hour:hour24:predicted:minOrders:maxOrders:)` to P2PDemandForecast struct
- **Files modified:** P2PAPIService.swift (line 8862)
- **Commit:** c8fab1c0

## Verification

- Restaurant app builds without errors (BUILD SUCCEEDED)
- AIInsightsViewModel.demandForecast never returns empty array (sample data fallback)
- fetchMonthlyEarnings calls P2P backend getAIInsights, not Firestore
- Earnings calculation subtracts $1/order platform fee with max(0, ...) guard

## Self-Check: PASSED
