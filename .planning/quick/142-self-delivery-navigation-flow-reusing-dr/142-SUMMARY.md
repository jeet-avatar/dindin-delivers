---
phase: quick-142
plan: 01
subsystem: ios-restaurant, android-partner
tags: [self-delivery, navigation, maps, ui]
dependency-graph:
  requires: [quick-93, quick-140]
  provides: [self-delivery-nav-flow]
  affects: [ios-restaurant-app, android-partner-app]
tech-stack:
  added: []
  patterns: [google-maps-intent, apple-maps-fallback, sequential-delivery-flow]
key-files:
  created: []
  modified:
    - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
    - apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift
    - apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
    - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/ApiModels.kt
    - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt
    - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersViewModel.kt
    - /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts
decisions:
  - Self-delivery detected by driverName being nil/empty (not a separate status)
  - Google Maps as primary nav with Apple Maps/geo intent fallback
  - VendorOrder model extended with delivery_instructions, leave_at_door, delivery_latitude, delivery_longitude
metrics:
  duration: 12m 26s
  completed: 2026-03-10
---

# Quick Task 142: Self-Delivery Navigation Flow Summary

Sequential self-delivery navigation with Google Maps intent, delivery instructions, and leave-at-door badge on both iOS Restaurant and Android Partner apps.

## Task Results

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | iOS Restaurant self-delivery nav | `c6372c12` | Phase A/B split, startDelivery(), map+navigate+arrived+delivered |
| 2 | Android Partner self-delivery nav | `7b44480d` (android repo) | Navigate button, delivery instructions, leave-at-door, VendorOrder model fields |
| 3 | Build + distribute | `909d0740` (iOS), `9387f6b1` (android) | iOS Restaurant 188 to TestFlight, Android Partner vC=32 to Firebase |

## Implementation Details

### iOS Restaurant (Task 1)
- **Phase A (restaurant_will_deliver):** Address preview, delivery instructions callout, leave-at-door badge, "Start Delivery" button that calls `updateOrderStatus(OUT_FOR_DELIVERY)`
- **Phase B (ontheway + no driver):** Map with restaurant/customer pins, "Navigate to Customer" button (Google Maps URL scheme first, Apple Maps fallback), "I've Arrived at Customer" button, "Photo & Mark Delivered" button
- Driver vs self-delivery detection: `driverName` presence check differentiates driver deliveries from self-deliveries in `ontheway` status

### Android Partner (Task 2)
- Added `deliveryInstructions`, `leaveAtDoor`, `deliveryLatitude`, `deliveryLongitude` to `VendorOrder` model (shared module)
- Added matching fields to `OrderItem` data class with mapping in `OrdersViewModel`
- Navigate to Customer: `google.navigation:q=lat,lng` intent with `com.google.android.apps.maps` package, falls back to `geo:` URI
- Delivery instructions card (blue), leave-at-door badge (orange) matching iOS visual style

### Builds (Task 3)
- iOS Restaurant: Build 188 archived and uploaded to TestFlight successfully
- Android Partner: vC=32 v1.0.31 built and distributed via Firebase App Distribution to jeetnair.in@gmail.com

## Deviations from Plan

None - plan executed exactly as written.
