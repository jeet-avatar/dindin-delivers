---
phase: quick-178
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/order_flow.py
autonomous: true
requirements: [RBAC-HARDENING-S1]

must_haves:
  truths:
    - "Customer tokens cannot call driver, vendor, or admin endpoints (403)"
    - "Driver tokens cannot call customer, vendor, or admin endpoints (403)"
    - "Vendor tokens cannot call customer, driver, or admin endpoints (403)"
    - "IDOR checks prevent users from acting on orders/resources they don't own"
    - "Admin endpoints reject non-admin tokens with 403"
    - "Payout-triggering endpoints (delivered, complete-delivery) only accept assigned driver"
  artifacts:
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "All 48 endpoints upgraded from require_any_auth to role-specific auth"
      contains: "require_customer, require_vendor, require_admin"
  key_links:
    - from: "order_flow.py endpoints"
      to: "auth_utils.py"
      via: "Depends(require_customer/require_driver/require_vendor/require_admin)"
      pattern: "Depends\\(require_(customer|driver|vendor|admin)\\)"
---

<objective>
Upgrade all 48 `require_any_auth` calls in order_flow.py to role-specific auth functions (`require_customer`, `require_driver`, `require_vendor`, `require_admin`) and add IDOR checks where path parameters reference user-owned resources.

Purpose: CRITICAL security hardening. Currently any authenticated user can call any endpoint -- a customer could mark orders as delivered (triggering payouts), process payouts, or access admin analytics.

Output: order_flow.py with proper RBAC on all 50 endpoints.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/auth_utils.py
@apps/web/p2p-platform/backend/order_flow.py
@.planning/todos/pending/2026-03-14-s1-order-flow-rbac-hardening.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update imports and replace all require_any_auth with role-specific auth</name>
  <files>apps/web/p2p-platform/backend/order_flow.py</files>
  <action>
**Step 1: Update the import line (line 21):**
Change from:
```python
from auth_utils import require_any_auth, require_driver
```
To:
```python
from auth_utils import require_any_auth, require_driver, require_customer, require_vendor, require_admin
```

**Step 2: Replace every `require_any_auth` dependency with the correct role-specific function per this mapping. For each endpoint, change the function signature parameter from `auth = Depends(require_any_auth)` to the correct role-specific version AND add IDOR checks inside the function body where noted.**

The auth functions return ORM objects: `require_customer` returns `Customer`, `require_driver` returns `Driver`, `require_vendor` returns `Vendor`, `require_admin` returns `User`. `require_any_auth` returns a `dict` (JWT payload). The parameter name MUST change to match the type (e.g., `customer: Customer = Depends(require_customer)`).

**CUSTOMER endpoints (2):**
- POST /orders/create (line ~1190): `customer: Customer = Depends(require_customer)` — the function already looks up customer from auth; replace that lookup with the injected customer object
- POST /orders/{order_id}/confirm-payment (line ~1484): `customer: Customer = Depends(require_customer)` + IDOR: verify `order.customer_id == customer.id`, return 403 if mismatch

**VENDOR endpoints (10):**
- POST /orders/{order_id}/restaurant-accept (line ~1641): `vendor: Vendor = Depends(require_vendor)` + IDOR: verify `order.vendor_id == vendor.id`
- POST /orders/{order_id}/restaurant-decline (line ~1753): `vendor: Vendor = Depends(require_vendor)` + IDOR: verify `order.vendor_id == vendor.id`
- GET /orders/pending-restaurant (line ~1860): `vendor: Vendor = Depends(require_vendor)` — filter results by vendor.id
- POST /orders/{order_id}/restaurant-accept-delivery (line ~1952): `vendor: Vendor = Depends(require_vendor)` + IDOR: verify `order.vendor_id == vendor.id`
- POST /orders/{order_id}/restaurant-decline-delivery (line ~2047): `vendor: Vendor = Depends(require_vendor)` + IDOR: verify `order.vendor_id == vendor.id`
- GET /orders/pending-delivery-decision (line ~2098): `vendor: Vendor = Depends(require_vendor)` — filter by vendor.id
- POST /orders/{order_id}/start-preparing (line ~2983): `vendor: Vendor = Depends(require_vendor)` + IDOR: verify `order.vendor_id == vendor.id`
- POST /orders/{order_id}/ready-for-pickup (line ~3013): `vendor: Vendor = Depends(require_vendor)` + IDOR: verify `order.vendor_id == vendor.id`
- GET /orders/vendor/{vendor_id} (line ~3066): `vendor: Vendor = Depends(require_vendor)` + IDOR: verify `int(vendor_id) == vendor.id`, return 403 if mismatch

