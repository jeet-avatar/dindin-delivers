---
phase: quick-90
plan: 90
type: execute
wave: 1
depends_on: [quick-89]
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
  - apps/ios/customer/eatfaircustomer/ViewModels/MultiRestaurantCartViewModel.swift
  - apps/ios/customer/eatfaircustomer/Views/MultiRestaurantCheckoutView.swift
  - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
  - /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/cart/CartViewModel.kt
autonomous: true
requirements: [GAP-CLIENT-409, GAP-CLIENT-400, GAP-PUSH-CANCEL, GAP-PUSH-REFUND]
must_haves:
  truths:
    - "Customer sees specific price change details when menu prices changed since cart was built"
    - "Customer sees 'restaurant closed' message when vendor goes offline during checkout"
    - "Customer receives push notification when their order is auto-cancelled due to vendor going offline"
    - "Customer receives push notification when a refund is issued for their order"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Push notification on vendor-offline auto-cancel"
      contains: "send_push_notification.*customer.*order.*cancelled"
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "Push notification on refund"
      contains: "send_push_notification.*customer.*refund"
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift"
      provides: "409 status code parsing with price_changes JSON"
    - path: "apps/ios/customer/eatfaircustomer/Views/MultiRestaurantCheckoutView.swift"
      provides: "User-friendly price change and vendor offline error alerts"
  key_links:
    - from: "P2PAPIService.swift createOrder"
      to: "MultiRestaurantCartViewModel placeOrder"
      via: "P2PAPIError cases for 409 and 400"
      pattern: "priceChanged|vendorOffline"
    - from: "main_new.py vendor go-offline"
      to: "send_push_notification"
      via: "FCM push to customer"
      pattern: "send_push_notification.*customer.*cancel"
---

<objective>
Handle backend payment safety responses (409 price change, 400 vendor offline) in iOS and Android customer apps, and add push notifications for auto-cancel and refund events.

Purpose: Quick Task 89 added backend safety checks (409 on stale prices, 400 on offline vendor, auto-cancel on go-offline, refund endpoint). Clients currently show generic error messages. This task makes the UX informative and adds proactive push notifications.

Output: iOS/Android show specific error messages for price changes and vendor offline. Backend sends push notifications on auto-cancel and refund.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/89-wave-1-payment-safety-stripe-idempotency/89-SUMMARY.md
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
@apps/ios/customer/eatfaircustomer/ViewModels/MultiRestaurantCartViewModel.swift
@apps/ios/customer/eatfaircustomer/Views/MultiRestaurantCheckoutView.swift
@/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
@/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/cart/CartViewModel.kt
@apps/web/p2p-platform/backend/main_new.py
@apps/web/p2p-platform/backend/order_flow.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend push notifications for auto-cancel and refund</name>
  <files>
    apps/web/p2p-platform/backend/main_new.py
    apps/web/p2p-platform/backend/order_flow.py
  </files>
  <action>
    **1a. Push notification on vendor go-offline auto-cancel (main_new.py ~line 10989)**

    In the vendor online-status endpoint (`PUT /api/vendors/{id}/online-status`), after the auto-cancel loop at ~line 10989, add a push notification for each cancelled order's customer. The loop already iterates `pending_orders`. Inside the loop, after the `logger.info(f"Auto-cancelled order...")` line, add:

    ```python
    # Notify customer about auto-cancellation
    try:
        from order_flow import send_push_notification
        send_push_notification(
            user_type="customer",
            user_id=order.customer_id,
            title="Order Cancelled",
            body=f"Your order #{order.order_number} has been cancelled because the restaurant went offline. A refund will be processed if payment was made.",
            data={"type": "order_cancelled", "order_id": str(order.id), "reason": "vendor_offline"},
            db=db
        )
    except Exception as e:
        logger.warning(f"Failed to send auto-cancel notification for order {order.order_number}: {e}")
    ```

    Use try/except so notification failure does not block the cancel flow. The `send_push_notification` function signature is: `(user_type: str, user_id: int, title: str, body: str, data: dict = None, db: Session = None) -> bool`. Import is already used in main_new.py at multiple places via `from order_flow import send_push_notification`.

    **1b. Push notification on refund (order_flow.py ~line 4893)**

    In the `refund_order` endpoint (order_flow.py line 4853), after `db.commit()` at line 4891 and the logger.info line, add push notification before the return:

    ```python
    # Notify customer about refund
    try:
        send_push_notification(
            user_type="customer",
            user_id=order.customer_id,
            title="Refund Issued",
            body=f"A refund of ${refund.amount / 100.0:.2f} has been issued for order #{order.order_number}. It may take 5-10 business days to appear.",
            data={"type": "refund_issued", "order_id": str(order.id), "refund_id": refund.id, "amount": str(refund.amount / 100.0)},
            db=db
        )
    except Exception as e:
        logger.warning(f"Failed to send refund notification for order {order.order_number}: {e}")
    ```

    `send_push_notification` is already imported at the top of order_flow.py (it is defined in the same file at line 159). No new import needed.

    Do NOT modify any existing tests. The push notification calls are wrapped in try/except and are non-blocking.
  </action>
  <verify>
    - `cd apps/web/p2p-platform/backend && python -c "import main_new; import order_flow"` succeeds (no syntax errors)
    - `grep -n "send_push_notification.*customer.*cancel" apps/web/p2p-platform/backend/main_new.py` finds the new notification
    - `grep -n "send_push_notification.*customer.*refund\|send_push_notification.*customer.*Refund" apps/web/p2p-platform/backend/order_flow.py` finds the new notification
    - `cd apps/web/p2p-platform/backend && python -m pytest tests/ -x -q 2>&1 | tail -5` — all tests pass, 0 regressions
  </verify>
  <done>
    Both auto-cancel (vendor offline) and refund flows send push notifications to the customer. Existing tests pass with 0 regressions.
  </done>
