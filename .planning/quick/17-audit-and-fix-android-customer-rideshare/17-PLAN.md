---
phase: quick-17
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/ApiModels.kt
  - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt
  - /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt
autonomous: true
requirements: [QUICK-17]

must_haves:
  truths:
    - "Every Android customer rideshare API path matches a real backend route in bid_routes.py or main_new.py"
    - "DollorApiService Retrofit negotiate/accept-fare endpoints send proposed_fare/accepted_fare as query params (not body), matching backend Query() signature"
    - "DollorApiService RideRequest model uses pickup_latitude/pickup_longitude/dropoff_latitude/dropoff_longitude field names matching backend schema"
    - "All Android Gson response models have @SerializedName for every snake_case field returned by backend"
    - "Android customer app compiles successfully after all fixes"
  artifacts:
    - path: "/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt"
      provides: "Retrofit rideshare API definitions with correct paths, query params, and auth"
    - path: "/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/ApiModels.kt"
      provides: "Corrected Gson models matching backend JSON response shapes"
    - path: "/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt"
      provides: "OkHttp rideshare API client with verified paths and field names"
  key_links:
    - from: "DollorApiService.kt customerSubmitFareOffer"
      to: "main_new.py:14726 customer_negotiate_ios_alias"
      via: "@Query proposed_fare"
      pattern: "Query.*proposed_fare"
    - from: "DollorApiService.kt customerAcceptDriverFare"
      to: "main_new.py:14765 customer_accept_fare_ios_alias"
      via: "@Query accepted_fare"
      pattern: "Query.*accepted_fare"
    - from: "ApiModels.kt RideRequest"
      to: "bid_routes.py:300 create_ride_request"
      via: "field names pickup_latitude etc"
      pattern: "pickup_latitude.*pickup_longitude"
---

<objective>
Audit and fix Android Customer rideshare flow APIs for full parity with iOS P2PAPIService and backend bid_routes.py/main_new.py.

Purpose: The Android customer rideshare has TWO API layers (CustomerRideshareApiService via OkHttp, DollorApiService via Retrofit) that must both correctly match backend route paths, query parameter signatures, and JSON response shapes. Mismatches cause silent failures (Gson returns null/default) or 422 errors.

Output: Corrected Android API files with verified parity. Audit report documenting every finding.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/CLAUDE.md

Source files to audit:
@/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt
@/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt
@/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/ApiModels.kt
@/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/rideshare/RideshareModels.kt

Reference (iOS):
@/Users/jeet/doordash-p2p/apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift

Backend (source of truth):
@/Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/bid_routes.py (router prefix: /api/rides)
@/Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/main_new.py (ride endpoints at lines 3664+, 6537+, 14534+, 15168+, 19320+)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Audit all Android customer rideshare APIs against backend routes</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/ApiModels.kt
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/rideshare/RideshareModels.kt
  </files>
  <action>
Read ALL source files listed above. For EVERY API call in CustomerRideshareApiService.kt and every rideshare-related Retrofit method in DollorApiService.kt, verify against the backend using grep:

```bash
grep -n "path/segment" apps/web/p2p-platform/backend/bid_routes.py apps/web/p2p-platform/backend/main_new.py
```

For each API call, check:
1. **Path**: Does the Android path resolve to a real backend route? (Account for bid_routes prefix `/api/rides` and Retrofit baseUrl `https://api.dollor.ai/api/`)
2. **Method**: GET/POST/PUT/DELETE match?
3. **Query params vs body**: Backend uses `Query()` vs Pydantic body -- Android must match
4. **Request field names**: @SerializedName values match backend's expected field names?
5. **Response field names**: All snake_case backend fields have matching @SerializedName in Android models?
6. **Auth**: All authenticated endpoints have auth header?

