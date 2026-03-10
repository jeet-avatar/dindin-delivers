---
phase: quick-132
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/order_flow.py
autonomous: true
requirements: [FIX-DELIVERED-500, FIX-PHOTO-PROOF, FIX-NAV-DIRECTIONS, FIX-ADDRESS-DISPLAY]

must_haves:
  truths:
    - "POST /erp/orders/{id}/delivered returns 200 (not 500) on production"
    - "PUT /erp/orders/{id}/complete-delivery returns 200 (not 500) on production"
    - "POST /erp/orders/{id}/delivery-photo uploads photo and returns 200"
    - "JournalEntry accounting records are created when deliveries complete"
    - "Driver app shows customer delivery address during active delivery"
    - "Driver app shows Navigate to Customer button with working directions"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "delivery-photo alias endpoint + defensive fixes in alias forwarding"
      contains: "delivery-photo"
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "Defensive None-safe arithmetic in order_delivered accounting logic"
      contains: "or 0"
  key_links:
    - from: "iOS P2PAPIService.swift uploadDeliveryPhoto"
      to: "/erp/orders/{id}/delivery-photo"
      via: "main_new.py alias -> order_flow.py upload_delivery_photo"
      pattern: "erp/orders.*delivery-photo"
    - from: "main_new.py order_delivered_alias"
      to: "order_flow.py order_delivered()"
      via: "direct function call with _auth"
      pattern: "order_delivered\\(order_id, db, _auth\\)"
---

<objective>
Fix 4 delivery flow bugs found during Quick-130 E2E production testing that prevent delivery completion, photo proof upload, and proper address/navigation display for drivers.

Purpose: These bugs mean (1) accounting entries are NOT created for deliveries on production (500 errors), (2) delivery proof photos can't be uploaded from the iOS app (missing alias), and (3) drivers may not see customer address/navigation during active deliveries (data issues). All of these are critical for production food delivery operations.

Output: Fixed backend endpoints, new delivery-photo alias, defensive accounting arithmetic, and verified address data flow.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/130-create-10-test-orders-e2e-lifecycle-on-p/130-SUMMARY.md
@apps/web/p2p-platform/backend/main_new.py (lines 14475-14600 — alias endpoints)
@apps/web/p2p-platform/backend/order_flow.py (lines 3457-3580 — order_delivered + accounting, lines 4337-4400 — upload_delivery_photo, lines 3095-3170 — available orders response)
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift (lines 4824-4900 — completeDelivery + uploadDeliveryPhoto)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CR ticket with full audit trail, fix delivered 500 + add delivery-photo alias</name>
  <files>apps/web/p2p-platform/backend/main_new.py, apps/web/p2p-platform/backend/order_flow.py</files>
  <action>
Create a CR ticket (priority: Critical, change_type: code) per ticketed-task skill. The CR description MUST include the full 4-bug audit trail below:

**CR Description (include ALL of this in the ticket description field):**

