---
phase: quick-214
plan: "01"
subsystem: ios-customer
tags: [ios, ride-request, error-handling, swift]
dependency_graph:
  requires: []
  provides: [ios-ride-error-matching, ios-ride-expired-status]
  affects: [RideRequestViewModel]
tech_stack:
  added: []
  patterns: [error-string-matching, switch-case-status-handling]
key_files:
  modified:
    - apps/ios/customer/eatfaircustomer/ViewModels/RideRequestViewModel.swift
decisions:
  - "Used lowercased errorMsg string matching to handle four new backend error conditions, consistent with existing pattern"
  - "Expired ride fires NSNotification for decoupled UI response; cancelled ride uses showErrorMessage inline for immediate feedback"
metrics:
  duration: "~8 min"
  completed: "2026-03-21"
---

# Phase quick-214 Plan 01: Fix iOS Ride-Request Failure Gap — Error Matching + Expired/Cancelled Status

**One-liner:** Added four actionable error-message branches and explicit expired/cancelled status handling to `RideRequestViewModel.swift`, replacing silent generic fallback with specific user guidance.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Extend error-string matching in .failure case (lines 430-436) | 4b77871a | RideRequestViewModel.swift |
| 2 | Handle "expired" and "cancelled" in updateRideStep switch (lines 806-820) | 4b77871a | RideRequestViewModel.swift |

## Changes Made

### Task 1 — Error-string matching in `.failure(let error)` handler

Added four `else if` branches between the existing "busy/unavailable" branch and the generic `else` fallback:

| New branch | Backend error string matched | User message shown |
|-----------|-----------------------------|--------------------|
| `unpaid balance` | Outstanding balance from previous ride | "You have an outstanding balance from a previous ride. Please contact support to resolve it before requesting again." |
| `already have 3` / `open ride requests` | 3 concurrent open rides limit | "You have open ride requests pending. Please wait or cancel them before requesting a new ride." |
| `pre-authorized` / `card could not` | Stripe pre-auth failure | "Your payment method could not be authorized. Please update your card in Settings." |
| `http error: 401` / `invalid or expired token` | Session expired / JWT invalid | "Your session has expired. Please log in again." |

The existing `network`/`connection` and `busy`/`unavailable` branches are unchanged. The generic fallback remains as the final `else`.

### Task 2 — Expired and cancelled status in `updateRideStep(from:)`

Added two explicit cases before `default: break` in the `switch status.lowercased()` block:

- `case "expired"`: calls `stopTracking()` + posts `NSNotification.Name("RideRequestExpired")` — decoupled UI can listen to dismiss the waiting screen
- `case "cancelled"`: calls `stopTracking()` + calls `showErrorMessage("Your ride was cancelled.")` — inline feedback

Previously both statuses fell through to `default: break`, leaving the tracking timer running and the user stuck on the waiting-for-driver screen.

## Verification

```
grep -n "unpaid balance|already have 3|open ride requests|pre-authorized|http error: 401"
→ Lines 434-441: all 5 new string literals present

grep -n 'case "expired"|case "cancelled"|RideRequestExpired|stopTracking'
→ Line 825: case "expired": | Line 826: stopTracking() | Line 827: RideRequestExpired notification
→ Line 828: case "cancelled": | Line 829: stopTracking()

grep -n "Unable to request ride"
→ Line 443: exactly 1 match (generic fallback preserved)

xcodebuild Debug scheme → ** BUILD SUCCEEDED **
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] File modified: `apps/ios/customer/eatfaircustomer/ViewModels/RideRequestViewModel.swift` — exists and updated
- [x] Commit exists: `4b77871a` — `fix(quick-214): extend ride-request error matching and handle expired/cancelled status`
- [x] All 5 new error-string literals present (grep confirmed)
- [x] `case "expired"` and `case "cancelled"` present (grep confirmed)
- [x] Generic fallback still at line 443 (grep confirmed)
- [x] Xcode build: BUILD SUCCEEDED
