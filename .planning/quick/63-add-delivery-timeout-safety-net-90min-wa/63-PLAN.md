---
phase: quick-63
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/models.py
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/ios/customer/eatfaircustomer/Views/OrderHistoryView.swift
  - apps/ios/customer/eatfaircustomer/Views/DeliveryTrackingView.swift
  - /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/order/OrdersViewModel.kt
  - /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/order/OrderTrackingScreen.kt
autonomous: true
requirements: [QUICK-63]

must_haves:
  truths:
    - "Orders stuck in out_for_delivery for 90+ minutes trigger a warning push notification to the customer (once only)"
    - "Orders stuck in out_for_delivery for 120+ minutes are auto-refunded and set to delivery_failed"
    - "Orders stuck in any active status for 24+ hours are auto-cancelled with refund"
    - "Support receives email escalation at both 90-min warning and 120-min failure"
    - "delivery_failed orders appear in the Completed tab on iOS and Android"
    - "iOS and Android show a clear Delivery Failed status with refund messaging"
  artifacts:
    - path: "apps/web/p2p-platform/backend/models.py"
      provides: "DELIVERY_FAILED enum value in OrderStatus"
      contains: "DELIVERY_FAILED"
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "check_delivery_timeouts_job and cleanup_stale_orders_job functions"
      contains: "check_delivery_timeouts_job"
  key_links:
    - from: "order_flow.py:check_delivery_timeouts_job"
      to: "order_flow.py:trigger_refund"
      via: "calls trigger_refund for 120-min timeout"
      pattern: "trigger_refund.*delivery timeout"
    - from: "order_flow.py:check_delivery_timeouts_job"
      to: "order_flow.py:send_push_notification"
      via: "sends push to customer at 90-min and 120-min"
      pattern: "send_push_notification.*customer"
    - from: "order_flow.py:restaurant_timeout_scheduler"
      to: "order_flow.py:check_delivery_timeouts_job"
      via: "registered as scheduled job"
      pattern: "add_job.*check_delivery_timeouts_job"
---

<objective>
Add a delivery timeout safety net that catches orders stuck in `out_for_delivery` status. After 90 minutes, warn the customer via push notification and email support. After 120 minutes, auto-refund and mark as `delivery_failed`. Also add a stale order cleanup job for any active orders older than 24 hours. Update iOS and Android customer apps to handle the new `delivery_failed` status.

Purpose: Prevent customers from being charged for orders that never arrive due to driver abandonment or app crashes.
Output: Backend timeout jobs + client-side status handling for delivery_failed.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/models.py (OrderStatus enum at line 386, Order model timestamps at line 463)
@apps/web/p2p-platform/backend/order_flow.py (existing timeout jobs: check_restaurant_timeouts_job at line 1937, check_delivery_proof_timeouts_job at line 2045, trigger_refund at line 128, send_push_notification at line 159, scheduler setup at line 2116)
@apps/web/p2p-platform/backend/email_service.py (send_email function at line 360 — signature: send_email(to_email, subject, html_body, text_body, skip_validation=False))
@apps/web/p2p-platform/backend/support_agent.py (_send_escalation_email pattern at line 158 — uses send_email with skip_validation=True to support@dollor.ai)
@apps/ios/customer/eatfaircustomer/Views/OrderHistoryView.swift (status filter at line 183-196)
@apps/ios/customer/eatfaircustomer/Views/DeliveryTrackingView.swift (stage progress at line 633, formatStatus equivalent logic)
@/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/order/OrdersViewModel.kt (isActiveOrder at line 179, isCompletedOrder at line 196)
@/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/order/OrderTrackingScreen.kt (formatStatus at line 579, DeliveryStatusCard at line 362)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend - Add delivery_failed status, delivery timeout job, and stale order cleanup job</name>
  <files>
    apps/web/p2p-platform/backend/models.py
    apps/web/p2p-platform/backend/order_flow.py
  </files>
  <action>
**models.py changes:**

1. Add `DELIVERY_FAILED = "delivery_failed"` to the `OrderStatus` enum (line ~407, after `CANCELLED = "cancelled"`).