</task>

<task type="auto">
  <name>Task 2: iOS client-side handling for 409 price change and 400 vendor offline</name>
  <files>
    apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    apps/ios/customer/eatfaircustomer/ViewModels/MultiRestaurantCartViewModel.swift
    apps/ios/customer/eatfaircustomer/Views/MultiRestaurantCheckoutView.swift
  </files>
  <action>
    **2a. Add new P2PAPIError cases (P2PAPIService.swift)**

    Add two new cases to the `P2PAPIError` enum (~line 7846):
    ```swift
    case priceChanged(String, [[String: Any]])  // (message, price_changes array)
    case vendorOffline(String)                   // (detail message)
    ```

    Add errorDescription cases:
    ```swift
    case .priceChanged(let message, _):
        return message
    case .vendorOffline(let message):
        return message
    ```

    **2b. Update createOrder error handling (P2PAPIService.swift ~line 2996)**

    Replace the generic `httpResponse.statusCode >= 400` block in `createOrder` with specific status code handling:

    ```swift
    if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode >= 400 {
        // Parse response body for specific error handling
        if httpResponse.statusCode == 409 {
            // Price change detected — parse price_changes from response
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let message = json["message"] as? String,
               let priceChanges = json["price_changes"] as? [[String: Any]] {
                completion(.failure(P2PAPIError.priceChanged(message, priceChanges)))
            } else {
                completion(.failure(P2PAPIError.serverError("Menu prices have changed. Please refresh your cart.")))
            }
            return
        }

        if httpResponse.statusCode == 400 {
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let detail = json["detail"] as? String,
               detail.lowercased().contains("offline") {
                completion(.failure(P2PAPIError.vendorOffline(detail)))
            } else if let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
            } else {
                completion(.failure(P2PAPIError.serverError("Order creation failed")))
            }
            return
        }

        // Default error handling for other status codes
        if let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
            completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
        } else {
            completion(.failure(P2PAPIError.serverError("Order creation failed")))
        }
        return
    }
    ```

    **2c. Update MultiRestaurantCartViewModel placeOrder failure handling (~line 506)**

    In the `.failure(let error)` case of the `p2pService.createOrder` completion handler, before appending to `failedOrders`, check for specific error types to build a better error message. Replace the existing failure block:

    ```swift
    case .failure(let error):
        #if DEBUG
        logger.info("[OrderFlow] Order failed for \(restaurant.name): \(error.localizedDescription)")
        #endif
        DispatchQueue.main.async {
            // Check for specific error types
            if let apiError = error as? P2PAPIError {
                switch apiError {
                case .priceChanged(let message, let changes):
                    // Build detailed price change message
                    var detail = "\(restaurant.name): \(message)\n"
                    for change in changes {
                        if let name = change["item"] as? String,
                           let expected = change["expected_price"] as? Double,
                           let current = change["current_price"] as? Double {
                            detail += "  \(name): $\(String(format: "%.2f", expected)) -> $\(String(format: "%.2f", current))\n"
                        }
                    }
                    failedOrders.append(detail)
                case .vendorOffline:
                    failedOrders.append("\(restaurant.name): Restaurant is currently closed")
                default:
                    failedOrders.append(restaurant.name)
                }
            } else {
                failedOrders.append(restaurant.name)
            }
            orderGroup.leave()
        }
    ```

    **2d. Update MultiRestaurantCheckoutView error display (~line 1054)**

    In the `.failure(let error)` case of the placeOrder completion handler in MultiRestaurantCheckoutView.swift, add specific handling:

    ```swift
    case .failure(let error):
        #if DEBUG
        print("[PlaceOrder] Order failed: \(error.localizedDescription)")
        #endif
        if let apiError = error as? P2PAPIError {
            switch apiError {
            case .priceChanged(let message, _):
                errorMessage = "\(message)\n\nPlease review your cart — prices have been updated."
            case .vendorOffline:
                errorMessage = "This restaurant is currently closed and not accepting orders. Please try again later."
            default:
                errorMessage = error.localizedDescription
            }
        } else {
            errorMessage = error.localizedDescription
        }
        showError = true
    ```

    Note: The `showError` triggers an `.alert("Error", isPresented: $showError)` at line 124 which displays `errorMessage`. No new UI components needed.

    IMPORTANT: Do NOT touch any test files. Only modify the 3 source files listed above.
  </action>
  <verify>
    - `grep -n "priceChanged\|vendorOffline" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` shows new enum cases and handling
    - `grep -n "priceChanged\|vendorOffline" apps/ios/customer/eatfaircustomer/ViewModels/MultiRestaurantCartViewModel.swift` shows specific error handling
    - `grep -n "priceChanged\|vendorOffline\|currently closed" apps/ios/customer/eatfaircustomer/Views/MultiRestaurantCheckoutView.swift` shows user-facing messages
    - Build check: `xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatfaircustomer -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5` succeeds (or at minimum, no syntax errors in modified files via `swiftc -typecheck` if full build is slow)
  </verify>
  <done>
    iOS customer app shows "Menu prices have changed" with item-level details on 409, shows "restaurant is currently closed" on 400 vendor offline. Generic errors still handled for other failures.
  </done>
