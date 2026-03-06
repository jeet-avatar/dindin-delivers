# UI Audit Issue Tracker — Quick-103 Findings

**Date:** 2026-03-06
**Source:** Quick-103 UI Audit (3 reports across 6 apps, 153 screens, 441 handlers)
**Verified by:** Root cause analysis with grep against actual source code

---

## Audit Quality Note

The original audit reported 23 issues. **After root cause verification, 10 were false positives** — the auditors missed backend route aliases registered via `app.add_api_route()` at the bottom of `main_new.py` (lines 21300+). These aliases were added during v1.2 API Standardization (Phase 02) specifically for iOS/Android compatibility.

**Actual issues: 13 (5 WRONG_TARGET reclassified as FALSE_POSITIVE, 2 MISSING reclassified as FALSE_POSITIVE, 1 DEAD reclassified as FALSE_POSITIVE)**

---

## FALSE POSITIVES (10 — No Fix Needed)

| ID | Original | App | Why False Positive |
|----|----------|-----|--------------------|
| FP-1 | C5 WRONG_TARGET: `auth/customer/apple-auth` | Android Customer | Route alias exists at `main_new.py:21340`: `app.add_api_route("/api/auth/customer/apple-auth", ...)` |
| FP-2 | C6 WRONG_TARGET: `customer/{id}/profile` PUT | Android Customer | Route alias exists at `main_new.py:21325`: `app.add_api_route("/api/customer/{customer_id}/profile", ...)` |
| FP-3 | C7 WRONG_TARGET: `erp/rides/{id}/negotiation-status` | Android Customer | Endpoint exists at `main_new.py:14732`: `@app.get("/api/erp/rides/{ride_id}/negotiation-status")` |
| FP-4 | D1 WRONG_TARGET: GET `erp/drivers/{id}` | Android Driver | Route alias exists at `main_new.py:21332`: `app.add_api_route("/api/erp/drivers/{driver_id}", ..., methods=["GET"])` |
| FP-5 | D2 WRONG_TARGET: PUT `erp/drivers/{id}` | Android Driver | Route alias exists at `main_new.py:21335`: `app.add_api_route("/api/erp/drivers/{driver_id}", ..., methods=["PUT"])` |
| FP-6 | D3 MISSING: No delete account in Driver | Android Driver | Delete Account exists at `ProfileScreen.kt:778` with two-step confirmation dialog |
| FP-7 | DEAD-1: `TrackOrderMapView` not found | iOS Customer | `TrackOrderMapView` IS defined at `MapView.swift:32` — auditor searched wrong file name |
| FP-8 | MISSING-2: No `.refreshable` on FavoritesView | iOS Customer | `.refreshable` exists at `FavoritesView.swift:78` |
| FP-9 | P2 WRONG_TARGET: `getVendorOrdersAlt` duplicate | Android Partner | Harmless Retrofit overload, same endpoint, different response type — not broken |
| FP-10 | P3 WRONG_TARGET: Order status aliases fragile | Android Partner | Currently correct — `PATCH orders/{id}/status` with correct status values. Fragility is a code quality note, not a bug |

---

## REAL ISSUES (13)

### Wave 1 — Critical (API/Navigation Broken) — 1 issue

| ID | Severity | Platform | App | Category | File:Line |
|----|----------|----------|-----|----------|-----------|
| **BUG-01** | **HIGH** | Backend | All | SHADOW | `main_new.py:20273` |

#### BUG-01: `complete_delivery()` function shadows order_flow import

**Description:** A local function `complete_delivery()` at line 20273 redefines the name imported from `order_flow` at line 14277. The alias endpoint at line 14340 (`/erp/orders/{order_id}/complete-delivery`) calls `complete_delivery()` — which after Python's name resolution will call the **local** function (line 20273, `POST /api/v2/driver/deliveries/{delivery_id}/complete`) instead of the **imported** `order_flow.complete_delivery`.

**Root Cause:** Two different delivery-complete functions with the same name. The import at line 14277 is overshadowed by the function definition at line 20273 because Python resolves names at call time, not import time, in module scope.

**Impact:** The `/erp/orders/{order_id}/complete-delivery` alias endpoint may call the wrong function. However, since the alias uses `await complete_delivery(order_id, db)` and the local version at 20273 is sync (not async), FastAPI will handle both — but the logic path may differ (order_flow version handles full order lifecycle; local version is a simpler v2 endpoint).

**Fix:** Rename the local function at line 20273 to `complete_delivery_v2()` and update its route decorator. No consumer code changes needed since it's a decorated endpoint.

**Effort:** 5 min
**Files:** `main_new.py:20273`

