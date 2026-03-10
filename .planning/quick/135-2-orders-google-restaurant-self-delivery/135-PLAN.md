---
phase: quick-135
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [QUICK-135]

must_haves:
  truths:
    - "Google Restaurant (vendor_id=134) is online and accepting orders"
    - "Order 1 completes full restaurant self-delivery lifecycle with photo proof"
    - "Order 2 completes full driver delivery lifecycle with photo proof"
    - "Both orders reach delivered status with accounting entries"
    - "Receipt emails sent to support@dollor.ai for both orders"
  artifacts: []
  key_links:
    - from: "customer order creation"
      to: "/api/orders"
      via: "POST with customer token"
    - from: "restaurant self-delivery decision"
      to: "/api/erp/orders/{id}/restaurant-delivery-decision"
      via: "POST with vendor token, decision=self_deliver"
    - from: "delivery completion"
      to: "/erp/orders/{id}/delivered"
      via: "POST with vendor/driver token, triggers photo proof gate"
---

<objective>
Create 2 production orders for Google Restaurant (vendor_id=134) testing both delivery paths:
1. Restaurant self-delivery (restaurant delivers directly)
2. Driver delivery (restaurant sends to driver pool, driver delivers)

Both orders must complete full lifecycle with photo proof and receipt emails.

Purpose: Validate the self-delivery flow end-to-end on production after Quick-132 (delivered 500 fix, photo alias, address/nav) and Quick-134 (proof gate 500 fix, enum migration) fixes.
Output: 2 delivered orders with full audit trail logged in CR ticket.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/130-create-10-test-orders-e2e-lifecycle-on-p/130-SUMMARY.md
@.planning/quick/132-fix-4-delivery-flow-bugs-delivered-500-p/132-SUMMARY.md
@.planning/quick/134-fix-delivery-proof-gate-500-when-no-phot/134-SUMMARY.md
@apps/web/p2p-platform/backend/restaurant_self_delivery_test.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bring Google Restaurant online and authenticate all actors</name>
  <action>
**Create CR ticket first** per ticketed-task skill.