Known issues to verify/confirm:
- DollorApiService.customerSubmitFareOffer sends body (`CustomerFareOfferRequest` with `offered_fare`) but backend expects `proposed_fare` as Query param
- DollorApiService.customerAcceptDriverFare has no way to pass `accepted_fare` -- backend expects it as Query param
- DollorApiService.RideRequest model uses `pickup_lat`/`pickup_lng` but backend expects `pickup_latitude`/`pickup_longitude`
- DollorApiService.RideResponse fields may not match backend create-ride response shape
- DollorApiService.RideEstimateResponse fields may not match backend fare estimate response
- DollorApiService.RideTrackingResponse field names may differ from backend tracking response
- DollorApiService.FareNegotiationResponse has `ride_id`, `negotiation_status`, `is_accepted` -- backend returns `success`, `status`, no `ride_id`/`is_accepted`

Produce a structured audit report listing:
- MATCH: Endpoints that are correct
- MISMATCH: Endpoints with issues, specifying exactly what is wrong
- MISSING: Endpoints present in iOS/backend but absent from Android

Write audit report to: `/Users/jeet/doordash-p2p/.planning/quick/17-audit-and-fix-android-customer-rideshare/AUDIT_REPORT.md`
  </action>
  <verify>
Audit report file exists at `.planning/quick/17-audit-and-fix-android-customer-rideshare/AUDIT_REPORT.md` and contains a table of every Android rideshare API call with MATCH/MISMATCH/MISSING status.
  </verify>
  <done>
Every Android customer rideshare API call (both OkHttp and Retrofit) has been compared against backend routes with grep verification. Audit report documents all findings with specific file:line references.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix all mismatches found in audit</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/ApiModels.kt
    /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt
  </files>
  <action>
Apply fixes for all MISMATCH items from audit report. Pre-identified fixes (verify each during audit before applying):

**DollorApiService.kt fixes:**

1. **customerSubmitFareOffer** -- Change from `@Body request: CustomerFareOfferRequest` to `@Query("proposed_fare") proposedFare: Double`. Backend at main_new.py:14728 uses `proposed_fare: float = Query(default=0.0)`. Remove `CustomerFareOfferRequest` body param.

2. **customerAcceptDriverFare** -- Add `@Query("accepted_fare") acceptedFare: Double` parameter. Backend at main_new.py:14767 uses `accepted_fare: float = Query(default=0.0)`.

3. **trackRide** -- Verify current path `rides/{rideId}/track` resolves to `/api/rides/{rideId}/track` which exists at main_new.py:15168. If both paths work, keep as-is. (Backend has both `/api/rides/{id}/track` and `/api/erp/rides/{id}/track`.)

**ApiModels.kt fixes:**

4. **RideRequest model** -- Change `pickup_lat`/`pickup_lng`/`dropoff_lat`/`dropoff_lng` to `pickup_latitude`/`pickup_longitude`/`dropoff_latitude`/`dropoff_longitude`. Backend bid_routes.py:300 `create_ride_request` expects these full names. Also add `ride_type`, `bidding_duration_minutes`, `customer_name`, `customer_phone`, `special_requests`, `customer_preferred_price` fields to match what CustomerRideshareApiService (OkHttp) already sends. This makes Retrofit parity with OkHttp.

5. **RideResponse model** -- Backend create-ride response returns `{"success": true, "message": "...", "ride_request_id": N, "ride_request": {...}}`. Current model expects `ride_id`, `status`, `estimated_fare` -- none match. Fix to match `CreateRideResponse` shape in RideshareModels.kt or create alias.

6. **RideEstimateResponse model** -- Backend (bid_routes.py:2092) returns `{"success": true, "estimate": {"distance_miles": ..., "duration_minutes": ..., "breakdown": {...}, "total": ..., "platform_fee": ...}}`. Current model expects flat `distance_miles`, `estimated_fare`, `estimated_time`. Fix to match wrapped response.

7. **RideTrackingResponse model** -- Backend (main_new.py:15168) returns different shape. Check actual fields and fix @SerializedName annotations. Key fields: `ride_request_id`, `status`, `driver`, `driver_location`, `eta_minutes`, `pickup`, `dropoff`, `final_price`.

