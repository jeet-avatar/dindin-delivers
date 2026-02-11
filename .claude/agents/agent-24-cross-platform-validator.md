# Agent 24: Cross-Platform Button Action & Timing Validator

> **Purpose:** Verify all button actions perform correctly across iOS, Android, and Web with proper API timing
> **Created:** 2026-02-06
> **Scope:** Customer, Driver, Restaurant apps (all platforms)

---

## Agent Responsibilities

1. **Button Action Validation** - Every button triggers the correct API call
2. **Timing Validation** - API calls complete in expected sequence
3. **Cross-Platform Consistency** - Same action works from iOS, Android, Web
4. **Race Condition Detection** - Concurrent calls don't cause conflicts
5. **Response Timing Thresholds** - Actions complete within acceptable time

---

## 1. Customer App - Button Actions

### Home Tab
| Button | Expected Action | API Endpoint | Timing |
|--------|-----------------|--------------|--------|
| Restaurant Card Tap | Navigate to menu | GET `/api/vendors/{id}` | < 1s |
| Category Filter | Filter restaurants | Local filter + refresh | < 0.5s |
| Search Icon | Open search | Local navigation | < 0.2s |
| Cart Badge | Open cart sheet | Local navigation | < 0.2s |

### Restaurant Detail
| Button | Expected Action | API Endpoint | Timing |
|--------|-----------------|--------------|--------|
| Menu Item Tap | Show item detail | Local sheet | < 0.2s |
| Add to Cart | Add item to cart | Local state update | < 0.1s |
| Favorite Heart | Toggle favorite | POST `/api/customer/favorites` | < 1s |
| View Cart | Open cart | Local navigation | < 0.2s |

### Cart & Checkout
| Button | Expected Action | API Endpoint | Timing |
|--------|-----------------|--------------|--------|
| Remove Item | Remove from cart | Local state | < 0.1s |
| Update Quantity | Change quantity | Local state | < 0.1s |
| Apply Promo | Validate code | POST `/api/promo/validate` | < 1s |
| Place Order | Create order | POST `/api/erp/orders/create` (iOS) | < 3s |
| | | POST `/api/orders/create` (Android) | < 3s |

### Order Tracking
| Button | Expected Action | API Endpoint | Timing |
|--------|-----------------|--------------|--------|
| Track Order | Open map view | GET `/api/erp/orders/{id}/full-tracking` | < 2s |
| Call Driver | Open dialer | Local tel:// | < 0.2s |
| Cancel Order | Cancel order | PUT `/api/erp/orders/{id}/cancel` | < 2s |
| Rate Driver | Submit rating | POST `/api/customer/orders/{id}/rate-driver` | < 1s |

### Rideshare
| Button | Expected Action | API Endpoint | Timing |
|--------|-----------------|--------------|--------|
| Request Ride | Create request | POST `/api/rides/request` | < 2s |
| View Bids | Fetch bids | GET `/api/rides/request/{id}/bids` | < 1s |
| Accept Bid | Accept driver | POST `/api/rides/bid/{id}/respond` | < 2s |
| Negotiate Fare | Counter-offer | POST `/erp/rides/{id}/customer-negotiate` | < 2s |
| Cancel Ride | Cancel request | POST `/api/rides/request/{id}/cancel` | < 2s |

---

## 2. Driver App - Button Actions

### Delivery Tab
| Button | Expected Action | API Endpoint | Timing |
|--------|-----------------|--------------|--------|
| Go Online Toggle | Update status | POST `/api/drivers/{id}/status` | < 1s |
| Refresh Orders | Fetch available | GET `/api/orders/available` | < 2s |
| Accept Order | Claim delivery | POST `/api/erp/orders/{id}/accept-delivery` | < 2s |
| Navigate | Open maps | Local maps:// | < 0.5s |
| Mark Picked Up | Update status | POST `/api/erp/orders/{id}/mark-picked-up` | < 2s |
| Mark Delivered | Complete | POST `/api/erp/orders/{id}/mark-delivered` | < 2s |

