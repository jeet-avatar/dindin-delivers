---
phase: quick-60
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
  - apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrderDetailsScreen.kt
autonomous: true
requirements: [QUICK-60]

must_haves:
  truths:
    - "When delivery decision window expires, restaurant sees 'Delivery decision window expired. Order sent to drivers.' not a generic error"
    - "When order is in wrong status, restaurant sees 'Cannot accept delivery for order in X status' not a generic error"
    - "Both accept and decline buttons show real backend error messages"
    - "Both iOS and Android apps show the same backend-provided error messages"
  artifacts:
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift"
      provides: "Error body parsing for restaurantAcceptDelivery and restaurantDeclineDelivery"
      contains: "P2PErrorResponse"
    - path: "apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift"
      provides: "Direct display of parsed server error messages"
    - path: "/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrderDetailsScreen.kt"
      provides: "Clean error display without redundant prefixes"
  key_links:
    - from: "P2PAPIService.swift:restaurantAcceptDelivery"
      to: "Backend 400 response body"
      via: "JSONDecoder P2PErrorResponse parsing"
      pattern: "P2PErrorResponse.*detail"
    - from: "OrdersViewModel.swift:acceptDelivery"
      to: "P2PAPIService error"
      via: "error.localizedDescription shows backend detail"
      pattern: "serverError.*detail"
---

<objective>
Fix delivery button error handling in iOS and Android restaurant apps so that backend error messages (e.g., "Delivery decision window expired", "Cannot accept delivery for order in X status") are shown to the user instead of generic fallback messages.

Purpose: When a restaurant taps "I'll Deliver" or "Send to Driver Pool" and the backend rejects with a 400 error, the app currently shows a generic "Failed to accept delivery" message. The backend returns specific, actionable error text in `{"detail": "..."}` that should be surfaced.

Output: Updated iOS P2PAPIService + OrdersViewModel, updated Android OrderDetailsScreen
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift (lines 430-458 for correct error parsing pattern; lines 3342-3408 for methods to fix; line 7781 for P2PErrorResponse struct)
@apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift (lines 389-455 for acceptDelivery and declineDelivery)
@/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrderDetailsScreen.kt (lines 725-782 for acceptDelivery and declineDelivery)
@apps/web/p2p-platform/backend/order_flow.py (lines 1740-1883 for backend error responses — DO NOT MODIFY)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix iOS error body parsing in P2PAPIService + simplify OrdersViewModel error display</name>
  <files>
    apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift
  </files>
  <action>
**P2PAPIService.swift — Fix `restaurantAcceptDelivery` (lines 3360-3373):**

Replace the simple status check block with the same pattern used by `deleteVendorMenu` (line 440-458). Currently the code is:
```swift
if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
    completion(.success(true))
} else {
    completion(.failure(P2PAPIError.serverError("Failed to accept delivery")))
}
```

Replace with:
```swift
if let httpResponse = response as? HTTPURLResponse {
    if httpResponse.statusCode == 200 {
        completion(.success(true))
    } else if httpResponse.statusCode >= 400 {
        if let data = data,
           let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
            completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
        } else {
            completion(.failure(P2PAPIError.serverError("Failed to accept delivery")))
        }
    } else {
        completion(.success(true))
    }
} else {
    completion(.failure(P2PAPIError.serverError("Invalid response")))
}
```

**P2PAPIService.swift — Fix `restaurantDeclineDelivery` (lines 3394-3407):**

Apply the exact same pattern. Replace:
```swift
if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
    completion(.success(true))
} else {
    completion(.failure(P2PAPIError.serverError("Failed to send to driver pool")))
}
```

