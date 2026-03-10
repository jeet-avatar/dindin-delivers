---
phase: quick-127
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift
  - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
autonomous: true
requirements: [GAP-1-leave-at-door, GAP-2-map-view, GAP-3-delivery-instructions]
must_haves:
  truths:
    - "P2PVendorOrder decodes leave_at_door from backend JSON"
    - "Order model carries leaveAtDoor through to restaurant UI"
    - "Self-delivery order card shows MapKit map with customer pin and restaurant pin"
    - "Navigate button opens Apple Maps with turn-by-turn directions"
    - "Delivery instructions shown in prominent callout box during self-delivery"
    - "Leave-at-door badge shown when leaveAtDoor is true"
  artifacts:
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift"
      provides: "leaveAtDoor field on P2PVendorOrder + passed to Order via toOrder()"
      contains: "leaveAtDoor"
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift"
      provides: "leaveAtDoor optional Bool on Order struct"
      contains: "leaveAtDoor"
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift"
      provides: "MapView + delivery instructions callout + leave-at-door badge in self-delivery card"
      contains: "Map("
  key_links:
    - from: "P2PAPIService.swift (P2PVendorOrder)"
      to: "Order.swift (Order)"
      via: "toOrder() passes leaveAtDoor"
      pattern: "leaveAtDoor.*leaveAtDoor"
    - from: "EnhancedDashboardView.swift"
      to: "Order.leaveAtDoor"
      via: "conditional badge rendering"
      pattern: "leaveAtDoor"
---

<objective>
Fix 3 gaps in restaurant self-delivery flow: decode leave_at_door from backend, add MapKit map with route to customer, and show delivery instructions + leave-at-door badge prominently.

Purpose: Restaurant staff doing self-delivery need to see where the customer is (map), how to get there (navigate button), what the customer wants (instructions), and whether to leave at door.
Output: Updated shared models + restaurant dashboard with map, instructions callout, and leave-at-door badge.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift (lines 10222-10422 — P2PVendorOrder struct + toOrder())
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift (lines 302-450 — Order struct)
@apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift (lines 1033-1091 — self-delivery section of EnhancedOrderCard)
@apps/ios/restaurant/eatffairrestaurant/Views/RestaurantDeliveryProofSheet.swift
@.agents/skills/ticketed-task/SKILL.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CR ticket for self-delivery flow improvements</name>
  <files>(API call only — no files modified)</files>
  <action>
Create a Change Request ticket on the admin portal:

```bash
curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix 3 gaps in restaurant self-delivery flow (leave_at_door, map, instructions)",
    "description": "GAP 1: Decode leave_at_door in P2PVendorOrder + Order model. GAP 2: Add MapKit MapView with customer/restaurant pins + Navigate button (Apple Maps). GAP 3: Show delivery instructions callout + leave-at-door badge prominently in self-delivery card. iOS restaurant app only, no backend changes.",
    "change_type": "code",
    "priority": "Medium",
    "requested_by": "support@dollor.ai"
  }'
```

Extract `cr_id` from response. Then submit for review:

```bash
curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/<cr_id>/submit?secret_key=$ADMIN_SECRET_KEY"
```

Include CR ID in all subsequent commit messages.
  </action>
  <verify>CR ticket created and submitted. cr_id extracted (e.g., CR-XXXX).</verify>
  <done>CR ticket exists in admin portal with status "Under Review" or "Approved".</done>
</task>

<task type="auto">
  <name>Task 2: Fix all 3 gaps — leave_at_door decode, MapView, delivery instructions callout</name>
  <files>
    apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift
    apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
  </files>
  <action>
**GAP 1 — Decode leave_at_door in models:**

1. In `P2PAPIService.swift`, add to `P2PVendorOrder` struct (after `driverEtaText` ~line 10250):
   ```swift
   public let leaveAtDoor: Bool?
   ```

2. Add CodingKey in the `enum CodingKeys` block:
   ```swift
   case leaveAtDoor = "leave_at_door"
   ```

3. In `toOrder()` method (~line 10302), pass `leaveAtDoor` to Order constructor. Add parameter:
   ```swift
   leaveAtDoor: leaveAtDoor
   ```

4. In `Order.swift`, add field to `Order` struct (after `driverEtaText` ~line 374):
   ```swift
   public var leaveAtDoor: Bool?
   ```

5. Add to `CodingKeys` enum:
   ```swift
   case leaveAtDoor
   ```

6. Add to `init(from decoder:)`:
   ```swift
   leaveAtDoor = try container.decodeIfPresent(Bool.self, forKey: .leaveAtDoor)
   ```

7. Add to the memberwise `init(...)` — add `leaveAtDoor: Bool? = nil` parameter and assign `self.leaveAtDoor = leaveAtDoor`.

**GAP 2 — Add MapKit MapView in self-delivery card:**

In `EnhancedDashboardView.swift`, add `import MapKit` at the top.

In the `restaurant_will_deliver` section of `EnhancedOrderCard` (~line 1033-1091), REPLACE the existing content between the status indicator ("You are delivering this order") and the "Photo & Mark Delivered" button with:

1. **Map view** — Use SwiftUI `Map` (iOS 17+ `Map { }` syntax, or iOS 14+ `Map(coordinateRegion:annotationItems:)` — use the iOS 14+ version for compatibility):
   - Show 2 annotation pins: restaurant location (from `order.restaurant.latitude/longitude`) and customer location (from `order.deliveryAddress.latitude/longitude`)
   - Set region to fit both pins with padding
   - Restaurant pin: orange, systemImage "building.2.fill"
   - Customer pin: green, systemImage "house.fill"
   - Map frame height: 200pt, corner radius 12
   - Only show map if BOTH coordinates are non-zero (guard against 0,0)