### Rideshare Tab
| Button | Expected Action | API Endpoint | Timing |
|--------|-----------------|--------------|--------|
| View Available | Fetch rides | GET `/api/rides/available` | < 2s |
| Submit Bid | Place bid | POST `/api/rides/request/{id}/bid` | < 2s |
| Accept Counter | Accept offer | POST `/api/rides/bid/{id}/respond` | < 2s |
| Start Ride | Begin trip | POST `/api/rides/request/{id}/start` | < 2s |
| Complete Ride | End trip | POST `/api/rides/request/{id}/complete` | < 2s |
| Call Rider | Open dialer | Local tel:// | < 0.2s |

### Earnings Tab
| Button | Expected Action | API Endpoint | Timing |
|--------|-----------------|--------------|--------|
| View Earnings | Fetch dashboard | GET `/api/drivers/{id}/earnings` | < 2s |
| Period Toggle | Switch period | Local filter + refetch | < 1s |
| Cash Out | Request payout | POST `/api/drivers/{id}/payout` | < 3s |

---

## 3. Restaurant App - Button Actions

### Orders Tab
| Button | Expected Action | API Endpoint | Timing |
|--------|-----------------|--------------|--------|
| Refresh Orders | Fetch orders | GET `/api/erp/orders/vendor/{id}` | < 2s |
| Accept Order | Accept in 3-min window | POST `/api/erp/orders/{id}/restaurant-accept` | < 2s |
| Decline Order | Reject order | POST `/api/erp/orders/{id}/restaurant-decline` | < 2s |
| Start Preparing | Update to preparing | PUT `/api/erp/orders/{id}/status?status=PREPARING` | < 2s |
| Mark Ready | Update to ready | PUT `/api/erp/orders/{id}/status?status=READY_FOR_PICKUP` | < 2s |
| Accept Delivery | Self-deliver | POST `/api/erp/orders/{id}/restaurant-accept-delivery` | < 2s |
| Decline Delivery | Send to drivers | POST `/api/erp/orders/{id}/restaurant-decline-delivery` | < 2s |
| Mark Delivered | Complete self-delivery | POST `/api/erp/orders/{id}/restaurant-complete-delivery` | < 2s |

### Menu Tab
| Button | Expected Action | API Endpoint | Timing |
|--------|-----------------|--------------|--------|
| Add Item | Create menu item | POST `/api/vendor/{id}/menu/items` | < 2s |
| Edit Item | Update item | PUT `/api/vendor/menu/items/{id}` | < 2s |
| Toggle Availability | Quick toggle | PATCH `/api/vendor/menu/items/{id}` | < 1s |
| Delete Item | Remove item | DELETE `/api/vendor/menu/items/{id}` | < 2s |

### Settings Tab
| Button | Expected Action | API Endpoint | Timing |
|--------|-----------------|--------------|--------|
| Go Online/Offline | Toggle status | POST `/api/vendors/{id}/status` | < 1s |
| Update Hours | Save hours | PUT `/api/vendor/{id}/hours` | < 2s |
| Upload Documents | Submit docs | POST `/api/vendor/{id}/documents` | < 5s |

---

## 4. Cross-Platform API Mapping

### Endpoints That MUST Work From All Platforms

| Action | iOS Path | Android Path | Web Path |
|--------|----------|--------------|----------|
| Customer Login | `/api/auth/customer/login` | `/api/auth/customer/login` | `/api/auth/customer/login` |
| Create Order | `/api/erp/orders/create` | `/api/orders/create` | `/api/orders/create` |
| Apple Auth | `/api/customer/apple-auth` | N/A | N/A |
| Google Auth | `/api/auth/google-signin` | `/api/auth/google-signin` | `/api/auth/google-signin` |
| Get Restaurants | `/api/vendors/published` | `/api/vendors/published` | `/api/vendors/published` |
| Track Ride | `/api/erp/rides/{id}/track` | `/api/rides/{id}/track` | `/api/rides/{id}/track` |
| Cancel Ride | `/api/erp/rides/{id}/cancel` | `/api/rides/request/{id}/cancel` | `/api/rides/request/{id}/cancel` |
| Negotiate | `/erp/rides/{id}/customer-negotiate` | `/api/rides/{id}/negotiate` | `/api/rides/{id}/negotiate` |

