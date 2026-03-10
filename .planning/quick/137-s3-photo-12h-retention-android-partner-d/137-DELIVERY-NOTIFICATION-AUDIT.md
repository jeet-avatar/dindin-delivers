# Delivery Notification Audit: Restaurant Self-Delivery Flow

**Date:** 2026-03-10
**Audited by:** AI Employee (Quick-137)
**Source files:** `apps/web/p2p-platform/backend/order_flow.py`, `models.py`

## Overview

This audit traces every push notification and in-app notification sent to the **customer** during the restaurant self-delivery flow. The self-delivery flow is the path where a restaurant chooses to deliver the order themselves instead of sending it to the driver pool.

## Flow Diagram

```
Order Placed → Pending Restaurant → Restaurant Accepts (Preparing) → Ready for Pickup
→ Pending Delivery Decision → Restaurant Will Deliver → Out for Delivery → Delivered
```

## Notification Audit Table

| Step | Status Transition | Endpoint | Push Notification? | In-App Notification? | Recipient | Title | Body | FCM Data Payload | Gap? |
|------|-------------------|----------|-------------------|---------------------|-----------|-------|------|-----------------|------|
| 1. Order Placed | `→ pending_restaurant` | `POST /erp/orders` (`create_order`, line 1190) | YES (to vendor only) | YES (to customer) | Vendor: push, Customer: in-app | Vendor: "New Order!" / Customer in-app: "Order Confirmed" | Vendor: "Order #X - N item(s) - $Y" / Customer: "Your order from {restaurant} has been confirmed..." | Vendor: `{type: "new_order", order_id, order_number, total_amount}` | **GAP: No push notification to customer at order placement** |
| 2. Restaurant Accepts | `pending_restaurant → preparing` | `POST /erp/orders/{id}/restaurant-accept` (`restaurant_accept_order`, line 1600) | YES (to customer) | NO | Customer | "Order Confirmed!" | "{restaurant_name} is now preparing your order." | `{type: "order_accepted", order_id, order_number, status: "preparing"}` | None |
| 3. Start Preparing | `→ preparing` | `POST /orders/{id}/start-preparing` (`start_preparing`, line 2905) | NO | NO | N/A | N/A | N/A | N/A | **GAP: No customer notification when preparation starts (redundant with #2 if restaurant accepts = starts preparing)** |
| 4. Ready for Pickup | `preparing → pending_delivery_decision` | `POST /orders/{id}/ready-for-pickup` (`ready_for_pickup`, line 2935) | NO | NO | N/A | N/A | N/A | N/A | **GAP: No customer notification that food is ready. Customer has no visibility into delivery decision window.** |
| 5. Restaurant Self-Delivers | `pending_delivery_decision → restaurant_will_deliver` | `POST /orders/{id}/restaurant-accept-delivery` (`restaurant_accept_delivery`, line 1918) | YES (to customer) | NO | Customer | "Your order is on its way!" | "{restaurant_name} is delivering your order directly to you." | `{type: "order_status", order_id, order_number, status: "restaurant_will_deliver", action: "track_order"}` | None |
| 6. Out for Delivery | `restaurant_will_deliver → out_for_delivery` | `PUT /orders/{id}/status` (`update_order_status`, line 3104) | NO | NO | N/A | N/A | N/A | N/A | **GAP: No customer notification when restaurant starts delivery trip. Generic `update_order_status` sends NO notifications for any status change.** |
| 7. Driver/Restaurant Arrives | N/A | `POST /orders/{id}/driver-arrived` (`driver_arrived_at_delivery`, line 4570) | YES (to customer) | NO | Customer | "Driver Has Arrived" | "Your driver has arrived at your delivery location. Please come out to receive your order." | `{type: "driver_arrived", order_id}` | **ISSUE: Notification says "driver" not "restaurant" for self-delivery. The endpoint exists but may not be called by partner app.** |
| 8. Delivery Photo Uploaded | N/A | `POST /orders/{id}/delivery-photo` (`upload_delivery_photo`, line 4412) | NO | NO | N/A | N/A | N/A | N/A | None (intermediate step, not customer-facing) |
| 9. Order Delivered | `out_for_delivery → delivered` | `PUT /orders/{id}/status` or `POST /orders/{id}/delivered` (`order_delivered`, line 3599) | YES (to customer) + YES (to vendor) | YES (to customer, in-app) | Customer + Vendor | Customer: "Order Delivered!" / Vendor: "Payment Received!" | Customer: "Your order from {restaurant} has arrived. Enjoy your meal!" / Vendor: "${payout} from order X has been transferred..." | Customer: `{type: "order_delivered", order_id, order_number, status: "delivered"}` / Vendor: `{type: "payment_processed", order_id, order_number, amount}` | None |

## Notification Count Summary

| Recipient | Push Notifications | In-App Notifications |
|-----------|-------------------|---------------------|
| Customer | 3 (accepted, self-delivery, delivered) | 2 (order placed, delivered) |
| Vendor | 2 (new order, payment received) | 0 |
| Driver | 0 (no driver in self-delivery flow) | 0 |

## Identified Gaps

### GAP-1: No customer push at order placement (Low priority)
- **Step:** 1 - Order Placed
- **Current:** Customer gets in-app notification only, vendor gets push
- **Impact:** Customer may not know their order was received if app is backgrounded
- **Recommendation:** Add `send_push_notification("customer", ...)` in `create_order` after the vendor push (line ~1530)

### GAP-2: No customer notification at "Ready for Pickup" / delivery decision (Medium priority)
- **Step:** 4 - Ready for Pickup
- **Current:** Neither customer nor restaurant gets a notification about the delivery decision window
- **Impact:** Customer has no visibility that food is ready and restaurant is deciding on delivery method. Slight UX gap.
- **Recommendation:** Add customer push: "Your order from {restaurant} is ready! Delivery will begin shortly."

### GAP-3: No customer notification at "Out for Delivery" (High priority)
- **Step:** 6 - Out for Delivery
- **Current:** `update_order_status` sends NO push notifications for any status change
- **Impact:** Customer doesn't know when restaurant actually starts the delivery trip. The "restaurant_will_deliver" notification (step 5) fires too early -- it fires when restaurant *decides* to deliver, not when they *leave*.
- **Recommendation:** Add customer push in `update_order_status` when transitioning to `out_for_delivery`: "Your order is on its way! {restaurant_name} has left for delivery."

### GAP-4: "Driver" language in arrival notification for self-delivery (Low priority)
- **Step:** 7 - Arrival
- **Current:** Notification says "Your driver has arrived" even for restaurant self-delivery
- **Impact:** Confusing to customer -- they expect a restaurant person, not a "driver"
- **Recommendation:** Check `order.restaurant_will_deliver` flag and use "The restaurant" instead of "Your driver" in the notification text

### GAP-5: Partner app may not call driver-arrived endpoint (Medium priority)
- **Step:** 7 - Arrival
- **Current:** The `POST /orders/{id}/driver-arrived` endpoint exists but the Partner app's self-delivery flow may not call it
- **Impact:** Customer never gets an arrival notification during self-delivery
- **Recommendation:** Verify Partner app calls `driver-arrived` during self-delivery, or add an arrival step to the Partner UI

## FCM Payload Format Reference

All push notifications use the same `send_push_notification` function (line 159):

```python
def send_push_notification(user_type, user_id, title, body, data=None, db=None)
```

- **user_type:** "customer", "driver", or "vendor"
- **data:** Dict with `type` key for client-side routing + metadata fields
- **Delivery:** Via notification-service HTTP POST, fallback to direct FCM
- **Token source:** `push_token` column (customers/vendors) or `fcm_token` column (drivers)

## Conclusions

The self-delivery flow has **3 customer push notifications** (accepted, self-delivery decision, delivered) and **2 notable gaps** (no "out for delivery" push, no "food ready" push). The most impactful gap is GAP-3: the customer has a notification gap between "restaurant will deliver" (decision point) and "delivered" (completion). Adding an "out for delivery" push notification would close this gap.

The generic `update_order_status` endpoint (line 3104) is a notification dead zone -- it handles status changes for the restaurant app but sends zero push notifications. This is the root cause of GAP-3 and would be the highest-value fix.
