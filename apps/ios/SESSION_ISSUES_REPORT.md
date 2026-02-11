# iOS Apps Production Issues Report
**Session Date**: 2026-02-04
**Status**: Read-Only Analysis (No Code Changes Made)

---

## EXECUTIVE SUMMARY

| Category | Issues Found | Severity |
|----------|--------------|----------|
| API Endpoint Duplicates | 69+ duplicate routes | Medium |
| Driver Accept Order | Crashes with 500 error | **Critical** |
| Active Orders Display | Shows delivered orders | High |
| Order Number Format | Inconsistent across apps | Medium |
| Error UI Missing | No alerts shown to user | High |

---

## ISSUE #1: Driver Accept Order Crashes (CRITICAL)

### Problem
When driver taps "Accept Order", the backend crashes with HTTP 500 Internal Server Error.

### Root Cause
`order_flow.py` line 2392 references `DriverStatus.ONLINE` which does not exist in the enum.

**Code in order_flow.py:2392:**
```python
if driver.status not in [DriverStatus.ACTIVE, DriverStatus.APPROVED, DriverStatus.ONLINE]:
```

**DriverStatus enum in models.py:690-695:**
```python
class DriverStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    # NO ONLINE!
```

### Impact
- Drivers cannot accept any orders
- Orders stay in "Available" forever
- iOS shows no error (see Issue #4)

### Fix Required
Either add `ONLINE = "online"` to `DriverStatus` enum OR remove `DriverStatus.ONLINE` from the check.

---

## ISSUE #2: Active Orders Shows Completed Orders

### Problem
The `/api/erp/orders/driver/{id}/active` endpoint returns ALL orders including delivered ones.

### Root Cause
`order_flow.py` line 3152-3154 has no status filter:

```python
orders = db.query(Order).filter(
    Order.driver_id == driver_id  # NO STATUS FILTER!
).order_by(Order.created_at.desc()).limit(100).all()
```

### Evidence
API returns 37 orders for driver 48:
- 8 `delivered` (should NOT be in active)
- 6 `out_for_delivery`
- 21 `ready_for_pickup`
- 2 `preparing`

### Fix Required
Add filter: `.filter(Order.status.notin_(['delivered', 'cancelled']))`

---

## ISSUE #3: Order Number Format Inconsistency

### Problem
Multiple order number formats exist, causing display issues in iOS apps.

### Formats Found in Database
| Format | Example | Source |
|--------|---------|--------|
| DOLL format | `DOLL2026165` | Backend order_flow.py, main_new.py |
| DEMO format | `DEMO-010515-458` | Demo/test data |
| EF format | `EF120500009` | Legacy (expected by iOS) |

### iOS Display Issues
Driver app truncates order numbers:

| Location | Code | Result for `DOLL2026165` |
|----------|------|--------------------------|
| PickupDropoffView.swift:780 | `.prefix(8)` | `DOLL2026` (loses unique ID) |
| ActiveDeliveryDetailView.swift:54 | `.prefix(8)` | `DOLL2026` |
| MyDeliveriesView.swift:250 | `.prefix(6)` | `DOLL20` |

### Backend Generation (order_flow.py:789)
```python
order_number = f"DOLL{datetime.now().year}{order_count + 1:03d}"
```

### Fix Required
1. Standardize order number format across all generators
2. Remove `.prefix()` truncation in iOS or increase to full length

---

## ISSUE #4: Error Messages Not Shown to User

### Problem
When API calls fail, `DeliveryViewModel` sets `showError = true` but no view displays it.

### Evidence
- `DeliveryViewModel.swift:16` has `@Published var showError = false`
- `DeliveryViewModel.swift:516-520` sets `showError = true` on errors
- **NO delivery view** has `.alert(isPresented: $viewModel.showError)`

### Views Missing Error Alert
- `DriverDashboardView.swift` - No alert
- `AvailableOrdersView.swift` - No alert
- `PickupDropoffView.swift` - No alert
- `MyDeliveriesView.swift` - No alert

### Views That Have Error Alert (for reference)
- `DriverProfileView.swift:76` - Has `.alert("Error", isPresented: $viewModel.showError)`
- Rideshare views - Have alerts

### Fix Required
Add `.alert(isPresented: $viewModel.showError)` to delivery views.

---

## ISSUE #5: Duplicate API Endpoints (69+ duplicates)

### Summary
Backend has 464+ endpoints in main_new.py + 48 in order_flow.py with many duplicates.

### Login Endpoints (17 duplicates)
| Endpoint | Purpose |
|----------|---------|
| `/api/auth/customer/login` | Customer login |
| `/auth/customer/login` | Alias without /api |
| `/api/erp/auth/customer/login` | ERP alias |
| `/api/auth/driver/login` | Driver login |
| `/auth/driver/login` | Alias without /api |
| `/api/erp/auth/driver/login` | ERP alias |
| `/api/auth/vendor/login` | Vendor login |
| `/auth/vendor/login` | Alias without /api |
| `/api/erp/auth/login` | Generic ERP login |
| `/api/admin/login` | Admin login |
| `/api/auth/admin/demo-login` | Demo admin |
| `/api/auth/vendor/demo-login` | Demo vendor |
| `/auth/vendor/demo-login` | Demo vendor alias |
| ... | ... |

### Driver Profile Endpoints (8 duplicates)
| Endpoint | Notes |
|----------|-------|
| `/erp/drivers/{id}` | Works |
| `/api/erp/drivers/{id}` | Alias with /api |
| `/drivers/{id}` | Returns 405 Method Not Allowed |
| `/api/drivers/{id}` | Different behavior |
| `/drivers/{id}/status` | Status endpoint |
| `/api/drivers/{id}/status` | Alias |
| `/drivers/{id}/documents` | Documents |
| `/api/drivers/{id}/documents` | Alias |

### Order Endpoints (20+ variations)
| Pattern | Variations |
|---------|------------|
| Order status | `/api/orders/{id}/status`, `/erp/orders/{id}/status`, `/api/erp/orders/{id}/status` |
| Assign driver | `/erp/orders/{id}/assign-driver`, `/api/erp/orders/{id}/assign-driver` |
| Active orders | `/erp/orders/driver/{id}/active`, `/api/erp/orders/driver/{id}/active` |

### iOS Uses These Endpoints (P2PAPIService.swift)
```
baseURL = "{p2pAPIBaseURL}/api"  # Already includes /api

So iOS calls:
- /api/auth/customer/login (works)
- /api/auth/driver/login (works)
- /api/auth/vendor/login (works)
- /api/erp/orders/... (works)
- /api/customer/orders (works)
```

---

## ISSUE #6: Route Conflicts

### Problem
Same path defined in both `main_new.py` (as proxy) and `order_flow.py` (actual implementation).

### Example: assign-driver
- `main_new.py:15139` - Proxy endpoint
- `order_flow.py:2355` - Actual implementation (via router)

Both define: `/api/erp/orders/{order_id}/assign-driver`

FastAPI uses first registered route, which should be `order_flow.py` (included at line 12274).

---

## iOS ENDPOINT MAPPING

### Customer App Uses:
| Feature | Endpoint | Status |
|---------|----------|--------|
| Login | `/api/auth/customer/login` | ✅ Works |
| Orders | `/api/customer/orders` | ✅ Works |
| Active Orders | `/api/customer/{id}/active-orders` | ✅ Works |
| Order Tracking | `/api/customer/orders/{id}/track` | ✅ Works |
| Addresses | `/api/addresses/{id}` | ✅ Works |
| Favorites | `/api/customer/favorites/{id}` | ✅ Works |
| Restaurants | `/api/vendors/published` | ✅ Works |

### Driver App Uses:
| Feature | Endpoint | Status |
|---------|----------|--------|
| Login | `/api/auth/driver/login` | ✅ Works |
| Profile | `/api/erp/drivers/{id}` | ✅ Works |
| Active Deliveries | `/api/erp/orders/driver/{id}/active` | ⚠️ Returns delivered too |
| Available Orders | `/api/erp/orders/available-for-delivery` | ✅ Works |
| Accept Order | `/api/erp/orders/{id}/assign-driver` | ❌ 500 Error |
| Mark Picked Up | `/api/erp/orders/{id}/picked-up` | Untested |
| Mark Delivered | `/api/erp/orders/{id}/delivered` | Untested |
| Documents | `/api/drivers/{id}/documents` | ✅ Works |
| Earnings | `/api/drivers/{id}/earnings` | ✅ Works |

### Restaurant App Uses:
| Feature | Endpoint | Status |
|---------|----------|--------|
| Login | `/api/auth/vendor/login` | ✅ Works |
| Orders | `/api/erp/orders/vendor/{id}` | ✅ Works |
| Accept Order | `/api/erp/orders/{id}/restaurant-accept` | Untested |
| Decline Order | `/api/erp/orders/{id}/restaurant-decline` | Untested |
| Update Status | `/api/erp/orders/{id}/status` | Untested |
| Menu | `/api/vendors/{id}/menu` | ✅ Works |

---

## WORKFLOW THAT FAILS

```
1. Driver opens app
2. Driver sees Available Orders ✅
3. Driver taps "Accept Order"
4. iOS calls POST /api/erp/orders/{id}/assign-driver
5. Backend hits DriverStatus.ONLINE → AttributeError
6. HTTP 500 Internal Server Error returned
7. iOS: viewModel.showError = true
8. NO ALERT SHOWN (missing .alert binding)
9. User sees nothing, order stays in "Available"
10. Driver confused, taps again → same result
```

---

## RECOMMENDED FIXES (Priority Order)

### P0 - Critical (Fix Immediately)
1. **order_flow.py:2392** - Remove `DriverStatus.ONLINE` or add to enum
2. **AvailableOrdersView.swift** - Add `.alert(isPresented: $viewModel.showError)`

### P1 - High (Fix This Week)
3. **order_flow.py:3152** - Add status filter to exclude delivered/cancelled
4. **Driver app views** - Remove `.prefix()` truncation from order numbers

### P2 - Medium (Fix This Sprint)
5. **Backend** - Standardize order number format (suggest: `EF{MMDD}{SEQ:05d}`)
6. **Backend** - Document which endpoints are canonical vs aliases
7. **Backend** - Remove unused duplicate endpoints

### P3 - Low (Technical Debt)
8. Create API endpoint documentation in `.claude/docs/API_ENDPOINTS.md`
9. Add endpoint validation tests in CI
10. Consolidate order number generation to single function

---

## TEST COMMANDS FOR NEXT SESSION

```bash
# Test driver login
curl -s -X POST "https://api.dollor.ai/auth/driver/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.driver@dollor.ai&password=DemoDriver2025!"

# Test assign driver (currently fails with 500)
curl -s -X POST "https://api.dollor.ai/api/erp/orders/145/assign-driver" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"driver_id": 48}'

# Test active orders (returns delivered too)
curl -s "https://api.dollor.ai/api/erp/orders/driver/48/active" \
  -H "Authorization: Bearer {TOKEN}"
```

---

## FILES TO MODIFY (Next Session)

| File | Line | Change |
|------|------|--------|
| `order_flow.py` | 2392 | Remove `DriverStatus.ONLINE` |
| `order_flow.py` | 3152 | Add status filter |
| `models.py` | 690 | OR add `ONLINE = "online"` |
| `AvailableOrdersView.swift` | End | Add error alert |
| `PickupDropoffView.swift` | 780 | Remove `.prefix(8)` |
| `MyDeliveriesView.swift` | 250 | Remove `.prefix(6)` |

---

*Report generated by Claude Code - Read-Only Analysis*
