---
phase: quick-127
plan: 01
subsystem: ui
tags: [mapkit, swiftui, ios, restaurant, self-delivery]

requires:
  - phase: quick-93
    provides: leave-at-door backend flow (DELIVERED status, delivery proof)
provides:
  - leaveAtDoor field decoded in P2PVendorOrder and Order models
  - MapKit map with restaurant + customer pins in self-delivery card
  - Navigate button opening Apple Maps with driving directions
  - Delivery instructions callout and leave-at-door badge in restaurant UI
affects: [restaurant-app, ios-builds]

tech-stack:
  added: [MapKit in EnhancedDashboardView]
  patterns: [Map with annotationItems for dual-pin display, MKMapItem.openInMaps for navigation]

key-files:
  created: []
  modified:
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift
    - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift

key-decisions:
  - "Used iOS 14+ Map(coordinateRegion:annotationItems:) for broad device compatibility"
  - "SelfDeliveryMapPin helper struct for type-safe map annotations"
  - "Staging build lstat errors are pre-existing CocoaPods DerivedData issue, not code-related"

patterns-established:
  - "Map pin helper struct pattern: SelfDeliveryMapPin with id, coordinate, tint, icon"

requirements-completed: [GAP-1-leave-at-door, GAP-2-map-view, GAP-3-delivery-instructions]

duration: 14min
completed: 2026-03-10
---

# Quick Task 127: Restaurant Self-Delivery Flow Summary

**Decoded leave_at_door from backend, added MapKit map with dual pins + Navigate button, delivery instructions callout + leave-at-door badge in restaurant self-delivery card**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-10T05:33:14Z
- **Completed:** 2026-03-10T05:47:45Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- P2PVendorOrder and Order structs now decode `leave_at_door` boolean from backend JSON
- Self-delivery card shows MapKit map with orange restaurant pin and green customer pin when coordinates available
- "Navigate to Customer" button opens Apple Maps with driving directions to delivery address
- Delivery instructions displayed in prominent blue callout box
- Orange "LEAVE AT DOOR" badge shown when customer requested leave-at-door delivery
- Restaurant app builds successfully (Debug Simulator verified, Staging device has pre-existing CocoaPods lstat issue only)

## Task Commits

1. **Task 1: Create CR ticket** - CR-0003 created and submitted (API-only, no commit)
2. **Task 2: Fix all 3 gaps** - `0a38c974` (feat)
3. **Task 3: Build verification** - (build-only, included in Task 2 commit)

## Files Created/Modified
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` - Added leaveAtDoor field + CodingKey + toOrder() pass-through on P2PVendorOrder
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift` - Added leaveAtDoor field, CodingKey, decoder, memberwise init, empty init
- `apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift` - Added MapKit import, leave-at-door badge, delivery instructions callout, Map with dual pins, Navigate button, SelfDeliveryMapPin helper struct

## Decisions Made
- Used iOS 14+ `Map(coordinateRegion:annotationItems:)` syntax for broad device compatibility (not iOS 17+ `Map { }`)
- Created `SelfDeliveryMapPin` struct for type-safe map annotations with id, coordinate, tint, and icon
- Map region auto-calculates center and span from both coordinates with 1.5x padding + 0.01 minimum delta
- Guard against 0,0 coordinates before showing map (only renders when both restaurant and customer have valid coordinates)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Staging device build has pre-existing `lstat` errors for CocoaPods bundles (nanopb, leveldb, gRPC, abseil, Stripe). These are DerivedData stale bundle issues unrelated to our code changes. Debug Simulator build succeeded with zero Swift compilation errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Restaurant app ready for next TestFlight build when user decides to archive/upload
- Customer app NOT touched (build 1111 is APPROVED)
- No backend changes needed

---
*Phase: quick-127*
*Completed: 2026-03-10*
