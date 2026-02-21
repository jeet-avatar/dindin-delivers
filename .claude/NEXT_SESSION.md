# NEXT SESSION: iOS Customer App - Active Orders Not Displaying

> **Date:** February 5, 2026
> **Priority:** Fix order DOLL2026174 (and all orders) not showing on customer app
> **Staging API:** `https://d34u5ixl0bulv4.cloudfront.net`
> **Production API:** `https://api.dollor.ai`

---

## ISSUE

Customer app active orders screen shows NO orders, even though backend returns them correctly.

**Specific case:** Order DOLL2026174 exists with status "preparing" but doesn't display in app.

---

## ROOT CAUSE (VERIFIED)

### Bug 1: JSON Wrapper Mismatch

**Backend returns:**
```json
{"orders": [...]}
```

**iOS decodes (P2PAPIService.swift:2874):**
```swift
let orders = try JSONDecoder().decode([P2PCustomerOrder].self, from: data)
// Expects RAW ARRAY, not wrapped in "orders" key
```

**On failure (P2PAPIService.swift:2876-2878):**
```swift
} catch {
    completion(.success([]))  // SILENTLY FAILS - returns empty array
}
```

### Bug 2: Items Field Type Mismatch

**Backend returns:**
```json
"items": [{"menu_item_id": 466, "name": "Classic Soup", ...}]  // ARRAY
```

**iOS expects (P2PAPIService.swift:9096):**
```swift
public let items: String  // Expects JSON STRING, not array
```

---

## VERIFICATION COMMANDS

```bash
# Check response format (should be dict with "orders" key)
curl -s "https://d34u5ixl0bulv4.cloudfront.net/api/customer/74/active-orders" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('Type:', type(data).__name__)
print('Keys:', list(data.keys()) if isinstance(data, dict) else 'N/A')
if 'orders' in data and len(data['orders']) > 0:
    print('Orders count:', len(data['orders']))
    print('Items type:', type(data['orders'][0].get('items')).__name__)
"

# Check full-tracking works (should be 200)
curl -s -w "Status: %{http_code}\n" -o /dev/null "https://d34u5ixl0bulv4.cloudfront.net/api/erp/orders/174/full-tracking"
```

---

## KEY FILE LOCATIONS

| File | Line | Purpose |
|------|------|---------|
| P2PAPIService.swift | 2838-2882 | `fetchActiveOrders()` function |
| P2PAPIService.swift | 2874 | Wrong decode: `[P2PCustomerOrder].self` |
| P2PAPIService.swift | 2876-2878 | Silent failure: returns `[]` |
| P2PAPIService.swift | 9083-9102 | `P2PCustomerOrder` struct |
| P2PAPIService.swift | 9096 | `items: String` (wrong type) |
| main_new.py | 12967-13033 | Backend active-orders endpoint |

**Full path:**
```
/Users/jeet/StudioProjects/eatfair-ios/apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
```

---

## FIX OPTIONS

### Option A: Fix iOS (Recommended)

**1. Add wrapper struct:**
```swift
struct ActiveOrdersResponse: Codable {
    let orders: [P2PCustomerOrder]
}
```

**2. Update fetchActiveOrders() decode (line 2874):**
```swift
let response = try JSONDecoder().decode(ActiveOrdersResponse.self, from: data)
completion(.success(response.orders))
```

**3. Fix items type in P2PCustomerOrder:**
- Change `items: String` to handle array, OR
- Add custom Codable init to convert array to string

### Option B: Fix Backend

Change `/api/customer/{id}/active-orders` to return raw array and stringify items:
```python
# Instead of: return {"orders": result_orders}
return result_orders  # Raw array

# And stringify items before adding to result
"items": json.dumps(o.items) if isinstance(o.items, list) else o.items
```

---

## FALSE ALARM - Full-Tracking Endpoint

The claim "iOS calls /erp/orders/... without /api prefix" was **WRONG**.

**Reality:**
- iOS `baseURL` = `"{p2pAPIBaseURL}/api"` (line 15)
- iOS calls: `{baseURL}/erp/orders/{id}/full-tracking` = `/api/erp/orders/{id}/full-tracking`
- This route returns **200 OK** - works fine

---

## DEPLOYMENT IN PROGRESS

A deployment was in progress when session ended. First thing next session:

```bash
# Re-verify after deployment
curl -s "https://d34u5ixl0bulv4.cloudfront.net/api/customer/74/active-orders" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('Type:', type(d).__name__)
if isinstance(d, dict):
    print('Keys:', list(d.keys()))
else:
    print('Direct array with', len(d), 'orders')
"
```

**If response is now a raw array `[...]`** - backend was fixed, iOS should work.
**If still `{"orders": [...]}`** - need to fix iOS decode.

---

## DEMO ACCOUNTS

| Role | Email | Password | ID |
|------|-------|----------|-----|
| Customer | demo.customer@dollor.ai | DemoCustomer2025! | 74 |
| Driver | demo.driver@dollor.ai | DemoDriver2025! | 48 |
| Restaurant | demo.restaurant@dollor.ai | DemoRestaurant2025! | 40 |

---

## CONTEXT FROM THIS SESSION

1. Traced complete order lifecycle (create -> confirm -> prepare -> pickup -> deliver)
2. Verified order number format: `DOLL{YEAR}{SEQ}` (e.g., DOLL2026174)
3. Ran 21 QA agents - all passed
4. Verified NO force unwraps in app code
5. Verified proper error handling throughout
6. Full-tracking returns real driver location + traffic-aware ETA
7. Found the JSON decode mismatch causing orders not to display

---

## QUICK START

```
The iOS customer app doesn't display active orders.

VERIFIED ROOT CAUSE:
1. Backend returns {"orders": [...]}
2. iOS decodes [P2PCustomerOrder].self (expects raw array)
3. Decode fails silently, returns empty array
4. Also: items field is array in backend, String in iOS

FIRST: Check if deployment fixed backend response format
THEN: If not fixed, update iOS P2PAPIService.swift:2874 to use wrapper struct
```

---

*Last Updated: February 5, 2026*
*Session: iOS Active Orders Display Investigation*
