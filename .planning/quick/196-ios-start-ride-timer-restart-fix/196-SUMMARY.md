---
phase: quick-196
plan: 01
subsystem: ios-driver-rideshare
tags: [ios, rideshare, timer, bug-fix, swift]
dependency_graph:
  requires: []
  provides: [startRide-correct-error-path]
  affects: [ActiveRideView, noShowTimer]
tech_stack:
  added: []
  patterns: [capture-before-mutate, error-path-rollback]
key_files:
  modified:
    - apps/ios/delivery/eatffairdelivery/Views/Rideshare/ActiveRideView.swift
decisions:
  - "Restore noShowTimerActive flag only (not the Combine publisher) on API failure — timer subscription remains cancelled, matching pre-call state"
metrics:
  duration: "5 minutes"
  completed: "2026-03-18"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Quick 196: iOS Start Ride Timer Restart Fix Summary

**One-liner:** Fixed startRide() error path to capture `previousTimerActive` before cancellation and restore flag only — eliminating the broken `noShowTimerActive = true` + `startNoShowTimer()` sequence that left the Combine publisher dead.

## What Was Built

Single targeted fix in `ActiveRideView.swift:startRide()`. The old error branch set `noShowTimerActive = true` then called `startNoShowTimer()`, which is guarded by `guard !noShowTimerActive`. Since the flag was already true, the guard short-circuited — leaving `timerCancellable` cancelled and `noShowTimerActive` stuck at true with no active timer. The fix:

1. Captures `previousTimerActive` BEFORE cancelling `timerCancellable`
2. On API error, restores `noShowTimerActive = previousTimerActive` only
3. Does NOT call `startNoShowTimer()` — preserving the exact pre-call timer state

## Verification

- Grep proof: `previousTimerActive` at lines 739 (capture) and 749 (restore) — exactly 2 hits
- Grep proof: `startNoShowTimer()` not called in `if viewModel.showError` block — only appears at definition (722) and two legitimate call sites (198, 220)
- Build: `** BUILD FAILED **` but failures are in `CounterOfferResponseSheet.swift` (pre-existing from quick-190, unrelated to this change) — see deferred-items.md

## Commits

| Hash | Message |
|------|---------|
| 78c8b55d | fix(quick-196): remove no-show timer restart from startRide() error path |

## Deviations from Plan

None — plan executed exactly as written.

**Pre-existing out-of-scope build error** logged to `deferred-items.md`:
- `CounterOfferResponseSheet.swift:374` — `SwipeToConfirmButton` signature mismatch between local delivery definition and EatFairShared definition. Pre-dates quick-196 (last modified in quick-190). Not caused by this fix.

## Self-Check: PASSED

- [x] `apps/ios/delivery/eatffairdelivery/Views/Rideshare/ActiveRideView.swift` — modified and verified
- [x] Commit `78c8b55d` exists in git log
- [x] `previousTimerActive` appears exactly twice in `startRide()`
- [x] `startNoShowTimer()` absent from `if viewModel.showError` block
