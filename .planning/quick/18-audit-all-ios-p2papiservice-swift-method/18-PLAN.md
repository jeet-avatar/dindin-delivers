---
phase: quick-18
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
autonomous: true
requirements: [QUICK-18]

must_haves:
  truths:
    - "Every method calling a non-public endpoint sends Authorization: Bearer header"
    - "FCM token save works for all 3 apps (customer, driver, vendor) after global auth middleware"
    - "Driver location updates and online status changes do not 401"
    - "Order tracking and driver location queries work for customers"
    - "Delivery decision flow works for restaurant app"
    - "KOT print and menu verification endpoints work for restaurant app"
  artifacts:
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift"
      provides: "All API methods with proper auth headers"
      contains: "Bearer.*token.*Authorization"
  key_links:
    - from: "P2PAPIService.swift (each method)"
      to: "Backend require_auth_middleware"
      via: "Authorization: Bearer header"
      pattern: "setValue.*Bearer.*forHTTPHeaderField.*Authorization"
---

<objective>
Add missing Authorization: Bearer headers to 18 methods in P2PAPIService.swift that call protected backend endpoints but currently send no auth token.

Purpose: After Phase 02 deployed global auth middleware (`require_auth_middleware` at main_new.py:367), ANY request to a non-public endpoint without a Bearer token gets 401. This audit found 18 methods (out of 44 without auth) that hit protected endpoints. The other 26 are legitimately public (login, register, password reset, public browsing, fare estimates, surge status, promo apply).

Output: Updated P2PAPIService.swift with all 18 methods fixed. All 3 iOS apps will function correctly against the auth-protected backend.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
@apps/web/p2p-platform/backend/main_new.py (lines 257-374 for public path allowlists)
@apps/web/p2p-platform/backend/auth_utils.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add auth headers to all 18 unprotected methods</name>
  <files>apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift</files>
  <action>
Add the appropriate `if let token = {role}Token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }` pattern to each of the 18 methods listed below. Use the correct token type for each method based on which app/role uses it.

IMPORTANT: Methods using plain `URLSession.shared.dataTask(with: url)` (GET without URLRequest) must be converted to use `URLRequest(url:)` first, so the auth header can be set. The pattern is:
```swift
var request = URLRequest(url: url)
request.httpMethod = "GET"
if let token = customerToken {
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
}
URLSession.shared.dataTask(with: request) { ... }
```

Here are the 18 methods to fix, grouped by token type:

**vendorToken (10 methods):**

1. Line 1002 - `assignStockImages(vendorId:)` - POST `/api/vendors/{id}/menu/assign-stock-images`
   - Already has `var request = URLRequest(url: url)`. Add auth after `request.httpMethod = "POST"`:
   ```swift
   if let token = vendorToken {
       request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
   }
   ```

2. Line 1041 - `getVerificationStatus(vendorId:)` - GET `/api/menu-verification/status/{id}`
   - Uses `URLSession.shared.dataTask(with: url)`. Convert to URLRequest pattern and add vendorToken auth.

3. Line 1075 - `approveAllPrices(vendorId:)` - POST `/api/menu-verification/approve-all/{id}`
   - Already has `var request = URLRequest(url: url)`. Add vendorToken auth after httpMethod.

4. Line 10719 - `saveVendorFCMToken(vendorId:token:)` - POST `/api/erp/vendors/{id}/fcm-token`
   - Already has `var request = URLRequest(url: url)`. Add vendorToken auth after Content-Type header.

5. Line 10908 - `getRealtimeAnalytics()` - GET `/api/erp/analytics/realtime`
   - Uses `URLSession.shared.dataTask(with: url)`. Convert to URLRequest. Use `vendorToken ?? customerToken` since this could be called from admin context.

6. Line 10940 - `getAIEmployeeStats()` - GET `/api/erp/analytics/ai-employees`
   - Already has TODO noting this. Uses `URLSession.shared.dataTask(with: url)`. Convert to URLRequest. Use `vendorToken ?? customerToken`.

7. Line 13391 - `startDeliveryDecision(orderId:)` - POST `/api/erp/orders/{id}/start-delivery-decision`
   - Already has `var request = URLRequest(url: url)`. Add vendorToken auth after Content-Type header.

8. Line 13431 - `makeDeliveryDecision(orderId:willDeliver:delivererName:)` - POST `/api/erp/orders/{id}/restaurant-delivery-decision`
   - Already has `var request = URLRequest(url: url)`. Add vendorToken auth after Content-Type header.

9. Line 13475 - `getDeliveryDecisionStatus(orderId:)` - GET `/api/erp/orders/{id}/delivery-decision-status`
   - Already has `var request = URLRequest(url: url)`. Add vendorToken auth after Content-Type header.

