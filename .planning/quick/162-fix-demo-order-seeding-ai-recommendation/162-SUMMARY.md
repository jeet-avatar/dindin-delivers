---
phase: quick-162
plan: 01
subsystem: backend
tags: [demo-seeding, ai-recommendations, app-store-review]
dependency_graph:
  requires: []
  provides: [demo-order-seeding-fix, ai-recommendation-fallbacks]
  affects: [vendor-demo-login, ai-insights-endpoint]
tech_stack:
  added: []
  patterns: [fallback-recommendation-pattern, active-demo-order-check]
key_files:
  modified:
    - apps/web/p2p-platform/backend/main_new.py
decisions:
  - "Check active demo orders (not total delivered) to determine if seeding is needed"
  - "Fallback recommendations use distinct types to avoid duplicates with data-driven ones"
metrics:
  duration: "~2 minutes"
  completed: "2026-03-12"
  tasks_completed: 2
  tasks_total: 2
---

# Quick Task 162: Fix Demo Order Seeding + AI Recommendation Fallbacks

Fixed demo vendor login seeding condition (was checking total delivered count, failing on production with 95+ orders) and added fallback AI recommendations so at least 3 always return for App Store review.

## Task Completion

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix demo order seeding condition | 219c1e63 | main_new.py:1996-2007 |
| 2 | Add fallback AI recommendations | a97dde10 | main_new.py:21606-21640 |

## Changes Made

### Task 1: Demo Order Seeding Condition Fix
- **Problem:** `existing_delivered` counted ALL delivered orders for the vendor. On production with 95+ delivered orders, the condition `existing_delivered < 5` was always false, so demo orders were never seeded.
- **Fix:** Changed to `existing_active_demo` which counts only orders with `ORD-DEMO-%` prefix in active statuses (PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY, PENDING_RESTAURANT, CONFIRMED). This triggers re-seeding when active demo orders drop below 5, regardless of historical delivered count.

### Task 2: AI Recommendation Fallbacks
- **Problem:** AI recommendations endpoint returned 0 recommendations for vendors with no/sparse order data, causing empty "Insights" section in iOS app.
- **Fix:** Added 3 fallback recommendations (trending, bundle, prep_time) that fill remaining slots up to 3. Data-driven recommendations take priority; fallbacks only fill gaps using distinct types to avoid duplicates.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- Syntax check: `ast.parse` confirms no syntax errors
- Both `existing_active_demo` and `fallback_recommendations` present in main_new.py
- Import check fails only due to missing DATABASE_URL env var (expected in local environment without DB)

## Self-Check: PASSED