---

### Wave 2 — Missing UX Handlers (Android) — 2 issues

| ID | Severity | Platform | App | Category | File:Line |
|----|----------|----------|-----|----------|-----------|
| **BUG-02** | **MEDIUM** | Android | Customer | MISSING | `NavigationGraph.kt:320` |
| **BUG-03** | **MEDIUM** | Android | Customer | MISSING | `NavigationGraph.kt:323` |

#### BUG-02: `onCallPartner` receives phone but no dialer Intent

**Description:** In `NavigationGraph.kt:320`, the `onCallPartner` lambda receives the partner's phone number as a string but the lambda body is empty — no `Intent(ACTION_DIAL)` is launched.

**Root Cause:** The `OrderTrackingScreen` composable declares `onCallPartner: (String) -> Unit` at line 92 and passes the phone through at line 232-234, but the NavGraph wiring at line 320 never creates the `Intent`. This was likely a TODO left during initial implementation.

**Impact:** Customer taps "Call Restaurant" during order tracking → nothing happens. Phone number is available but not used.

**Fix:**
```kotlin
onCallPartner = { phone ->
    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
    context.startActivity(intent)
}
```

**Effort:** 5 min
**Files:** `app/.../NavigationGraph.kt:320`

---

#### BUG-03: `onAddInstructions` empty lambda — no instruction dialog

**Description:** In `NavigationGraph.kt:323`, the `onAddInstructions` lambda is empty. The OrderTrackingScreen has a clickable "Add Instructions" area (line 483) but nothing happens on tap.

**Root Cause:** Delivery instructions feature was wired in the UI composable (`OrderTrackingScreen.kt:93`, `483`) but never connected to a dialog or API call in the NavGraph. The backend supports delivery instructions on order creation but not post-creation modification.

**Impact:** Customer taps "Add Instructions" during tracking → nothing happens. Low impact since instructions should be set at checkout, but confusing UX.

**Fix:** Either (a) show a dialog that calls a PATCH endpoint to update instructions, or (b) remove the clickable "Add Instructions" row from `OrderTrackingScreen` if post-checkout instruction editing isn't supported. Recommend option (b) — simpler, avoids building a new backend endpoint.

**Effort:** 10 min (option b: remove UI element) or 30 min (option a: add dialog + backend endpoint)
**Files:** `app/.../OrderTrackingScreen.kt:483` and `app/.../NavigationGraph.kt:323`

---

### Wave 3 — Missing UX (iOS) — 2 issues

| ID | Severity | Platform | App | Category | File:Line |
|----|----------|----------|-----|----------|-----------|
| **BUG-04** | **MEDIUM** | iOS | Customer | MISSING | `OrderHistoryView.swift` |
| **BUG-05** | **MEDIUM** | iOS | Customer | MISSING | `DeliveryTrackingView.swift` |

#### BUG-04: No pull-to-refresh on OrderHistoryView

**Description:** `OrderHistoryView.swift` loads orders on `.onAppear` but has no `.refreshable` modifier. Users cannot pull down to refresh the orders list.

**Root Cause:** The view was built before `.refreshable` was standard practice in the app. HomeView, FavoritesView, and AvailableOrdersView all have `.refreshable` but OrderHistoryView was missed.

**Impact:** Users must navigate away and back to see new orders. Medium impact — active orders update via polling, but completed order list goes stale.

**Fix:** Add `.refreshable { await viewModel.fetchOrders() }` to the List or ScrollView in OrderHistoryView.

**Effort:** 5 min
**Files:** `apps/ios/customer/eatfaircustomer/Views/OrderHistoryView.swift`

---

#### BUG-05: No "Chat" button on DeliveryTrackingView

**Description:** `DeliveryTrackingView.swift` shows the active delivery map and status but has no button to open `OrderChatView`. The chat feature (Phase 10) is only accessible from `OrderHistoryView` order details.

**Root Cause:** Phase 10 added `OrderChatView` and wired it into `OrderHistoryView` order cards, but the primary tracking view (`DeliveryTrackingView`) wasn't updated with a chat entry point. The tracking view was built before Phase 10.

**Impact:** During active delivery, chat is not discoverable. User has to navigate to Orders tab → find the order → open chat. Medium UX friction.

**Fix:** Add a "Chat with Driver" button (using `message.fill` SF Symbol) to the `DeliveryTrackingView` toolbar or action area, presenting `OrderChatView` as a sheet.

**Effort:** 15 min
**Files:** `apps/ios/customer/eatfaircustomer/Views/DeliveryTrackingView.swift`

---

