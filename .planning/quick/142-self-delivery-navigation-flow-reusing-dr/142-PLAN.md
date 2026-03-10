---
phase: quick-142
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [SEQUENTIAL-FLOW, NAVIGATION, MAP, REUSE-DRIVER-PATTERNS]
---

<objective>
Implement sequential self-delivery navigation flow in iOS Restaurant + Android Partner apps, reusing driver delivery patterns.

Flow: Start Delivery → Map + Navigate → I've Arrived → Photo + Complete
</objective>

## Tasks

### Task 1: iOS Restaurant — sequential self-delivery flow
- **files**: `apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift`, `apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift`
- **action**:
  Split the `restaurant_will_deliver` section into two phases:
  
  **Phase A: restaurant_will_deliver status** (before starting delivery)
  - Show address preview + delivery instructions
  - Show "Start Delivery" button (calls updateOrderStatus to out_for_delivery)
  - No map/navigate/arrived buttons yet
  
  **Phase B: out_for_delivery status** (after starting delivery — add new `else if` for this status)
  - Show status: "On the way to customer"
  - Show map with restaurant + customer pins (reuse existing map code)
  - Show customer address prominently
  - Show delivery instructions
  - Show "Navigate to Customer" button (reuse existing Apple Maps code, add Google Maps fallback like driver app)
  - Show "I've Arrived at Customer" button
  - Show "Photo & Mark Delivered" button
  - Leave-at-door badge if applicable
  
  Add `startDelivery(_ order:)` method to OrdersViewModel that calls `p2pAPI.updateOrderStatus()` with "out_for_delivery"
  
  Add `onStartDelivery` callback to EnhancedOrderCard
  
  Update `deliveringOrders` computed property to include "out_for_delivery" mapped status

### Task 2: Android Partner — add map + navigation to self-delivery
- **files**: `/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt`
- **action**:
  In the `isOutForDelivery` section (after Start Delivery is tapped), ADD before the "I've Arrived" button:
  
  1. Customer address card with location icon
  2. Delivery instructions card (if present)  
  3. Leave-at-door badge (if applicable)
  4. "Navigate to Customer" button using Google Maps intent (reuse driver pattern):
     ```kotlin
     val gmmUri = Uri.parse("google.navigation:q=${lat},${lng}")
     context.startActivity(Intent(Intent.ACTION_VIEW, gmmUri).apply {
         setPackage("com.google.android.apps.maps")
     })
     ```
  5. Fallback to generic geo intent if Google Maps not installed
  
  The order data model should already have delivery address coordinates from the API.
  Check VendorOrder model for lat/lng fields.

### Task 3: Commit + build both apps
- **action**:
  1. Commit iOS changes in doordash-p2p repo
  2. Commit Android changes in eatfair-android repo
  3. Build iOS Restaurant (bump to 188) + upload TestFlight
  4. Build Android Partner (bump to vC=32) + Firebase distribute
