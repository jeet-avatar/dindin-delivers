---
phase: quick-19
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - ".planning/quick/19-recheck-android-customer-rideshare-api-f/RECHECK_REPORT.md"
  - "/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt"
  - "/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt"
  - "/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/ApiModels.kt"
autonomous: true
requirements: [QUICK-19]

must_haves:
  truths:
    - "Every @SerializedName annotation in Android rideshare models matches the exact JSON key the backend returns"
    - "customerSubmitFareOffer uses @Query('proposed_fare') not @Body"
    - "customerAcceptDriverFare has @Query('accepted_fare') parameter"
    - "RideRequest sends pickup_latitude/pickup_longitude/dropoff_latitude/dropoff_longitude (not pickup_lat/pickup_lng)"
    - "deleteRecurringRide calls /api/rides/recurring-rides/{id} (not /api/rides/recurring/{id})"
    - "All rideshare API calls include Authorization header"
  artifacts:
    - path: ".planning/quick/19-recheck-android-customer-rideshare-api-f/RECHECK_REPORT.md"
      provides: "Line-by-line PASS/FAIL verification of every quick-17 fix against actual backend code"
      contains: "PASS|FAIL"
  key_links:
    - from: "DollorApiService.kt:customerSubmitFareOffer"
      to: "main_new.py:14723"
      via: "@Query('proposed_fare') matching FastAPI Query(default=0.0)"
      pattern: "Query.*proposed_fare"
    - from: "DollorApiService.kt:customerAcceptDriverFare"
      to: "main_new.py:14764"
      via: "@Query('accepted_fare') matching FastAPI Query(default=0.0)"
      pattern: "Query.*accepted_fare"
    - from: "ApiModels.kt:RideRequest"
      to: "bid_routes.py:CreateRideRequestInput"
      via: "@SerializedName field names matching Pydantic model fields"
      pattern: "pickup_latitude.*pickup_longitude.*dropoff_latitude.*dropoff_longitude"
    - from: "CustomerRideshareApiService.kt:deleteRecurringRide"
      to: "bid_routes.py:recurring-rides/{ride_id}"
      via: "URL path matching backend route"
      pattern: "recurring-rides"
---

<objective>
Deep cross-reference verification of all 12 Android rideshare API fixes from quick-17, plus the known unfixed recurring-rides path bug.

Purpose: Quick-17 fixed 12 mismatches between Android Retrofit/OkHttp models and the backend. This task reads the ACTUAL current source files (post-fix) and verifies every fix against the backend code line-by-line. If any fix is missing, wrong, or incomplete, apply the correction immediately.

Output: RECHECK_REPORT.md with PASS/FAIL per item, plus any code fixes if issues are found.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/17-audit-and-fix-android-customer-rideshare/17-SUMMARY.md
@.planning/quick/17-audit-and-fix-android-customer-rideshare/AUDIT_REPORT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Deep cross-reference verification of all 12 fixes + recurring-rides bug</name>
  <files>
    .planning/quick/19-recheck-android-customer-rideshare-api-f/RECHECK_REPORT.md
  </files>
  <action>
Read ALL 5 source files in full:
- `/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt`
- `/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/ApiModels.kt`
- `/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt`
- `/Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/bid_routes.py`
- `/Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/main_new.py` (read lines around 14723-14800 for negotiate endpoints, 15168 for tracking, 19320-19380 for estimate)

For EACH of the 12 fixes from quick-17, perform this verification:

**Fix 1: customerSubmitFareOffer @Query**
- Read DollorApiService.kt, find `customerSubmitFareOffer` method
- Confirm it has `@Query("proposed_fare") proposedFare: Double` (not @Body)
- Read main_new.py around line 14723-14730, confirm backend has `proposed_fare: float = Query(default=0.0)`
- Record: PASS if @Query matches, FAIL if still @Body or wrong param name

