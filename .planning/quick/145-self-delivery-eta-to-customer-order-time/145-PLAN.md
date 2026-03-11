---
phase: quick-145
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt
autonomous: true
requirements: [QUICK-145]
must_haves:
  truths:
    - "When restaurant taps Start Delivery for self-delivery, customer receives push notification with ETA in minutes"
    - "ETA is calculated from vendor-to-customer haversine distance at ~25mph + 2min buffer"
    - "iOS restaurant order cards show the order placed date and time"
    - "Android partner order cards show the order placed date and time"
  artifacts:
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "ETA calculation and push notification with ETA on self-delivery out_for_delivery transition"
      contains: "estimated_delivery_minutes"
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift"
      provides: "Order placed date/time on EnhancedOrderCard"
      contains: "orderDateFormatted"
    - path: "/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt"
      provides: "Order placed date/time on EnhancedOrderCard"
      contains: "formatOrderDate"
  key_links:
    - from: "order_flow.py update_order_status"
      to: "send_push_notification"
      via: "ETA included in push body and data payload when self-delivery goes out_for_delivery"
      pattern: "estimated_delivery_minutes"
---

<objective>
Two fixes for restaurant/customer experience:
1. Calculate and send delivery ETA to customer when restaurant starts self-delivery (taps Start Delivery, status -> out_for_delivery)
2. Show order placed date/time on order cards in both iOS and Android restaurant apps

Purpose: Customers need estimated delivery time for self-delivery orders. Restaurants need to see when orders were placed at a glance.
Output: Updated backend with ETA calculation + push, updated iOS/Android order cards with timestamps.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/order_flow.py (lines 3209-3238 — existing out_for_delivery push notification)
@apps/web/p2p-platform/backend/google_maps_service.py (lines 56-99 — _haversine_distance and _haversine_eta functions)
@apps/web/p2p-platform/backend/models.py (lines 410-510 — Order model, delivery_latitude/longitude fields)
@apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift (lines 383-515 — EnhancedOrderCard)
@/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt (lines 537-700 — EnhancedOrderCard)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend — Calculate ETA and include in self-delivery push notification</name>
  <files>apps/web/p2p-platform/backend/order_flow.py</files>
  <action>
In the `update_order_status` function (around line 3209), where the existing GAP-3 push notification is sent for `out_for_delivery` status, enhance the self-delivery branch to calculate distance-based ETA.

When `is_self_delivery` is True and status is `OUT_FOR_DELIVERY`:

1. Get vendor coordinates from the vendor object (already queried at line 3214): `vendor.latitude`, `vendor.longitude`
2. Get customer delivery coordinates from the order: `order.delivery_latitude`, `order.delivery_longitude`
3. If both coordinate pairs exist, calculate ETA using the existing `_haversine_eta` function from `google_maps_service.py`:
   ```python
   from google_maps_service import _haversine_eta
   eta_result = _haversine_eta(
       float(vendor.latitude), float(vendor.longitude),
       float(order.delivery_latitude), float(order.delivery_longitude)
   )
   eta_minutes = eta_result.eta_minutes
   ```
   Note: `_haversine_eta` already uses 25 mph average speed + 2-minute buffer, which is appropriate.
4. If coordinates are missing, fall back to `eta_minutes = 20` (reasonable default).

5. Update the push notification body for self-delivery (line 3219) from:
   `f"{r_name} has left to deliver your order."`
   to:
   `f"{r_name} has left to deliver your order. Estimated arrival in {eta_minutes} minutes."`

6. Add `estimated_delivery_minutes` to the push notification `data` dict (line 3228):
   ```python
   data={
       "type": "out_for_delivery",
       "order_id": str(order.id),
       "order_number": order.order_number,
       "status": "out_for_delivery",
       "estimated_delivery_minutes": str(eta_minutes),
       "is_self_delivery": "true"
   }
   ```

7. Also include `estimated_delivery_minutes` in the response dict (line 3241) so the restaurant app sees it:
   Add `"estimated_delivery_minutes": eta_minutes` to the response dict if self-delivery.

Import `_haversine_eta` from `google_maps_service` at the top of the self-delivery block (inside the try block to avoid import issues). The function `_haversine_eta` is NOT async, so it can be called directly.
  </action>
  <verify>