With the same error-parsing block (keeping "Failed to send to driver pool" as the fallback when body can't be parsed).

**OrdersViewModel.swift — Simplify `acceptDelivery` error handler (lines 410-419):**

The current code tries to pattern-match on `error.localizedDescription` with string checks for "expired", "timeout", "window", "already", "assigned". This is fragile and was only needed because the real backend message was never passed through. Now that P2PAPIService parses the actual backend `detail` message, the ViewModel should just display it directly.

Replace the failure case in `acceptDelivery` (lines 410-419) with:
```swift
case .failure(let error):
    self?.errorMessage = error.localizedDescription
    self?.showError = true
```

**OrdersViewModel.swift — Simplify `declineDelivery` error handler (lines 446-453):**

Same simplification. Replace the failure case with:
```swift
case .failure(let error):
    self?.errorMessage = error.localizedDescription
    self?.showError = true
```

Note: `P2PAPIError.serverError(message)` produces `localizedDescription` that returns the message string. This was verified by the `deleteVendorMenu` pattern which relies on the same flow.
  </action>
  <verify>
Build iOS restaurant app to confirm no compile errors:
```bash
cd /Users/jeet/doordash-p2p && xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
```
Grep to confirm P2PErrorResponse is used in both methods:
```bash
grep -A5 "restaurantAcceptDelivery\|restaurantDeclineDelivery" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift | grep "P2PErrorResponse"
```
  </verify>
  <done>
Both `restaurantAcceptDelivery` and `restaurantDeclineDelivery` in P2PAPIService.swift parse the response body for `{"detail": "..."}` on non-200 responses. OrdersViewModel displays the parsed backend message directly without fragile string pattern matching.
  </done>
</task>

<task type="auto">
  <name>Task 2: Clean up Android error display in OrderDetailsScreen to show backend message directly</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrderDetailsScreen.kt
  </files>
  <action>
**Context:** The Android `safeApiCall` in `DollorRepository.kt` (lines 77-83) ALREADY parses the backend error body `{"detail": "..."}` and passes it as the `Exception.message`. So when the backend returns `400: {"detail": "Delivery decision window expired. Order sent to drivers."}`, the `error.message` in the fold's `onFailure` is already "Delivery decision window expired. Order sent to drivers." -- no repository changes needed.

**OrderDetailsScreen.kt — Fix `acceptDelivery` (lines 737-741):**

Currently shows: `"Failed to accept delivery: ${error.message}"` which produces redundant output like "Failed to accept delivery: Delivery decision window expired. Order sent to drivers."

Change to show the backend message directly:
```kotlin
onFailure = { error ->
    Log.e(TAG, "Failed to accept delivery: ${error.message}")
    _uiState.value = _uiState.value.copy(
        error = error.message ?: "Failed to accept delivery. Please try again."
    )
}
```

Also update the catch block (lines 744-748) the same way:
```kotlin
} catch (e: Exception) {
    Log.e(TAG, "Failed to accept delivery: ${e.message}")
    _uiState.value = _uiState.value.copy(
        error = e.message ?: "Failed to accept delivery. Please try again."
    )
}
```

**OrderDetailsScreen.kt — Fix `declineDelivery` (lines 768-772):**

Same pattern. Change:
```kotlin
onFailure = { error ->
    Log.e(TAG, "Failed to send to driver pool: ${error.message}")
    _uiState.value = _uiState.value.copy(
        error = error.message ?: "Failed to send to driver pool. Please try again."
    )
}
```

Also update the catch block (lines 775-779):
```kotlin
} catch (e: Exception) {
    Log.e(TAG, "Failed to send to driver pool: ${e.message}")
    _uiState.value = _uiState.value.copy(
        error = e.message ?: "Failed to send to driver pool. Please try again."
    )
}
```

The log messages keep the prefix for debugging context, but the user-facing `error` field shows only the backend message. The null-coalescing `?:` fallback handles the rare case where `message` is null.
  </action>
  <verify>
Build Android partner app to confirm no compile errors:
```bash
cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :partner:compileDebugKotlin 2>&1 | tail -5
```
Grep to confirm no more redundant prefix pattern:
```bash
grep -n "Failed to accept delivery:" /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrderDetailsScreen.kt
```
Should only appear in Log.e lines, not in error state assignment.
  </verify>
  <done>
Android `acceptDelivery` and `declineDelivery` in OrderDetailsScreen show the backend-parsed error message directly (e.g., "Delivery decision window expired. Order sent to drivers.") instead of prepending a redundant "Failed to accept delivery:" prefix. Log lines retain the prefix for debug context.
  </done>
</task>

</tasks>

<verification>
1. iOS restaurant app builds without errors
2. Android partner app builds without errors
3. P2PAPIService.swift uses P2PErrorResponse parsing in both delivery decision methods
4. OrdersViewModel.swift no longer has fragile string pattern matching on error messages
5. Android OrderDetailsScreen.kt shows error.message directly without prefix
</verification>

<success_criteria>
- Backend error "Delivery decision window expired. Order sent to drivers." surfaces verbatim in both iOS and Android restaurant apps
- Backend error "Cannot accept delivery for order in X status" surfaces verbatim in both apps
- Generic fallback messages only appear when the response body cannot be parsed
- No compile errors in either platform
</success_criteria>

<output>
After completion, create `.planning/quick/60-fix-delivery-button-error-handling-in-io/60-SUMMARY.md`
</output>
