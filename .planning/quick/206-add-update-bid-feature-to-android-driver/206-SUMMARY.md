---
phase: quick-206
plan: 01
subsystem: android-driver
tags: [android, rideshare, bidding, driver-app, ux]
key-decisions:
  - "Used RideBid.bidId computed property (returns id) — existing pattern in ViewModel, no field rename needed"
  - "UpdateBidSheet pre-populates with bid.proposedPrice and shows live earnings-after-fee preview matching FareNegotiationSheet pattern"
  - "Edit Bid button placed above Withdraw button in PendingBidItem to surface it more prominently"
key-files:
  created: []
  modified:
    - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/ApiModels.kt
    - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt
    - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
    - /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/rides/MyBidsViewModel.kt
    - /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/rides/RideshareTabScreen.kt
metrics:
  duration: "7 minutes"
  completed: "2026-03-19"
  tasks_completed: 3
  files_modified: 5
---

# Quick Task 206: Add Update Bid Feature to Android Driver App — Summary

**One-liner:** Android driver app can now edit a PENDING bid via a bottom sheet calling PUT /api/rides/bid/{id}, matching iOS parity.

## What Was Built

Android drivers can now tap "Edit Bid" on any PENDING bid card in the My Bids → Pending tab. This opens a price-edit bottom sheet pre-populated with the current bid price and optional message, shows a live earnings-after-platform-fee preview, and calls the backend PUT endpoint on confirm.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add UpdateBidRequest model, API endpoint, repository method | 8f6a7bfb | ApiModels.kt, DollorApiService.kt, DollorRepository.kt |
| 2 | Wire updateBid into MyBidsViewModel + Edit Bid button + UpdateBidSheet UI | 419bef2b | MyBidsViewModel.kt, RideshareTabScreen.kt |
| 3 | Build debug APK — verify bid field name, BUILD SUCCESSFUL | (no code changes) | driver-debug.apk (31MB) |

## Implementation Details

### Data Layer (shared module)
- `UpdateBidRequest` data class with `@SerializedName("proposed_price")` and `@SerializedName("message")` — required for plain Gson serialization
- `@PUT("rides/bid/{bidId}")` `updateBid()` in `DollorApiService.kt` follows exact same signature as `submitDriverCounter` (bidId path param, @Body, @Header Authorization)
- `repository.updateBid()` follows DRIVER auth pattern with `safeApiCall` and same error path as `submitDriverCounter`

### ViewModel (driver module)
- `MyBidsUiState` gains `showUpdateSheet: RideBid? = null` field (mirrors `showCounterSheet`)
- Three new functions: `showUpdateSheet(bid)`, `dismissUpdateSheet()`, `updateBid(bidId, newPrice, message)`
- On success: sheet dismisses, snackbar shows "Bid updated!", `refreshBids()` fires to update the list
- On failure: `error` state set (shows via existing error handling)

### UI (driver module)
- `PendingBidItem` gains `onEditBid: () -> Unit` parameter — "Edit Bid" OutlinedButton (blue) placed above "Withdraw" button
- Edit Bid button disabled while `actionInProgress` matches bid (same pattern as Withdraw)
- `UpdateBidSheet` composable: ModalBottomSheet with price field, earnings preview (`AppConfig.Rideshare.calculatePlatformFee`), optional message field, "Update Bid" button with loading spinner
- Sheet trigger sits alongside `showCounterSheet` block in `RideshareTabScreen`

## Verification

- `grep "data class UpdateBidRequest"` → ApiModels.kt:1988 ✓
- `grep '@PUT("rides/bid/{bidId}")'` → DollorApiService.kt:789 ✓
- `grep "suspend fun updateBid"` → DollorRepository.kt:1492 ✓
- `grep "showUpdateSheet\|updateBid\|UpdateBidRequest"` → MyBidsViewModel.kt:9,29,192,197,200,203,207 ✓
- `grep "UpdateBidSheet\|onShowUpdateSheet\|onEditBid"` → RideshareTabScreen.kt:113,238,307,432,461,502,798 ✓
- `./gradlew :shared:compileDebugKotlin` → BUILD SUCCESSFUL ✓
- `./gradlew :driver:compileDebugKotlin` → BUILD SUCCESSFUL (warnings pre-existing) ✓
- `./gradlew :driver:assembleDebug` → BUILD SUCCESSFUL, 31MB APK ✓

## Deviations from Plan

None — plan executed exactly as written. Bid field name was verified (`RideBid.bidId` is a computed property returning `id` at ApiModels.kt:1963) — the ViewModel's existing `it.bidId != bidId` pattern was already correct.

## Self-Check: PASSED

- ApiModels.kt modified: FOUND ✓
- DollorApiService.kt modified: FOUND ✓
- DollorRepository.kt modified: FOUND ✓
- MyBidsViewModel.kt modified: FOUND ✓
- RideshareTabScreen.kt modified: FOUND ✓
- Commit 8f6a7bfb: FOUND ✓
- Commit 419bef2b: FOUND ✓
- driver-debug.apk (31MB): FOUND ✓