**DRIVER endpoints (change from require_any_auth only -- 3 already use require_driver):**
- GET /orders/available-for-delivery (line ~3426): `driver: Driver = Depends(require_driver)`
- POST /orders/{order_id}/assign-driver (line ~3486): `driver: Driver = Depends(require_driver)` — driver self-assigns (verify driver is assigning themselves, not impersonating). NOTE: This endpoint may also be used by admins; if existing code checks for admin role, keep that path with `require_any_auth` and check role in body, OR use a union approach. Simplest: keep as `require_any_auth` and check role inside.
- POST /orders/{order_id}/picked-up (line ~3683): `driver: Driver = Depends(require_driver)` + IDOR: verify `order.driver_id == driver.id`
- POST /orders/{order_id}/delivered (line ~3783): `driver: Driver = Depends(require_driver)` + IDOR: verify `order.driver_id == driver.id` (CRITICAL: triggers payout)
- PUT /orders/{order_id}/complete-delivery (line ~4663): `driver: Driver = Depends(require_driver)` + IDOR: verify `order.driver_id == driver.id` (CRITICAL: triggers payout)
- POST /orders/{order_id}/delivery-photo (line ~4676): `driver: Driver = Depends(require_driver)` + IDOR: verify `order.driver_id == driver.id`
- POST /orders/{order_id}/vendor-arrived-at-delivery (line ~4801): `driver: Driver = Depends(require_driver)` + IDOR: verify `order.driver_id == driver.id`
- GET /orders/driver/{driver_id}/active (line ~4502): `driver: Driver = Depends(require_driver)` + IDOR: verify `int(driver_id) == driver.id`
- GET /orders/driver/{driver_id}/pending (line ~4577): `driver: Driver = Depends(require_driver)` + IDOR: verify `int(driver_id) == driver.id`
- PUT /orders/{order_id}/driver-location (line ~5050): `driver: Driver = Depends(require_driver)` + IDOR: verify `order.driver_id == driver.id`
- PUT /drivers/{driver_id}/location (line ~5372): `driver: Driver = Depends(require_driver)` + IDOR: verify `int(driver_id) == driver.id`
- PUT /drivers/{driver_id}/status (line ~5413): `driver: Driver = Depends(require_driver)` + IDOR: verify `int(driver_id) == driver.id`

**ADMIN endpoints (12):**
- PUT /orders/{order_id}/status (line ~3198): `admin: User = Depends(require_admin)`
- GET /payouts/pending (line ~4188): `admin: User = Depends(require_admin)`
- POST /payouts/{payout_id}/process (line ~4228): `admin: User = Depends(require_admin)`
- GET /journal-entries (line ~4267): `admin: User = Depends(require_admin)`
- GET /drivers (line ~4308): `admin: User = Depends(require_admin)`
- POST /drivers/create (line ~4334): `admin: User = Depends(require_admin)`
- PUT /orders/{order_id}/unassign-driver (line ~5015): `admin: User = Depends(require_admin)`
- POST /orders/{order_id}/auto-dispatch (line ~5086): `admin: User = Depends(require_admin)`
- POST /orders/{order_id}/broadcast-to-drivers (line ~5241): `admin: User = Depends(require_admin)`
- GET /analytics/realtime (line ~5444): `admin: User = Depends(require_admin)`
- GET /analytics/ai-employees (line ~5554): `admin: User = Depends(require_admin)`
- DELETE /orders/cleanup (line ~5824): `admin: User = Depends(require_admin)`
- POST /orders/{order_id}/refund (line ~5868): `admin: User = Depends(require_admin)`

**KEEP as require_any_auth (participant check, system, or multi-role):**
- POST /orders/{order_id}/send-to-restaurant (line ~1597): keep require_any_auth (system/internal trigger)
- POST /orders/{order_id}/check-restaurant-timeout (line ~1796): keep require_any_auth (system)
- POST /orders/{order_id}/request-delivery-decision (line ~1908): keep require_any_auth (system)
- GET /rides/{ride_id}/receipt (line ~1074): keep require_any_auth (customer or driver participant)
- GET /orders/{order_id}/driver-location (line ~5318): keep require_any_auth (customer tracking driver)
- GET /orders/{order_id}/full-tracking (line ~5619): keep require_any_auth (any participant)
- PATCH /orders/{order_id}/delivery-location (line ~5782): `customer: Customer = Depends(require_customer)` + IDOR: verify `order.customer_id == customer.id`