**Fix 2: customerAcceptDriverFare @Query**
- Read DollorApiService.kt, find `customerAcceptDriverFare` method
- Confirm it has `@Query("accepted_fare") acceptedFare: Double`
- Read main_new.py around line 14764-14770, confirm backend has `accepted_fare: float = Query(default=0.0)`
- Record: PASS/FAIL

**Fix 3: RideRequest coordinate fields**
- Read ApiModels.kt, find `RideRequest` data class
- Confirm `@SerializedName("pickup_latitude")`, `@SerializedName("pickup_longitude")`, `@SerializedName("dropoff_latitude")`, `@SerializedName("dropoff_longitude")`
- Read bid_routes.py around line 72-80, find `CreateRideRequestInput` Pydantic model fields
- Confirm field names match exactly
- Record: PASS/FAIL

**Fix 4: RideRequest new fields**
- Confirm RideRequest has `ride_type` and `bidding_duration_minutes` fields with correct @SerializedName
- Cross-ref bid_routes.py CreateRideRequestInput for these fields
- Record: PASS/FAIL

**Fix 5: RideResponse shape**
- Read ApiModels.kt, find `RideResponse` data class
- Confirm it has `success: Boolean`, `ride_request_id: Int?`, `ride_request: Any?` (or RideRequestDetail?)
- Read bid_routes.py around line 300-320 (create_ride_request return statement)
- Confirm response JSON shape matches: `{"success": true, "message": "...", "ride_request_id": N, "ride_request": {...}}`
- Record: PASS/FAIL

**Fix 6: RideTrackingResponse shape**
- Read ApiModels.kt, find `RideTrackingResponse` data class
- Confirm `ride_request_id` (not `ride_id`), `eta_minutes` (not `eta`), has `driver_location`, `pickup`, `dropoff`, `final_price`
- Read main_new.py around line 15168 for the track endpoint response
- Record: PASS/FAIL

**Fix 7: DriverLocation field names**
- Read ApiModels.kt, find `DriverLocation` data class
- Confirm `@SerializedName("latitude")` and `@SerializedName("longitude")` (not `lat`/`lng`)
- Cross-ref the tracking response in main_new.py to verify backend returns `latitude`/`longitude`
- Record: PASS/FAIL

**Fix 8: RideEstimateResponse shape**
- Read ApiModels.kt, find `RideEstimateResponse` data class
- Confirm fields: `fare_estimate`, `total_fare`, `distance_miles`, `duration_minutes`, `base_fare`, `distance_fee`, `time_fee`
- Read main_new.py around line 19360 for the actual response dict
- Confirm field names match EXACTLY
- Record: PASS/FAIL

**Fix 9: FareBreakdown field names**
- Read ApiModels.kt, find `FareBreakdown` data class
- Confirm updated field names: `base_fare`, `distance_cost`/`distance_fee`, `time_cost`/`time_fee`
- Cross-ref both bid_routes.py estimate (if wrapped) and main_new.py:19360 (if flat)
- Record: PASS/FAIL

**Fix 10: FareNegotiationResponse shape**
- Read ApiModels.kt, find `FareNegotiationResponse` data class
- Confirm it has `success`, `status`, `customer_offer`, `driver_offer`, `platform_fee_driver`, `platform_fee_customer`, `message`
- Read main_new.py around line 14723-14760 for negotiate endpoint response dict
- Confirm all fields match
- Record: PASS/FAIL

**Fix 11: CustomerFareOfferRequest deprecated**
- Read ApiModels.kt, find `CustomerFareOfferRequest`
- Confirm it exists but is marked @Deprecated
- Record: PASS/FAIL

**Fix 12: Backward-compatible aliases**
- Confirm computed property aliases exist for: `rideId`, `lat`/`lng`, `estimatedFare`, `estimatedTime`, `negotiationStatus`, `isAccepted`, `base`, `distance`
- Record: PASS/FAIL

