---
phase: quick-136
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/136-e2e-delivery-test-google-restaurant-andr/136-E2E-REPORT.md
autonomous: true
requirements: [E2E-DELIVERY-001, E2E-DELIVERY-002]
must_haves:
  truths:
    - "Order 1 (Google Restaurant / driver pool) completes full lifecycle: place -> accept -> prepare -> ready -> driver pickup -> en route -> photo proof -> delivered"
    - "Order 2 (Apple Restaurant / self-delivery) completes full lifecycle: place -> accept -> prepare -> ready -> restaurant self-deliver -> en route -> photo proof -> delivered"
    - "Push notifications verified at every status transition for both orders"
    - "Receipt email sent to customer email for both orders"
    - "Delivered endpoint returns 200 with JournalEntry accounting data"
    - "Delivery address with navigation coordinates visible to driver/restaurant"
  artifacts:
    - path: ".planning/quick/136-e2e-delivery-test-google-restaurant-andr/136-E2E-REPORT.md"
      provides: "Step-by-step E2E delivery test report with every API call documented"
      min_lines: 200
  key_links:
    - from: "POST /api/erp/orders/create"
      to: "order_flow.py:create_order"
      via: "order creation with vendor_id"
      pattern: "create_order"
    - from: "POST /api/erp/orders/{id}/delivered"
      to: "order_flow.py:order_delivered"
      via: "delivery completion with accounting"
      pattern: "order_delivered"
---

<objective>
Run comprehensive E2E delivery tests on PRODUCTION for two complete order flows:

1. **Order 1 (Android/Google Restaurant path):** Google Restaurant (vendor_id=134) with driver pool delivery
2. **Order 2 (iOS/Apple Restaurant path):** Apple Restaurant (vendor_id=40) with restaurant self-delivery

Document every API call, response, push notification, and accounting entry in a detailed report.

Purpose: Verify the full food delivery pipeline works end-to-end on production after Quick-132/134 fixes (delivered endpoint, photo alias, proof gate).
Output: `136-E2E-REPORT.md` with numbered steps showing request/response/notification/PASS-FAIL for every transition.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/web/p2p-platform/backend/order_flow.py (delivery flow: create_order, restaurant_accept, ready_for_pickup, assign_driver, order_picked_up, complete_delivery, upload_delivery_photo, order_delivered)
@apps/web/p2p-platform/backend/main_new.py (auth endpoints, vendor online-status, aliases)
@.agents/skills/ticketed-task/SKILL.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Setup — Authenticate all actors and prepare Google Restaurant (vendor_id=134)</name>
  <files>.planning/quick/136-e2e-delivery-test-google-restaurant-andr/136-E2E-REPORT.md</files>
  <action>
Create a CR ticket for this E2E test (change_type: "docs", priority: "Medium").

