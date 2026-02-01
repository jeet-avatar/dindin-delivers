# Next Session: Customer Order Flow - Uber Eats Style
**Date:** 2026-02-01
**Focus:** Customer App Order Tracking Only
**Method:** Use `/gsd:plan-phase` then `/gsd:execute-phase`

---

## Objective

Align the iOS Customer App order tracking experience with Uber Eats/DoorDash standards. Customer should see clear, simple status updates without internal system complexity.

---

## Current vs Ideal Flow

### How Uber Eats Shows Order Status to Customers:
```
1. "Confirming your order" → Restaurant receiving order
2. "Preparing your order" → Restaurant accepted, cooking
3. "Order ready for pickup" → Food ready, driver assigned/arriving
4. "On the way" → Driver picked up, en route
5. "Delivered" → Complete
```

### How Dollor Currently Works (Backend):
```
PENDING_PAYMENT → PENDING_RESTAURANT → PREPARING →
PENDING_DELIVERY_DECISION → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED
```

### What Customer Should See (Simplified):
| Backend Status | Customer Sees | Icon | Note |
|----------------|---------------|------|------|
| `pending_payment` | "Placing Order" | clock | Brief, during payment |
| `pending_restaurant` | "Confirming" | clock.fill | 3-min restaurant acceptance window |
| `confirmed` | "Confirmed" | checkmark.circle.fill | Restaurant accepted |
| `preparing` | "Preparing" | flame.fill | Cooking |
| `pending_delivery_decision` | "Ready" | bag.fill | Transparent to customer |
| `ready_for_pickup` | "Ready" | bag.fill | Waiting for driver |
| `restaurant_will_deliver` | "On the Way" | car.fill | Restaurant self-delivering |
| `out_for_delivery` | "On the Way" | car.fill | Driver delivering |
| `delivered` | "Delivered" | house.fill | Complete |

**Key Principle:** The 3-minute "delivery decision" window (restaurant vs driver) should be INVISIBLE to customer. They just see "Ready" until someone picks it up.

---

## Files to Modify

### 1. DeliveryTrackingView.swift
**Location:** `apps/ios/customer/eatfaircustomer/Views/DeliveryTrackingView.swift`
**Lines:** 476-502 (DeliveryStatusTimeline stages)

**Change:** Update `stages` computed property to:
- Show "Confirming" with clock icon when status is `confirming` or `pending_restaurant`
- Show "Confirmed" briefly or skip to "Preparing" when `confirmed`
- Handle all status mappings correctly
- Keep 5 stages visually (Placed/Confirming → Preparing → Ready → On the Way → Delivered)

### 2. P2PAPIService.swift (Already Fixed)
**Location:** `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift`
**Lines:** 8804-8836

**Status:** ✅ Already updated with correct mappings:
- `pending_restaurant` → "Confirming"
- `pending_delivery_decision` → "Ready"
- `restaurant_will_deliver` → "OnTheWay"
- `declined_by_restaurant` → "Cancelled"

---

## TODO List for Next Session

### Phase 1: Timeline UI Fix (Priority: HIGH)
- [ ] Update `DeliveryStatusTimeline.stages` to handle "Confirming" status
- [ ] Show clock icon during confirmation phase
- [ ] Show checkmark when confirmed/placed is complete
- [ ] Test all status transitions visually

### Phase 2: Error State Display (Priority: MEDIUM)
- [ ] Add error message display in DeliveryTrackingView
- [ ] Show retry button when tracking fails
- [ ] Add "pull to refresh" on tracking view

### Phase 3: Push Notification Navigation (Priority: MEDIUM)
- [ ] Verify notification tap navigates to correct order
- [ ] Test "Order Confirmed" notification → tracking view
- [ ] Test "On the Way" notification → tracking view with map
- [ ] Test "Delivered" notification → thank you screen