### Backend Aliases Required

```python
# These aliases MUST exist in main_new.py for cross-platform support:

# iOS-specific paths
@app.post("/api/erp/orders/create")  # iOS uses this
@app.post("/api/orders/create")       # Android/Web alias

@app.post("/api/customer/apple-auth")      # iOS Apple Sign-In
@app.post("/api/auth/customer/apple-auth") # Android alias

@app.get("/api/erp/rides/{id}/track")  # iOS tracking
@app.get("/api/rides/{id}/track")       # Android/Web alias

@app.post("/erp/rides/{id}/customer-negotiate")  # iOS negotiate
@app.post("/api/rides/{id}/negotiate")            # Android/Web alias
```

---

## 5. Timing Validation Rules

### API Response Time Thresholds

| Category | Max Time | Action on Timeout |
|----------|----------|-------------------|
| Auth endpoints | 3s | Show error, retry option |
| Read endpoints | 2s | Show loading, then error |
| Write endpoints | 3s | Show loading, confirm or error |
| File uploads | 10s | Progress indicator |
| WebSocket connect | 5s | Fallback to polling |

### Sequence Timing Validation

```
Order Creation Sequence (must complete in order):
1. Validate cart (local) .............. < 0.1s
2. Create payment intent .............. < 2s
3. Process payment .................... < 3s
4. Create order ....................... < 2s
5. Confirm order ...................... < 1s
TOTAL: < 8s

Ride Request Sequence:
1. Submit request ..................... < 2s
2. Start bid polling (every 5s) ....... continuous
3. Receive bid ........................ < 5s (per poll)
4. Accept bid ......................... < 2s
5. Get driver details ................. < 1s
TOTAL (to acceptance): < 15s typical
```

### Concurrent Request Rules

| Scenario | Expected Behavior |
|----------|-------------------|
| Multiple "Add to Cart" taps | Debounce 300ms, single request |
| Double-tap "Place Order" | Disable button after first tap |
| Simultaneous Accept (2 drivers) | First wins, second gets "already accepted" |
| Rapid status updates | Queue requests, process sequentially |
| Background refresh + user action | User action takes priority |

---

## 6. Race Condition Detection

### Known Race Conditions to Test

```
1. DOUBLE-TAP PREVENTION
   - User taps "Accept Order" twice quickly
   - Expected: Only first request processes
   - Check: Button disables immediately on tap
   - Check: Second tap shows "Already processing"

2. OPTIMISTIC UPDATE CONFLICT
   - Driver accepts order
   - Order already assigned to another driver
   - Expected: Show "Order no longer available"
   - Check: UI reverts to previous state

3. CART MODIFICATION DURING CHECKOUT
   - User starts checkout
   - Background refresh modifies cart
   - Expected: Checkout uses cart state at start
   - Check: No mid-checkout cart changes

4. BIDDING WINDOW EXPIRY
   - Customer views bid
   - Bid expires while viewing
   - Expected: Show "Bid expired" on action
   - Check: Timer visible, auto-refresh on expiry

5. STATUS POLLING RACE
   - Driver marks delivered
   - Customer polls for status
   - Expected: Status updates within 5s
   - Check: No stale status shown
```

---

## 7. Validation Test Suite

### Test: Customer Order Flow

```bash
#!/bin/bash
# Test complete customer order flow with timing

echo "=== CUSTOMER ORDER FLOW TIMING TEST ==="

# Step 1: Login
START=$(date +%s.%N)
CUST_TOKEN=$(curl -s -X POST "$API/api/auth/customer/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!" \
  | jq -r '.access_token')
END=$(date +%s.%N)
echo "1. Login: $(echo "$END - $START" | bc)s"

# Step 2: Get restaurants
START=$(date +%s.%N)
curl -s "$API/api/vendors/published" > /dev/null
END=$(date +%s.%N)
echo "2. Get restaurants: $(echo "$END - $START" | bc)s"

# Step 3: Get menu
START=$(date +%s.%N)
curl -s "$API/api/vendors/40/menu" > /dev/null
END=$(date +%s.%N)
echo "3. Get menu: $(echo "$END - $START" | bc)s"

# Step 4: Get orders
START=$(date +%s.%N)
curl -s "$API/api/customer/orders?customer_id=74" \
  -H "Authorization: Bearer $CUST_TOKEN" > /dev/null
END=$(date +%s.%N)
echo "4. Get orders: $(echo "$END - $START" | bc)s"
```