**BONUS CHECK 13: deleteRecurringRide path (KNOWN BUG)**
- Read CustomerRideshareApiService.kt, find `deleteRecurringRide` method
- Check if it calls `/api/rides/recurring/{id}` (WRONG) or `/api/rides/recurring-rides/{id}` (CORRECT)
- Read bid_routes.py around line 2916: confirm backend route is `@router.delete("/recurring-rides/{ride_id}")`
- Record: PASS/FAIL — if FAIL, note exact line and needed fix

**BONUS CHECK 14: Auth headers on all rideshare calls**
- Scan CustomerRideshareApiService.kt for any rideshare API call that does NOT include an Authorization header
- Record: PASS (all have auth) / FAIL (list methods missing auth)

Write RECHECK_REPORT.md in `.planning/quick/19-recheck-android-customer-rideshare-api-f/` with:
- Table: Item #, Description, Android File:Line, Backend File:Line, Status (PASS/FAIL), Details
- Summary: X/14 PASS, Y/14 FAIL
- For each FAIL: exact issue description, affected file, line numbers, what the fix should be
  </action>
  <verify>
RECHECK_REPORT.md exists and contains PASS/FAIL for all 14 checks. Run:
`grep -c "PASS\|FAIL" .planning/quick/19-recheck-android-customer-rideshare-api-f/RECHECK_REPORT.md`
Should return >= 14 lines with status markers.
  </verify>
  <done>
Every quick-17 fix has been verified against actual current source code with line-number references. All discrepancies documented. RECHECK_REPORT.md contains 14 items with PASS/FAIL status.
  </done>
</task>

<task type="auto">
  <name>Task 2: Apply fixes for any FAIL items found in recheck + rebuild</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/ApiModels.kt
  </files>
  <action>
**CONDITIONAL: Only execute if Task 1 found any FAIL items.**

For each FAIL item from the RECHECK_REPORT:

1. Open the affected Android file
2. Apply the minimal fix (change field name, add @SerializedName, fix URL path, etc.)
3. Preserve backward-compatible aliases if they exist (do NOT remove `val rideId get() = ...` style properties)

**Specifically for the deleteRecurringRide bug (if FAIL):**
- In CustomerRideshareApiService.kt, find the `deleteRecurringRide` method
- Change the URL from `/api/rides/recurring/$rideId` to `/api/rides/recurring-rides/$rideId`
- This is the path the backend expects at bid_routes.py:2916

**After all fixes:**
- Run `cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew assembleDebug` to verify all 4 modules compile
- If build fails, fix compilation errors (likely caused by changed field names — update callers)

**If Task 1 found 0 FAIL items:**
- Skip this task entirely
- Note in RECHECK_REPORT.md: "All 14 checks PASS. No fixes needed."
  </action>
  <verify>
If fixes were applied:
  `cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew assembleDebug 2>&1 | tail -5`
  Should show BUILD SUCCESSFUL for all modules.

If no fixes needed:
  RECHECK_REPORT.md states "All checks PASS" — no build required.
  </verify>
  <done>
All FAIL items from the recheck are corrected. Android project compiles cleanly. RECHECK_REPORT.md updated with final status showing all items PASS (either originally or after fix).
  </done>
</task>

</tasks>

<verification>
- RECHECK_REPORT.md has 14 items, each with PASS/FAIL status and file:line references
- Every FAIL item has been fixed (or there were zero FAILs)
- Android project compiles with `./gradlew assembleDebug` if any changes were made
- The recurring-rides path bug (item 13) is explicitly verified
</verification>

<success_criteria>
- 14/14 items verified with line-by-line cross-reference
- 0 remaining FAIL items (all fixed or all were already PASS)
- RECHECK_REPORT.md serves as auditable proof of verification
</success_criteria>

<output>
After completion, create `.planning/quick/19-recheck-android-customer-rideshare-api-f/19-SUMMARY.md`
</output>