### Phase 4: Testing (Priority: HIGH)
- [ ] Test full order flow: Place → Confirm → Prepare → Ready → Deliver
- [ ] Verify timeline updates correctly at each stage
- [ ] Verify push notifications arrive at each stage
- [ ] Verify thank you email arrives with receipt

---

## What NOT to Change

- ❌ Backend order flow logic (already working)
- ❌ Push notification sending (already implemented)
- ❌ Email receipt sending (already implemented)
- ❌ Restaurant or Driver app flows
- ❌ Payment processing
- ❌ Multi-restaurant ordering

---

## Code Change Preview

```swift
// DeliveryStatusTimeline.stages - NEW LOGIC
private var stages: [(name: String, icon: String, isActive: Bool, isCompleted: Bool, time: String?)] {
    let status = order.status.lowercased()
    let events = timelineEventMap

    // Determine current phase
    let isConfirming = status == "confirming" || status == "pending_restaurant"
    let isPlaced = status == "placed" || status == "pending"
    let isPreparing = ["preparing", "accepted", "confirmed"].contains(status)
    let isReady = status == "ready"
    let isOnTheWay = ["out for delivery", "ontheway"].contains(status)
    let isDelivered = status == "delivered"

    // Stage completion logic
    let stage1Complete = !isPlaced && !isConfirming
    let stage2Complete = isReady || isOnTheWay || isDelivered
    let stage3Complete = isOnTheWay || isDelivered
    let stage4Complete = isDelivered

    return [
        // Stage 1: Placed/Confirming
        (isConfirming ? "Confirming" : "Placed",
         isConfirming ? "clock.fill" : "checkmark.circle.fill",
         isPlaced || isConfirming,
         stage1Complete,
         events["placed"] ?? events["confirming"]),

        // Stage 2: Preparing
        ("Preparing", "flame.fill",
         isPreparing,
         stage2Complete,
         events["preparing"] ?? events["confirmed"]),

        // Stage 3: Ready
        ("Ready", "bag.fill",
         isReady,
         stage3Complete,
         events["ready"]),

        // Stage 4: On the Way
        ("On the Way", "car.fill",
         isOnTheWay,
         stage4Complete,
         events["picked_up"] ?? events["out_for_delivery"]),

        // Stage 5: Delivered
        ("Delivered", "house.fill",
         isDelivered,
         isDelivered,
         events["delivered"])
    ]
}
```

---

## GSD Commands for Next Session

```bash
# Start with progress check
/gsd:progress

# Or plan this specific phase
/gsd:plan-phase

# When ready to execute
/gsd:execute-phase

# If debugging needed
/gsd:debug
```

---

## Verification Checklist

After changes, verify:

1. **Confirming State:**
   - [ ] Place order → Timeline shows "Confirming" with clock icon
   - [ ] Timeline animates/pulses to show waiting
   - [ ] After 3 min (or restaurant accepts), moves to "Preparing"

2. **Preparing State:**
   - [ ] "Preparing" stage active with flame icon
   - [ ] "Confirming/Placed" shows completed (green checkmark)

3. **Ready State:**
   - [ ] "Ready" stage active with bag icon
   - [ ] Customer does NOT see "pending delivery decision" text
   - [ ] ETA updates appropriately

4. **On the Way State:**
   - [ ] Driver location shows on map
   - [ ] "On the Way" active with car icon
   - [ ] Driver info card visible (name, rating, vehicle)

5. **Delivered State:**
   - [ ] Thank you celebration overlay appears
   - [ ] Email receipt sent
   - [ ] Push notification received

---

## Session Summary

**Completed Today:**
- ✅ Fixed status mappings in P2PAPIService.swift
- ✅ Added push notifications for all order steps
- ✅ Added thank you email with receipt
- ✅ Added thank you celebration screen
- ✅ Documented complete order flow API

**For Next Session:**
- 🔲 Fix timeline UI to show "Confirming" status
- 🔲 Add error state display
- 🔲 Test complete flow end-to-end

---

*Generated: 2026-02-01*
