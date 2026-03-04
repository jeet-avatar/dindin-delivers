---
phase: quick-77
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/customer/eatfaircustomer/ViewModels/RideRequestViewModel.swift
  - apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
  - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
autonomous: true
requirements: [FARE-FLASH-FIX]

must_haves:
  truths:
    - "Fare section is hidden until API fare estimate response arrives (no default values visible)"
    - "Displayed fare total matches backend estimate.total (no client-side recalculation mismatch)"
    - "Loading overlay is fully opaque over fare section during estimation, showing 'Estimating fare...'"
    - "iOS minimum fare matches backend $8.00 (not old $5.00)"
    - "Second fare estimate request still works correctly (no regression)"
  artifacts:
    - path: "apps/ios/customer/eatfaircustomer/ViewModels/RideRequestViewModel.swift"
      provides: "fareEstimateReceived flag, isEstimatingFare flag, backend total/subtotal usage"
      contains: "fareEstimateReceived"
    - path: "apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift"
      provides: "Gated fare section, opaque estimation overlay"
      contains: "fareEstimateReceived"
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift"
      provides: "Corrected minimum fare $8.00"
      contains: "rideMinFare: Double = 8.00"
  key_links:
    - from: "RideRequestViewModel.swift"
      to: "RideRequestView.swift"
      via: "fareEstimateReceived @Published property"
      pattern: "fareEstimateReceived"
    - from: "RideRequestViewModel.swift"
      to: "estimate.total / estimate.subtotal"
      via: "Direct backend value usage instead of recalculation"
      pattern: "estimate\\.total"
---

<objective>
Fix all 3 root causes of the fare estimate flash/wrong price bug in the iOS Customer app, then rebuild build 1111 to TestFlight.

Purpose: Users currently see a wrong fare ($6.00 default) flash on screen before the real API fare loads. Even after loading, the displayed fare differs from backend because iOS recalculates from breakdown components, missing time_adjustment and long_distance_discount. The loading overlay is also semi-transparent, making wrong values readable during API call.

Output: Fixed RideRequestViewModel + RideRequestView + AppConfig, iOS Customer build 1111 on TestFlight attached to ASC version.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/ios/customer/eatfaircustomer/ViewModels/RideRequestViewModel.swift
@apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
@apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
@.planning/debug/fare-wrong-first-screen-flash.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix all 3 fare estimate root causes in ViewModel, View, and AppConfig</name>
  <files>
    apps/ios/customer/eatfaircustomer/ViewModels/RideRequestViewModel.swift
    apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift
    apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
  </files>
  <action>
**ROOT CAUSE 1 — Race condition (ViewModel + View):**

In `RideRequestViewModel.swift`:
- Add `@Published var fareEstimateReceived: Bool = false` near the other @Published properties (around line 20-31).
- Add `@Published var isEstimatingFare: Bool = false` to distinguish fare estimation from ride requesting.
- In `estimateFare()` (line 234): at the START of the function, set `fareEstimateReceived = false` and `isEstimatingFare = true`. Do NOT set `isLoading = true` here (isLoading is for ride requesting).
- In the `.success` case (line 254): set `fareEstimateReceived = true` and `isEstimatingFare = false` AFTER updating all the fare properties.
- In the `.failure` case (line 282): set `fareEstimateReceived = true` and `isEstimatingFare = false` AFTER calling `estimateFareLocally()` (local fallback still needs to show).

In `RideRequestView.swift`:
- Line 401: Change the fare section gate from `if viewModel.canRequestRide` to `if viewModel.canRequestRide && viewModel.fareEstimateReceived`. This prevents rendering default values before API responds. Keep the notes section (line 387) gated on just `canRequestRide` — that's fine to show early.
- Lines 51-58 (loading overlay): Replace the single overlay with TWO conditions:
  1. `if viewModel.isEstimatingFare` — Show a FULLY OPAQUE white overlay with `ProgressView("Estimating fare...")` centered. Use `Color.white` (not black with opacity). Place it over the bottom sheet area. Implementation: inside the ZStack after the bottom sheet VStack, add:
     ```swift
     if viewModel.isEstimatingFare {
         Color.white.opacity(0.95)
             .ignoresSafeArea()
         ProgressView("Estimating fare...")
             .padding()
             .background(Color.white)
             .cornerRadius(12)
             .shadow(radius: 4)
     }
     ```
  2. Keep the existing `if viewModel.isLoading` overlay for ride requesting with "Requesting ride..." text (leave as-is, this is correct for the ride request flow).

**ROOT CAUSE 2 — Fare recalculation mismatch (ViewModel + AppConfig):**

In `RideRequestViewModel.swift`:
- Add `@Published var backendTotal: Double?` and `@Published var backendSubtotal: Double?` properties.
- In the `.success` handler (around line 254-269), after setting breakdown values, also set:
  ```swift
  self.backendTotal = estimate.total
  self.backendSubtotal = estimate.subtotal
  ```
- Modify the computed property `fareBeforeTax` (line 139-142): If `backendSubtotal` is non-nil, use it directly instead of recalculating. The backend subtotal already includes time_adjustment and long_distance_discount:
  ```swift
  var fareBeforeTax: Double {
      if let backendSubtotal = backendSubtotal {
          return backendSubtotal
      }
      // Fallback for local calculation only
      let driverPortion = (baseFare + distanceFee + timeFee) * surgeMultiplier
      return max(driverPortion, minimumFare) + platformFee
  }
  ```
