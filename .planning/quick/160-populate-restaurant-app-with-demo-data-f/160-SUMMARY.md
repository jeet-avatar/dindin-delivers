---
phase: quick-160
plan: 01
subsystem: api, ui
tags: [demo-data, apple-review, restaurant-app, order-seeding, promotions]

requires:
  - phase: none
    provides: n/a
provides:
  - Demo order seeding on vendor demo login (35 orders with mixed statuses)
  - GET /api/promotions/suggestions/{vendor_id} endpoint
  - History filter tab in iOS restaurant orders dashboard
affects: [restaurant-app, apple-review, vendor-demo-login]

tech-stack:
  added: []
  patterns: [demo-data-seeding-on-login, promotion-suggestions-api]

key-files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/main_new.py
    - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift

key-decisions:
  - "Promotion suggestions endpoint added to AUTH_EXEMPT_PATHS for simplicity (non-sensitive data)"
  - "Demo orders cleared and re-seeded if fewer than 5 delivered orders exist"

patterns-established:
  - "Demo data seeding: wrap in try/except so failures never block login flow"

requirements-completed: [DEMO-01, DEMO-02, DEMO-03]

duration: 5min
completed: 2026-03-12
---

# Quick 160: Populate Restaurant App with Demo Data Summary

**35 demo orders seeded on vendor login with mixed statuses, promotion suggestions endpoint, and History tab for Apple review**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-12T18:48:21Z
- **Completed:** 2026-03-12T18:53:38Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Backend seeds 35 realistic orders (15 delivered, 5 confirmed, 3 preparing, 2 ready, 2 out-for-delivery, 3 pending, 5 cancelled) on vendor demo login
- New GET /api/promotions/suggestions/{vendor_id} returns 4 AI-powered promotion suggestions matching iOS model
- iOS restaurant app has History tab showing delivered, cancelled, and failed orders
- Empty state for History tab shows contextual messaging

## Task Commits

Each task was committed atomically:

1. **Task 1: Seed demo orders + promotion suggestions endpoint** - `cf5eb52c` (feat)
2. **Task 2: Add History filter tab to iOS orders dashboard** - `9e141a51` (feat)

## Files Created/Modified
- `apps/web/p2p-platform/backend/main_new.py` - Demo order seeding in vendor_demo_login(), promotion suggestions endpoint, AUTH_EXEMPT_PATHS update
- `apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift` - OrderFilter.history case, filteredOrders history logic, countForFilter history count, EmptyOrdersView history state

## Decisions Made
- Added /api/promotions/suggestions to AUTH_EXEMPT_PATHS since it returns non-sensitive data and simplifies demo flow
- Demo orders use ORD-DEMO-{random}-{index} format to avoid collisions with real orders
- Order seeding wrapped in try/except with db.rollback() so failures never block login
- History tab filters on "delivered", "cancelled", and "delivery_failed" statuses, sorted by newest first

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added history case to countForFilter switch**
- **Found during:** Task 2 (iOS build)
- **Issue:** Adding .history to OrderFilter enum caused exhaustive switch error in countForFilter function (not mentioned in plan)
- **Fix:** Added `case .history` to countForFilter that counts delivered + cancelled + delivery_failed orders
- **Files modified:** apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
- **Verification:** iOS build succeeded after fix
- **Committed in:** 9e141a51 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary for compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## Deployment Note
Backend changes require deployment to staging/production via CI/CD:
- `git push origin main`
- `gh workflow run deploy-staging.yml --ref main`
- Test staging, then `gh workflow run deploy-dollar-ai.yml`

## Next Steps
- Deploy backend to staging and production
- Verify demo vendor login seeds orders correctly on staging
- Submit restaurant app build to TestFlight for Apple review

---
*Phase: quick-160*
*Completed: 2026-03-12*