Then authenticate all three demo actors on production (https://api.dollor.ai):

**Customer auth:**
```
POST /api/customer/demo-login
Body: {"email_hint": "demo.customer@dollor.ai"}
```
Save customer token + customer_id.

**Driver auth:**
```
POST /api/auth/driver/demo-login
Body: {"email_hint": "demo.driver@dollor.ai"}
```
Save driver token + driver_id. Then set driver online:
```
POST /api/drivers/{driver_id}/status
Body: {"is_online": true}
```

**Vendor auth (Apple Restaurant, vendor_id=40):**
```
POST /api/auth/vendor/login
Body (form): username=demo.restaurant@dollor.ai, password=DemoRestaurant2025!
```
Save vendor token.

**Google Restaurant (vendor_id=134) setup:**
1. First, check if vendor_id=134 exists via `GET /api/vendors/published` (public, no auth) — search for it in the response list
2. If vendor 134 is not published or not online, use admin API:
   - `GET /api/vendors/134?secret_key=$ADMIN_SECRET_KEY` via admin auth middleware to check status
   - If not approved: `PATCH /api/vendors/134/status?status=approved&skip_document_check=true&secret_key=$ADMIN_SECRET_KEY` (admin auth)
   - If not published: `POST /api/admin/vendors/134/publish?secret_key=$ADMIN_SECRET_KEY` (admin auth)
3. Check if vendor 134 has a User account (try login with its contact_email). If no credentials exist:
   - Use `POST /api/vendors/134/create-account` (admin auth) with a known password
   - Then login with those credentials
4. Set vendor 134 online: `PUT /api/vendors/134/online-status?is_online=true` (vendor auth)
5. Verify vendor 134 has menu items via `GET /api/vendors/published` — need at least 1 item to place an order

Also set Apple Restaurant (vendor_id=40) online:
`PUT /api/vendors/40/online-status?is_online=true` (vendor auth from demo.restaurant login)

Start writing the report header with setup results. Document every curl call and response.

IMPORTANT: The ADMIN_SECRET_KEY is needed for admin endpoints. Check if it's set in env. If not, try fetching from AWS Secrets Manager: `aws secretsmanager get-secret-value --secret-id dollor/production/admin-yCDIFY --query SecretString --output text`. Parse the JSON to get the key.
  </action>
  <verify>
All three tokens obtained (customer, driver, vendor x2). Both restaurants online. Google Restaurant has menu items. Report file started with setup section.
  </verify>
  <done>Customer, driver, and both vendor accounts authenticated. Both restaurants online and accepting orders. Report documents all setup API calls with responses.</done>
</task>

<task type="auto">
  <name>Task 2: Execute Order 1 (Google Restaurant / Driver Pool) and Order 2 (Apple Restaurant / Self-Delivery) — Full Lifecycle</name>
  <files>.planning/quick/136-e2e-delivery-test-google-restaurant-andr/136-E2E-REPORT.md</files>
  <action>
Execute both orders sequentially on production, documenting every step.

**ORDER 1: Google Restaurant (vendor_id=134) — Driver Pool Path**

Step 1 — Place Order:
```
POST /api/erp/orders/create (or /api/orders/create)
Headers: Authorization: Bearer {customer_token}
Body: {
  "customer_name": "Demo Customer",
  "customer_email": "support@dollor.ai",
  "customer_phone": "+14155550001",
  "vendor_id": 134,
  "items": [{"menu_item_id": {first_menu_item_id}, "quantity": 1, "price": {item_price}}],
  "delivery_address": {"street": "100 Main St", "city": "San Francisco", "state": "CA", "zip": "94105", "latitude": 37.7749, "longitude": -122.4194},
  "delivery_instructions": "E2E test order - ring doorbell",
  "tip": 3.00,
  "leave_at_door": false
}
```
Record order_id, order_number, total_amount.

Step 2 — Restaurant Accepts (vendor 134 auth):
```
POST /api/erp/orders/{order_id}/restaurant-accept
Body: {"estimated_prep_minutes": 15}
```
Check: push notification to customer ("Restaurant accepted your order").

Step 3 — Start Preparing:
```
POST /api/erp/orders/{order_id}/start-preparing
```

Step 4 — Ready for Pickup:
```
POST /api/erp/orders/{order_id}/ready-for-pickup
```
Check: This triggers delivery decision request. Since this is driver pool path, either auto-dispatch or we decline delivery for restaurant.

Step 5 — Restaurant Declines Self-Delivery (sends to driver pool):
```
POST /api/erp/orders/{order_id}/restaurant-decline-delivery
```

Step 6 — Driver Picks Up from Pool:
```
GET /api/erp/orders/available-for-delivery (driver auth)
POST /api/erp/orders/{order_id}/assign-driver
Body: {"driver_id": {demo_driver_id}}
```
Check: push notification to customer ("Driver assigned").

Step 7 — Driver Picks Up Order:
```
POST /api/erp/orders/{order_id}/picked-up (driver auth)
```
Check: push notification to customer ("Driver picked up your order").

Step 8 — Upload Delivery Photo Proof:
```
POST /api/erp/orders/{order_id}/delivery-photo
Headers: Authorization: Bearer {driver_token}
Body: multipart form with a test image file (create a small JPEG or use a placeholder)
```
Record: photo_url from response.

Step 9 — Mark Delivered:
```
POST /api/erp/orders/{order_id}/delivered (driver auth)
```
Verify response contains: JournalEntry with entry_number, restaurant_payout, driver_payout, platform_revenue.
Check: push notification to customer ("Order delivered").
Check: receipt email sent (response should indicate email was sent; also check logs).

**ORDER 2: Apple Restaurant (vendor_id=40) — Self-Delivery Path**

Step 1 — Place Order (same customer):
```
POST /api/erp/orders/create
Body: same structure but vendor_id=40, use Apple Restaurant menu items
"customer_email": "support@dollor.ai"
```

Step 2 — Restaurant Accepts (demo.restaurant vendor auth):
```
POST /api/erp/orders/{order_id}/restaurant-accept
Body: {"estimated_prep_minutes": 10}
```

Step 3 — Start Preparing:
```
POST /api/erp/orders/{order_id}/start-preparing
```

Step 4 — Ready for Pickup:
```
POST /api/erp/orders/{order_id}/ready-for-pickup
```

Step 5 — Restaurant Accepts Self-Delivery:
```
POST /api/erp/orders/{order_id}/restaurant-accept-delivery
```
Check: push notification to customer ("Restaurant is delivering your order directly").

Step 6 — Upload Delivery Photo (vendor auth since restaurant is delivering):
```
POST /api/erp/orders/{order_id}/delivery-photo
Body: multipart form with test image
```

Step 7 — Mark Delivered (vendor auth):
```
POST /api/erp/orders/{order_id}/delivered
```
Verify: JournalEntry accounting, push notification, receipt email.

**For EACH step in both orders, document in the report:**
- Step number and description
- Full curl command (endpoint, method, headers summary, body)
- HTTP status code + full response body (truncated if huge)
- Whether push notification was triggered (check response fields like `notification_sent`, or note that `send_push_notification()` was called based on the status transition)
- Delivery address and coordinates visible in order data
- PASS or FAIL verdict

**Push notification verification approach:**
- The backend calls `send_push_notification()` at each status transition (confirmed in order_flow.py lines: 1514, 1673, 1978, 2148, 2345, 2390, 2448, 2497, 3347, 3466, 3780, 4508, 4579, 4604, 4662)
- Check response JSON for `notification_sent` fields
- If no explicit field, note "push notification expected per order_flow.py line X" based on the status transition

**Photo proof approach:**
- Create a minimal valid JPEG file (can be a 1x1 pixel) for upload via multipart form
- Use `curl -F "file=@/path/to/test.jpg"` syntax

**Receipt email:**
- Receipt is sent at order_flow.py:3861 via `send_order_delivered_with_receipt_email()` to `order.customer_email`
- Since we set customer_email to "support@dollor.ai", receipt goes there
- Note in report: "Receipt email dispatched to support@dollor.ai"
  </action>
  <verify>
Both orders reach DELIVERED status. Report contains every API call with request/response. JournalEntry accounting present in both delivered responses. Photo proof uploaded for both. No 4xx/5xx errors in the happy path.
  </verify>
  <done>
Order 1 (Google Restaurant / driver pool) fully delivered with accounting. Order 2 (Apple Restaurant / self-delivery) fully delivered with accounting. Report at `136-E2E-REPORT.md` documents every step numbered with endpoint, request body, response, push notification status, and PASS/FAIL verdict. Receipt emails sent to support@dollor.ai for both orders.
  </done>
</task>

</tasks>

<verification>
1. Both orders show status=DELIVERED in their final response
2. JournalEntry with entry_number exists for both orders
3. Photo proof URL recorded for both orders
4. No 500 errors in any step
5. Report file is comprehensive with every API call documented
6. Push notification status noted at every transition
</verification>

<success_criteria>
- 136-E2E-REPORT.md exists with 200+ lines documenting both order flows
- Order 1: Google Restaurant (vendor_id=134) delivered via driver pool with all transitions documented
- Order 2: Apple Restaurant (vendor_id=40) delivered via self-delivery with all transitions documented
- Every step shows: endpoint, request, response status, push notification, PASS/FAIL
- Both delivered responses include JournalEntry accounting data
- Photo proof uploaded and recorded for both orders
- Receipt emails dispatched to support@dollor.ai
</success_criteria>

<output>
After completion, create `.planning/quick/136-e2e-delivery-test-google-restaurant-andr/136-SUMMARY.md`
</output>
