---
phase: quick-69
plan: 01
subsystem: infra
tags: [app-store, ios, audit, pre-submission, app-store-connect-api]

requires:
  - phase: quick-67
    provides: Build 1108 on TestFlight
provides:
  - Pre-submission audit report with 42 checks across 9 categories
  - Identified 4 blockers and 6 warnings before App Store submission
affects: [quick-68, ios-distribution]

tech-stack:
  added: []
  patterns: [App Store Connect API v1 JWT auth for metadata verification]

key-files:
  created:
    - .planning/quick/69-pre-submission-app-store-rejection-audit/APP_STORE_AUDIT_REPORT.md
  modified: []

key-decisions:
  - "Privacy policy URL must use www.dollor.ai (bare domain has Let's Encrypt SSL issues)"
  - "Version in REJECTED state needs build 1108 attached and resubmission (currently has build 1037)"
  - "Demo account must be reset on production before submission (currently returns 401)"

patterns-established:
  - "ASC API JWT: ES256 with kid header, appstoreconnect-v1 audience, 20min expiry"
  - "Pre-submission checklist covers 9 categories: demo, plist, entitlements, config, code, ATS, metadata, build, org"

requirements-completed: [AUDIT-01]

duration: 5min
completed: 2026-03-04
---

# Quick Task 69: Pre-Submission App Store Rejection Audit Summary

**42-check audit of customer app build 1108: 32 PASS, 4 FAIL (demo 401, privacy URL SSL, wrong build attached, REJECTED state), 6 WARNING**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T10:29:51Z
- **Completed:** 2026-03-04T10:35:20Z
- **Tasks:** 2
- **Files created:** 1

## Accomplishments

- Comprehensive 42-point audit across 9 categories covering all common Apple rejection reasons
- Verified build 1108 is VALID and APP_STORE_ELIGIBLE via App Store Connect API
- Identified 4 critical blockers that would cause immediate rejection
- All code-level checks pass: no UIWebView, no staging URLs, no private APIs, all print() in #if DEBUG
- Info.plist, entitlements, and Production.xcconfig all properly configured
- Screenshots verified: 10 iPhone 6.5" + 5 iPad Pro 12.9" present

## Task Commits

1. **Task 1+2: Demo, API, Code-Level, and ASC Metadata Audit** - `bf106f8d` (docs)

## Files Created/Modified

- `.planning/quick/69-pre-submission-app-store-rejection-audit/APP_STORE_AUDIT_REPORT.md` - Full audit report with pass/fail for 42 checks, action items, and pre-submission checklist

## Decisions Made

- Privacy policy URL in ASC uses bare `dollor.ai` which has Let's Encrypt cert causing SSL failures -- must update to `www.dollor.ai`
- Support URL should also be updated to `www.dollor.ai/support` for consistency
- Version 1.0 is in REJECTED state from Jan 23 -- can be edited and resubmitted with new build
- Demo account setup requires admin secret key -- must be run before submission

## Deviations from Plan

None - plan executed exactly as written. Both tasks were combined into a single commit since the audit report is the sole deliverable.

## Issues Encountered

- Demo account login returns 401 on production -- demo account may not exist or password hash is stale. This is an expected finding (auditing for readiness).
- Bare `dollor.ai` domain has a different SSL cert (Let's Encrypt) than `www.dollor.ai` (likely Vercel/hosting provider), causing `curl` failures with exit code 60. `www.dollor.ai` works fine.

## User Setup Required

None - read-only audit, no code changes.

## Next Steps (Pre-Submission)

1. Run demo account setup on production with admin secret key
2. Update privacy policy URL to `https://www.dollor.ai/privacy` in ASC
3. Update support URL to `https://www.dollor.ai/support` in ASC
4. Attach build 1108 to the App Store version (currently has build 1037)
5. Clean up description formatting (extra spaces)
6. Resubmit for App Store review

---
*Phase: quick-69*
*Completed: 2026-03-04*
