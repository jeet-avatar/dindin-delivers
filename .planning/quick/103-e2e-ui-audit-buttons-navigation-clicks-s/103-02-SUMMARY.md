---
phase: quick-103
plan: 02
subsystem: testing
tags: [e2e, ios, driver, restaurant, fastapi, pytest, ui-audit]

requires:
  - phase: quick-103-01
    provides: customer app UI audit pattern and methodology
provides:
  - iOS Driver app UI audit (17 views, 72 handlers traced)
  - iOS Restaurant app UI audit (12 views, 46 handlers traced)
  - 20 backend E2E tests covering driver delivery, rideshare, and vendor flows
affects: [app-store-submission, ios-driver, ios-restaurant, backend-testing]

tech-stack:
  added: []
  patterns: [e2e-ui-wiring-verification, static-code-audit-with-grep-verification]

key-files:
  created:
    - .planning/quick/103-e2e-ui-audit-buttons-navigation-clicks-s/UI_AUDIT_IOS_DRIVER_RESTAURANT.md
    - apps/web/p2p-platform/backend/tests/e2e/test_driver_vendor_ui_wiring_e2e.py
  modified: []

key-decisions:
  - "Used POST /erp/orders/{id}/delivered instead of PUT /erp/orders/{id}/complete-delivery due to backend function shadowing bug"
  - "Classified ChatView (WebSocket/Firebase) as DEAD since OrderChatView (REST) is the correct implementation"
  - "Created separate order fixtures per status (READY_FOR_PICKUP for driver, PENDING_RESTAURANT for vendor) matching backend state machine"

patterns-established:
  - "Audit methodology: trace every Button/NavigationLink/sheet/onTapGesture handler to its API call, verify endpoint with grep"
  - "E2E test pattern: create DB fixtures at correct lifecycle state, then exercise the exact endpoint sequence iOS apps use"

requirements-completed: [QUICK-103]

duration: 6min
completed: 2026-03-06
---

# Quick-103 Plan 02: iOS Driver + Restaurant UI Audit & E2E Tests Summary

**Static audit of 29 iOS views (118 UI handlers traced: 113 OK, 3 DEAD, 2 MISSING) plus 20 passing backend E2E tests covering driver delivery, rideshare, and vendor flows**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-06T05:40:00Z
- **Completed:** 2026-03-06T05:46:00Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Audited every button, NavigationLink, sheet, and action handler across 17 iOS Driver views and 12 iOS Restaurant views
- Identified 3 DEAD handlers (ChatView WebSocket legacy, AIEmployeesView behind compile guard) and 2 MISSING backend endpoints (document submit-for-review, print KOT)
- Wrote 20 E2E tests across 3 test classes covering the full driver delivery lifecycle, rideshare bid-start-complete lifecycle, and vendor order+menu management
- All 20 tests pass with zero regressions to existing test suite
- Discovered and documented backend bug: `complete_delivery()` function shadowed by v2 redefinition at main_new.py:20273

## Task Commits

1. **Task 1: Static code audit of iOS Driver and Restaurant apps** - `13bf03ab` (docs)
2. **Task 2: Write backend E2E tests covering driver and vendor user journeys** - `0e24439f` (test)

## Files Created/Modified
- `.planning/quick/103-e2e-ui-audit-buttons-navigation-clicks-s/UI_AUDIT_IOS_DRIVER_RESTAURANT.md` - Audit report with file:line references for 29 views, 118 handlers
- `apps/web/p2p-platform/backend/tests/e2e/test_driver_vendor_ui_wiring_e2e.py` - 20 E2E tests in 3 test classes (TestDriverFullFlow, TestRideshareDriverFlow, TestVendorFullFlow)

## Decisions Made
- Used `POST /erp/orders/{id}/delivered` instead of `PUT /erp/orders/{id}/complete-delivery` in tests because the latter has a name collision bug (v2 function at line 20273 shadows the order_flow import at line 14277)
- Classified ChatView as DEAD (uses Firebase WebSocket ChatManager) since OrderChatView (REST API) is the correct active chat implementation
- Created separate order fixtures per lifecycle state (`READY_FOR_PICKUP` for driver assign, `PENDING_RESTAURANT` for vendor accept) to match the backend state machine constraints

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed VendorMenuItem model name and field names**
- **Found during:** Task 2 (E2E test writing)
- **Issue:** Plan referenced `MenuItem` (doesn't exist) and `name` field (actual field is `item_name`)
- **Fix:** Used `VendorMenuItem` model and `item_name` field matching models.py:338-345
- **Files modified:** test_driver_vendor_ui_wiring_e2e.py
- **Committed in:** 0e24439f

**2. [Rule 1 - Bug] Fixed RideRequest model fields**
- **Found during:** Task 2 (E2E test writing)
- **Issue:** Used non-existent fields (`PENDING` status, `bidding_end_time`, `estimated_fare`, `driver_id`)
- **Fix:** Used correct fields (`OPEN` status, `bidding_expires_at`, `suggested_price`, `matched_driver_id`, `request_id`)
- **Files modified:** test_driver_vendor_ui_wiring_e2e.py
- **Committed in:** 0e24439f

**3. [Rule 1 - Bug] Fixed order status for delivery flow**
- **Found during:** Task 2 (E2E test writing)
- **Issue:** Orders must be READY_FOR_PICKUP (not CONFIRMED) for driver assignment
- **Fix:** Created `_create_order()` helper with status parameter, separate fixtures per flow
- **Files modified:** test_driver_vendor_ui_wiring_e2e.py
- **Committed in:** 0e24439f

---

**Total deviations:** 3 auto-fixed (3 bug fixes for model field mismatches)
**Impact on plan:** All fixes necessary for test correctness. No scope creep.

## Issues Encountered
- Pre-existing backend bug: `complete_delivery()` at main_new.py:20273 shadows the imported order_flow function, causing the `/erp/orders/{id}/complete-delivery` alias to fail with `'Depends' object has no attribute 'query'`. Worked around by using `/erp/orders/{id}/delivered` endpoint instead. Logged as deferred item.
- 2 pre-existing test failures in test_customer_ui_wiring_e2e.py (fare estimate response structure) and 1 error in test_rideshare_e2e_flow.py (SQLite lock) -- all unrelated to this plan's changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Driver and Restaurant UI audit complete; findings feed into any pre-submission fix work
- 2 MISSING endpoints identified (document submit-for-review, print KOT) can be prioritized
- Backend bug (complete_delivery shadowing) should be fixed before next release

---
*Phase: quick-103-02*
*Completed: 2026-03-06*