2. **Navigate button** — Below the map:
   ```swift
   Button(action: {
       let destCoord = CLLocationCoordinate2D(
           latitude: order.deliveryAddress.latitude,
           longitude: order.deliveryAddress.longitude
       )
       let placemark = MKPlacemark(coordinate: destCoord)
       let mapItem = MKMapItem(placemark: placemark)
       mapItem.name = order.customerName
       mapItem.openInMaps(launchOptions: [
           MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving
       ])
   }) {
       HStack {
           Image(systemName: "arrow.triangle.turn.up.right.diamond.fill")
           Text("Navigate to Customer")
       }
       // Style: blue background, white text, full width, rounded
   }
   ```

**GAP 3 — Delivery instructions callout + leave-at-door badge:**

In the same self-delivery section, ABOVE the map, add:

1. **Leave-at-door badge** (if `order.leaveAtDoor == true`):
   ```swift
   if order.leaveAtDoor == true {
       HStack {
           Image(systemName: "door.left.hand.open")
               .foregroundColor(.orange)
           Text("LEAVE AT DOOR")
               .font(.caption)
               .fontWeight(.bold)
               .foregroundColor(.orange)
       }
       .padding(.horizontal, 12)
       .padding(.vertical, 6)
       .background(Color.orange.opacity(0.15))
       .cornerRadius(8)
   }
   ```

2. **Delivery instructions callout** (if instructions non-empty):
   ```swift
   if !order.deliveryInstructions.isEmpty {
       VStack(alignment: .leading, spacing: 4) {
           HStack {
               Image(systemName: "note.text")
                   .foregroundColor(.blue)
               Text("Delivery Instructions")
                   .font(.caption)
                   .fontWeight(.semibold)
                   .foregroundColor(.blue)
           }
           Text(order.deliveryInstructions)
               .font(.subheadline)
               .foregroundColor(.primary)
       }
       .padding(12)
       .frame(maxWidth: .infinity, alignment: .leading)
       .background(Color.blue.opacity(0.08))
       .cornerRadius(10)
   }
   ```

Place both in `.padding(.horizontal)` wrapper.

**Important:** Keep the existing delivery address text and "Photo & Mark Delivered" button. The new elements go BETWEEN the status header and the mark-delivered button. Order: status header -> leave-at-door badge -> delivery instructions callout -> address -> map -> navigate button -> mark delivered button.
  </action>
  <verify>
Build the restaurant app to confirm no compilation errors:
```bash
xcodebuild -workspace apps/ios/EatFair.xcworkspace \
  -scheme eatffairrestaurant -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  build 2>&1 | tail -5
```
Verify `BUILD SUCCEEDED`.

Grep to confirm all 3 gaps are addressed:
```bash
grep -n "leaveAtDoor" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
grep -n "leaveAtDoor" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift
grep -n "Map(" apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
grep -n "LEAVE AT DOOR" apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
grep -n "Delivery Instructions" apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
grep -n "openInMaps" apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
```
  </verify>
  <done>
All 3 gaps fixed: (1) P2PVendorOrder and Order decode leave_at_door from backend JSON, (2) MapKit map shows restaurant + customer pins with Navigate button opening Apple Maps, (3) delivery instructions shown in blue callout box + orange leave-at-door badge when applicable. Restaurant app builds successfully.
  </done>
</task>

<task type="auto">
  <name>Task 3: Build restaurant app to TestFlight (staging config)</name>
  <files>(build output only)</files>
  <action>
Build the restaurant app with Staging configuration to verify everything compiles cleanly for device:

```bash
xcodebuild -workspace apps/ios/EatFair.xcworkspace \
  -scheme eatffairrestaurant -configuration Staging \
  -destination 'generic/platform=iOS' build
```

If build succeeds, the changes are verified for device deployment. Do NOT archive/upload — this is a verification build only. The user will decide when to do a full TestFlight upload.

Commit all changes with CR ID:
```bash
git add apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift \
       apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift \
       apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift

git commit -m "feat(quick-127): [CR-XXXX] fix 3 self-delivery gaps — leave_at_door decode, MapView + navigate, instructions callout

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
(Replace CR-XXXX with actual CR ID from Task 1)
  </action>
  <verify>
`xcodebuild` exits 0 with `BUILD SUCCEEDED` for Staging configuration.
Git log shows commit with CR ID.
  </verify>
  <done>Restaurant app builds for device with all 3 self-delivery improvements. Changes committed with CR ticket reference.</done>
</task>

</tasks>

<verification>
1. `grep -c "leaveAtDoor" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` returns >= 3 (field, CodingKey, toOrder pass-through)
2. `grep -c "leaveAtDoor" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift` returns >= 3 (field, CodingKey, init)
3. `grep "import MapKit" apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift` returns match
4. `grep "openInMaps" apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift` returns match
5. `grep "LEAVE AT DOOR" apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift` returns match
6. `grep "Delivery Instructions" apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift` returns match
7. Restaurant app builds for both Simulator (Debug) and device (Staging)
</verification>

<success_criteria>
- P2PVendorOrder decodes `leave_at_door` boolean from backend JSON
- Order model carries `leaveAtDoor` to UI layer
- Self-delivery card shows MapKit map with 2 pins (restaurant + customer) when coordinates available
- "Navigate to Customer" button opens Apple Maps with driving directions
- Delivery instructions shown in prominent blue callout box
- Leave-at-door shown as orange badge when true
- Restaurant app builds clean for Staging configuration
- CR ticket created and referenced in commit
</success_criteria>

<output>
After completion, create `.planning/quick/127-audit-restaurant-self-delivery-flow-maps/127-SUMMARY.md`
</output>