**order_flow.py changes:**

2. Add constants after `DELIVERY_PROOF_CHECK_INTERVAL_SECONDS = 300` (line 2042):
   ```python
   # Delivery timeout thresholds
   DELIVERY_WARNING_MINUTES = 90      # Send warning after 90 minutes
   DELIVERY_FAILURE_MINUTES = 120     # Auto-refund after 120 minutes
   DELIVERY_TIMEOUT_CHECK_INTERVAL_SECONDS = 60  # Check every 60 seconds
   STALE_ORDER_HOURS = 24             # Cancel stale active orders after 24 hours
   STALE_ORDER_CHECK_INTERVAL_SECONDS = 300  # Check every 5 minutes
   ```

3. Add `check_delivery_timeouts_job()` function after `check_delivery_proof_timeouts_job()` (after line 2113). Follow the exact pattern of `check_restaurant_timeouts_job()` (line 1937):
   - Create `db = SessionLocal()` with try/except/finally for db.close()
   - Query orders WHERE `status == OrderStatus.OUT_FOR_DELIVERY` AND `picked_up_at IS NOT NULL`
   - For each order, calculate `elapsed_minutes = (datetime.now() - order.picked_up_at).total_seconds() / 60`

   **90-minute warning** (fire ONCE per order):
   - To avoid adding a DB column, check if an escalation email has already been sent by looking for a sentinel in `order.delivery_instructions` — NO, that's customer data. Instead, use a simple approach: add a module-level `set()` called `_delivery_warned_orders` to track order IDs that have already been warned within this process lifecycle. This is acceptable because the scheduler runs in the same process, and a restart just means warnings may re-fire once (harmless).
   - If `elapsed_minutes >= 90` AND `order.id not in _delivery_warned_orders`:
     - Call `send_push_notification(user_type="customer", user_id=order.customer_id, title="Delivery Update", body="Your delivery appears to be delayed. We're looking into it and will keep you updated.", data={"type": "delivery_delayed", "order_id": str(order.id)}, db=db)`
     - Send escalation email to `support@dollor.ai` using `send_email()` with `skip_validation=True` (same pattern as `support_agent.py:179`). Import `send_email` from `email_service`. Subject: `[Delivery Alert] Order {order.order_number} delayed 90+ minutes`. HTML body with order number, customer name/email/phone, driver ID/name, picked_up_at timestamp, elapsed minutes.
     - Add `order.id` to `_delivery_warned_orders`
     - Log: `logger.warning(f"Order {order.order_number} delivery delayed {int(elapsed_minutes)} min. Warning sent.")`

   **120-minute auto-refund:**
   - If `elapsed_minutes >= 120`:
     - Call `trigger_refund(order, reason="Delivery timeout - order not delivered within 120 minutes")`
     - Set `order.status = OrderStatus.DELIVERY_FAILED`
     - Set `order.payment_status = "refunded"`
     - Call `send_push_notification(user_type="customer", user_id=order.customer_id, title="Order Could Not Be Delivered", body="Your order could not be delivered. A full refund has been issued to your payment method.", data={"type": "delivery_failed", "order_id": str(order.id)}, db=db)`
     - Send escalation email to `support@dollor.ai` with `skip_validation=True`. Subject: `[Delivery Failed] Order {order.order_number} auto-refunded after 120+ minutes`. HTML body with all order details + resolution note.
     - Discard from `_delivery_warned_orders` if present
     - Log: `logger.error(f"Order {order.order_number} delivery FAILED after {int(elapsed_minutes)} min. Refund issued.")`

   - After loop, `db.commit()` if any changes were made (track with a counter like existing jobs).

