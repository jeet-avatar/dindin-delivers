---
phase: quick-153
plan: 01
subsystem: ios-restaurant, backend-promotions
tags: [bugfix, ios, backend, sample-data, promotions]
dependency_graph:
  requires: []
  provides: [vendor-id-in-promotions-response, sample-earnings-fallback, sample-recommendations]
  affects: [restaurant-settings-screen, ai-insights-screen, promotions-list]
tech_stack:
  added: []
  patterns: [sample-data-fallback-with-flag]
key_files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/promotions.py
    - apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
    - apps/ios/restaurant/eatffairrestaurant/ViewModels/AIInsightsViewModel.swift
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
decisions:
  - Sample earnings value of $847.50 chosen as realistic monthly figure for new restaurants
  - Followed existing isSampleForecast pattern for consistency across all sample data indicators
metrics:
  duration: 235s
  completed: 2026-03-12
---

# Quick Task 153: Fix Earnings Fallback, Smart Recommendations, Promotions Decode

Fixed 3 iOS Restaurant app bugs: promotions decode crash from missing vendor_id, monthly earnings always $0, and empty recommendations section.

## One-liner

Sample data fallback for earnings ($847.50) and recommendations (3 cards) when backend returns empty, plus vendor_id fix in promotions API response.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix promotions backend response -- add missing vendor_id | 0fe85ee8 | promotions.py |
| 2 | Add sample earnings fallback and sample recommendations | cb7f7937 | RestaurantSettingsView.swift, AIInsightsViewModel.swift, P2PAPIService.swift |

## Changes Made

### Task 1: Promotions vendor_id fix
- Added `"vendor_id": p.vendor_id` to list_promotions response dict in `promotions.py` line 417
- iOS `P2PPromotion` model has `vendorId: Int` as non-optional -- without this field, JSON decode fails with "data could not be read because it's missing"

### Task 2: Sample data fallbacks
- **RestaurantSettingsView.swift**: When `totalOrders == 0`, sets `monthlyEarnings = 847.50` and `isSampleEarnings = true` instead of showing $0.00
- **AIInsightsViewModel.swift**: Recommendations computed property now returns 3 sample cards when backend data is empty, matching existing `demandForecast` pattern. Added `isSampleRecommendations` computed property.
- **P2PAPIService.swift**: Added public memberwise `init` to `P2PAIRecommendation` struct (needed for programmatic construction of sample data)

## Deviations from Plan

### Auto-fixed Issues

None -- plan executed exactly as written.

## Verification

1. `grep "vendor_id" promotions.py` confirms `p.vendor_id` in list_promotions response
2. Restaurant app builds successfully (BUILD SUCCEEDED on iPhone 17 Simulator)
3. Sample earnings value (847.50) set when totalOrders == 0
4. Sample recommendations (3 items) returned when backend recommendations are empty

## Self-Check: PASSED

All modified files exist and both commits verified.
