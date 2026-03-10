---
phase: quick-138
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/web/p2p-platform/backend/main_new.py
  - apps/ios/customer/eatfaircustomer/Services/P2PAPIService.swift
  - apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift
  - apps/ios/restaurant/eatffairrestaurant/Views/Dashboard/EnhancedDashboardView.swift
  - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt
  - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersViewModel.kt
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt
autonomous: true
requirements: [NOTIF-GAP-1, NOTIF-GAP-2, NOTIF-GAP-3, NOTIF-GAP-4, NOTIF-GAP-5]

must_haves:
  truths:
    - "Customer receives push notification when payment is confirmed (GAP-1)"
    - "Customer receives push notification when food is ready for pickup (GAP-2)"
    - "Customer receives push notification when order is out for delivery (GAP-3)"
    - "Arrival notification distinguishes self-delivery vs driver delivery (GAP-4)"
    - "Android Partner app has 'I've Arrived at Customer' button for self-delivery orders (GAP-5)"
  artifacts:
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "GAP-1 through GAP-5 backend notifications + vendor-arrived endpoint"
      contains: "vendor-arrived-at-delivery"
    - path: "/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt"
      provides: "vendorArrivedAtDelivery Retrofit endpoint"
      contains: "vendor-arrived-at-delivery"
    - path: "/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt"
      provides: "I've Arrived at Customer button in EnhancedOrderCard"
      contains: "Arrived at Customer"
  key_links:
    - from: "OrdersScreen.kt (Partner)"
      to: "DollorApiService.kt"
      via: "OrdersViewModel -> DollorRepository -> vendorArrivedAtDelivery"
      pattern: "vendorArrivedAtDelivery"
---

<objective>
Fix 5 delivery notification gaps (GAP-1 through GAP-5) to ensure customers receive push notifications at every delivery lifecycle stage, and Android Partner app gets the "I've Arrived at Customer" button matching iOS.

Purpose: Backend + iOS changes are ALREADY IMPLEMENTED (uncommitted). This task verifies those, implements the remaining Android Partner changes, runs tests, creates CR ticket, and commits atomically.
Output: All 5 gaps closed, backend tested, CR ticket created, atomic commit on main.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/web/p2p-platform/backend/order_flow.py
@apps/ios/restaurant/eatffairrestaurant/Views/Dashboard/EnhancedDashboardView.swift
@/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt
@/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
@/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersViewModel.kt
@/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify existing backend+iOS changes and run pytest</name>
  <files>apps/web/p2p-platform/backend/order_flow.py, apps/web/p2p-platform/backend/main_new.py</files>
  <action>
    DO NOT re-implement any code. The following are ALREADY written and uncommitted:

    1. Verify GAP-1 exists: In `order_flow.py` around line 1504, `confirm_payment()` sends customer push after vendor push
    2. Verify GAP-2 exists: In `order_flow.py` around line 3155, `update_order_status()` sends "Your food is ready!" when transitioning to READY_FOR_PICKUP
    3. Verify GAP-3 exists: In `order_flow.py` around line 3197 AND `main_new.py` around line 8824, customer push "Out for delivery!" after db.commit
    4. Verify GAP-4 exists: In `order_flow.py` around line 4662, arrival notification checks `restaurant_will_deliver` flag for differentiated messaging
    5. Verify GAP-5 backend exists: In `order_flow.py` around line 4693, `POST /api/erp/orders/{id}/vendor-arrived-at-delivery` endpoint
    6. Verify iOS changes exist: `P2PAPIService.swift` has `markArrivedAtDelivery`, `OrdersViewModel.swift` has method, `EnhancedDashboardView.swift` has button

    Run backend tests:
    ```bash
    cd apps/web/p2p-platform/backend && source venv/bin/activate && pytest tests/ -v --timeout=60
    ```

    If tests fail on unrelated issues, note them but do not fix. If tests fail on GAP-related code, investigate and fix.
  </action>
  <verify>pytest passes (or only pre-existing failures unrelated to GAP changes)</verify>
  <done>All 5 GAP changes verified present in working tree, pytest confirms no regressions</done>
</task>