### Wave 4 — Dead Code / No-ops (Low Priority) — 5 issues

| ID | Severity | Platform | App | Category | File:Line |
|----|----------|----------|-----|----------|-----------|
| **BUG-06** | **LOW** | iOS | Driver | DEAD | `ChatView.swift:54,83` |
| **BUG-07** | **LOW** | iOS | Restaurant | DEAD | `AIEmployeesView.swift` (all) |
| **BUG-08** | **LOW** | Android | Customer | DEAD | `MainScreen.kt:172` |
| **BUG-09** | **LOW** | Android | Customer | DEAD | `MainScreen.kt:173` |
| **BUG-10** | **LOW** | Android | Partner | DEAD | `PartnerNavGraph.kt:286` |

#### BUG-06: Driver ChatView uses Firebase ChatManager, not REST API

**Description:** `ChatView.swift` in the Driver app uses `ChatManager.shared` (Firebase/WebSocket) for send message and share location, while `OrderChatView.swift` (Phase 10) uses the correct REST endpoint (`/api/customer/orders/{id}/chat`).

**Root Cause:** Two chat implementations coexist. `ChatView` is the original Firebase-based chat from v1.0. `OrderChatView` was added in Phase 10 with proper REST integration. `ChatView` was retained for backward compatibility but its Firebase ChatManager has no backend connection.

**Impact:** If a driver navigates to the old `ChatView` (from `ConversationsListView`), messages send to Firebase but not to the P2P backend. The new `OrderChatView` works correctly. Low impact — the new flow is the primary path.

**Fix:** Either (a) remove `ChatView` and redirect to `OrderChatView`, or (b) mark `ChatView` as deprecated and hide the `ConversationsListView` entry point. Recommend (a).

**Effort:** 20 min
**Files:** `apps/ios/delivery/eatffairdelivery/Views/ChatView.swift`

---

#### BUG-07: AIEmployeesView entirely behind compile flag

**Description:** `AIEmployeesView.swift` in the Restaurant app is wrapped in `#if ENABLE_AI_EMPLOYEES`. Since this flag is not set, the entire view is dead code.

**Root Cause:** Intentional by design (Phase 10 decision). AI employee features are aspirational and hidden until the AI automation milestone.

**Impact:** None — working as intended. This is dead code BY DESIGN.

**Fix:** No fix needed. Keep as-is. Remove from issue tracking.

**Effort:** 0
**Files:** N/A — intentional

---

#### BUG-08: `onCategoryClick` empty lambda in Customer MainScreen

**Description:** `MainScreen.kt:172` passes `onCategoryClick = {}` to HomeScreen. When user taps a food category, nothing happens.

**Root Cause:** HomeScreen has a `CategoriesSection` composable (line 796) that renders category cards, but the main screen never wired the click to navigate anywhere (e.g., to SearchScreen with a category filter). The search screen has its own cuisine filter, but there's no programmatic way to pre-filter by category from HomeScreen.

**Impact:** Category cards on home screen are not interactive. Low impact — users can use the Search tab for filtering.

**Fix:** Wire `onCategoryClick` to navigate to Search tab with the category name as a pre-filled search term:
```kotlin
onCategoryClick = { category ->
    searchViewModel.searchByTerm(category.name)
    selectedTabIndex = 1  // Switch to Search tab
}
```

**Effort:** 10 min
**Files:** `app/.../MainScreen.kt:172`, `app/.../HomeScreen.kt:116`

---

#### BUG-09: `onFoodItemClick` empty lambda in Customer MainScreen

**Description:** `MainScreen.kt:173` passes `onFoodItemClick = {}` to HomeScreen. When user taps a food item in the "Popular Items" section, nothing happens.

**Root Cause:** The HomeScreen shows popular food items but clicking them doesn't navigate to the parent restaurant. The item model may not carry the `vendorId` needed for navigation to `RestaurantScreen`.

**Impact:** Food item cards on home screen are not interactive. Low impact — users can tap the restaurant card instead.

**Fix:** If `FoodItem` has a `vendorId` field, navigate to `restaurant/{vendorId}`:
```kotlin
onFoodItemClick = { item ->
    item.vendorId?.let { navController.navigate("restaurant/$it") }
}
```
If `FoodItem` doesn't have `vendorId`, either add it or remove the click affordance.

**Effort:** 10 min
**Files:** `app/.../MainScreen.kt:173`

---

#### BUG-10: `onEditPromotion` empty lambda in Partner PromotionsScreen

**Description:** `PartnerNavGraph.kt:286` passes `onEditPromotion = { /* Edit not implemented yet */ }`. The edit button appears on each promotion card but does nothing.

