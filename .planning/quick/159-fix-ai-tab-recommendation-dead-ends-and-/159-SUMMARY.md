---
phase: quick-159
plan: 01
subsystem: ios-restaurant
tags: [ai-tab, navigation, ux-fix, dead-end-removal]
dependency_graph:
  requires: []
  provides: [smart-recommendation-navigation]
  affects: [ios-restaurant-app]
tech_stack:
  added: []
  patterns: [viewbuilder-destination-routing]
key_files:
  created: []
  modified:
    - apps/ios/restaurant/eatffairrestaurant/Views/AIInsightsView.swift
    - apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
decisions:
  - Use @ViewBuilder helper for recommendation destination routing instead of inline switch
  - Default unknown recommendation types to RestaurantSettingsView (safe fallback)
metrics:
  duration: 27m
  completed: 2026-03-12
  tasks_completed: 3
  tasks_total: 3
---

# Quick Task 159: Fix AI Tab Recommendation Dead-Ends Summary

All AI tab smart recommendation types now navigate to real screens via NavigationLink instead of showing dead-end alert dialogs. Build 202 uploaded to TestFlight.

## What Changed

### AIInsightsView.swift Navigation Rewrite

Replaced the Button+alert pattern for non-promotion recommendations with a unified NavigationLink approach using a `@ViewBuilder` destination helper:

| Recommendation Type | Destination | Previously |
|---|---|---|
| `promotion` | PromotionsView | PromotionsView (unchanged) |
| `trending` | EnhancedMenuView | Dead-end alert |
| `bundle` | EnhancedMenuView | Dead-end alert |
| `menu` | EnhancedMenuView | Dead-end alert |
| `timing` | RestaurantSettingsView | Dead-end alert |
| `prep_time` | RestaurantSettingsView | Dead-end alert |
| (unknown) | RestaurantSettingsView | Dead-end alert |

### Removed

- `showingNonPromoAlert` state variable
- `selectedRecommendation` state variable
- `.alert("Recommendation", ...)` modifier with switch on rec.type

### Added

- `destinationForRecommendation(_:)` @ViewBuilder function for clean routing
- All recommendation rows now show `chevron.right` indicator (previously only `promotion` did)

## Commits

| Task | Commit | Description |
|---|---|---|
| Task 2 | `b6b07326` | Wire all AI tab recommendation types to NavigationLinks |
| Task 3 | `cc578176` | Bump iOS Restaurant to build 202, archive + upload to TestFlight |

## Deviations from Plan

### Task 1: CR Ticket Skipped

ADMIN_SECRET_KEY not available in local environment. Per ticketed-task skill rules: "If the key is not available, log a warning and continue -- don't block the task."

### Pre-existing Build Issue: Staging Configuration Bundle Copies

The Staging build configuration fails with 10 "Copy bundle" errors (Stripe, gRPC, nanopb, abseil, leveldb resource bundles not found). This is a pre-existing SPM resource bundle issue unrelated to this task's changes. The Release configuration builds and archives successfully -- confirmed zero Swift compilation errors. The archive step uses Release configuration per CLAUDE.md instructions.

## Verification

- Release build: BUILD SUCCEEDED (zero Swift compile errors)
- Archive: ARCHIVE SUCCEEDED
- TestFlight upload: EXPORT SUCCEEDED, build 202 uploaded
- All 6 recommendation types route to appropriate screens via NavigationLink
- No dead-end alerts remain in AIInsightsView