**IDOR pattern to use consistently:**
```python
# For order-scoped IDOR (vendor example):
order = db.query(Order).filter(Order.id == order_id).first()
if not order:
    raise HTTPException(status_code=404, detail="Order not found")
if order.vendor_id != vendor.id:
    raise HTTPException(status_code=403, detail="Not authorized for this order")

# For path-parameter IDOR (driver/{driver_id} example):
if int(driver_id) != driver.id:
    raise HTTPException(status_code=403, detail="Not authorized for this resource")
```

**IMPORTANT:** When changing the auth dependency, also update how the authenticated user is referenced in the function body. Many endpoints currently extract user info from the `auth` dict payload (e.g., `auth.get("sub")`). With role-specific auth, the dependency returns an ORM object (e.g., `customer.id`, `driver.email`). Trace each function body to update these references.

For assign-driver: keep `auth = Depends(require_any_auth)` since it serves both driver self-assign AND admin dispatch. Inside the body, check `auth.get("role")` or look up the user to determine if they're a driver or admin.
  </action>
  <verify>
Run from backend directory:
```bash
cd apps/web/p2p-platform/backend && python -c "import order_flow; print('Import OK')"
grep -c "require_any_auth" order_flow.py  # Should show ~7 (the 6 kept + import line)
grep -c "require_customer" order_flow.py  # Should show 3 (create, confirm-payment, delivery-location)
grep -c "require_vendor" order_flow.py    # Should show 10
grep -c "require_admin" order_flow.py     # Should show 13
grep -c "require_driver" order_flow.py    # Should show 15+ (12 new + 3 existing)
```
  </verify>
  <done>All 48 require_any_auth calls replaced with role-specific auth. Import line updated. No require_any_auth remains except the 6 intentionally kept (system/participant endpoints) + import.</done>
</task>

<task type="auto">
  <name>Task 2: Run tests to verify no regressions</name>
  <files>apps/web/p2p-platform/backend/order_flow.py</files>
  <action>
Run the full backend test suite to verify the auth changes don't break existing tests:
```bash
cd apps/web/p2p-platform/backend && source venv/bin/activate && pytest tests/ -v --timeout=120
```

If tests fail due to the auth changes (e.g., tests using generic auth tokens now get 401/403), the tests are correctly catching the RBAC enforcement. Do NOT weaken the auth to fix tests. Instead, update test fixtures to use the correct role-specific tokens.

Common test fix patterns:
- Test calling a vendor endpoint with a generic token -> update to use a vendor token
- Test calling a driver endpoint with a generic token -> update to use a driver token
- If tests mock `require_any_auth`, they need to mock the specific auth function instead

Also verify the IDOR checks work by checking that the 403 responses include descriptive messages:
```bash
grep -n "Not authorized for this" order_flow.py | head -20
```
  </action>
  <verify>
```bash
cd apps/web/p2p-platform/backend && source venv/bin/activate && pytest tests/ -v --timeout=120 2>&1 | tail -20
```
Test suite passes (or only pre-existing failures remain -- no NEW failures from this change).
  </verify>
  <done>Test suite passes with RBAC changes. All role-specific auth enforced. IDOR checks in place for order-scoped and path-parameter endpoints. Zero regressions.</done>
</task>

</tasks>

<verification>
1. `grep -c "require_any_auth" order_flow.py` returns ~7 (6 intentionally kept + 1 import line)
2. `grep -c "require_customer\|require_vendor\|require_admin" order_flow.py` returns 25+
3. `grep -c "Not authorized" order_flow.py` returns 20+ (IDOR checks)
4. `python -c "import order_flow"` succeeds (no syntax errors)
5. `pytest tests/ -v` passes with no new failures
6. CRITICAL payout endpoints (delivered, complete-delivery) have IDOR: `grep -A5 "def.*delivered\|def.*complete_delivery" order_flow.py | grep "driver.id"`
</verification>

<success_criteria>
- All 48 require_any_auth replaced with correct role-specific auth per mapping
- IDOR checks on all order-scoped endpoints (20+ checks)
- IDOR checks on all path-parameter endpoints (driver_id, vendor_id matches)
- Import line updated with all 5 auth functions
- Test suite passes with no new failures
- CRITICAL: delivered + complete-delivery endpoints verify assigned driver before triggering payout
</success_criteria>

<output>
After completion, create `.planning/quick/178-s1-order-flow-py-rbac-hardening-upgrade-/178-SUMMARY.md`
</output>