</task>

<task type="auto">
  <name>Task 3: Android client-side handling for 409 price change and 400 vendor offline</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
    /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/cart/CartViewModel.kt
  </files>
  <action>
    **3a. Add specific exception classes and update safeApiCall (DollorRepository.kt)**

    Add two exception classes near the top of the file (after existing exception classes like `TokenExpiredException`):

    ```kotlin
    class PriceChangedException(
        val priceChanges: List<Map<String, Any>>,
        message: String
    ) : Exception(message)

    class VendorOfflineException(message: String) : Exception(message)
    ```

    In the `safeApiCall` method (~line 60), inside the `catch (e: HttpException)` block, BEFORE the generic backendDetail extraction (~line 77), add specific 409 and 400 handling:

    ```kotlin
    // Check for price change (409)
    if (e.code() == 409 && errorBody != null) {
        try {
            val json = com.google.gson.JsonParser.parseString(errorBody).asJsonObject
            val message = json.get("message")?.asString ?: "Menu prices have changed"
            val changesArray = json.getAsJsonArray("price_changes")
            val changes = changesArray?.map { change ->
                val obj = change.asJsonObject
                mapOf(
                    "item" to (obj.get("item")?.asString ?: ""),
                    "expected_price" to (obj.get("expected_price")?.asDouble ?: 0.0),
                    "current_price" to (obj.get("current_price")?.asDouble ?: 0.0)
                )
            } ?: emptyList()
            return Result.failure(PriceChangedException(changes, message))
        } catch (_: Exception) { /* fall through to generic handling */ }
    }

    // Check for vendor offline (400)
    if (e.code() == 400 && errorBody != null) {
        try {
            val json = com.google.gson.JsonParser.parseString(errorBody).asJsonObject
            val detail = json.get("detail")?.asString ?: ""
            if (detail.lowercase().contains("offline")) {
                return Result.failure(VendorOfflineException(detail))
            }
        } catch (_: Exception) { /* fall through to generic handling */ }
    }
    ```

    This must be placed AFTER the `val errorBody = ...` line (line 62) and AFTER the 403 registration check (line 65-75), but BEFORE the `val backendDetail = ...` line (line 78).

    **3b. Update CartViewModel error handling (CartViewModel.kt ~line 317)**

    In the `onFailure` block of `dollorRepository.createOrder(orderRequest)` result handler (~line 317):

    ```kotlin
    onFailure = { error ->
        android.util.Log.e("CartViewModel", "Order creation failed: ${error.message}")
        val errorMsg = when (error) {
            is PriceChangedException -> {
                val details = error.priceChanges.joinToString("\n") { change ->
                    val item = change["item"] as? String ?: ""
                    val expected = change["expected_price"] as? Double ?: 0.0
                    val current = change["current_price"] as? Double ?: 0.0
                    "  $item: $${String.format("%.2f", expected)} -> $${String.format("%.2f", current)}"
                }
                "${error.message}\n$details\n\nPlease review your cart -- prices have been updated."
            }
            is VendorOfflineException -> {
                "This restaurant is currently closed and not accepting orders. Please try again later."
            }
            else -> "Failed to create order: ${error.message}"
        }
        _paymentErrorEvent.emit(errorMsg)
    }
    ```

    Add imports at the top of CartViewModel.kt:
    ```kotlin
    import ai.dollor.shared.data.repository.PriceChangedException
    import ai.dollor.shared.data.repository.VendorOfflineException
    ```

    IMPORTANT: Do NOT modify any test files. Only modify the 2 source files listed.
  </action>
  <verify>
    - `grep -n "PriceChangedException\|VendorOfflineException" /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt` shows new exception classes and handling
    - `grep -n "PriceChangedException\|VendorOfflineException" /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/cart/CartViewModel.kt` shows specific error handling
    - `cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :shared:compileReleaseKotlin :app:compileReleaseKotlin 2>&1 | tail -10` compiles without errors
  </verify>
  <done>
    Android customer app shows specific price change details on 409, shows "restaurant is currently closed" on 400 vendor offline. Generic errors still handled for other failures.
  </done>