- Modify `estimatedFare` (line 168-170): If `backendTotal` is non-nil, use it directly:
  ```swift
  var estimatedFare: Double {
      if let total = backendTotal {
          return total
      }
      return fareBeforeTax + taxAmount
  }
  ```
- In `estimateFare()` start, reset: `backendTotal = nil` and `backendSubtotal = nil`.
- In `estimateFareLocally()`, leave backendTotal/backendSubtotal as nil so it falls back to local calc.

In `AppConfig.swift`:
- Line 268: Change `rideMinFare: Double = 5.00` to `rideMinFare: Double = 8.00` to match backend `pricing_config.py:21` MINIMUM_FARE = $8.00.

**Important: Do NOT change** the breakdown display (baseFare, distanceFee, timeFee line items in the View). Those individual line items are informational. The TOTAL displayed to the user via `viewModel.totalAmount` and `viewModel.estimatedFare` will now use backend values, which is what matters for pricing correctness.

**Important: Do NOT touch** `driverEarnings` computed property — it uses the breakdown values for informational display and is fine as-is.
  </action>
  <verify>
    Build the customer app with: `xcodebuild -workspace apps/ios/customer/eatfaircustomer.xcworkspace -scheme eatfaircustomer -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5`
    Verify: BUILD SUCCEEDED with no errors. Grep the built files for `fareEstimateReceived` to confirm the new property exists.
  </verify>
  <done>
    - fareEstimateReceived @Published property added, reset to false at start of estimateFare(), set true on both success and failure paths
    - isEstimatingFare @Published property added, drives opaque overlay with "Estimating fare..." text
    - Fare section in View gated on `canRequestRide && fareEstimateReceived` (not just canRequestRide)
    - backendTotal/backendSubtotal used as primary fare display values, with local-calc fallback
    - AppConfig.rideMinFare corrected from $5.00 to $8.00
    - Build succeeds with no errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Bump build to 1111, archive, upload to TestFlight, attach to ASC version</name>
  <files>
    apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
  </files>
  <action>
1. **Bump build number** from 1110 to 1111 in `project.pbxproj`:
   ```bash
   sed -i '' 's/CURRENT_PROJECT_VERSION = 1110/CURRENT_PROJECT_VERSION = 1111/g' apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
   ```
   Verify with grep that all 6 occurrences changed to 1111.

2. **Git commit** the code fixes + build bump together:
   ```bash
   git add apps/ios/customer/eatfaircustomer/ViewModels/RideRequestViewModel.swift \
          apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift \
          apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift \
          apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
   git commit -m "fix(ios): fare estimate flash + wrong price — 3 root causes fixed (build 1111)"
   ```

3. **Archive** the customer app:
   ```bash
   xcodebuild archive \
     -workspace apps/ios/customer/eatfaircustomer.xcworkspace \
     -scheme eatfaircustomer -configuration Release \
     -archivePath /tmp/dollor-archives/customer.xcarchive \
     -destination 'generic/platform=iOS' -allowProvisioningUpdates
   ```

4. **Export + Upload to TestFlight** (ExportOptions.plist has destination:upload):
   ```bash
   xcodebuild -exportArchive \
     -archivePath /tmp/dollor-archives/customer.xcarchive \
     -exportOptionsPlist apps/ios/customer/ExportOptions.plist \
     -exportPath /tmp/dollor-ipas/customer \
     -allowProvisioningUpdates \
     -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
     -authenticationKeyID 9K626GB728 \
     -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
   ```

5. **Wait ~60s** for build to process on ASC, then attach build 1111 to the existing ASC version using the ASC API:
   - First find the build: `GET /v1/builds?filter[app]=com.dollorai.customer&filter[version]=1111`
   - Then PATCH the appStoreVersion `30ad500d-cdf6-47fb-98e2-314fe6fd68dc` to attach the build relationship
   - Use ASC JWT auth with key `9K626GB728`, issuer `80d10e49-f379-462f-9668-5ea53016812e`
  </action>
  <verify>
    - `grep 'CURRENT_PROJECT_VERSION = 1111' apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj | wc -l` returns 6
    - Archive succeeds (check exit code 0)
    - Export+Upload succeeds (look for "Upload Succeeded" or exit code 0)
    - ASC API confirms build 1111 is attached to version (PATCH returns 200)
  </verify>
  <done>
    - Build number bumped to 1111 in all 6 build settings
    - Code committed with descriptive message
    - Customer app archived with Release configuration
    - Build uploaded to TestFlight via ExportOptions.plist
    - Build 1111 attached to ASC version 30ad500d-cdf6-47fb-98e2-314fe6fd68dc (PREPARE_FOR_SUBMISSION)
  </done>
</task>

</tasks>

<verification>
- iOS Customer app builds without errors
- fareEstimateReceived property exists and gates fare section visibility
- isEstimatingFare drives opaque "Estimating fare..." overlay (separate from isLoading)
- backendTotal/backendSubtotal used for displayed fare (not client-side recalculation)
- AppConfig.rideMinFare = 8.00 (matches backend pricing_config.py:21)
- Build 1111 on TestFlight attached to ASC version
</verification>

<success_criteria>
- No fare flash on first estimate (fare section hidden until API responds)
- Displayed total matches backend estimate.total exactly
- Opaque overlay during estimation prevents reading stale values
- Minimum fare aligned at $8.00 across iOS and backend
- Build 1111 live on TestFlight and attached to ASC submission version
</success_criteria>

<output>
After completion, create `.planning/quick/77-fix-fare-estimate-flash-wrong-price-3-ro/77-SUMMARY.md`
</output>
