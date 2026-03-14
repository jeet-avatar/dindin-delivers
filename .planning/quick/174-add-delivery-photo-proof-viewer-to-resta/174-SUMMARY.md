---
phase: quick-174
plan: 01
subsystem: ios-restaurant
tags: [ios, restaurant, delivery-proof, photo, ui]
cr_id: CR-0020
dependency_graph:
  requires: []
  provides: [delivery-photo-viewer-restaurant-history]
  affects: [ios-restaurant-app, eatfair-shared-models]
tech_stack:
  added: []
  patterns: [AsyncImage, fullScreenCover, SwiftUI-conditional-view]
key_files:
  created: []
  modified:
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift
    - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
decisions:
  - Used fullScreenCover instead of sheet for delivery photo preview (consistent with quick-147 pattern to avoid SwiftUI double-dismissal)
  - Photo block placed inside VStack before .background modifier to preserve card styling chain
metrics:
  duration_minutes: 59
  tasks_completed: 2
  files_modified: 3
  completed_date: "2026-03-14"
---

# Quick Task 174: Add Delivery Photo Proof Viewer to Restaurant History Tab

**One-liner:** deliveryPhotoUrl threaded from P2PVendorOrder JSON through Order model to restaurant history tab with AsyncImage 64x64 thumbnail and full-screen DeliveryPhotoPreviewView sheet.

## What Was Built

Restaurant owners can now see photographic proof that a delivery was completed when reviewing delivered orders in their history tab. When a delivered order has a `delivery_photo_url` in the backend response, the history card shows a tappable 64x64 thumbnail with "Delivery Photo / Tap to view full size" text. Tapping opens a full-screen black-background viewer with the full-resolution photo, loading/failure states, and a Done button.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add deliveryPhotoUrl to P2PVendorOrder + Order | 87e5d0cc | P2PAPIService.swift, Order.swift |
| 2 | Add DeliveryPhotoPreviewView + photo thumbnail to history tab | e5b8572e | EnhancedDashboardView.swift |

## Changes Made

### Task 1: P2PAPIService.swift + Order.swift

**P2PVendorOrder (P2PAPIService.swift `line 10546`):**
- Added `public let deliveryPhotoUrl: String?` property
- Added `case deliveryPhotoUrl = "delivery_photo_url"` to CodingKeys enum
- Added `deliveryPhotoUrl: deliveryPhotoUrl` to `toOrder()` init call

**Order struct (Order.swift):**
- Added `public var deliveryPhotoUrl: String?` property (`line 380`)
- Added `case deliveryPhotoUrl` to CodingKeys enum (`line 400`)
- Added `decodeIfPresent` in `init(from decoder:)` (`line 481`)
- Added `deliveryPhotoUrl: String? = nil` to long `public init(...)` parameter list
- Added `self.deliveryPhotoUrl = deliveryPhotoUrl` in init body
- Added `self.deliveryPhotoUrl = nil` in empty `public init()`

### Task 2: EnhancedDashboardView.swift

- Added `@State private var showDeliveryPhoto = false` to `EnhancedOrderCard`
- Added conditional photo thumbnail block inside VStack body:
  - Condition: `order.status.lowercased() == "delivered"` AND `deliveryPhotoUrl` non-nil/non-empty
  - Shows Divider + Button row with 64x64 AsyncImage thumbnail (gray placeholder on load/failure)
  - HStack: thumbnail, "Delivery Photo / Tap to view full size" text, chevron
  - `.fullScreenCover(isPresented: $showDeliveryPhoto)` opens `DeliveryPhotoPreviewView`
- Added `DeliveryPhotoPreviewView` struct after `EmptyOrdersView`:
  - Full-screen black ZStack background
  - AsyncImage with `.scaledToFit` success, `photo.slash` failure state, ProgressView loading state
  - NavigationStack with dark toolbar, "Delivery Photo" title, "Done" dismiss button

## Decisions Made

- **fullScreenCover over sheet**: Consistent with quick-147 decision. Avoids SwiftUI double-dismissal bug when nested inside the restaurant dashboard's existing sheet layer.
- **Photo block inside VStack**: Placed conditional block before the closing `}` of the VStack, so `.background`/`.cornerRadius`/`.shadow`/`.onChange` modifiers apply to the whole card including photo row.

## Verification Results

```
grep -n "deliveryPhotoUrl" P2PAPIService.swift | P2PVendorOrder range:
  10546: public let deliveryPhotoUrl: String?       (property)
  10576: case deliveryPhotoUrl = "delivery_photo_url" (CodingKey)
  10722: deliveryPhotoUrl: deliveryPhotoUrl          (toOrder call)

grep -n "deliveryPhotoUrl" Order.swift:
  380: public var deliveryPhotoUrl: String?         (property)
  400: case deliveryPhotoUrl                         (CodingKey)
  481: decodeIfPresent(String.self, ...)             (decoder)
  484: ..., deliveryPhotoUrl: String? = nil)         (init param)
  535: self.deliveryPhotoUrl = deliveryPhotoUrl      (init body)
  579: self.deliveryPhotoUrl = nil                   (empty init)

grep -n "DeliveryPhotoPreviewView|showDeliveryPhoto" EnhancedDashboardView.swift:
  416: @State private var showDeliveryPhoto = false
  1431: showDeliveryPhoto = true
  1467: .fullScreenCover(isPresented: $showDeliveryPhoto)
  1468: DeliveryPhotoPreviewView(photoUrl: photoUrl)
  1515: struct DeliveryPhotoPreviewView: View
```

Build: Zero Swift compilation errors. Pre-existing CocoaPods bundle copy errors in DerivedData are unrelated to this task (stale Release-iphoneos artifacts, present before and after this change).

## Change Request

CR-0020 created and submitted (Under Review) at `https://api.dollor.ai/api/admin/change-requests/CR-0020`

## Self-Check: PASSED

- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` — FOUND, contains `deliveryPhotoUrl`
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift` — FOUND, contains `deliveryPhotoUrl`
- `apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift` — FOUND, contains `DeliveryPhotoPreviewView`
- Commit 87e5d0cc — FOUND (Task 1)
- Commit e5b8572e — FOUND (Task 2)
