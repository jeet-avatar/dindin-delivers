---
phase: 05-ops-security
plan: 02
subsystem: infra
tags: [staging-url, cloudfront, xcconfig, gradle, cors, nginx]

# Dependency graph
requires:
  - phase: 05-ops-security/01
    provides: "gitignore and pre-commit hook foundation"
provides:
  - "All staging references in code/config/test/doc files point to correct CF domain d34u5ixl0bulv4"
  - "Zero references to wrong production CF domain d3kuu45w6kl8hr in any non-planning file"
affects: [05-ops-security/03, deploy-staging]

# Tech tracking
tech-stack:
  added: []
  patterns: ["staging URL centralized via xcconfig/buildConfigField/env vars"]

key-files:
  created: []
  modified:
    - "apps/ios/customer/Config/Debug.xcconfig"
    - "apps/ios/delivery/Config/Debug.xcconfig"
    - "apps/ios/restaurant/Config/Debug.xcconfig"
    - "apps/android/app/build.gradle.kts"
    - "apps/android/driver/build.gradle.kts"
    - "apps/android/partner/build.gradle.kts"
    - "apps/web/p2p-platform/frontend/.env.staging"
    - "apps/web/p2p-platform/backend/main_new.py"
    - "apps/web/p2p-platform/backend/endpoint_config.py"
    - "apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift"
    - "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/EnterpriseNetworkLayer.swift"
    - "infrastructure/kubernetes/api-gateway/nginx.conf"

key-decisions:
  - "Fixed 24 additional doc/agent files not in plan to achieve zero-reference verification"

patterns-established:
  - "Staging URL d34u5ixl0bulv4.cloudfront.net is the single correct staging CloudFront domain"

requirements-completed: [OPS-04, OPS-05]

# Metrics
duration: 5min
completed: 2026-02-21
---

# Phase 05 Plan 02: Staging URL Correction Summary

**Replaced wrong staging URL (production CF d3kuu45w6kl8hr) with correct staging CF (d34u5ixl0bulv4) across 61 files -- zero old references remain**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-21T10:33:22Z
- **Completed:** 2026-02-21T10:39:02Z
- **Tasks:** 2
- **Files modified:** 61 (12 critical config + 25 planned test/script/doc + 24 additional doc)

## Accomplishments
- All iOS debug xcconfigs (3) now point to real staging, not production
- All Android staging build.gradle.kts (3) now point to real staging
- Backend CORS, frontend .env.staging, K8s nginx, endpoint_config all corrected
- Every test suite, QA script, agent config, and documentation file updated
- Full codebase verification: zero references to old URL outside .planning/

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix old staging URL in critical app config files (12 files)** - `3f2d9bd2` (fix)
2. **Task 2: Fix old staging URL in test/script/agent/doc files (49 files)** - `f143f142` (fix)

## Files Created/Modified

### Critical Config (Task 1 - 12 files)
- `apps/ios/customer/Config/Debug.xcconfig` - iOS customer debug API_BASE_URL, WEBSOCKET_URL, CDN_URL (3 occurrences)
- `apps/ios/delivery/Config/Debug.xcconfig` - iOS driver debug URLs (3 occurrences)
- `apps/ios/restaurant/Config/Debug.xcconfig` - iOS restaurant debug URLs (3 occurrences)
- `apps/android/app/build.gradle.kts` - Android customer staging buildConfigField
- `apps/android/driver/build.gradle.kts` - Android driver staging buildConfigField
- `apps/android/partner/build.gradle.kts` - Android partner staging buildConfigField
- `apps/web/p2p-platform/frontend/.env.staging` - Frontend VITE_API_URL
- `apps/web/p2p-platform/backend/main_new.py` - CORS STAGING_ORIGINS list
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift` - Staging URL comment
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/EnterpriseNetworkLayer.swift` - Hardcoded staging fallback
- `infrastructure/kubernetes/api-gateway/nginx.conf` - CORS origin regex
- `apps/web/p2p-platform/backend/endpoint_config.py` - Environment.STAGING enum value

### Test/Script/Agent/Doc (Task 2 - 49 files)
- 3 shell scripts (qa-runner.sh, uat-comprehensive.sh, validation-meta.sh)
- 5 agent configs (.claude/agents/*.sh)
- 11 Python test suites/agents (use_case_test_suite*.py, test_ride_checkout.py, etc.)
- 2 iOS test files (run_staging_tests.swift, CustomerAppStagingAPITests.swift)
- 2 top-level docs (CLAUDE_PRODUCTION.md, CUSTOMER_APP_STAGING_AUDIT.md)
- 2 additional agent .md files (.claude/agents/agent-24-cross-platform-validator.md, ios-development-agent.md)
- 24 additional docs: session handoffs, source-of-truth, deployment guides, architecture docs, etc.

## Decisions Made
- Fixed 24 additional documentation files not listed in the plan to satisfy the plan's own verification criteria (zero old URL references in any non-planning file)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed 24 additional doc/agent files with old staging URL**
- **Found during:** Task 2 (verification step)
- **Issue:** Plan listed 37 files total but full codebase grep found 24 more .md files containing the old URL. Plan's success criteria required zero references.
- **Fix:** Applied same literal string replacement to all 24 files (session handoffs, source-of-truth docs, deployment guides, architecture docs, etc.)
- **Files modified:** SESSION_HANDOFF.md, DEPLOYMENT.md, API_CONTRACT.md, AUDIT_PRODUCTION.md, .claude/SOURCE_OF_TRUTH.md, .claude/NEXT_SESSION.md, docs/TESTING_SYSTEMS.md, docs/customer/BUILD.md, docs/SESSION_STATE_2026_01_04.md, apps/ios/DEPLOYMENT.md, apps/ios/IOS_APP_ARCHITECTURE.md, apps/ios/CUSTOMER_APP_*.md, apps/ios/RESTAURANT_APP_SOURCE_OF_TRUTH.md, apps/ios/SESSION_HANDOFF_BUILD*.md, apps/ios/TESTFLIGHT_BUILD_GUIDE.md, apps/ios/NEXT_SESSION_PROMPT.md, apps/web/p2p-platform/backend/ENTERPRISE_PRODUCTION_AUDIT.md, .claude/agents/agent-24-cross-platform-validator.md, .claude/agents/ios-development-agent.md
- **Verification:** `grep -rn "d3kuu45w6kl8hr" . --include="*.md" | grep -v ".planning/"` returns 0 matches
- **Committed in:** f143f142 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Necessary to meet plan's own zero-reference success criteria. No scope creep -- same string replacement, same intent.

## Issues Encountered
None -- all replacements were straightforward literal string substitutions.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 05-03 (CLAUDE.md update + key revocation checkpoint) is ready to execute
- The backend CORS list, endpoint_config, and all app configs now reference the correct staging URL
- Deploying these changes will require the standard CI/CD pipeline (push + workflow trigger)

## Self-Check: PASSED

- FOUND: 05-02-SUMMARY.md
- FOUND: commit 3f2d9bd2 (Task 1)
- FOUND: commit f143f142 (Task 2)
- OLD_URL_REFERENCES: 0 (zero remaining)

---
*Phase: 05-ops-security*
*Completed: 2026-02-21*
