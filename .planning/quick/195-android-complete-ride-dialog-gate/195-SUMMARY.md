---
phase: quick-195
plan: 01
subsystem: android-driver
tags: [android, swipe-mode, ux, ride-completion]
key-files:
  modified:
    - driver/src/main/java/ai/dollor/driver/ui/rides/ActiveRideScreen.kt
decisions:
  - "Swipe gesture is the confirmation — no secondary AlertDialog needed (matches iOS pattern)"
metrics:
  duration: "5 minutes"
  completed: "2026-03-18"
  tasks: 1
  files: 1
---

# Quick-195: Android Complete Ride Dialog Gate — Summary

**One-liner:** Removed 25-line AlertDialog gate from IN_TRANSIT swipe, wired onSwipeConfirm directly to viewModel.completeRide() to match iOS UX.

## What Was Changed

**File:** `driver/src/main/java/ai/dollor/driver/ui/rides/ActiveRideScreen.kt`

**Lines deleted (original line numbers):**
- Line 392: `var showCompleteConfirmation by remember { mutableStateOf(false) }` — state var removed
- Lines 394-416: Entire `if (showCompleteConfirmation) { AlertDialog(...) }` block (25 lines total) deleted

**Line updated:**
- Original line 433: `onSwipeConfirm = { showCompleteConfirmation = true }` changed to `onSwipeConfirm = { viewModel.completeRide() }`

**Why:** The swipe gesture is itself the confirmation intent. Showing a second "Are you sure?" dialog after a deliberate swipe duplicates the confirmation and breaks parity with iOS, which wires swipe directly to the completion action.

**Import safety:** AlertDialog is used at 3 other locations in the file (lines 89, 132, 303 in original) — no import was removed.

## Verification

### Grep proof — showCompleteConfirmation is gone

```
$ grep -n "showCompleteConfirmation" ActiveRideScreen.kt
(zero results)
```

### Grep proof — direct viewModel.completeRide() wiring

```
$ grep -n "onSwipeConfirm" ActiveRideScreen.kt
279:                    onSwipeConfirm = { viewModel.confirmArrival() },
348:                        onSwipeConfirm = { viewModel.startRide() },
407:                    onSwipeConfirm = { viewModel.completeRide() },
514:    onSwipeConfirm: () -> Unit,
809:                onConfirm = onSwipeConfirm
```

Line 407 confirms the direct wiring.

### Build output

```
> Task :driver:assembleDebug

BUILD SUCCESSFUL in 36s
64 actionable tasks: 28 executed, 2 from cache, 34 up-to-date
```

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 0839d412 | fix(quick-195): remove AlertDialog gate from IN_TRANSIT swipe — wire directly to completeRide() |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] File modified: `ActiveRideScreen.kt` — confirmed
- [x] Commit 0839d412 exists in android repo
- [x] showCompleteConfirmation: 0 occurrences
- [x] onSwipeConfirm wired to viewModel.completeRide()
- [x] BUILD SUCCESSFUL