**Step 1 — Authenticate all three actors on production (https://api.dollor.ai):**

1a. Customer login via demo-login (needs ADMIN_SECRET_KEY):
```
POST /api/customer/demo-login?secret_key=$ADMIN_SECRET_KEY
Body: {"email_hint": "demo.customer@dollor.ai"}
```
Save `customer_token` and `customer_id`.

1b. Vendor login — demo.restaurant@dollor.ai maps to Apple Restaurant (vendor_id=40), NOT Google Restaurant.
For Google Restaurant (vendor_id=134), first look up its contact_email:
```
GET /api/vendors/134  (with any valid token or check if public)
```
If vendor_id=134 has a known email/password, login via:
```
POST /api/auth/vendor/login
Body (form): username=<vendor_134_email>&password=<vendor_134_password>
```

**FALLBACK**: If vendor_id=134 credentials are unknown, use admin API to set it online:
- Use ADMIN_SECRET_KEY to directly update vendor 134 status via:
```
PATCH /api/vendors/134/status?secret_key=$ADMIN_SECRET_KEY
Body: {"is_online": true}
```
Or use the PATCH /api/vendors/134 endpoint with admin auth.
If no admin endpoint can toggle online status, create a vendor account for vendor_id=134 or use SQL via admin/migrate endpoint.

**IMPORTANT**: If you cannot get a vendor token for vendor_id=134, use Apple Restaurant (vendor_id=40) as fallback and document this in the CR. The self-delivery flow is the priority, not the specific vendor.

1c. Driver login via demo-login (needs ADMIN_SECRET_KEY):
```
POST /api/auth/driver/demo-login?secret_key=$ADMIN_SECRET_KEY
Body: {"email_hint": "demo.driver@dollor.ai"}
```
Save `driver_token` and `driver_id`.

**Step 2 — Bring restaurant online:**
```
PUT /api/vendors/{vendor_id}/online-status?is_online=true
Authorization: Bearer {vendor_token}
```
Verify response shows `is_online: true`.

**Step 3 — Get menu items:**
```
GET /api/vendors/{vendor_id}/menu
```
Pick 2 items for the orders. Log item names, prices, IDs.

Log every request/response status code and key fields.
  </action>
  <verify>
All three tokens obtained. Restaurant is_online=true confirmed. Menu items retrieved. CR ticket created.
  </verify>
  <done>Customer, vendor, and driver authenticated. Restaurant online. Menu items identified for ordering.</done>
</task>

<task type="auto">
  <name>Task 2: Order 1 — Full restaurant self-delivery lifecycle with photo proof</name>
  <action>
Walk Order 1 through the COMPLETE self-delivery lifecycle. Log every step with HTTP status, response body excerpt, and timestamps.

**Step 1 — Customer creates order:**
```
POST /api/orders
Authorization: Bearer {customer_token}
Body: {
  "customer_id": {customer_id},
  "customer_name": "Demo Customer",
  "customer_email": "demo.customer@dollor.ai",
  "customer_phone": "9498881234",
  "vendor_id": {vendor_id},
  "delivery_address": "22352 El Paseo, Rancho Santa Margarita, CA 92688",
  "delivery_lat": 33.641,
  "delivery_lng": -117.6028,
  "items": [{menu_item_1}],
  "subtotal": {price},
  "delivery_fee": 4.99,
  "platform_fee": 1.00,
  "tip": 3.00,
  "total_amount": {calculated},
  "payment_method": "card",
  "payment_status": "succeeded",
  "special_instructions": "Order 1: Self-delivery test. Ring doorbell.",
  "leave_at_door": false
}
```
Save `order_id` and `order_number`.

**Step 2 — Confirm payment (use /api/erp/ router path, NOT alias):**
```
POST /api/erp/orders/{order_id}/confirm-payment
Authorization: Bearer {vendor_token}
```

**Step 3 — Restaurant accepts order:**
```
POST /erp/orders/{order_id}/restaurant-accept
Authorization: Bearer {vendor_token}
Body: {"estimated_prep_minutes": 10}
```
Verify status transitions to PREPARING.

**Step 4 — Mark ready for pickup:**
```
PATCH /api/orders/{order_id}/status
Authorization: Bearer {vendor_token}
Body: {"status": "ready_for_pickup"}
```

**Step 5 — Start delivery decision window (3 min):**
```
POST /api/erp/orders/{order_id}/start-delivery-decision
Authorization: Bearer {vendor_token}
```
Log `window_seconds` and `timeout_at`.

**Step 6 — Check delivery decision status:**
```
GET /api/erp/orders/{order_id}/delivery-decision-status
Authorization: Bearer {vendor_token}
```
Log `remaining_seconds`.

**Step 7 — Restaurant chooses SELF-DELIVER:**
```
POST /api/erp/orders/{order_id}/restaurant-delivery-decision
Authorization: Bearer {vendor_token}
Body: {"decision": "self_deliver"}
```
Verify response shows `decision: self_deliver`, `status: restaurant_will_deliver`.

**Step 8 — Restaurant marks out for delivery:**
```
PATCH /api/orders/{order_id}/status
Authorization: Bearer {vendor_token}
Body: {"status": "out_for_delivery"}
```

**Step 9 — Upload delivery proof photo:**
Create a small test image (1x1 PNG or use any small image file).
```
POST /erp/orders/{order_id}/delivery-photo
Authorization: Bearer {vendor_token}
Content-Type: multipart/form-data
file: <test_image.png>
```
Log photo upload response.

**Step 10 — Mark as delivered (triggers accounting + proof gate):**
```
POST /erp/orders/{order_id}/delivered
Authorization: Bearer {vendor_token}
```
This should return 200 with accounting entries (JournalEntry created) since photo was uploaded.
If it returns `requires_photo: true`, the photo wasn't associated — try uploading again then retry.

**Step 11 — Verify final status:**
```
GET /api/orders/{order_id}
Authorization: Bearer {customer_token}
```
Confirm status=delivered, restaurant_will_deliver=true, check for accounting data.

**Step 12 — Trigger receipt email (if not auto-sent):**
Check if the delivered endpoint triggered email. If there's a send-receipt endpoint:
```
POST /api/orders/{order_id}/send-receipt
```
Receipt must go to support@dollor.ai (the demo customer email or configure explicitly).

Log EVERY step's HTTP status and key response fields in detail for the CR ticket.
  </action>
  <verify>
Order 1 status is "delivered" with restaurant_will_deliver=true. Photo proof uploaded. Accounting entries created. All step transitions logged.
  </verify>
  <done>Order 1 fully delivered via restaurant self-delivery path with photo proof and accounting entries.</done>
</task>

<task type="auto">
  <name>Task 3: Order 2 — Full driver delivery lifecycle with photo proof</name>
  <action>
Walk Order 2 through the COMPLETE driver delivery lifecycle. Log every step with HTTP status, response body excerpt, and timestamps.

**Step 1 — Customer creates order:**
```
POST /api/orders
Authorization: Bearer {customer_token}
Body: {
  "customer_id": {customer_id},
  "customer_name": "Demo Customer",
  "customer_email": "demo.customer@dollor.ai",
  "customer_phone": "9498881234",
  "vendor_id": {vendor_id},
  "delivery_address": "22352 El Paseo, Rancho Santa Margarita, CA 92688",
  "delivery_lat": 33.641,
  "delivery_lng": -117.6028,
  "items": [{menu_item_2}],
  "subtotal": {price},
  "delivery_fee": 4.99,
  "platform_fee": 1.00,
  "tip": 4.00,
  "total_amount": {calculated},
  "payment_method": "card",
  "payment_status": "succeeded",
  "special_instructions": "Order 2: Driver delivery test. Leave at door.",
  "leave_at_door": true
}
```
Save `order_id_2` and `order_number_2`.

**Step 2 — Confirm payment:**
```
POST /api/erp/orders/{order_id_2}/confirm-payment
Authorization: Bearer {vendor_token}
```

**Step 3 — Restaurant accepts order:**
```
POST /erp/orders/{order_id_2}/restaurant-accept
Authorization: Bearer {vendor_token}
Body: {"estimated_prep_minutes": 15}
```

**Step 4 — Mark ready for pickup:**
```
PATCH /api/orders/{order_id_2}/status
Authorization: Bearer {vendor_token}
Body: {"status": "ready_for_pickup"}
```

**Step 5 — Restaurant declines self-delivery (sends to driver pool):**
Two options — use whichever works:

Option A (decision endpoint):
```
POST /api/erp/orders/{order_id_2}/start-delivery-decision
Authorization: Bearer {vendor_token}
```
Then:
```
POST /api/erp/orders/{order_id_2}/restaurant-delivery-decision
Authorization: Bearer {vendor_token}
Body: {"decision": "pass_to_driver"}
```

Option B (decline endpoint):
```
POST /erp/orders/{order_id_2}/restaurant-decline-delivery
Authorization: Bearer {vendor_token}
```

Verify order goes back to READY_FOR_PICKUP and available_for_drivers=true.

**Step 6 — Driver picks up assignment:**
```
POST /erp/orders/{order_id_2}/assign-driver
Authorization: Bearer {driver_token}
Body: {"driver_id": {driver_id}}
```

**Step 7 — Driver marks picked up:**
```
POST /erp/orders/{order_id_2}/picked-up
Authorization: Bearer {driver_token}
```

**Step 8 — Upload delivery proof photo:**
```
POST /erp/orders/{order_id_2}/delivery-photo
Authorization: Bearer {driver_token}
Content-Type: multipart/form-data
file: <test_image.png>
```

**Step 9 — Mark as delivered:**
```
POST /erp/orders/{order_id_2}/delivered
Authorization: Bearer {driver_token}
```
Should return 200 with accounting entries since photo was uploaded.

**Step 10 — Verify final status:**
```
GET /api/orders/{order_id_2}
Authorization: Bearer {customer_token}
```
Confirm status=delivered, driver_id assigned, restaurant_will_deliver=false.

**Step 11 — Trigger receipt email if needed.**

**IMPORTANT**: If Order 1's driver is still marked active, ensure Order 1 is fully delivered before starting Order 2's driver assignment (driver concurrent order limit from Quick-130).

Log EVERY step's HTTP status and key response fields for the CR ticket.

**Final step — Update CR ticket description with full audit trail:**
Include a table showing both orders' lifecycle steps, HTTP status codes, order IDs, order numbers, and any issues encountered.
  </action>
  <verify>
Order 2 status is "delivered" with driver assigned. Photo proof uploaded. Accounting entries created. Both orders verified in customer history. CR ticket updated with full audit trail.
  </verify>
  <done>Order 2 fully delivered via driver delivery path. Both orders complete with photo proof, accounting, and detailed audit trail in CR ticket.</done>
</task>

</tasks>

<verification>
1. Both orders show "delivered" status in customer order history
2. Order 1 has restaurant_will_deliver=true (self-delivery)
3. Order 2 has driver_id assigned and restaurant_will_deliver=false (driver delivery)
4. Photo proof uploaded for both orders
5. Accounting entries (JournalEntry) created for both orders
6. CR ticket has detailed step-by-step audit trail
7. No 500 errors encountered (validates Quick-132 and Quick-134 fixes)
</verification>

<success_criteria>
- 2 orders created and delivered on production for Google Restaurant (or Apple Restaurant fallback)
- Order 1: full self-delivery lifecycle (create -> pay -> accept -> prepare -> ready -> decision -> self_deliver -> out_for_delivery -> photo -> delivered)
- Order 2: full driver delivery lifecycle (create -> pay -> accept -> prepare -> ready -> decline_delivery -> driver_assign -> picked_up -> photo -> delivered)
- Both orders have photo proof and accounting entries
- Zero 500 errors in the flow
- CR ticket documents every step with HTTP status codes
</success_criteria>

<output>
After completion, create `.planning/quick/135-2-orders-google-restaurant-self-delivery/135-SUMMARY.md`
</output>