```
BUG 1 — CRITICAL: /erp/orders/{id}/delivered returns 500
- Found: Quick-130 E2E production test (2026-03-10)
- Symptom: POST /erp/orders/{id}/delivered and PUT /erp/orders/{id}/complete-delivery return HTTP 500
- Root cause: The order_delivered() function in order_flow.py (line 3532-3534) performs arithmetic on order.delivery_fee, order.tip, order.subtotal, and order.discount_amount which may be None. Specifically: `order.subtotal - (order.discount_amount or 0) - RESTAURANT_PLATFORM_FEE` and `order.delivery_fee + order.tip` will TypeError if delivery_fee or tip is None.
- Impact: JournalEntry accounting records NOT created for any deliveries. Production workaround was PUT /api/erp/orders/{id}/status?status=delivered which skips accounting.
- Fix: Add defensive `or 0` to all arithmetic in order_delivered() accounting section. Also add try/except around the JournalEntry block so a failure in accounting doesn't prevent the order status from being updated to DELIVERED.

BUG 2 — HIGH: Photo proof upload 404s from iOS app
- Found: Quick-130 E2E production test (2026-03-10)
- Symptom: iOS driver/restaurant apps call PUT /erp/orders/{orderId}/delivery-photo but get 404
- Root cause: The upload_delivery_photo endpoint is registered on the order_flow router at /api/erp/orders/{id}/delivery-photo but there is NO alias in main_new.py for the /erp/ prefix path. All other delivery lifecycle endpoints have aliases (picked-up, complete-delivery, delivered, etc.) but delivery-photo was missed.
- Impact: Drivers cannot upload delivery proof photos from the iOS app, which means the delivery proof gate in order_delivered() always triggers (no photo_url = always returns requires_photo=true), creating an infinite loop.
- Fix: Add POST /erp/orders/{order_id}/delivery-photo alias in main_new.py that forwards to upload_delivery_photo().

BUG 3 — MEDIUM: Navigation/directions to customer not showing during active delivery
- Found: Quick-130 manual app testing (2026-03-10)
- Symptom: Driver app doesn't show "Navigate to Customer" button during active delivery
- Root cause: PickupDropoffView.swift line 166 checks `order.deliveryAddress.latitude != 0 && order.deliveryAddress.longitude != 0`. If the backend returns null/None for dropoff_latitude/dropoff_longitude, these decode to 0.0 and the condition fails. The backend at order_flow.py:3138-3139 uses `delivery_addr.get("latitude")` which may return None if the delivery_address JSON doesn't include lat/lng, and falls back to `order.delivery_latitude` which may also be None.
- Impact: Drivers have no navigation assistance to find the customer's location.
- Fix: Ensure backend ALWAYS returns non-null dropoff_latitude/dropoff_longitude. Add fallback geocoding or at minimum return 0.0 instead of None so the iOS app can display the address text even without map pin.

BUG 4 — MEDIUM: Delivery address not displayed to driver
- Found: Quick-130 manual app testing (2026-03-10)
- Symptom: Customer delivery address blank/not visible during active delivery
- Root cause: Related to Bug 3 — the delivery_address JSON parsing at order_flow.py:3112-3117 may produce an address dict without "street" key if the original address was stored as a plain string. The backend returns customer_address as `delivery_addr.get("street", delivery_addr.get("address", "")) + ", " + delivery_addr.get("city", "")` which could produce just ", " if keys are missing. Also, the delivery_address response for P2PDeliveryOrder needs to include full structured data.
- Impact: Drivers don't know where to deliver.
- Fix: Make customer_address construction more robust — handle plain string addresses, missing keys, and ensure delivery_address dict always includes street/city/state/zip fields.
```

**Now fix the backend code:**

**Fix 1 — order_flow.py order_delivered() accounting arithmetic (line ~3530-3534):**

Change:
```python
restaurant_payout = order.subtotal - (order.discount_amount or 0) - RESTAURANT_PLATFORM_FEE
driver_payout = order.delivery_fee + order.tip
platform_revenue = CUSTOMER_SERVICE_FEE + RESTAURANT_PLATFORM_FEE
```

To:
```python
restaurant_payout = (order.subtotal or 0) - (order.discount_amount or 0) - RESTAURANT_PLATFORM_FEE
driver_payout = (order.delivery_fee or 0) + (order.tip or 0)
platform_revenue = CUSTOMER_SERVICE_FEE + RESTAURANT_PLATFORM_FEE
```

Also wrap the ENTIRE JournalEntry creation block (lines ~3507-3580) in a try/except so accounting failures don't prevent delivery status update. Move the `order.status = OrderStatus.DELIVERED` and `db.commit()` BEFORE the accounting block. Pattern:

```python
# Update order status FIRST (this must succeed)
order.status = OrderStatus.DELIVERED
order.delivered_at = datetime.now()
db.commit()

# THEN create accounting entries (failures logged but don't block delivery)
try:
    # ... JournalEntry creation ...
    db.commit()
except Exception as e:
    db.rollback()
    logging.error(f"Failed to create accounting entries for order {order.order_number}: {e}")
```

**Fix 2 — main_new.py: Add delivery-photo alias (add after line ~14502, near other delivery aliases):**