4. Add `cleanup_stale_orders_job()` function after `check_delivery_timeouts_job()`:
   - Create `db = SessionLocal()` with try/except/finally
   - Define active statuses list: `[OrderStatus.PENDING_RESTAURANT, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.PENDING_DELIVERY_DECISION, OrderStatus.PENDING_DELIVERY_PROOF]`
   - Query orders WHERE `status IN active_statuses` AND `created_at < datetime.now() - timedelta(hours=STALE_ORDER_HOURS)`
   - For each stale order:
     - If `order.stripe_payment_intent_id`: call `trigger_refund(order, reason="Stale order cleanup - order inactive for 24+ hours")`
     - Set `order.status = OrderStatus.CANCELLED`
     - Set `order.cancelled_at = datetime.now()`
     - If has payment intent, set `order.payment_status = "refunded"`
     - Call `send_push_notification(user_type="customer", user_id=order.customer_id, title="Order Cancelled", body="Your order has been automatically cancelled due to inactivity. If you were charged, a full refund has been issued.", data={"type": "stale_order_cancelled", "order_id": str(order.id)}, db=db)`
     - Log: `logger.warning(f"Stale order {order.order_number} auto-cancelled after 24+ hours")`
   - `db.commit()` if changes made.

5. Register both new jobs on the `restaurant_timeout_scheduler` (after line 2138, before `start_timeout_scheduler`):
   ```python
   restaurant_timeout_scheduler.add_job(
       check_delivery_timeouts_job,
       IntervalTrigger(seconds=DELIVERY_TIMEOUT_CHECK_INTERVAL_SECONDS),
       id="delivery_timeout_checker",
       name="Check for delivery timeouts (90min warn, 120min fail)",
       replace_existing=True
   )
   restaurant_timeout_scheduler.add_job(
       cleanup_stale_orders_job,
       IntervalTrigger(seconds=STALE_ORDER_CHECK_INTERVAL_SECONDS),
       id="stale_order_cleanup",
       name="Cleanup stale active orders (24h+)",
       replace_existing=True
   )
   ```

6. Add `from email_service import send_email` at the top of `order_flow.py` if not already imported.
  </action>
  <verify>
    Run: `cd apps/web/p2p-platform/backend && python -c "from models import OrderStatus; print(OrderStatus.DELIVERY_FAILED.value)"` -- should print "delivery_failed".
    Run: `cd apps/web/p2p-platform/backend && python -c "from order_flow import check_delivery_timeouts_job, cleanup_stale_orders_job; print('OK')"` -- should print "OK".
    Run: `cd apps/web/p2p-platform/backend && python -c "from order_flow import restaurant_timeout_scheduler; jobs = restaurant_timeout_scheduler.get_jobs(); names = [j.id for j in jobs]; assert 'delivery_timeout_checker' in names; assert 'stale_order_cleanup' in names; print('Jobs registered:', names)"` -- should show both new jobs.
    Run: `cd apps/web/p2p-platform/backend && pytest tests/ -v -x --timeout=30 2>&1 | tail -20` -- existing tests should still pass (no regressions).
  </verify>
  <done>
    - OrderStatus.DELIVERY_FAILED exists in the enum
    - check_delivery_timeouts_job queries out_for_delivery orders, warns at 90 min (once via in-memory set), refunds at 120 min
    - cleanup_stale_orders_job cancels any active order older than 24 hours with refund
    - Both jobs registered on the BackgroundScheduler with correct intervals (60s and 300s)
    - Push notifications sent to customers at each stage
    - Escalation emails sent to support@dollor.ai at 90-min and 120-min marks
    - All existing tests pass
  </done>
</task>

<task type="auto">
  <name>Task 2: iOS - Handle delivery_failed status in order filters and tracking UI</name>
  <files>
    apps/ios/customer/eatfaircustomer/Views/OrderHistoryView.swift
    apps/ios/customer/eatfaircustomer/Views/DeliveryTrackingView.swift
  </files>
  <action>
**OrderHistoryView.swift changes (line 183-196):**

1. Add `"DeliveryFailed"` to the completed status filter array (line 193). The backend sends `delivery_failed` but the iOS Order model may capitalize it. Add both forms to be safe:
   ```swift
   case .completed:
       return viewModel.orders.filter {
           ["Delivered", "Cancelled", "DeliveryFailed", "delivery_failed"].contains($0.status)
       }
   ```

**DeliveryTrackingView.swift changes:**

2. In the stage progress logic (around line 633), add `delivery_failed` to the failed/terminal states. Find the `let isDelivered` line (line 636) and add:
   ```swift
   let isDeliveryFailed = status == "delivery_failed"
   ```

