---
phase: quick-81
plan: 01
subsystem: app-store
tags: [ios, app-store, submission, customer-app]
dependency_graph:
  requires: [quick-80]
  provides: [app-store-review-submission]
  affects: [app-store-connect]
tech_stack:
  added: []
  patterns: [asc-review-submissions-api, jwt-es256-auth]
key_files:
  created: []
  modified: []
decisions:
  - "appStoreVersionSubmissions CREATE is deprecated (403); use reviewSubmissions API instead"
  - "Resolved REJECTED item on stale UNRESOLVED_ISSUES submission (from Jan 23 rejection) via PATCH resolved:true, then resubmitted"
  - "New empty reviewSubmission was created but unused; old submission reused since it already had the version attached"
metrics:
  duration: 176s
  completed: 2026-03-04T18:00:16Z
---

# Quick Task 81: Submit iOS Customer App Build 1111 to App Store Review

iOS Customer app v1.0 build 1111 submitted for App Store review via ASC reviewSubmissions API after resolving stale REJECTED item from Jan 23 submission.

## Results

| Check | Result |
|-------|--------|
| JWT generation (ES256) | PASS |
| Version state pre-submission | PREPARE_FOR_SUBMISSION |
| Build 1111 attached | PASS (valid, uploaded 2026-03-04) |
| Screenshots present | PASS (iPhone 6.5" + iPad Pro 12.9") |
| Review details configured | PASS (demo account, notes, contact) |
| Submission API call | PASS (200 OK) |
| Version state post-submission | WAITING_FOR_REVIEW |

## Execution Details

### Task 1: Generate ASC JWT and verify version readiness

- Generated ES256 JWT with Key ID 9K626GB728, Issuer 80d10e49-f379-462f-9668-5ea53016812e
- Confirmed version 30ad500d-cdf6-47fb-98e2-314fe6fd68dc in PREPARE_FOR_SUBMISSION state
- Confirmed build 1111 (ID: 3626a07d-2608-4a88-aebc-a16e715d8b8b) attached, processingState: VALID
- Build uploaded: 2026-03-04T07:47:12, expires: 2026-06-02, minOsVersion: 17.0

### Task 2: Submit for App Store review

**Obstacle encountered:** The `appStoreVersionSubmissions` CREATE endpoint returned 403 FORBIDDEN (deprecated by Apple). Switched to `reviewSubmissions` API.

**Second obstacle:** The version was already claimed by a stale review submission (`84fdc29e`) from Feb 3 in `UNRESOLVED_ISSUES` state (left over from the Jan 23 rejection). Could not add version to a new submission.

**Resolution:**
1. Resolved the REJECTED item on the old submission via `PATCH reviewSubmissionItems/{id}` with `resolved: true` -- item state changed to READY_FOR_REVIEW
2. Submitted the old submission (which already had the version attached) via `PATCH reviewSubmissions/{id}` with `submitted: true`
3. Submission succeeded: state changed to WAITING_FOR_REVIEW at 2026-03-04T18:00:16.406Z

**Final state confirmed:**
- `appStoreState`: WAITING_FOR_REVIEW
- `appVersionState`: WAITING_FOR_REVIEW
- Review submission ID: 84fdc29e-3c5b-432a-aabc-f798e69ffc16
- Expected review timeline: 24-48 hours

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] appStoreVersionSubmissions CREATE deprecated**
- **Found during:** Task 2
- **Issue:** Plan specified POST to /v1/appStoreVersionSubmissions which returned 403 FORBIDDEN (Apple deprecated CREATE on this endpoint)
- **Fix:** Switched to /v1/reviewSubmissions API (newer Apple approach)

**2. [Rule 3 - Blocking] Stale UNRESOLVED_ISSUES submission blocking version**
- **Found during:** Task 2
- **Issue:** Version was claimed by old review submission from Jan 23 rejection (state: UNRESOLVED_ISSUES), preventing it from being added to a new submission
- **Fix:** Resolved the REJECTED item on the old submission, then resubmitted the old submission directly

## Self-Check: PASSED

- Version state confirmed WAITING_FOR_REVIEW via API
- Submission timestamp: 2026-03-04T18:00:16.406Z
- No code files created or modified (API-only task)