</task>

</tasks>

<verification>
- Backend: `cd apps/web/p2p-platform/backend && python -m pytest tests/ -x -q` — all tests pass, 0 regressions
- iOS: `grep -c "priceChanged\|vendorOffline" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` returns at least 4 (enum cases + error handling)
- Android: `grep -c "PriceChangedException\|VendorOfflineException" /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt` returns at least 4
- Backend push: `grep -c "send_push_notification.*customer" apps/web/p2p-platform/backend/main_new.py` has increased by at least 1 from before
- Backend push: `grep -c "send_push_notification.*customer" apps/web/p2p-platform/backend/order_flow.py` has increased by at least 1 from before
</verification>

<success_criteria>
1. iOS customer app shows item-level price change details when backend returns 409
2. iOS customer app shows "restaurant is currently closed" when backend returns 400 vendor offline
3. Android customer app shows item-level price change details when backend returns 409
4. Android customer app shows "restaurant is currently closed" when backend returns 400 vendor offline
5. Backend sends push notification to customer when order auto-cancelled (vendor goes offline)
6. Backend sends push notification to customer when refund is issued
7. All existing backend tests pass with 0 regressions
</success_criteria>

<output>
After completion, create `.planning/quick/90-wave-1-client-side-handling-409-price-ch/90-SUMMARY.md`
</output>