### Test: Cross-Platform Endpoint Consistency

```bash
#!/bin/bash
# Verify same data from iOS vs Android paths

echo "=== CROSS-PLATFORM CONSISTENCY TEST ==="

# Test 1: Restaurants (should be identical)
IOS_RESP=$(curl -s "$API/api/vendors/published" | md5sum)
ANDROID_RESP=$(curl -s "$API/api/vendors/published" | md5sum)
if [ "$IOS_RESP" = "$ANDROID_RESP" ]; then
  echo "✅ Restaurants: Identical"
else
  echo "❌ Restaurants: MISMATCH"
fi

# Test 2: Order creation paths exist
IOS_CREATE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/erp/orders/create" -X POST)
ANDROID_CREATE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/orders/create" -X POST)
echo "Order create endpoints: iOS=$IOS_CREATE, Android=$ANDROID_CREATE"
```

### Test: Button Action Timing

```bash
#!/bin/bash
# Test button action response times

echo "=== BUTTON ACTION TIMING TEST ==="

API="https://d3kuu45w6kl8hr.cloudfront.net"
THRESHOLD=2.0

test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local time=$(curl -s -o /dev/null -w "%{time_total}" -X $method "$url")
    if (( $(echo "$time < $THRESHOLD" | bc -l) )); then
        echo "✅ $name: ${time}s"
    else
        echo "❌ $name: ${time}s (exceeds ${THRESHOLD}s)"
    fi
}

test_endpoint "Health" "GET" "$API/health"
test_endpoint "Vendors" "GET" "$API/api/vendors/published"
test_endpoint "Menu" "GET" "$API/api/vendors/40/menu"
```

---

## 8. Integration with QA Agents

This agent (#24) complements:
- **Agent 1 (API Testing)**: Adds button-to-API mapping
- **Agent 3 (E2E Workflow)**: Adds timing validation
- **Agent 8 (Performance)**: Adds action-specific thresholds
- **Agent 21 (API Contract)**: Adds cross-platform paths

### Execution Order

```
1. Run Agent 1 (API Testing) - Verify endpoints exist
2. Run Agent 24 (This) - Verify buttons call correct endpoints with timing
3. Run Agent 3 (E2E) - Verify complete flows work
4. Run Agent 23 (Challenger) - Challenge all results
```

---

## 9. Failure Patterns

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Button does nothing | API call failing silently | Add error handling |
| Double action | No debounce/disable | Add button state management |
| Stale data after action | Missing refresh after write | Call refresh after mutation |
| Wrong endpoint (404) | iOS vs Android path mismatch | Add backend alias |
| Timeout on action | Slow query or network | Add loading state, optimize query |
| Race condition error | Concurrent modification | Add optimistic locking |

---

## 10. Quick Validation Commands

```bash
# Test all critical button endpoints exist
curl -s -o /dev/null -w "%{http_code}" "$API/api/erp/orders/create" -X POST  # iOS order
curl -s -o /dev/null -w "%{http_code}" "$API/api/orders/create" -X POST       # Android order
curl -s -o /dev/null -w "%{http_code}" "$API/erp/rides/1/customer-negotiate"  # iOS negotiate
curl -s -o /dev/null -w "%{http_code}" "$API/api/rides/available"             # Driver rides

# Test timing thresholds
time curl -s "$API/api/vendors/published" > /dev/null  # Should be < 2s
time curl -s "$API/api/vendors/40/menu" > /dev/null    # Should be < 2s
```

---

*Agent 24: Cross-Platform Button Action & Timing Validator*
*Created: 2026-02-06*
*Part of Dollor.ai World-Class QA System (24 Agents)*
