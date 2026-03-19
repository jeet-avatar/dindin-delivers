---
phase: quick-194
plan: 01
subsystem: ios-customer
tags: [ios, swift, ux, error-handling, rideshare]
dependency_graph:
  requires: []
  provides: [visible-error-feedback-rating-tip]
  affects: [RideRequestView]
tech_stack:
  added: []
  patterns: [SwiftUI .alert modifier, @State error vars]
key_files:
  created: []
  modified:
    - apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift
decisions:
  - Two separate .alert modifiers on rideCompletedSection VStack (SwiftUI shows one at a time)
  - ratingSubmitted/tipSubmitted remain false on failure so form stays visible for retry
metrics:
  duration: "5 min"
  completed: "2026-03-18"
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-194 Plan 01: Fix iOS Silent Rating and Tip Failure Summary

**One-liner:** Added user-visible error alerts for submitRating/submitTip failures in RideRequestView — ratingSubmitted/tipSubmitted now only set on .success, forms stay open on .failure for retry.

## What Was Done

Fixed silent failure behavior in `RideRequestView.swift` where both `submitRating()` and `submitTip()` were setting their `*Submitted = true` flags even when the API call returned `.failure`, effectively hiding errors from the user and preventing retry.

### Changes Made

**4 new `@State` vars added** (line 1513):
```swift
@State private var showRatingError = false
@State private var ratingErrorMessage = ""
@State private var showTipError = false
@State private var tipErrorMessage = ""
```

**`submitRating()` failure branch fixed** — replaced silent dismiss with alert trigger:
```swift
case .failure(let error):
    ratingErrorMessage = error.localizedDescription
    showRatingError = true
```

**`submitTip()` failure branch fixed** — same pattern:
```swift
case .failure(let error):
    tipErrorMessage = error.localizedDescription
    showTipError = true
```

**Two `.alert` modifiers added** to `rideCompletedSection` VStack:
```swift
.alert("Rating Failed", isPresented: $showRatingError) {
    Button("OK", role: .cancel) { }
} message: {
    Text(ratingErrorMessage)
}
.alert("Tip Failed", isPresented: $showTipError) {
    Button("OK", role: .cancel) { }
} message: {
    Text(tipErrorMessage)
}
```

## Verification Results

All 5 plan checks passed:

| Check | Result |
|-------|--------|
| "Allow user to proceed" comment removed | PASS — 0 matches |
| Error state vars declared | PASS — 10 lines (vars + usages) |
| .alert("Rating Failed") and .alert("Tip Failed") present | PASS — 2 lines |
| ratingSubmitted = true appears exactly once (.success) | PASS — 1 match |
| tipSubmitted = true appears exactly twice (.success + Skip button) | PASS — 2 matches |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | cafacbb6 | fix(quick-194): show alert on rating/tip failure, submitted only on success |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] File exists: `apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift`
- [x] Commit exists: cafacbb6
- [x] 5/5 grep verification checks passed
- [x] `showRatingError` confirmed in file at line 1513
