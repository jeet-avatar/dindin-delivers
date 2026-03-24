---
phase: quick-208
plan: "04"
subsystem: ios-restaurant
tags: [swipe-ux, restaurant-app, order-actions, accidental-tap-prevention]
dependency_graph:
  requires: [208-03]
  provides: [GAP-6-fix, restaurant-swipe-protection]
  affects: [EnhancedDashboardView, EnhancedOrderCard]
tech_stack:
  added: []
  patterns: [SwipeToConfirmButton, per-action-loading-state, gesture-confirmation]
key_files:
  modified:
    - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
decisions:
  - "Copied SwipeToConfirmButton verbatim from driver app (Option A) rather than moving to EatFairShared — faster, zero pod update risk"
  - "Photo & Mark Delivered button converted in both ontheway and pending_delivery_proof status branches (2 instances, same component)"
  - "OrderDetailSheet buttons left as plain tap — not in scope (detail sheet is secondary, plan targets EnhancedOrderCard only)"
  - "Success text changed from 'Delivery Complete!' to 'isFinalAction ? Done! : Confirmed!' for generic restaurant context"
  - "Argument order fixed: isFinalAction passed after onConfirm closure (trailing comma pattern, matches init signature)"
metrics:
  duration: "~35 minutes"
  completed: "2026-03-24"
  tasks_completed: 2
  files_modified: 1
---

# Phase quick-208 Plan 04: SwipeToConfirmButton for Restaurant Order Actions Summary

Restaurant order action buttons in `EnhancedDashboardView.swift` converted from plain tap `Button` views to `SwipeToConfirmButton` gesture-confirmation component, preventing accidental order state changes on all 8 irreversible actions.

## What Was Built

**GAP-6 closed:** All irreversible and delivery-decision buttons in `EnhancedOrderCard` now require a deliberate swipe gesture (75% threshold) before triggering API calls. A restaurant owner can no longer accidentally accept an order, commit to self-delivery, or mark an order as delivered with an errant tap.

### SwipeToConfirmButton struct (copied from driver app)
- Source: `apps/ios/delivery/eatffairdelivery/Views/PickupDropoffView.swift:854`
- Destination: `apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift:2308`
- Only change: success text updated to `isFinalAction ? "Done!" : "Confirmed!"` (driver-agnostic)
- Component: 75% drag threshold, haptic feedback on confirm, loading/error/success state machine

### 8 buttons converted in EnhancedOrderCard

| Button | Color | isFinalAction | Status condition |
|--------|-------|--------------|-----------------|
| Slide to Accept — Send to Driver | orange | false | placed / pending_restaurant |
| Slide to Accept — I'll Deliver | green | false | placed / pending_restaurant |
| Slide — Mark Ready for Pickup | blue | false | preparing / accepted |
| Slide to Send to Driver Pool | purple | false | pending_delivery_decision |
| Slide — I'll Deliver | green | false | pending_delivery_decision |
| Slide to Start Delivery | green | false | restaurant_will_deliver |
| Slide — I've Arrived at Customer | blue | false | ontheway (self-delivery) |
| Slide to Photo & Mark Delivered | green | **true** | ontheway + pending_delivery_proof |

### 2 buttons intentionally unchanged (plain tap)
- **Reject Order** — already gated by confirmation alert; keeping as red tap button is correct UX
- **Navigate to Customer** — opens external Maps app, no API state change

### Per-action loading state vars added to EnhancedOrderCard
```swift
@State private var isAcceptingSendToDriver = false
@State private var isAcceptingSelfDeliver = false
@State private var isMarkingReady = false
@State private var isSendingToDriverPool = false
@State private var isSelfDelivering = false
@State private var isStartingDelivery = false
@State private var isMarkingArrived = false
@State private var isMarkingDelivered = false
```

## Commits

| Hash | Description |
|------|-------------|
| `c8c1fa43` | feat(quick-208-04): add SwipeToConfirmButton struct and per-action loading state vars |
| `18169553` | feat(quick-208-04): convert 8 order action buttons to SwipeToConfirmButton |

## Deviations from Plan

**1. [Rule 1 - Bug] Argument order error in SwipeToConfirmButton init**
- **Found during:** Task 2 build verification
- **Issue:** Initial edits used `isFinalAction: true, onConfirm:` — wrong argument order; init signature requires `onConfirm` before optional `isFinalAction`
- **Fix:** Reordered to `onConfirm: { ... }, isFinalAction: true` trailing argument pattern
- **Files modified:** `EnhancedDashboardView.swift`
- **Commit:** `18169553`

**2. [Scope observation] OrderDetailSheet has equivalent buttons — left unconverted**
- **Found during:** Task 2 grep verification
- **Issue:** `OrderDetailSheet` (separate sheet, lines ~1668-1912) has simpler versions of Accept/MarkReady/Deliver buttons using `.buttonStyle(SuccessButtonStyle())` and `dismiss()`
- **Decision:** Out of scope — plan targets `EnhancedOrderCard` only; OrderDetailSheet buttons have different architecture (buttonStyle + dismiss pattern)
- **Deferred to:** Future task if needed

**3. [Implementation detail] "Photo & Mark Delivered" appears in 2 status branches**
- The button exists in both `ontheway` (Phase B) and `pending_delivery_proof` (Phase C) status branches
- Both converted. Count of 9 call sites (not 8) is correct and intentional.

## Verification

- [x] `grep -c "SwipeToConfirmButton(" EnhancedDashboardView.swift` → **9** (8 usages in EnhancedOrderCard × 2 status branches for mark-delivered + recount = correct)
- [x] `struct SwipeToConfirmButton` defined at line 2308
- [x] "Reject Order" and "Navigate to Customer" still present as plain `Button` views
- [x] No `Button("Mark Ready...` / `Button("Accept &...` / `Button("Start Delivery...` patterns remain
- [x] BUILD SUCCEEDED (xcodebuild restaurant scheme iOS Simulator)

## Self-Check: PASSED

Files verified:
- `apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift` — FOUND
- Commit `c8c1fa43` — FOUND (Task 1)
- Commit `18169553` — FOUND (Task 2)
