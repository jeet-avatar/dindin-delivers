---
phase: quick-55
plan: 1
subsystem: ui
tags: [ios, swift, backend, config, urls]

# Dependency graph
requires: []
provides:
  - "Fixed Help Center, Contact Support, and Admin Portal links in Restaurant iOS app"
affects: [ios-distribution, restaurant-app]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
    - apps/web/p2p-platform/backend/main_new.py

key-decisions:
  - "Use www.dollor.ai canonical domain for all user-facing URLs (avoids 301 redirect from bare domain)"
  - "Convert vanity phone +1-800-DOLLOR to numeric +1-800-365-5671 for iOS tel: scheme compatibility"

patterns-established: []

requirements-completed: [FIX-LINKS]

# Metrics
duration: 1min
completed: 2026-03-02
---

# Quick Task 55: Fix Broken Links in Restaurant iOS App Summary

**Fixed 3 broken Settings screen links: Help Center and Admin Portal pointed to non-existent subdomains, Contact Support used vanity letters incompatible with iOS tel: scheme**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-02T21:38:22Z
- **Completed:** 2026-03-02T21:39:31Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Help Center link now opens `https://www.dollor.ai/support` (HTTP 200) instead of `api.dollor.ai/support` (401) or `support.dollor.ai` (NXDOMAIN)
- Contact Support phone number is numeric `+1-800-365-5671` instead of vanity `+1-800-DOLLOR` that iOS tel: scheme cannot dial
- Admin Portal link now opens `https://www.dollor.ai/admin` (HTTP 200) instead of `admin.dollor.ai` (NXDOMAIN)
- Both iOS client defaults and backend /api/config response are now consistent

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix iOS defaults and AppConstants** - `461453b3` (fix)
2. **Task 2: Fix backend /api/config response URLs** - `ae45fade` (fix)

## Files Created/Modified
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift` - Fixed supportUrl default (line 338), AppConstants.supportURL (line 591), AppConstants.adminPanelURL (line 600)
- `apps/web/p2p-platform/backend/main_new.py` - Fixed supportUrl (line 1583) and supportPhone (line 1584) in /api/config response

## Decisions Made
- Used `www.dollor.ai` canonical domain for all user-facing URLs -- bare `dollor.ai` 301-redirects adding latency
- Converted vanity phone number to its numeric equivalent (D=3, O=6, L=5, L=5, O=6, R=7 = 365-5671) for iOS tel: URL scheme compatibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Steps
- Deploy backend to staging/production for /api/config change to take effect
- Rebuild iOS Restaurant app and upload to TestFlight for client-side changes

## Self-Check: PASSED

- [x] AppConfig.swift: FOUND
- [x] main_new.py: FOUND
- [x] 55-SUMMARY.md: FOUND
- [x] Commit 461453b3: FOUND
- [x] Commit ae45fade: FOUND

---
*Quick Task: 55*
*Completed: 2026-03-02*
