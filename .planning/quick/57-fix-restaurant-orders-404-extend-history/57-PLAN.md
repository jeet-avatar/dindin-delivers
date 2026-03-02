---
phase: quick-57
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/order_flow.py
autonomous: true
requirements: [Q57-01, Q57-02, Q57-03]
must_haves:
  truths:
    - "iOS Restaurant app loads vendor orders without 404"
    - "Vendor sees all orders from last 90 days, not just 48 hours"
    - "Vendor earnings endpoint returns data grouped by year and month"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Alias route /erp/orders/vendor/{vendor_id} and /erp/vendor/earnings"
      contains: "/erp/orders/vendor/"
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "90-day order history window"
      contains: "timedelta(days=90)"
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Vendor earnings with year/month breakdown"
      contains: "monthly_breakdown"
  key_links:
    - from: "iOS P2PAPIService.swift:3131"
      to: "/erp/orders/vendor/{vendor_id}"
      via: "alias route in main_new.py"
      pattern: "erp/orders/vendor"
    - from: "iOS RestaurantSettingsView.swift"
      to: "/erp/vendor/earnings"
      via: "alias route in main_new.py"
      pattern: "erp/vendor/earnings"
---

<objective>
Fix Restaurant iOS app orders returning 404 by adding missing /erp/ alias route, extend order history from 48h to 90 days, and add year/month earnings breakdown to vendor earnings endpoint.

Purpose: Restaurant app is completely broken for viewing orders (404 due to missing alias), and history is too short (48h window misses all existing orders). Earnings need monthly grouping for useful financial overview.
Output: Working vendor orders + extended history + earnings by month
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/main_new.py (lines 14074-14220 — alias pattern)
@apps/web/p2p-platform/backend/order_flow.py (lines 2275-2392 — get_vendor_orders)
@apps/web/p2p-platform/backend/main_new.py (lines 10202-10256 — get_vendor_earnings)
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift (line 3131 — iOS call site)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add /erp/ vendor orders alias + extend history to 90 days</name>
  <files>
    apps/web/p2p-platform/backend/main_new.py
    apps/web/p2p-platform/backend/order_flow.py
  </files>
  <action>
**1a. Add `get_vendor_orders` to the import block in main_new.py (~line 14076):**

In the `from order_flow import (...)` block at line 14076, add `get_vendor_orders` to the import list (after `get_full_order_tracking`).

**1b. Add alias route in main_new.py after the existing aliases (~line 14220 area):**

Add this alias alongside the other iOS Restaurant app aliases. Follow the EXACT pattern of the existing aliases (separate alias function forwarding to the imported handler). Note: Cannot use multi-decorator pattern here because `get_vendor_orders` is on the `order_flow_router` with prefix `/api/erp`, while the alias needs to be on `@app` without prefix.

```python
@app.get("/erp/orders/vendor/{vendor_id}")
async def get_vendor_orders_alias(vendor_id: int, vendor: Vendor = Depends(require_vendor), db: Session = Depends(get_db)):
    """Alias for iOS Restaurant app - get vendor orders
    iOS calls: GET /erp/orders/vendor/{vendorId}
    Original: /api/erp/orders/vendor/{vendor_id}
    """
    # SECURITY: Verify the authenticated vendor owns this account
    if vendor.id != vendor_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return await get_vendor_orders(vendor_id, db, _auth={})
```

Note: `get_vendor_orders` signature is `(vendor_id, db, _auth)` — pass a dummy dict for `_auth` since we already verified auth via `require_vendor`. Check the exact signature at order_flow.py:2276 and match it.

**1c. Extend order history from 48h to 90 days in order_flow.py:**

At `order_flow.py:2286`, change:
```python
cutoff_48h = datetime.now() - timedelta(hours=48)
```
to:
```python
cutoff_90d = datetime.now() - timedelta(days=90)
```

Also update the variable reference at line 2291:
```python
Order.created_at >= cutoff_90d
```

Update the docstring at line 2283 from "last 48 hours" to "last 90 days".

Also update the limit from 100 to 500 at line 2292 to accommodate the wider window.
  </action>
  <verify>
    1. `grep -n "erp/orders/vendor" apps/web/p2p-platform/backend/main_new.py` — should show the new alias route
    2. `grep -n "timedelta(days=90)" apps/web/p2p-platform/backend/order_flow.py` — confirms 90-day window
    3. `cd apps/web/p2p-platform/backend && python -c "from main_new import app; routes = [r.path for r in app.routes]; assert '/erp/orders/vendor/{vendor_id}' in routes, f'Missing alias. Routes with vendor: {[r for r in routes if \"vendor\" in r]}'; print('PASS: alias route registered')"` — confirms route is registered
  </verify>
  <done>
    - `/erp/orders/vendor/{vendor_id}` alias exists in main_new.py, matching iOS app's call pattern
    - Order history window is 90 days (not 48 hours)
    - Alias has `require_vendor` auth + ownership check (vendor.id == vendor_id)
  </done>
</task>

<task type="auto">
  <name>Task 2: Add year/month earnings breakdown to vendor earnings endpoint</name>
  <files>
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
**2a. Enhance the existing `/api/vendor/earnings` endpoint at main_new.py:10202:**