3. In the stage array (around line 644-675), update Stage 5 to handle delivery_failed. Replace the final "Delivered" stage tuple to show "Delivery Failed" when appropriate:
   - If `isDeliveryFailed`, the last stage should show "Delivery Failed" with an "xmark.circle.fill" icon instead of "house.fill", marked as complete.
   - The simplest approach: add a conditional stage 5 entry:
   ```swift
   // Stage 5: Delivered or Failed
   (isDeliveryFailed ? "Delivery Failed" : "Delivered",
    isDeliveryFailed ? "xmark.circle.fill" : "house.fill",
    isDelivered || isDeliveryFailed,
    isDelivered || isDeliveryFailed,
    isDeliveryFailed ? events["delivery_failed"] : events["delivered"])
   ```
   Also update all references to `isDelivered` in stage completion logic (lines 639-642) to include `|| isDeliveryFailed`:
   ```swift
   let stage2Complete = isReady || isOnTheWay || isDelivered || isDeliveryFailed
   let stage3Complete = isOnTheWay || isDelivered || isDeliveryFailed
   let stage4Complete = isDelivered || isDeliveryFailed
   ```

4. Add a refund banner in the active delivery tracking view. In `ActiveDeliveryTrackingView` (or wherever the current status card is shown), add a conditional banner when status is `delivery_failed`:
   ```swift
   if order.status.lowercased() == "delivery_failed" {
       HStack {
           Image(systemName: "exclamationmark.triangle.fill")
               .foregroundColor(.white)
           VStack(alignment: .leading) {
               Text("Delivery Failed")
                   .font(.headline)
                   .foregroundColor(.white)
               Text("A full refund has been issued to your payment method.")
                   .font(.subheadline)
                   .foregroundColor(.white.opacity(0.9))
           }
       }
       .padding()
       .frame(maxWidth: .infinity, alignment: .leading)
       .background(Color.red)
       .cornerRadius(12)
       .padding(.horizontal)
   }
   ```
   Place this at the top of the order detail content, BEFORE the map/progress stages, so the customer sees it immediately.

5. In the `.onChange(of: viewModel.currentOrder?.status)` handler (line 48-52), ensure `delivery_failed` does NOT trigger the celebration view. The existing check for `"delivered"` is fine since it's an exact match.
  </action>
  <verify>
    Build the iOS customer app:
    ```
    xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatfaircustomer -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
    ```
    Should compile without errors.
    Verify "delivery_failed" appears in the completed filter: `grep -n "delivery_failed\|DeliveryFailed" apps/ios/customer/eatfaircustomer/Views/OrderHistoryView.swift`
    Verify delivery failed banner exists: `grep -n "Delivery Failed" apps/ios/customer/eatfaircustomer/Views/DeliveryTrackingView.swift`
  </verify>
  <done>
    - "delivery_failed" status included in the Completed tab filter in OrderHistoryView.swift
    - DeliveryTrackingView shows "Delivery Failed" with xmark icon in the progress stages
    - Red banner with refund message displayed when order status is delivery_failed
    - Celebration view does NOT trigger for delivery_failed orders
    - iOS customer app builds without errors
  </done>
</task>

<task type="auto">
  <name>Task 3: Android - Handle delivery_failed status in order filters and tracking UI</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/order/OrdersViewModel.kt
    /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/order/OrderTrackingScreen.kt
  </files>
  <action>
**OrdersViewModel.kt changes:**

1. Add `"delivery_failed"` to the `isCompletedOrder()` function (line 196-203):
   ```kotlin
   fun isCompletedOrder(status: String): Boolean {
       return status.lowercase() in listOf(
           "delivered",
           "cancelled",
           "declined_by_restaurant",
           "restaurant_timeout",
           "delivery_failed"
       )
   }
   ```

**OrderTrackingScreen.kt changes:**