```python
@app.post("/erp/orders/{order_id}/delivery-photo")
async def delivery_photo_alias(
    order_id: int,
    file: UploadFile = File(...),
    _auth: dict = Depends(require_any_auth),
    db: Session = Depends(get_db),
):
    """Alias for iOS Driver/Restaurant app - upload delivery proof photo
    iOS calls: POST /erp/orders/{orderId}/delivery-photo
    """
    return await upload_delivery_photo(order_id, file, db, _auth)
```

Make sure to import `upload_delivery_photo` from `order_flow` at the top of main_new.py if not already imported. Also import `UploadFile` and `File` from `fastapi` if not already imported. Check existing imports first — these are likely already imported.

**Fix 3+4 — order_flow.py: Improve delivery address response (lines ~3112-3139 in get_available_orders, and similar in get_driver_active_orders around line ~4195):**

Update the delivery_addr parsing to be more robust:

```python
# Safely parse delivery address
delivery_addr = {}
if order.delivery_address:
    try:
        parsed = json.loads(order.delivery_address)
        if isinstance(parsed, dict):
            delivery_addr = parsed
        else:
            delivery_addr = {"address": str(parsed)}
    except (json.JSONDecodeError, TypeError):
        delivery_addr = {"address": str(order.delivery_address)}
```

Update `customer_address` construction to handle missing fields:
```python
"customer_address": _build_customer_address(delivery_addr, order),
```

Add a helper function near the top of the delivery section:
```python
def _build_customer_address(delivery_addr: dict, order) -> str:
    """Build a readable customer address from delivery_addr dict and order fields."""
    # Try structured fields first
    parts = []
    street = delivery_addr.get("street") or delivery_addr.get("address") or ""
    city = delivery_addr.get("city") or ""
    state = delivery_addr.get("state") or ""
    zip_code = delivery_addr.get("zip") or delivery_addr.get("zipCode") or ""

    if street:
        parts.append(street)
    if city:
        parts.append(city)
    if state:
        parts.append(state)
    if zip_code:
        parts.append(zip_code)

    if parts:
        return ", ".join(parts)

    # Fallback to full_address
    if delivery_addr.get("full_address") or delivery_addr.get("fullAddress"):
        return delivery_addr.get("full_address") or delivery_addr.get("fullAddress")

    # Last resort: the raw delivery_address string
    return str(order.delivery_address or "Address not available")
```

Update `dropoff_latitude`/`dropoff_longitude` to never return None:
```python
"dropoff_latitude": delivery_addr.get("latitude") or (getattr(order, 'delivery_latitude', None)) or 0.0,
"dropoff_longitude": delivery_addr.get("longitude") or (getattr(order, 'delivery_longitude', None)) or 0.0,
```

Also add the full structured delivery_address dict to the response:
```python
"delivery_address": {
    "street": delivery_addr.get("street") or delivery_addr.get("address") or "",
    "city": delivery_addr.get("city") or "",
    "state": delivery_addr.get("state") or "",
    "zip": delivery_addr.get("zip") or delivery_addr.get("zipCode") or "",
    "full_address": _build_customer_address(delivery_addr, order),
    "latitude": delivery_addr.get("latitude") or (getattr(order, 'delivery_latitude', None)) or 0.0,
    "longitude": delivery_addr.get("longitude") or (getattr(order, 'delivery_longitude', None)) or 0.0,
},
```

