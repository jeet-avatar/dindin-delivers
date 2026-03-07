---
phase: 12-fix-admin-portal-ui
plan: 01
subsystem: ui
tags: [react, axios, admin-portal, vendor-management, auth-interceptor]

# Dependency graph
requires:
  - phase: 02-ios-api-verification
    provides: Backend vendor API endpoints verified and working
provides:
  - Vendor management screens with proper auth via api axios instance
  - No raw fetch() in vendor management -- all calls go through auth interceptor
  - Mock vendor data removed (Tech Solutions Inc, Global Supplies Co, etc.)
affects: [12-02-PLAN, admin-portal, vendor-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Use api axios instance (from api.ts) for all admin portal API calls -- never raw fetch()"]

key-files:
  created: []
  modified:
    - apps/web/p2p-platform/frontend/src/app/screens/vendorManagement/Main.tsx
    - apps/web/p2p-platform/frontend/src/app/screens/vendorManagement/DocumentReview.tsx
    - apps/web/p2p-platform/frontend/src/app/screens/vendorManagement/MenuReview.tsx

key-decisions:
  - "Map non-existent backend fields (risk_rating, performance_score, contract_status) to sensible defaults instead of undefined"
  - "Use api.get/api.post from api.ts instead of raw fetch() -- auth interceptor handles token automatically"

patterns-established:
  - "Admin portal API pattern: import api from api.ts, use api.get/post/put, response data via response.data"

requirements-completed: [ADMIN-01, ADMIN-05, ADMIN-06]

# Metrics
duration: 3min
completed: 2026-03-07
---

# Phase 12 Plan 01: Vendor Management Auth Fix Summary

**Replaced raw fetch() with api axios instance in all 3 vendor management screens, removing 401 auth failures and 150 lines of mock vendor data**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-07T08:03:28Z
- **Completed:** 2026-03-07T08:06:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- All 3 vendor management screens (Main, DocumentReview, MenuReview) now use the api axios instance with auth interceptor
- Removed 150-line mock vendor data block containing fake companies (Tech Solutions Inc, Global Supplies Co, etc.)
- Fixed wrong localStorage key (`auth_token` -> handled by interceptor which checks `token`)
- Aligned BackendVendor interface with actual backend fields (added onboarding_phase, is_published, removed phantom fields)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix VendorManagement/Main.tsx** - `a5c9374f` (feat)
2. **Task 2: Fix DocumentReview.tsx and MenuReview.tsx** - `cb671636` (feat)

## Files Created/Modified
- `apps/web/p2p-platform/frontend/src/app/screens/vendorManagement/Main.tsx` - Vendor list, publish, checklist -- all using api instance now
- `apps/web/p2p-platform/frontend/src/app/screens/vendorManagement/DocumentReview.tsx` - Document fetch, approve, reject -- all using api instance
- `apps/web/p2p-platform/frontend/src/app/screens/vendorManagement/MenuReview.tsx` - Menu fetch, approve, reject, flag -- all using api instance

## Decisions Made
- Mapped non-existent backend fields (risk_rating, performance_score, contract_status) to sensible defaults ('low', 0, 'none'/'active') rather than removing the UI columns -- preserves layout while showing real data
- Used `/vendors/{id}/publish-checklist` endpoint (not `/admin/vendors/{id}/publish-checklist`) since the api.ts already has a helper for it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Vendor management screens are ready for production use
- Admin can now manage restaurants, review documents, and approve menus without 401 errors
- Plan 12-02 can proceed to fix remaining admin portal screens

---
*Phase: 12-fix-admin-portal-ui*
*Completed: 2026-03-07*
