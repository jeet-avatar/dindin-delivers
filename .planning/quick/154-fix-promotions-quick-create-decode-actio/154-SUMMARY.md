---
phase: quick-154
plan: 01
subsystem: backend-promotions, ios-restaurant
tags: [bugfix, ios, backend, promotions, ai-insights]
dependency_graph:
  requires: []
  provides: [full-promotion-response, tappable-recommendations]
  affects: [promotions-api, restaurant-app-ui]
tech_stack:
  added: []
  patterns: [NavigationLink-routing, alert-guidance]
key_files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/promotions.py
    - apps/ios/restaurant/eatffairrestaurant/Views/AIInsightsView.swift
decisions:
  - Kept backward-compat fields (success, processed_by, message) in promotion response for non-iOS consumers
  - Used NavigationLink for promotion recs and Button+alert for non-promotion types
metrics:
  duration: 213s
  completed: 2026-03-12
---

# Quick Task 154: Fix Promotions Quick-Create Decode + Recommendation Actions

Backend create_promotion returns full P2PPromotion-compatible object; smart recommendation cards navigate to relevant views.

## Changes Made

### Task 1: Fix backend create_promotion return object
**Commit:** `dbdf0862`
**File:** `apps/web/p2p-platform/backend/promotions.py`

Replaced the minimal success dict in `create_promotion()` with a full promotion object matching the format used by `list_promotions()`. The iOS `P2PPromotion` struct requires fields like `id`, `promotion_code`, `vendor_id`, `name`, `type`, `value`, `status`, `start_date`, `end_date`, `usage_count`, `total_discount_given`, etc. The old response only had `promotion_id`, `promotion_code`, and `status`, causing iOS decode failure ("data couldn't be read").

This also fixes `quick_create_promotion` since it delegates to `create_promotion` at line 894.

### Task 2: Make smart recommendation cards tappable
**Commit:** `9d1bcee4`
**File:** `apps/ios/restaurant/eatffairrestaurant/Views/AIInsightsView.swift`

- Added `@State` vars for alert presentation and selected recommendation
- Promotion-type cards wrapped in `NavigationLink` to `PromotionsView()`
- Other types (menu, timing, staffing) use `Button` that shows contextual alert
- Extracted `recommendationRow()` helper for shared card layout
- Added chevron/info icons to indicate interactivity

## Verification

1. Backend syntax check: PASSED (ast.parse)
2. All 14 P2PPromotion-required fields verified present in return dict
3. iOS Restaurant app build: PASSED (BUILD SUCCEEDED)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