8. **FareNegotiationResponse model** -- Backend returns `{"success": true, "status": "counter_offer_sent", "customer_offer": ..., "driver_offer": ..., "platform_fee_driver": ..., "platform_fee_customer": ..., "message": "..."}`. Current model has `ride_id`, `negotiation_status`, `current_fare`, `platform_suggested_fare`, `is_accepted` which DO NOT match. Fix to match actual backend response.

9. **CustomerFareOfferRequest model** -- If keeping, rename `offered_fare` to `proposed_fare` to match backend field name. But since endpoint now uses @Query, this model may become unused. Add @Deprecated or remove.

**CustomerRideshareApiService.kt fixes (verify during audit):**

10. The OkHttp service was already fixed in Feb 17. Verify each path still matches after any backend changes. Fix anything found in audit.

**Important rules:**
- NEVER invent endpoints -- grep verify every path before fixing
- Use @SerializedName for ALL multi-word JSON fields
- Keep backward compatibility where possible (default values on new fields)
- Do NOT change files outside the 3 listed files
  </action>
  <verify>
Run Android customer debug build to verify compilation:
```bash
cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :app:compileDebugKotlin 2>&1 | tail -20
```
Build must succeed with 0 errors.
  </verify>
  <done>
All MISMATCH items from audit report are fixed. DollorApiService negotiate endpoints use @Query params. RideRequest/RideResponse/RideEstimateResponse/RideTrackingResponse/FareNegotiationResponse models match backend JSON shapes. Android customer module compiles successfully.
  </done>
</task>

<task type="auto">
  <name>Task 3: Full build verification and summary</name>
  <files>
    /Users/jeet/doordash-p2p/.planning/quick/17-audit-and-fix-android-customer-rideshare/17-SUMMARY.md
  </files>
  <action>
1. Run full Android debug build for ALL modules to ensure no cross-module breakage:
```bash
cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew assembleDebug 2>&1 | tail -30
```

2. If build fails, fix any compilation errors introduced by Task 2 changes (likely callers of modified Retrofit methods that need parameter updates).

3. Search for callers of modified methods to ensure they pass correct params:
```bash
grep -rn "customerSubmitFareOffer\|customerAcceptDriverFare\|requestRide\|estimateRideFare\|trackRide" /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ --include="*.kt"
```
Fix any call sites that now have wrong signatures.

4. Create summary documenting all changes made, organized as:
   - Total APIs audited
   - Matches found
   - Mismatches fixed (with before/after)
   - Any remaining issues or deferred items
  </action>
  <verify>
Full `./gradlew assembleDebug` passes for all 3 modules (app, driver, partner). Summary file exists.
  </verify>
  <done>
All 3 Android modules build successfully. No regressions introduced. Summary documents every change with before/after values.
  </done>
</task>

</tasks>

<verification>
1. Audit report covers every API call in CustomerRideshareApiService.kt (~20 methods) and every rideshare method in DollorApiService.kt (~10 methods)
2. Every MISMATCH in audit report has a corresponding fix
3. All 3 Android modules compile: `./gradlew assembleDebug` passes
4. No new @SerializedName mismatches introduced
5. Backend endpoint paths verified with grep (no invented endpoints)
</verification>

<success_criteria>
- Audit report at `.planning/quick/17-audit-and-fix-android-customer-rideshare/AUDIT_REPORT.md` with MATCH/MISMATCH/MISSING for every API
- DollorApiService negotiate endpoints use @Query params matching backend Query() signatures
- RideRequest model field names match backend schema (pickup_latitude, not pickup_lat)
- Response models match backend JSON shapes (FareNegotiationResponse, RideEstimateResponse, etc.)
- `./gradlew assembleDebug` succeeds for all modules
- Summary at `.planning/quick/17-audit-and-fix-android-customer-rideshare/17-SUMMARY.md`
</success_criteria>

<output>
After completion, create `.planning/quick/17-audit-and-fix-android-customer-rideshare/17-SUMMARY.md`
</output>
