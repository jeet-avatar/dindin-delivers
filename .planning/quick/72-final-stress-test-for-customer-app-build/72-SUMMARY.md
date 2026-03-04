---
phase: quick-72
plan: 01
subsystem: testing
tags: [stress-test, app-store, apple-review, production-api, asc-api, demo-account, edge-cases]

# Dependency graph
requires:
  - phase: quick-71
    provides: "E2E pre-submission verification baseline (30 checks, GO)"
  - phase: quick-70
    provides: "4 App Store blocker fixes (demo login, privacy URL, build 1108, REJECTED state)"
provides:
  - "Comprehensive 39-check stress test report with PASS/FAIL evidence"
  - "Critical demo login 401 failure discovery"
  - "Apple Guidelines risk assessment for all relevant guidelines"
  - "Edge case verification (no 500s on invalid data)"
affects: [app-store-submission, demo-account-fix, production-backend]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Test standard OAuth2 login (not bypass) for Apple reviewer simulation"]

key-files:
  created:
    - ".planning/quick/72-final-stress-test-for-customer-app-build/FINAL_STRESS_TEST_REPORT.md"
  modified: []

key-decisions:
  - "NO-GO recommendation: demo customer OAuth2 login returns 401 on production, blocking Apple review"
  - "Test standard /api/auth/customer/login (not demo-login bypass) to simulate actual Apple reviewer flow"
  - "WebSocket test with matching client_id (customer_74) proves JWT validation works correctly"

patterns-established:
  - "Always test the exact authentication path the app uses, not admin bypass endpoints"
  - "Edge case testing: zero coords, extreme coords, invalid IDs, double login"

requirements-completed: [STRESS-01, STRESS-02, STRESS-03, STRESS-04, STRESS-05]

# Metrics
duration: 9min
completed: 2026-03-04
---

# Quick-72: Final Stress Test Summary

**39-check stress test: 34 PASS, 1 CRITICAL FAIL (demo login 401), 4 WARNING -- NO-GO for App Store submission until demo password hash fixed on production**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-04T11:10:40Z
- **Completed:** 2026-03-04T11:19:42Z
- **Tasks:** 2
- **Files created:** 1

## Accomplishments
- Executed comprehensive 39-check stress test across 5 areas (demo flow, ASC metadata, stability, guidelines, edge cases)
- Discovered critical demo login failure that quick-71 missed (tested bypass endpoint instead of standard OAuth2 login)
- Verified App Store Connect metadata completeness via API (build 1108 VALID, all fields populated)
- Confirmed production backend stability (health, WebSocket, auth errors -- zero 500s)
- Assessed 7 Apple Guidelines with risk levels and reasoning

## Task Commits

Each task was committed atomically:

1. **Task 1: Full Demo Flow + Production Stability + Edge Cases** - `2084abdc` (test)
2. **Task 2: App Store Connect Check + Apple Guidelines + Final Report** - `04c19800` (test)

## Files Created/Modified
- `.planning/quick/72-final-stress-test-for-customer-app-build/FINAL_STRESS_TEST_REPORT.md` - Complete 39-check stress test report with evidence tables

## Decisions Made
- **NO-GO recommendation** because demo customer login fails on production (401 on standard OAuth2 endpoint)
- Tested the exact endpoint the iOS app uses (`/api/auth/customer/login` via P2PAPIService.swift:1553) rather than the admin bypass endpoint
- WebSocket tested with correct client_id format (`customer_{id}`) matching JWT claims structure

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fare estimate field names corrected**
- **Found during:** Task 1 (check 1.5)
- **Issue:** Plan specified `pickup_lat`/`pickup_lng` but endpoint requires `pickup_latitude`/`pickup_longitude`
- **Fix:** Used correct field names from 422 validation error, re-tested successfully
- **Files modified:** None (test adjustment only)
- **Verification:** Fare estimate returned 200 with correct fields

**2. [Rule 3 - Blocking] WebSocket client_id format corrected**
- **Found during:** Task 1 (check 3.2)
- **Issue:** Plan used `test_stress` as client_id, but WebSocket JWT validation requires `customer_{id}` format
- **Fix:** Used `customer_74` (matching demo customer id=74 in JWT claims)
- **Verification:** WebSocket upgraded successfully, received `{"type":"connected"}` message

---

**Total deviations:** 2 auto-fixed (2 blocking -- test parameter corrections)
**Impact on plan:** Both were test parameter corrections, not code issues. No scope creep.

## Issues Encountered
- **Demo login 401 (CRITICAL)**: The primary finding of this stress test. Standard OAuth2 login at `/api/auth/customer/login` returns 401 for demo credentials despite `/api/demo/setup` confirming the account exists and updating the password hash. Root cause likely bcrypt version mismatch between deployed Docker image and local code, or ORM/SQL commit timing issue.
- **ASC API endpoint format**: Initial attempt to query `appStoreVersions` directly returned 403 (GET_COLLECTION not allowed). Fixed by querying through `/v1/apps/{id}/appStoreVersions` instead.

## User Setup Required

None - no external service configuration required. This was a read-only stress test.

## Next Steps

| Priority | Action | Effort |
|----------|--------|--------|
| **P0** | Fix demo customer password hash on production | 30 min + deploy |
| **P0** | Re-run quick-72 check 1.1 to verify fix | 2 min |
| P2 | Set supportUrl in ASC metadata | 5 min |
| P3 | Add coordinate bounds validation | 15 min |

**CRITICAL:** Do NOT submit to App Store until demo login is fixed and verified.

## Self-Check: PASSED

- FINAL_STRESS_TEST_REPORT.md: FOUND (224 lines, exceeds 200 minimum)
- 72-SUMMARY.md: FOUND
- Task 1 commit (2084abdc): FOUND
- Task 2 commit (04c19800): FOUND

---
*Phase: quick-72*
*Completed: 2026-03-04*
