# Deferred Items — Quick 196

## Pre-existing Build Error (Out of Scope)

**File:** `apps/ios/delivery/eatffairdelivery/Views/Rideshare/CounterOfferResponseSheet.swift:374`

**Error:**
```
error: extra arguments at positions #1, #2, #3 in call
error: missing arguments for parameters 'title', 'color', 'isLoading' in call
error: cannot infer contextual base in reference to member 'orange'
```

**Root cause:** `CounterOfferResponseSheet.swift` was last modified in quick-190 (`feat(quick-190): wire SwipeToConfirmButton into Driver app`). The file calls `SwipeToConfirmButton` with the EatFairShared signature (`label:`, `accentColor:`, `isDisabled:`), but the local delivery-module definition in `PickupDropoffView.swift` uses `title:`, `color:`, `isLoading:`. Swift resolves to the local definition, causing a signature mismatch.

**Not caused by quick-196.** My change was only in `startRide()` in `ActiveRideView.swift`.

**Fix needed:** Either unify the SwipeToConfirmButton signatures across delivery module or add a `@_exported import EatFairShared` disambiguation in CounterOfferResponseSheet so it resolves the shared version.