<task type="auto">
  <name>Task 2: Implement Android Partner "I've Arrived at Customer" feature (GAP-5)</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
    /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersViewModel.kt
    /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt
  </files>
  <action>
    **DollorApiService.kt** -- Add new endpoint method near the delivery section (after `restaurantDeclineDelivery` around line 1224):
    ```kotlin
    /**
     * Vendor marks arrived at customer location (self-delivery)
     * POST /api/erp/orders/{orderId}/vendor-arrived-at-delivery
     */
    @POST("erp/orders/{orderId}/vendor-arrived-at-delivery")
    suspend fun vendorArrivedAtDelivery(
        @Path("orderId") orderId: Int,
        @Header("Authorization") token: String
    ): OrderActionResponse
    ```

    **DollorRepository.kt** -- Add repository method near `restaurantDeclineOrder` (around line 1660), following the exact same pattern as `restaurantAcceptDelivery`:
    ```kotlin
    /**
     * Vendor marks arrived at customer location (self-delivery)
     */
    suspend fun vendorArrivedAtDelivery(orderId: Int): Result<OrderActionResponse> =
        withContext(Dispatchers.IO) {
            val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
                ?: return@withContext Result.failure(Exception("Not authenticated"))
            safeApiCall { apiService.vendorArrivedAtDelivery(orderId, token) }
        }
    ```

    **OrdersViewModel.kt** (Partner) -- Add method after `startDelivery()` (after line 462):
    ```kotlin
    /**
     * Vendor arrived at customer location (self-delivery)
     */
    fun vendorArrivedAtDelivery(orderId: Long) {
        viewModelScope.launch {
            try {
                dollorRepository.vendorArrivedAtDelivery(orderId.toInt()).fold(
                    onSuccess = {
                        refreshOrders()
                    },
                    onFailure = { error ->
                        _uiState.update { it.copy(error = "Failed to mark arrived: ${error.message}") }
                    }
                )
            } catch (e: Exception) {
                _uiState.update { it.copy(error = "Failed to mark arrived: ${e.message ?: "Unknown error"}") }
            }
        }
    }
    ```

    **OrdersScreen.kt** (Partner) -- Two changes:
    1. Add `onArrivedAtDelivery` parameter to `EnhancedOrderCard` composable (around line 544, between `onStartDelivery` and `onMarkDelivered`):
       ```kotlin
       onArrivedAtDelivery: () -> Unit = {},
       ```
    2. Wire it at the call site (around line 232):
       ```kotlin
       onArrivedAtDelivery = { viewModel.vendorArrivedAtDelivery(order.id) },
       ```
    3. Add "I've Arrived at Customer" orange button in the `isOutForDelivery` section (around line 1230, BEFORE the "Mark as Delivered" button). Use orange color `Color(0xFFFF9500)` to match iOS. Pattern matches the "Start Delivery" button but with `Icons.Default.LocationOn` icon and text "I've Arrived at Customer".

    Build Android Partner to verify compilation:
    ```bash
    cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :partner:assembleDebug
    ```
  </action>
  <verify>`./gradlew :partner:assembleDebug` compiles without errors. Grep confirms `vendorArrivedAtDelivery` exists in all 4 files.</verify>
  <done>Android Partner app has "I've Arrived at Customer" button wired through ViewModel -> Repository -> ApiService -> backend endpoint, and compiles successfully</done>
</task>

<task type="auto">
  <name>Task 3: Create CR ticket and commit all changes atomically</name>
  <files>None (git operations + API call only)</files>
  <action>
    1. Create CR ticket via admin portal:
       ```bash
       curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY" \
         -H "Content-Type: application/json" \
         -d '{
           "title": "Fix 5 delivery notification gaps (GAP-1 through GAP-5)",
           "description": "GAP-1: Customer push on payment confirmed. GAP-2: Customer push on food ready. GAP-3: Customer push on out for delivery. GAP-4: Self-delivery vs driver arrival messaging. GAP-5: Vendor arrived-at-delivery endpoint + iOS/Android Partner UI button.",
           "change_type": "code",
           "priority": "High",
           "requested_by": "support@dollor.ai"
         }'
       ```
    2. Extract `cr_id` from response
    3. Submit for review:
       ```bash
       curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/<cr_id>/submit?secret_key=$ADMIN_SECRET_KEY"
       ```
    4. Stage ALL modified files (backend, iOS, Android) and commit with CR ID:
       ```
       feat(quick-138): [CR-XXXX] fix 5 delivery notification gaps (GAP-1 through GAP-5)
       ```
       Include all backend (order_flow.py, main_new.py), iOS (P2PAPIService.swift, OrdersViewModel.swift, EnhancedDashboardView.swift), and Android (DollorApiService.kt, DollorRepository.kt, OrdersViewModel.kt, OrdersScreen.kt) files.

    NOTE: Do NOT deploy yet. Deployment will be a separate task after verification.
  </action>
  <verify>`git log --oneline -1` shows the commit with CR ID. `git status` shows clean working tree for all GAP-related files.</verify>
  <done>CR ticket created and submitted, all 5 GAP fixes committed atomically with CR reference</done>
</task>

</tasks>

<verification>
1. `grep -n "vendor-arrived-at-delivery" apps/web/p2p-platform/backend/order_flow.py` -- confirms GAP-5 endpoint
2. `grep -rn "vendorArrivedAtDelivery" /Users/jeet/StudioProjects/eatfair-android/` -- confirms Android wiring across 4 files
3. `grep -n "Arrived at Customer" /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt` -- confirms UI button
4. Backend pytest passes
5. Android Partner compiles
</verification>

<success_criteria>
- All 5 GAP notifications verified in backend code
- Android Partner "I've Arrived at Customer" button compiles and is wired end-to-end
- Backend pytest passes with no GAP-related regressions
- CR ticket created with proper audit trail
- Single atomic commit with all changes across backend + iOS + Android
</success_criteria>

<output>
After completion, create `.planning/quick/138-fix-5-delivery-notification-gaps-gap-1-t/138-SUMMARY.md`
</output>