Run: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -c "from order_flow import update_order_status; print('import OK')"`
Verify the code compiles without syntax errors.
Grep for `estimated_delivery_minutes` in order_flow.py to confirm it appears in both the push data and response.
  </verify>
  <done>
When restaurant marks self-delivery order as out_for_delivery, push notification to customer includes "Estimated arrival in X minutes" based on haversine distance. ETA also returned in the API response.
  </done>
</task>

<task type="auto">
  <name>Task 2: iOS Restaurant — Show order placed date/time on order cards</name>
  <files>apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift</files>
  <action>
In `EnhancedOrderCard` (line 384), add a computed property to format the order placed date:

```swift
private var orderDateFormatted: String {
    let orderDate = Date(timeIntervalSince1970: TimeInterval(order.placedAt) / 1000)
    let formatter = DateFormatter()
    formatter.dateStyle = .short
    formatter.timeStyle = .short
    return formatter.string(from: orderDate)
}
```

In the card header (line 495), change from:
```swift
Text("\(order.itemsCount) items • \(timeElapsed)")
```
to:
```swift
Text("\(order.itemsCount) items • \(orderDateFormatted) • \(timeElapsed)")
```

This shows the format: "3 items • 3/10/26, 2:15 PM • 5m ago"

The `timeElapsed` already uses `DateTimeFormatter.shared.orderedTime(from:)` which gives relative time. Adding `orderDateFormatted` gives the absolute timestamp. Using `.short` date/time style keeps it compact on the card.
  </action>
  <verify>
Build iOS restaurant app:
```bash
cd /Users/jeet/doordash-p2p && xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build 2>&1 | tail -5
```
Confirm build succeeds with no errors.
  </verify>
  <done>
iOS restaurant order cards display "X items • M/D/YY, H:MM AM/PM • Xm ago" showing both absolute date/time and relative time.
  </done>
</task>

<task type="auto">
  <name>Task 3: Android Partner — Show order placed date/time on order cards</name>
  <files>/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt</files>
  <action>
In `OrdersScreen.kt`, add a helper function near the `EnhancedOrderCard` composable (around line 533):

```kotlin
private fun formatOrderDate(timeString: String): String {
    return try {
        // Parse ISO 8601 format from backend (e.g., "2026-03-10T14:15:00")
        val inputFormat = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
        val outputFormat = java.text.SimpleDateFormat("M/d h:mm a", java.util.Locale.US)
        val date = inputFormat.parse(timeString)
        if (date != null) outputFormat.format(date) else timeString.take(16)
    } catch (e: Exception) {
        timeString.take(16) // Fallback: show raw timestamp truncated
    }
}
```

In the `EnhancedOrderCard` composable, in the "Order Info" column (around line 683-692), change the subtitle text from:
```kotlin
text = "${order.items.size} items • ${
    if (order.orderNumber.isNotEmpty())
        OrderNumberFormatter.formatRelativeTime(order.orderNumber)
    else
        order.time
}",
```
to:
```kotlin
text = "${order.items.size} items • ${formatOrderDate(order.time)} • ${
    if (order.orderNumber.isNotEmpty())
        OrderNumberFormatter.formatRelativeTime(order.orderNumber)
    else
        order.time
}",
```

The `order.time` field already contains the ISO timestamp from `order.createdAt` (set in OrdersViewModel.kt line 88: `time = order.createdAt ?: ""`). This adds the formatted absolute date before the relative time.

Result: "3 items • 3/10 2:15 PM • 5m ago"
  </action>
  <verify>
Build Android partner app:
```bash
cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :partner:assembleDebug 2>&1 | tail -5
```
Confirm build succeeds.
  </verify>
  <done>
Android partner order cards display "X items • M/D H:MM AM/PM • Xm ago" showing both absolute date/time and relative time.
  </done>
</task>

</tasks>

<verification>
1. Backend: `grep -n "estimated_delivery_minutes" apps/web/p2p-platform/backend/order_flow.py` shows ETA in push data and response
2. iOS: Build succeeds, `grep -n "orderDateFormatted" apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift` shows date formatting
3. Android: Build succeeds, `grep -n "formatOrderDate" /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt` shows date formatting
</verification>

<success_criteria>
- Backend calculates haversine-based ETA when self-delivery order transitions to out_for_delivery
- Customer push notification includes "Estimated arrival in X minutes" for self-delivery
- iOS restaurant order cards show absolute date/time + relative time
- Android partner order cards show absolute date/time + relative time
- All three codebases compile without errors
</success_criteria>

<output>
After completion, create `.planning/quick/145-self-delivery-eta-to-customer-order-time/145-SUMMARY.md`
</output>
