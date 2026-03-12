# Quick Task 158 Summary

## Fix Restaurant ID Blank + Sample Earnings Indicator

**Date:** 2026-03-12
**Commit:** f93006ad
**CR:** CR-0021

### Root Cause

`RestaurantSettingsView.swift:670-671` used `Auth.auth().currentUser?.uid` to derive `restaurantId`. After migration to P2P OAuth (Apple Sign-In, Google Sign-In), Firebase user is `nil` — making restaurantId blank. This broke:
- Restaurant ID display in Settings
- Online/offline Firebase toggle (guard checked `!restaurantId.isEmpty`)
- Firebase settings updates

### Changes Made

| Change | Lines | Description |
|--------|-------|-------------|
| restaurantId property | 677-681 | P2P vendor ID first (`currentVendorId`), Firebase UID fallback |
| ID display | 542 | Show full ID (removed `.prefix(12) + "..."` truncation) |
| Earnings indicator | 345-354 | Added "Estimated" caption when `isSampleEarnings == true` |

### Pattern Alignment

Now matches correct pattern from `EnhancedMenuView.swift:742-748` and `OrdersViewModel.swift:187-196`.

### Files Modified (1)

- `apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift`