2. Add `"delivery_failed"` to the `formatStatus()` function (line 579-589):
   ```kotlin
   fun formatStatus(status: String): String = when (status.lowercase()) {
       "pending_payment" -> "Payment Pending"
       "confirmed" -> "Order Confirmed"
       "pending_restaurant" -> "Sent to Restaurant"
       "preparing" -> "Preparing Your Order"
       "ready_for_pickup" -> "Ready for Pickup"
       "out_for_delivery" -> "Out for Delivery"
       "picked_up" -> "Picked Up"
       "delivered" -> "Delivered"
       "cancelled" -> "Cancelled"
       "delivery_failed" -> "Delivery Failed"
       else -> status.replace("_", " ").replaceFirstChar { it.uppercase() }
   }
   ```

3. In `DeliveryStatusCard` composable (line 362), add a delivery failed banner. After the existing `val statusText = formatStatus(...)` line (line 368), add a check and show a red error card when status is `delivery_failed`:
   ```kotlin
   val isDeliveryFailed = (tracking?.status ?: "").lowercase() == "delivery_failed"
   ```

   Then inside the Card content, add a conditional block at the TOP (before the existing status text):
   ```kotlin
   if (isDeliveryFailed) {
       Row(
           modifier = Modifier
               .fillMaxWidth()
               .background(Color(0xFFDC2626), RoundedCornerShape(8.dp))
               .padding(12.dp),
           verticalAlignment = Alignment.CenterVertically
       ) {
           Icon(
               Icons.Filled.ErrorOutline,
               contentDescription = "Error",
               tint = Color.White,
               modifier = Modifier.size(24.dp)
           )
           Spacer(modifier = Modifier.width(8.dp))
           Column {
               Text(
                   text = "Delivery Failed",
                   color = Color.White,
                   fontWeight = FontWeight.Bold,
                   fontSize = 16.sp
               )
               Text(
                   text = "A full refund has been issued to your payment method.",
                   color = Color.White.copy(alpha = 0.9f),
                   fontSize = 13.sp
               )
           }
       }
       Spacer(modifier = Modifier.height(12.dp))
   }
   ```
   Note: `Icons.Filled.ErrorOutline` is already imported (line 28). Add `import androidx.compose.foundation.layout.width` and `import androidx.compose.ui.Alignment` if not already imported.

4. In the timeline/status history section (around line 549-576 where status items are rendered), `delivery_failed` will naturally be handled by the `formatStatus()` function update in step 2 via the `else` branch or the explicit case.
  </action>
  <verify>
    Build Android customer app:
    ```
    cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :app:compileDebugKotlin 2>&1 | tail -10
    ```
    Should compile without errors.
    Verify delivery_failed in completed filter: `grep -n "delivery_failed" /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/order/OrdersViewModel.kt`
    Verify formatStatus handles it: `grep -n "delivery_failed" /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/order/OrderTrackingScreen.kt`
  </verify>
  <done>
    - "delivery_failed" included in isCompletedOrder() so it appears in Completed tab
    - formatStatus() returns "Delivery Failed" for the new status
    - Red error banner with refund message shown in DeliveryStatusCard for delivery_failed orders
    - Android customer app compiles without errors
  </done>
</task>

</tasks>

<verification>
1. Backend: `DELIVERY_FAILED` enum value exists, both background jobs import and register correctly, existing tests pass
2. iOS: Customer app builds, delivery_failed appears in completed filter and tracking UI with failure banner
3. Android: Customer app builds, delivery_failed appears in completed filter and tracking screen with failure banner
4. No DB migration needed -- in-memory set tracks warned orders, new enum value auto-maps via SQLAlchemy
</verification>

<success_criteria>
- Orders stuck in out_for_delivery for 90+ minutes trigger exactly ONE warning push notification + support email
- Orders stuck for 120+ minutes are auto-refunded, marked delivery_failed, customer notified, support emailed
- Orders stuck in any active status for 24+ hours are auto-cancelled with refund
- delivery_failed orders appear in Completed tab on both iOS and Android
- Both iOS and Android show a clear red "Delivery Failed" banner with refund messaging
- All existing backend tests pass (zero regressions)
- Both iOS and Android apps compile without errors
</success_criteria>

<output>
After completion, create `.planning/quick/63-add-delivery-timeout-safety-net-90min-wa/63-SUMMARY.md`
</output>
