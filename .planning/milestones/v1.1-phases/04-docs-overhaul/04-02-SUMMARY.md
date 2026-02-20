---
phase: 04-docs-overhaul
plan: 02
subsystem: docs
tags: [ground-truth, api-docs, line-references, staging-url, anti-hallucination]

# Dependency graph
requires:
  - phase: 02-security-auth-fix
    provides: "auth middleware additions that shifted main_new.py line numbers by 400-700+"
provides:
  - "GROUND_TRUTH.md with verified file:line references matching current code"
  - "API_ENDPOINTS.md with correct staging URL and auth requirements"
  - "QA_KNOWLEDGE_BASE.md with correct staging URL"
  - "TIER2 guide with correct Android module names"
affects: [qa-testing, anti-hallucination, android-development]

# Tech tracking
tech-stack:
  added: []
  patterns: ["grep-verify-before-documenting line references"]

key-files:
  created: []
  modified:
    - ".claude/docs/GROUND_TRUTH.md"
    - ".claude/docs/API_ENDPOINTS.md"
    - ".claude/agents/QA_KNOWLEDGE_BASE.md"
    - "docs/TIER2-ANDROID-IMPLEMENTATION-GUIDE.md"

key-decisions:
  - "Used grep to verify every single line reference rather than applying a fixed offset"
  - "Changed Stripe driver endpoint from create-account to connect (matching actual route name)"
  - "Removed /api/rides/estimate from deprecated list since it is still active and used by iOS"

patterns-established:
  - "After any code changes to main_new.py, re-verify GROUND_TRUTH.md line numbers with grep"

requirements-completed: [DOC-04, DOC-05, DOC-06]

# Metrics
duration: 7min
completed: 2026-02-20
---

# Phase 04 Plan 02: Documentation Reference Fix Summary

**Re-verified 50+ GROUND_TRUTH.md line references, fixed staging URLs in 3 files, updated API auth requirements, and corrected Android module names**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-20T11:36:48Z
- **Completed:** 2026-02-20T11:44:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Every `main_new.py:NNNN` reference in GROUND_TRUTH.md now matches actual code (50+ references updated)
- Staging URL corrected from `d3kuu45w6kl8hr` to `d34u5ixl0bulv4` in 3 files (GROUND_TRUTH, API_ENDPOINTS, QA_KNOWLEDGE_BASE)
- API_ENDPOINTS.md now reflects Phase 02 auth requirements (vendor orders: No* -> Bearer, global middleware note added)
- TIER2 Android guide uses correct `:driver` module name and `driver/` file paths (was `:orderapp` / `orderapp/`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Re-verify and fix all GROUND_TRUTH.md line references** - `4fba395b` (docs)
2. **Task 2: Fix API_ENDPOINTS.md staging URL + auth info** - `32a81890` (docs)
3. **Task 3: Fix QA_KNOWLEDGE_BASE.md and TIER2 guide** - `bb31d0cd` (docs)

## Files Created/Modified
- `.claude/docs/GROUND_TRUTH.md` - Updated 50+ file:line references, staging URL, "Last verified" date
- `.claude/docs/API_ENDPOINTS.md` - Fixed staging URL, added auth middleware note, updated auth column, removed false deprecation
- `.claude/agents/QA_KNOWLEDGE_BASE.md` - Fixed staging URL in 2 locations
- `docs/TIER2-ANDROID-IMPLEMENTATION-GUIDE.md` - Fixed `:orderapp` to `:driver` and `orderapp/` to `driver/` paths

## Decisions Made
- Used grep to verify every single line reference individually rather than applying a fixed offset -- the shift was non-uniform because Phase 02 added code at multiple points in main_new.py
- Discovered and corrected the Stripe driver endpoint path: GROUND_TRUTH said `GET /api/drivers/{id}/stripe/create-account` but actual route is `POST /api/drivers/{id}/stripe/connect`
- Removed `/api/rides/estimate` from deprecated endpoints list because it is still active and used by iOS (`bid_routes.py:1438`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Stripe endpoint path in GROUND_TRUTH.md**
- **Found during:** Task 1
- **Issue:** GROUND_TRUTH documented `GET /api/drivers/{id}/stripe/create-account` and `POST /api/vendors/{id}/stripe/create-account` but actual routes are `POST /api/drivers/{id}/stripe/connect` and `POST /api/vendors/{id}/stripe/connect`
- **Fix:** Updated both endpoint paths and HTTP methods
- **Files modified:** `.claude/docs/GROUND_TRUTH.md`
- **Verification:** `grep -n 'stripe/connect' apps/web/p2p-platform/backend/main_new.py` confirms routes
- **Committed in:** `4fba395b` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed orderapp file paths in TIER2 guide**
- **Found during:** Task 3
- **Issue:** TIER2 guide had file paths like `orderapp/src/main/java/...` which don't match the actual `driver/` module directory
- **Fix:** Replaced `orderapp/src/main/java/ai/dollor/driver` with `driver/src/main/java/ai/dollor/driver` (2 paths)
- **Files modified:** `docs/TIER2-ANDROID-IMPLEMENTATION-GUIDE.md`
- **Committed in:** `bb31d0cd` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes correct inaccurate documentation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 04 (Documentation Overhaul) is fully complete with both plans executed
- All documentation now reflects the post-Phase-02 codebase state
- Anti-hallucination references verified against actual source code

## Self-Check: PASSED

All 4 modified files exist. All 3 task commits verified in git history.

---
*Phase: 04-docs-overhaul*
*Completed: 2026-02-20*
