---
phase: quick-147
plan: 01
subsystem: ios-restaurant
tags: [self-delivery, navigation, swiftui, bug-fix]
dependency_graph:
  requires: []
  provides: [self-delivery-fixes]
  affects: [EnhancedDashboardView, RestaurantDeliveryProofSheet]
tech_stack:
  added: []
  patterns: [fullScreenCover-for-nested-sheets, contentShape-for-tap-targets, onChange-timer-invalidation]
key_files:
  modified:
    - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
    - apps/ios/restaurant/eatffairrestaurant/Views/RestaurantDeliveryProofSheet.swift
decisions:
  - Use .fullScreenCover instead of nested .sheet to prevent SwiftUI double-dismissal
  - Use address-string fallback for Navigate when coordinates are 0,0
  - Remove .buttonStyle(.borderless) pattern-wide for consistent tap behavior
metrics:
  duration: 224s
  completed: 2026-03-11
---

# Quick-147: Fix 5 Self-Delivery Bugs in iOS Restaurant App

Address-encoded navigate URLs, map pin labels, full tap area buttons, fullScreenCover camera, and timer-guarded delivery decision state.

## What Changed

### Bug 1: Navigate Opens Wrong Address (FIXED)
- Apple Maps URL now includes `&q=<encodedAddress>` for label accuracy alongside lat/lon coordinates
- Google Maps URL unchanged (coordinates only, which is the standard)
- NEW: When coordinates are 0,0 but fullAddress exists, a Navigate button appears using address-only URL encoding as fallback

### Bug 2: Address Text Not Showing on Map (FIXED)
- Customer map pin annotation now wraps icon + text label in a VStack
- Shows `street` if available, falls back to `fullAddress`
- Styled with caption2 font, white background, shadow for readability

### Bug 3: Buttons Not Clickable (FIXED)
- Removed `.buttonStyle(.borderless)` from 5 buttons: Start Delivery, Navigate to Customer, I've Arrived, Photo & Mark Delivered, Mark Ready for Pickup
- Added `.contentShape(Rectangle())` to all button label HStacks so the full padded area is tappable

### Bug 4: Delivery Proof Photo Disappears (FIXED)
- Changed `RestaurantDeliveryProofSheet.swift` from `.sheet(isPresented: $showCamera)` to `.fullScreenCover(isPresented: $showCamera)`
- This prevents the classic SwiftUI nested sheet dismissal bug where the inner sheet dismissal cascades to dismiss the outer sheet

### Bug 5: Stale "Send to Driver Pool" Button (FIXED)
- Added `.onChange(of: order.status)` to EnhancedOrderCard that invalidates `deliveryTimer` when status changes away from `pending_delivery_decision`
- Added `ontheway` self-delivery handling in OrderDetailSheet with "Photo & Mark Delivered" button (previously fell through to no buttons)

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | `3de3b58a` | Navigate URL fallback, map address label, button tap targets |
| 2 | `6bcd46e8` | Delivery proof photo persistence, stale driver pool button |

## Verification

- iOS Restaurant app builds with zero errors (Release configuration, generic iOS)
- All 5 bugs addressed in 2 files total

## Deviations from Plan

### Additional Fix: Mark Ready for Pickup button
- **Rule 2 - Missing critical functionality**: The Mark Ready for Pickup button (preparing status) also had `.buttonStyle(.borderless)` causing the same tap target issue. Fixed alongside the planned buttons.

## Self-Check: PASSED
