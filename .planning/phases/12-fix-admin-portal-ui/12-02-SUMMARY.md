---
phase: 12-fix-admin-portal-ui
plan: 02
subsystem: ui
tags: [react, admin-portal, dashboard, cleanup]

# Dependency graph
requires:
  - phase: 12-fix-admin-portal-ui plan 01
    provides: api axios instance migration, vendor management fix
provides:
  - Real Dollor.ai dashboard with live stats from /api/dashboard/stats
  - Clean sidebar without mock ERP links
  - Routes only to real working screens
  - No mock data files in codebase
affects: [admin-portal, deployment]

# Tech tracking
tech-stack:
  added: []
  patterns: [real-api-dashboard-stats, clean-sidebar-navigation]

key-files:
  created: []
  modified:
    - apps/web/p2p-platform/frontend/src/app/components/layout/MainLayout.tsx
    - apps/web/p2p-platform/frontend/src/App.tsx
    - apps/web/p2p-platform/frontend/src/app/constants/Apis.tsx
    - apps/web/p2p-platform/frontend/src/app/constants/Bridge.tsx
    - apps/web/p2p-platform/frontend/src/app/constants/consts.tsx

key-decisions:
  - "Kept Coupa dashboard route (backend endpoints exist) but removed from sidebar since not production-ready"
  - "Kept ZIP dashboard in sidebar under Partners > Onboarding (ZIP) since it uses real vendor data"
  - "Dashboard Main.tsx rewrite was already done by 12-01, so Task 1 was a no-op"

patterns-established:
  - "Dashboard fetches from /api/dashboard/stats and /api/dashboard/recent-activity"
  - "Sidebar only links to screens with real backend endpoints"

requirements-completed: [ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05]

# Metrics
duration: 6min
completed: 2026-03-07
---

# Phase 12 Plan 02: Remove Mock ERP Dashboards Summary

**Removed 4,572 lines of mock ERP code -- deleted 14 files (mock tabs, screens, data), cleaned sidebar, routes, and API constants to only use real Dollor.ai endpoints**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-07T08:03:47Z
- **Completed:** 2026-03-07T08:09:54Z
- **Tasks:** 2
- **Files modified:** 19 (5 modified, 14 deleted)

## Accomplishments
- Removed entire ERP section from admin sidebar (Coupa, NetSuite, JIRA, Transactions links)
- Deleted 14 mock files: 4 screen directories (jiraDashboard, netsuiteDashboard, systemDashboard, transactions), 2 mock data files, all with zero TypeScript errors
- Cleaned Apis.tsx and Bridge.tsx to remove all references to nonexistent ERP endpoints
- Production build passes clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewire main dashboard to real stats and remove mock ERP tabs** - Skipped (already completed by 12-01-PLAN)
2. **Task 2: Clean sidebar, routes, and remove mock screen files and data** - `11f9d4b8` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `MainLayout.tsx` - Removed ERP nav section, unused icon imports
- `App.tsx` - Removed routes/imports for netsuite-dashboard, jira-dashboard, transactions
- `Apis.tsx` - Removed mock ERP endpoint URLs, replaced with real dashboard/stats
- `Bridge.tsx` - Removed mock dashboard tab methods, systemDashboard, netSuiteDashboard, jiraDashboard, transactions
- `consts.tsx` - Removed systemTabs, spendTrendData, DUMMY_REQUISITIONS_DATA; kept dateRangeOptions
- Deleted: `mockData.ts`, `mockNetSuiteTransactions.ts`
- Deleted dirs: `jiraDashboard/`, `netsuiteDashboard/`, `systemDashboard/`, `transactions/`

## Decisions Made
- Kept Coupa dashboard route in App.tsx (backend endpoints exist at main_new.py:8104-8474) but removed from sidebar since it is not production-ready for the matchmaking platform
- Kept ZIP dashboard accessible via Partners > Onboarding (ZIP) since it uses real vendor data from /api/vendors
- Task 1 (dashboard rewrite) was already completed by plan 12-01; verified and skipped

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Bridge.tsx syntax error after transactions removal**
- **Found during:** Task 2 (production build verification)
- **Issue:** Removing the transactions block left an extra closing brace, causing esbuild parse error
- **Fix:** Removed the stray `}` at line 138
- **Files modified:** Bridge.tsx
- **Verification:** Production build passes
- **Committed in:** 11f9d4b8 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor syntax fix from edit operation. No scope creep.

## Issues Encountered
- Task 1 was a no-op because plan 12-01 had already rewritten dashboard/Main.tsx and deleted the tab files. This is expected overlap between plans.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Admin portal is now production-ready with real data only
- Ready for deployment to staging and production
- Coupa dashboard exists as a hidden route for future use

---
*Phase: 12-fix-admin-portal-ui*
*Completed: 2026-03-07*
