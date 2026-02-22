---
phase: 02-ios-api-verification
plan: 01
subsystem: api
tags: [ios, swift, api-verification, p2p-api, customer-app]

# Dependency graph
requires: []
provides:
  - "Complete iOS Customer app API verification report (163 calls, 119 OK, 44 mismatches)"
  - "17 TODO comments at mismatch sites in 9 iOS source files"
  - "Mismatch severity classification (critical/medium/low) with fix approaches"
affects: [02-ios-api-verification, 04-ios-distribution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "API verification report format: Function | Method | Path | Backend Route | Auth | Status | Notes"
    - "TODO comment convention: // TODO: [SEVERITY] API mismatch -- description"

key-files:
  created:
    - ".planning/phases/02-ios-api-verification/02-01-REPORT-CUSTOMER.md"
  modified:
    - "apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift"
    - "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift"
    - "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/TripBoardService.swift"
    - "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/ChatService.swift"
    - "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/NegotiationService.swift"
    - "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/CallService.swift"
    - "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/LegalService.swift"
    - "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/DollorV3Service.swift"
    - "apps/ios/customer/eatfaircustomer/Services/ACHPaymentService.swift"

key-decisions:
  - "Audit-only: no fixes applied, TODO comments mark mismatches for future discussion"
  - "Classified 5 entire service files as dead code (TripBoardService, NegotiationService, DollorV3Service, ACHPaymentService, and most of LegalService)"
  - "Identified double URL prefix bug in AppConfig.swift affecting ChatService, NegotiationService, CallService"

patterns-established:
  - "API verification report table format for cross-referencing iOS/backend routes"
  - "TODO comment tagging with severity for mismatch tracking"

requirements-completed: [API-01]

# Metrics
duration: 25min
completed: 2026-02-22
---

# Phase 02 Plan 01: iOS Customer App API Verification Summary

**163 Customer app API calls verified against 641 backend routes: 119 OK, 44 mismatches (29 dead endpoints in 5 service files, 15 individual mismatches)**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-02-22T22:45:00Z
- **Completed:** 2026-02-22T23:10:00Z
- **Tasks:** 1/1
- **Files modified:** 10 (1 created, 9 modified)

## Accomplishments
- Verified all 163 API calls across 10 service files used by the iOS Customer app
- Identified 5 entire service files with dead/unreachable backend routes (TripBoardService: 22, DollorV3Service: 4, ACHPaymentService: 3, NegotiationService: 5, and most of LegalService: 6)
- Discovered double URL prefix bug in AppConfig.swift affecting 3 services (ChatService, NegotiationService, CallService)
- Added 17 TODO comments across 9 iOS source files marking every mismatch at its call site
- Confirmed base URL configs correct: Production = api.dollor.ai, Staging = d34u5ixl0bulv4.cloudfront.net

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract and verify all Customer app API calls** - `e35546b9` (feat)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified
- `.planning/phases/02-ios-api-verification/02-01-REPORT-CUSTOMER.md` - Full verification report (530 lines)
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift` - TODO: double URL prefix bug
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` - 3 TODOs: updateCustomerProfile wrong path, 2 GET-for-mutation issues
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/TripBoardService.swift` - TODO: all 22 endpoints dead
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/ChatService.swift` - TODO: double prefix + path mismatch
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/NegotiationService.swift` - TODO: double prefix + no backend routes
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/CallService.swift` - TODO: double prefix + wrong base path
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/LegalService.swift` - 6 TODOs: missing backend routes
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/DollorV3Service.swift` - TODO: all 4 endpoints dead
- `apps/ios/customer/eatfaircustomer/Services/ACHPaymentService.swift` - TODO: all 3 endpoints dead

## Decisions Made
- **Audit-only approach**: Per user decision, no fixes applied. TODO comments mark mismatches for one-by-one discussion in a separate session.
- **Dead service classification**: TripBoardService (22 endpoints), DollorV3Service (4), ACHPaymentService (3), NegotiationService (5), and 6 of 8 LegalService endpoints classified as dead code -- no backend routes exist for any of these paths.
- **Double URL prefix root cause**: Traced to AppConfig.swift where microservice URLs (chatServiceURL, negotiationServiceURL, callServiceURL) already include `/api/chat`, `/api/negotiation`, `/api/call` suffixes, but the service files then construct paths starting with `/api/chat/...` again.

## Deviations from Plan

None - plan executed exactly as written.

Note: TestFlight build baseline was documented as "unavailable" because `xcrun altool` is not installed and no git tags exist for customer app builds. This limitation is noted in the report header.

## Issues Encountered
- API_REGISTRY.md exceeded single-read token limit (28117 tokens) -- resolved by reading in two chunks with offset/limit
- TestFlight build baseline could not be established -- `xcrun altool` unavailable, no git tags found. Documented as limitation in report.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Ready for 02-02-PLAN.md (iOS Driver app verification) -- same methodology applies
- Ready for 02-03-PLAN.md (iOS Restaurant app verification + consolidated FIX_PLAN.md)
- Critical finding: 40 of the 44 mismatches are dead code (entire service files with no backend) rather than fixable API path issues. This suggests the fix plan may recommend deleting ~5 service files rather than creating backend routes.

## Self-Check: PASSED

- [x] `02-01-REPORT-CUSTOMER.md` exists (530 lines)
- [x] `02-01-SUMMARY.md` exists
- [x] Commit `e35546b9` exists in git log
- [x] 17 TODO comments confirmed across 9 iOS source files

---
*Phase: 02-ios-api-verification*
*Completed: 2026-02-22*