Modify `get_vendor_earnings()` to always include an all-time `monthly_breakdown` array regardless of the `period` parameter. After the existing `orders` query (line 10227), add logic to:

1. Query ALL completed orders for this vendor (no date filter) for the breakdown
2. Group by year and month using Python:

```python
from collections import defaultdict

# All-time orders for monthly breakdown
all_orders = db.query(Order).filter(
    Order.vendor_id == vendor.id,
    Order.status.in_([OrderStatus.DELIVERED, OrderStatus.COMPLETED])
).all()

# Build year/month breakdown
monthly_data = defaultdict(lambda: {"order_count": 0, "gross_sales": 0.0})
for o in all_orders:
    if o.created_at:
        key = f"{o.created_at.year}-{o.created_at.month:02d}"
        monthly_data[key]["order_count"] += 1
        monthly_data[key]["gross_sales"] += float(o.subtotal or 0)

monthly_breakdown = []
for key in sorted(monthly_data.keys(), reverse=True):
    data = monthly_data[key]
    year, month = key.split("-")
    platform_fee = data["order_count"] * 1.0
    monthly_breakdown.append({
        "year": int(year),
        "month": int(month),
        "order_count": data["order_count"],
        "gross_sales": round(data["gross_sales"], 2),
        "platform_fee": round(platform_fee, 2),
        "net_earnings": round(data["gross_sales"] - platform_fee, 2)
    })
```

3. Add these fields to the return dict:
   - `"all_time_net_earnings"`: sum of net from all_orders (gross - $1/order)
   - `"all_time_order_count"`: len(all_orders)
   - `"monthly_breakdown"`: the sorted array above

**2b. Add `/erp/vendor/earnings` alias for iOS:**

iOS Restaurant app may call `/erp/vendor/earnings` (without `/api` prefix). Add an alias route:

```python
@app.get("/erp/vendor/earnings")
async def get_vendor_earnings_alias(period: str = "today", vendor: Vendor = Depends(require_vendor), db: Session = Depends(get_db)):
    """Alias for iOS Restaurant app - vendor earnings
    iOS calls: GET /erp/vendor/earnings
    Original: /api/vendor/earnings
    """
    return await get_vendor_earnings(period=period, vendor=vendor, db=db)
```

Place this near the other iOS aliases section (~line 14220 area).
  </action>
  <verify>
    1. `grep -n "monthly_breakdown" apps/web/p2p-platform/backend/main_new.py` — confirms new field exists
    2. `grep -n "all_time_net_earnings" apps/web/p2p-platform/backend/main_new.py` — confirms all-time field
    3. `grep -n "erp/vendor/earnings" apps/web/p2p-platform/backend/main_new.py` — confirms alias exists
    4. `cd apps/web/p2p-platform/backend && python -c "from main_new import app; print('PASS: app imports cleanly')"` — no import errors
  </verify>
  <done>
    - `/api/vendor/earnings` returns `monthly_breakdown` array with year, month, order_count, gross_sales, platform_fee, net_earnings per month
    - `/api/vendor/earnings` returns `all_time_net_earnings` and `all_time_order_count`
    - `/erp/vendor/earnings` alias exists for iOS without /api prefix
    - Existing period-based response fields are preserved (backward compatible)
  </done>
</task>

<task type="auto">
  <name>Task 3: Run tests and verify no regressions</name>
  <files></files>
  <action>
Run the backend test suite to verify no regressions from the changes:

```bash
cd apps/web/p2p-platform/backend
pytest tests/unit/test_vendor_endpoints.py -v
pytest tests/ -v --timeout=60
```

If vendor earnings tests exist (test_get_earnings at test_vendor_endpoints.py:241), verify they still pass. The response shape is a superset of the old shape so existing tests should pass.

Also verify the app imports cleanly:
```bash
cd apps/web/p2p-platform/backend
python -c "from main_new import app; print('App loaded successfully')"
```
  </action>
  <verify>
    1. `pytest tests/unit/test_vendor_endpoints.py -v` — all tests pass
    2. `python -c "from main_new import app"` — no import errors
  </verify>
  <done>
    - All existing vendor endpoint tests pass
    - No import errors in main_new.py
    - Backend test suite shows no regressions from the changes
  </done>
</task>

</tasks>

<verification>
1. Route alias works: `grep "/erp/orders/vendor/" main_new.py` shows alias
2. History extended: `grep "timedelta(days=90)" order_flow.py` shows 90-day window
3. Earnings enhanced: `grep "monthly_breakdown" main_new.py` shows year/month grouping
4. Tests pass: `pytest tests/unit/test_vendor_endpoints.py -v` all green
5. Clean import: `python -c "from main_new import app"` succeeds
</verification>

<success_criteria>
- iOS Restaurant app GET /erp/orders/vendor/{id} returns 200 (not 404)
- Orders from up to 90 days ago are included in the response
- GET /api/vendor/earnings returns monthly_breakdown with year/month/net_earnings
- GET /erp/vendor/earnings alias works for iOS
- All existing tests pass with no regressions
</success_criteria>

<output>
After completion, create `.planning/quick/57-fix-restaurant-orders-404-extend-history/57-SUMMARY.md`
</output>