**Root Cause:** The `CreatePromotionScreen` was built for creating new promotions but doesn't support edit mode (pre-populating fields from an existing promotion). The backend `PUT /api/promotions/{id}` endpoint exists but the Android UI never wired the edit flow.

**Impact:** Restaurant partners see an edit button that doesn't work. Low impact — they can delete and recreate promotions.

**Fix:** Navigate to `CreatePromotionScreen` with the promotion ID as an argument, and add edit-mode support:
```kotlin
onEditPromotion = { promotion ->
    navController.navigate("create_promotion?promotionId=${promotion.id}")
}
```
Then modify `CreatePromotionScreen` to fetch and pre-populate when `promotionId` is provided.

**Effort:** 45 min
**Files:** `partner/.../PartnerNavGraph.kt:286`, `partner/.../CreatePromotionScreen.kt`

---

### Wave 5 — No-op / Aspirational (No Fix) — 3 issues

| ID | Severity | Platform | App | Category | File:Line |
|----|----------|----------|-----|----------|-----------|
| **NFX-01** | **INFO** | iOS | Driver | DEAD | `TripBoardView.swift:31-33` |
| **NFX-02** | **INFO** | iOS | Restaurant | MISSING | `RestaurantDocumentsView.swift:261` |
| **NFX-03** | **INFO** | Android | Partner | INFO | `DollorApiService.kt:~1128` |

#### NFX-01: TripBoardView MyMatchesView uses mock data

**Description:** TripBoardView is an aspirational feature with no backend integration. MyMatchesView shows empty state.

**Root Cause:** Trip board is a future feature placeholder. No API endpoints exist for trip matching.

**Impact:** None — feature is not user-facing in normal flows.

**Fix:** No fix needed. Future milestone work.

---

#### NFX-02: Restaurant "Submit for Review" is a no-op

**Description:** `RestaurantDocumentsView.swift:261` has a "Submit for Review" button that calls `submitForReview()` at line 568, which just refreshes the document list after a 0.5s delay.

**Root Cause:** Documents are automatically submitted when uploaded (per comment at line 572). The button gives users a sense of completion but doesn't trigger any backend action beyond a refresh.

**Impact:** None — documents work correctly. Button is cosmetic.

**Fix:** No fix needed. Consider removing the button or adding a success toast to reduce confusion.

---

#### NFX-03: `getVendorOrdersAlt` duplicate endpoint

**Description:** Partner Android has two Retrofit methods for the same endpoint with different return types. Harmless overload.

**Fix:** No fix needed.

---

## Fix Priority Summary

| Wave | Issues | Severity | Total Effort | Description |
|------|--------|----------|-------------|-------------|
| **1** | BUG-01 | HIGH | 5 min | Backend function shadow fix |
| **2** | BUG-02, BUG-03 | MEDIUM | 15 min | Android missing handlers (phone dial, instructions) |
| **3** | BUG-04, BUG-05 | MEDIUM | 20 min | iOS missing UX (pull-to-refresh, chat button) |
| **4** | BUG-06, BUG-08, BUG-09, BUG-10 | LOW | 85 min | Dead code cleanup and feature wiring |
| **5** | NFX-01, NFX-02, NFX-03, BUG-07 | INFO | 0 min | No fix needed — aspirational/by-design |

**Total fixable issues:** 9 (BUG-01 through BUG-06, BUG-08 through BUG-10)
**Total estimated effort:** ~125 min (~2 hours)
**Recommended approach:** Fix Waves 1-3 now (40 min, 5 issues), defer Wave 4 to a future session

---

## Execution Plan

### `/gsd:quick` Wave 1+2+3 (Recommended — 40 min)
Fix BUG-01 through BUG-05:
1. Rename `complete_delivery` → `complete_delivery_v2` in `main_new.py:20273`
2. Add phone dial Intent to `onCallPartner` in Android `NavigationGraph.kt:320`
3. Remove empty `onAddInstructions` clickable from `OrderTrackingScreen.kt:483`
4. Add `.refreshable` to iOS `OrderHistoryView.swift`
5. Add "Chat" button to iOS `DeliveryTrackingView.swift`
6. Run tests, build all 6 apps, distribute

### `/gsd:quick` Wave 4 (Optional — 85 min)
Fix BUG-06, BUG-08, BUG-09, BUG-10:
1. Replace old `ChatView` with `OrderChatView` redirect in Driver app
2. Wire `onCategoryClick` to search in Android Customer
3. Wire `onFoodItemClick` to restaurant in Android Customer
4. Implement edit-mode for Partner promotions
