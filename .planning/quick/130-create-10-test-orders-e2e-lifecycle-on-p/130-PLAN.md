---
phase: quick-130
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [E2E-ORDER-LIFECYCLE]

must_haves:
  truths:
    - "10 test orders created on production across Apple Restaurant and Google Restaurant"
    - "Orders progress through full lifecycle: created -> restaurant-accept -> driver-assign -> picked-up -> delivered"
    - "Mix of completion types: some with delivery photo proof, some with driver-side completion"
    - "Email notifications sent at each stage (order confirmation, restaurant acceptance, driver assigned, delivered)"
  artifacts: []
  key_links:
    - from: "customer auth token"
      to: "/api/orders/create"
      via: "POST with Bearer token"
      pattern: "orders/create"
    - from: "vendor auth token"
      to: "/erp/orders/{id}/restaurant-accept"
      via: "POST with Bearer token"
      pattern: "restaurant-accept"
    - from: "driver auth token"
      to: "/erp/orders/{id}/assign-driver"
      via: "POST with Bearer token"
      pattern: "assign-driver"
---

<objective>
Create 10 test orders on PRODUCTION (https://api.dollor.ai) using demo accounts, walk each through the full order lifecycle. Test restaurant acceptance, driver pool assignment, pickup, and delivery completion with a mix of photo-proof and direct completion. Verify email notifications at each stage.

Purpose: Validate the complete food order E2E flow on production before public launch.
Output: Test results log documenting all 10 orders and their lifecycle outcomes.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.agents/skills/ticketed-task/SKILL.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CR ticket and authenticate all 3 demo accounts</name>
  <files></files>
  <action>
NO CODE CHANGES. This is API-only testing on production.

1. Create a Change Request ticket on production:
   ```
   POST https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY
   {
     "title": "E2E test: 10 food orders full lifecycle on production",
     "description": "Create 10 test orders using demo accounts, walk through full lifecycle: order creation, restaurant acceptance, driver assignment, pickup, delivery. Mix of Apple Restaurant and Google Restaurant.",
     "change_type": "docs",
     "priority": "Low",
     "requested_by": "support@dollor.ai"
   }
   ```
   Extract CR ID. Submit for review:
   ```
   POST https://api.dollor.ai/api/admin/change-requests/{cr_id}/submit?secret_key=$ADMIN_SECRET_KEY
   ```

2. Authenticate all 3 demo accounts and store tokens:
   - Customer: POST /api/auth/customer/login with {"email": "demo.customer@dollor.ai", "password": "DemoCustomer2025!"}
   - Driver: POST /api/auth/driver/login with {"email": "demo.driver@dollor.ai", "password": "DemoDriver2025!"}
   - Vendor: POST /api/auth/vendor/login with {"email": "demo.restaurant@dollor.ai", "password": "DemoRestaurant2025!"}

3. Get vendor IDs and menu items for the demo restaurant:
   - GET /api/vendors/published — find Apple Restaurant and Google Restaurant vendor IDs
   - For each vendor, GET /erp/menu/{vendor_id} or check the menu items available

Store all tokens and IDs for Task 2.
  </action>
  <verify>
All 3 auth calls return 200 with JWT tokens. CR ticket created with valid CR-XXXX ID. Vendor IDs and menu item IDs confirmed.
  </verify>
  <done>CR ticket created and submitted. Customer, driver, and vendor tokens obtained. Vendor IDs and menu item IDs identified for both restaurants.</done>
</task>

<task type="auto">
  <name>Task 2: Create 10 orders and walk through full lifecycle</name>
  <files></files>
  <action>
NO CODE CHANGES. API-only testing on production (https://api.dollor.ai).

Create 10 orders using the customer token. Mix between 2 restaurant vendors. For each order, use the CreateOrderRequest format:
```json
{
  "customer_name": "Demo Customer",
  "customer_email": "demo.customer@dollor.ai",
  "customer_phone": "+15551234567",
  "vendor_id": {vendor_id},
  "items": [{"menu_item_id": {id}, "quantity": 1, "name": "Item Name", "price": 9.99}],
  "delivery_address": {"street": "123 Test St", "city": "New York", "state": "NY", "zip": "10001", "latitude": 40.7128, "longitude": -74.006},
  "tip": 2.00,
  "leave_at_door": false
}
```

POST each to /api/orders/create with customer Bearer token.

For each order, walk through lifecycle using these endpoints:

**Step A — Restaurant accepts (vendor token):**
POST /erp/orders/{order_id}/restaurant-accept
Body: {"estimated_prep_minutes": 15}

**Step B — Restaurant sends to driver pool (declines self-delivery):**
POST /erp/orders/{order_id}/restaurant-decline-delivery

**Step C — Driver assigns self:**
POST /erp/orders/{order_id}/assign-driver
Body: {"driver_id": {demo_driver_id}, "driver_eta_minutes": 10}

**Step D — Driver picks up:**
POST /erp/orders/{order_id}/picked-up

**Step E — Driver completes delivery:**
For orders 1-5: PUT /erp/orders/{order_id}/complete-delivery (direct completion)
For orders 6-10: POST /erp/orders/{order_id}/delivered (delivered endpoint)

**Variations across the 10 orders:**
- Orders 1-5: Apple Restaurant, various menu items, tip $2, leave_at_door=false
- Orders 6-10: Google Restaurant (or same vendor if only 1 exists), tip $3-5 varying, some with leave_at_door=true
- Some with delivery_instructions ("Ring doorbell", "Leave on porch", etc.)

**After each lifecycle step**, log:
- Order ID, order number
- HTTP status code at each step
- Any error messages
- Whether the status transitions correctly (pending -> preparing -> ready_for_pickup -> out_for_delivery -> delivered)

**Email verification:** After completing all orders, check order confirmation and delivery notification status. Note: cannot directly verify email delivery via API, but the system sends emails at each stage if configured. Log any email-related response fields.

Track results in a structured format:
| Order # | Vendor | Order ID | Create | Accept | Pool | Driver | Pickup | Deliver | Final Status |
  </action>
  <verify>
All 10 orders created (HTTP 200/201). All 10 walked through full lifecycle. Final status for each order is "delivered". No 500 errors encountered. Results table shows all steps passed.
  </verify>
  <done>10 test orders created on production, each walked through complete lifecycle (create -> accept -> pool -> driver-assign -> pickup -> deliver). Results documented with HTTP status codes at each step. Mix of restaurants, tip amounts, and delivery preferences tested.</done>
</task>

<task type="auto">
  <name>Task 3: Verify order data integrity and update CR ticket</name>
  <files></files>
  <action>
NO CODE CHANGES. API-only verification on production.

1. Verify all 10 orders appear in customer order history:
   GET /api/customer/orders with customer Bearer token
   Confirm all 10 order IDs appear with status "delivered"

2. Spot-check 2-3 orders for data integrity:
   GET /api/orders/{order_id} — verify:
   - Correct vendor_id, customer_email
   - Subtotal, tax, delivery_fee, tip calculated correctly
   - Status is "delivered"
   - Driver assigned (driver_id not null)
   - Delivery address persisted correctly

3. Check driver earnings/history:
   GET /api/auth/driver/me with driver token — verify delivery count reflects new orders

4. Transition CR ticket to Verified:
   ```
   POST /api/admin/change-requests/{cr_id}/transition?secret_key=$ADMIN_SECRET_KEY
   {"new_status": "Verified", "metadata": {"orders_created": 10, "orders_completed": 10}, "actor_email": "system@dollor.ai", "role": "system"}
   ```

5. Write SUMMARY documenting:
   - All 10 order IDs and their final statuses
   - Any issues encountered during lifecycle
   - Email notification observations
   - Data integrity check results
  </action>
  <verify>
GET /api/customer/orders returns all 10 test orders with "delivered" status. Data integrity checks pass on spot-checked orders. CR ticket transitioned to Verified.
  </verify>
  <done>All 10 orders verified in customer history as delivered. Data integrity confirmed (correct amounts, driver assignment, addresses). CR ticket marked Verified. SUMMARY written.</done>
</task>

</tasks>

<verification>
- All 10 orders created successfully on production (no 500s)
- Full lifecycle completed: create -> restaurant-accept -> driver-pool -> driver-assign -> pickup -> delivered
- Mix of restaurants and delivery preferences tested
- Customer order history shows all 10 orders as delivered
- CR ticket created and transitioned through workflow
</verification>

<success_criteria>
- 10/10 orders reach "delivered" status on production
- Zero 500 errors during lifecycle transitions
- Customer order history confirms all 10 delivered orders
- CR ticket completed (Verified status)
</success_criteria>

<output>
After completion, create `.planning/quick/130-create-10-test-orders-e2e-lifecycle-on-p/130-SUMMARY.md`
</output>