10. Line 13511 - `getPendingDeliveryOrders(vendorId:)` - GET `/api/erp/orders/pending-restaurant-delivery`
    - Already has `var request = URLRequest(url: url)`. Add vendorToken auth after Content-Type header.

**driverToken (4 methods):**

11. Line 10689 - `saveDriverFCMToken(driverId:token:)` - POST `/api/erp/drivers/{id}/fcm-token`
    - Already has `var request = URLRequest(url: url)`. Add driverToken auth after Content-Type header.

12. Line 10751 - `updateDriverLocation(driverId:latitude:longitude:)` - PUT `/api/erp/drivers/{id}/location`
    - Already has `var request = URLRequest(url: url)`. Add driverToken auth after Content-Type header.

13. Line 10785 - `updateDriverOnlineStatus(driverId:isOnline:)` - PUT `/api/erp/drivers/{id}/status`
    - Already has `var request = URLRequest(url: url)`. Add driverToken auth after httpMethod.

14. Line 10811 - `saveDriverFCMToken(driverId:fcmToken:)` (duplicate, PUT method) - PUT `/api/erp/drivers/{id}/fcm-token`
    - Already has `var request = URLRequest(url: url)`. Add driverToken auth after Content-Type header.

**customerToken (2 methods):**

15. Line 10659 - `saveCustomerFCMToken(customerId:token:)` - POST `/api/erp/customers/{id}/fcm-token`
    - Already has `var request = URLRequest(url: url)`. Add customerToken auth after Content-Type header.

16. Line 10842 - `getFullOrderTracking(orderId:)` - GET `/api/erp/orders/{id}/full-tracking`
    - Uses `URLSession.shared.dataTask(with: url)`. Convert to URLRequest and add customerToken auth.

17. Line 10874 - `getDriverLocation(orderId:)` - GET `/api/erp/orders/{id}/driver-location`
    - Uses `URLSession.shared.dataTask(with: url)`. Convert to URLRequest and add customerToken auth.

**vendorToken for KOT (1 method):**

18. Line 13713 - `printKOT(orderId:)` - POST `/api/erp/orders/{id}/print-kot`
    - Already has `var request = URLRequest(url: url)`. Add vendorToken auth after Content-Type header.

ALSO: Remove the TODO comments on lines 10939 and 1001 that note the missing auth -- they will be fixed by this task.

DO NOT modify any of the 26 methods that correctly have no auth (they hit public endpoints):
- fetchRestaurants, fetchRestaurantDetail, fetchVendorProfile, fetchMenuItems (public browsing)
- All login/register/auth methods (public auth endpoints)
- All password reset methods (public reset flow)
- validatePromoCode (public promo apply)
- estimateRideFare, getSurgeStatus (public fare/surge info)
  </action>
  <verify>
1. `grep -c "forHTTPHeaderField.*Authorization" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` should return a count 18 higher than before (was ~139, should be ~157+)
2. Build all 3 iOS apps to confirm no compilation errors:
   ```
   xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatfaircustomer -configuration Staging -destination 'generic/platform=iOS' build
   xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairdelivery -configuration Staging -destination 'generic/platform=iOS' build
   xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Staging -destination 'generic/platform=iOS' build
   ```
3. Verify no public endpoint methods were accidentally modified:
   ```
   grep -A5 "func fetchRestaurants" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift | grep -c "Authorization"
   ```
   Should return 0 (fetchRestaurants is public, no auth needed).
  </verify>
  <done>
All 18 methods that call protected endpoints now include the Authorization: Bearer header with the correct token type. All 3 iOS apps compile successfully. Public endpoint methods remain untouched. FCM token registration, driver location updates, order tracking, delivery decisions, and KOT printing will no longer 401 against the auth-protected backend.
  </done>
</task>

</tasks>

<verification>
1. Count auth headers: `grep -c "forHTTPHeaderField.*Authorization"` should be ~157+ (was ~139)
2. All 3 iOS apps build with zero errors
3. No regressions in public endpoints (login/register/browse should still work without auth)
4. Spot-check: `grep -A10 "func saveCustomerFCMToken" P2PAPIService.swift` shows Bearer header
5. Spot-check: `grep -A10 "func updateDriverLocation" P2PAPIService.swift` (the one at ~line 10751) shows Bearer header
6. Spot-check: `grep -A10 "func startDeliveryDecision" P2PAPIService.swift` shows Bearer header
</verification>

<success_criteria>
- 18 methods now send Authorization: Bearer headers
- Correct token type per method (customerToken, driverToken, vendorToken)
- All 3 iOS apps build without errors
- Zero changes to public endpoint methods
</success_criteria>

<output>
After completion, create `.planning/quick/18-audit-all-ios-p2papiservice-swift-method/18-SUMMARY.md`
</output>