Apply the same fixes to BOTH `get_available_orders` (line ~3095) AND `get_driver_active_orders` (find it with grep — there's a similar function for active orders assigned to a specific driver). Search for all places that build the delivery response dict and apply the same patterns.

**IMPORTANT:** Do NOT modify any endpoint signatures or routing. Only fix the internal logic and add the one missing alias.
  </action>
  <verify>
1. `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -c "import main_new; print('import OK')"` — no syntax errors
2. `grep -n "delivery-photo" apps/web/p2p-platform/backend/main_new.py` — confirms new alias exists
3. `grep -n "or 0" apps/web/p2p-platform/backend/order_flow.py | grep -i "subtotal\|delivery_fee\|tip"` — confirms defensive arithmetic
4. `grep -n "_build_customer_address" apps/web/p2p-platform/backend/order_flow.py` — confirms helper function exists
5. `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && pytest tests/ -v --tb=short 2>&1 | tail -40` — all tests pass
  </verify>
  <done>
All 4 bugs fixed: (1) order_delivered() has defensive None-safe arithmetic + accounting wrapped in try/except, (2) /erp/orders/{id}/delivery-photo alias added, (3) dropoff_latitude/longitude never return None, (4) customer_address built robustly from structured + fallback fields. Full test suite passes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Deploy to production and verify all 4 fixes</name>
  <files>apps/web/p2p-platform/backend/main_new.py, apps/web/p2p-platform/backend/order_flow.py</files>
  <action>
1. Run full test suite: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && pytest tests/ -v --tb=short 2>&1 | tail -60`. Fix any regressions.

2. Commit with CR ID: `fix(quick-132): [CR-XXXX] fix 4 delivery flow bugs — 500 on delivered, missing photo alias, address/nav data`

3. Push to remote: `git push origin main`

4. Deploy to staging: `gh workflow run deploy-staging.yml --ref main`

5. Wait for staging deploy, then smoke test all 4 fixes:

   **Bug 1 — delivered endpoint no longer 500s:**
   ```
   curl -s -o /dev/null -w "%{http_code}" -X POST "https://d34u5ixl0bulv4.cloudfront.net/erp/orders/999/delivered" -H "Authorization: Bearer TEST" -H "Content-Type: application/json"
   ```
   Expect: 401 or 404 (NOT 500). 401 = auth rejection (correct). 404 = order not found (correct).

   **Bug 2 — delivery-photo alias exists:**
   ```
   curl -s -o /dev/null -w "%{http_code}" -X POST "https://d34u5ixl0bulv4.cloudfront.net/erp/orders/999/delivery-photo" -H "Authorization: Bearer TEST"
   ```
   Expect: 401 or 422 (NOT 404). 401 = auth rejection. 422 = missing file param (both correct — alias exists).

   **Bug 3+4 — dropoff coordinates in response:**
   Use demo driver login to get a token, then fetch active orders and verify `dropoff_latitude`, `dropoff_longitude`, `delivery_address`, and `customer_address` fields are populated (not null/empty).

6. Deploy to production: `gh workflow run deploy-dollar-ai.yml`

7. Monitor deploy: `gh run list --workflow=deploy-dollar-ai.yml --limit 3` then `gh run watch <run-id>`

8. Smoke test production with same curl commands against `https://api.dollor.ai`.

9. Transition CR ticket through: In Progress -> Staging -> Production -> Verified
  </action>
  <verify>
- Full test suite passes with zero regressions
- Staging smoke: /erp/orders/{id}/delivered returns non-500
- Staging smoke: /erp/orders/{id}/delivery-photo returns non-404
- Production deploy succeeds
- Production smoke: same verifications pass
- CR ticket transitioned to Verified
  </verify>
  <done>
All 4 delivery flow bugs fixed and deployed to production. Alias endpoints return proper HTTP codes (401/404) instead of 500. Delivery photo alias exists and accepts requests. Address/coordinate data is always populated in driver order responses. CR ticket verified with full audit trail.
  </done>
</task>

</tasks>

<verification>
- POST /erp/orders/{id}/delivered does not return 500 on production
- PUT /erp/orders/{id}/complete-delivery does not return 500 on production
- POST /erp/orders/{id}/delivery-photo does not return 404 on production
- order_delivered() accounting logic handles None values without TypeError
- Accounting failures are logged but don't block delivery status update
- dropoff_latitude/dropoff_longitude are never null in driver order responses
- customer_address and delivery_address are always populated in driver order responses
- All backend tests pass
- Production deployment succeeds
</verification>

<success_criteria>
All 4 bugs fixed, test suite green, deployed to production. Drivers can complete deliveries with photo proof through the iOS app. Accounting entries are created (or failures logged gracefully). Address and navigation data always available during active delivery.
</success_criteria>

<output>
After completion, create `.planning/quick/132-fix-4-delivery-flow-bugs-delivered-500-p/132-SUMMARY.md`
</output>
