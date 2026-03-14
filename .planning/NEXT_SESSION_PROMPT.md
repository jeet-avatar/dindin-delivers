# Next Session Prompt — Restaurant App + Order Flow Fixes

> Start with: `/gsd:resume-work`

---

## Current State (Mar 14, 2026)

| Item | Status |
|------|--------|
| **Restaurant build** | 215 on TestFlight — login screen blue theme, LaunchIcon logo, password toggle, Google brand colors |
| **App Store rejection** | Guideline 2.1 — needs screen recording + info (draft reply ready in conversation) |
| **Online/offline bugs** | FIXED + deployed to production (Quick-172) |
| **Earnings tab** | Rideshare + food delivery combined (Quick-171), deployed |
| **Backend** | All fixes on production |

---

## Priority 1: Demo Payment Bypass for Demo Orders

Orders from `demo.customer@dollor.ai` to demo/test restaurants are stuck at `pending_payment` because there's no real Stripe payment. Need to bypass payment for:

- **Customer:** `demo.customer@dollor.ai` (customer_id = 74)
- **Restaurants:** Apple Test Restaurant (vendor_id=40), Google Test Restaurant (vendor_id=134), Demo Restaurant (vendor_id=1)

**Fix:** In the order creation endpoint, after saving the order, if `customer.email` is a demo account AND `vendor_id` is one of the above, auto-call `confirm_payment()` logic to set `payment_status="succeeded"` and `status=PENDING_RESTAURANT` — skipping Stripe entirely.

---

## Priority 2: Order Flow Bug — Restaurant "I Will Deliver" Timing + Driver Pool

**Current correct flow** (per business rules):
1. Order placed → `PENDING_RESTAURANT` (restaurant has **3 minutes** to accept/decline or choose self-delivery)
2. If restaurant picks **"I Will Deliver"** within 3 min → vendor delivers it themselves
3. If 3 minutes pass with no action → order auto-moves to **driver pool** (`PENDING_DRIVER`)
4. Once restaurant marks order as **"Ready"** → driver can pick it up
5. **Restaurant cannot choose "I Will Deliver" after the 3-min window expires**

**Bugs to fix:**
- Restaurant still sees "I Will Deliver" option AFTER the 3-minute window has passed (should be hidden/disabled)
- Need to verify the 3-min timer correctly moves order to driver pool when it expires
- Driver pickup should only be available after restaurant marks order `READY` — confirm this gate exists

**Files to check:**
- `order_flow.py` — 3-min timer logic, `PENDING_RESTAURANT` → `PENDING_DRIVER` transition
- `apps/ios/restaurant/eatffairrestaurant/Views/` — order detail view that shows "I Will Deliver" button
- `main_new.py` — `/erp/orders/{id}/restaurant-accept-delivery` endpoint

---

## Priority 3: App Store Submission (Restaurant)

Build **215** needs to be submitted. Steps:
1. Record screen video on physical iPhone (build 215 from TestFlight)
   - Launch app → login → dashboard → incoming order → accept it → mark preparing → mark ready
2. Reply to Apple review thread in App Store Connect with the drafted info + video
3. Submit build 215 for App Store review

**Key IDs:**
| Item | Value |
|------|-------|
| App ID | `6758357924` |
| Version ID (1.1) | `c3df803a-f889-412e-be2f-9e7a44e42b44` |
| Latest Build | 215 (needs to be attached — 210 was previously attached) |
| API Key | `9K626GB728` |
| Issuer ID | `80d10e49-f379-462f-9668-5ea53016812e` |

---

## Demo Credentials

```
Customer:   demo.customer@dollor.ai / DemoCustomer2025!   (customer_id=74)
Restaurant: demo.restaurant@dollor.ai / DemoRestaurant2025!
Driver:     demo.driver@dollor.ai / DemoDriver2025!
```

Test restaurants: Apple Test Restaurant (40), Google Test Restaurant (134), Demo Restaurant (1)

---

## Key Files

| File | Relevance |
|------|-----------|
| `order_flow.py:1472` | `confirm_payment()` — sets payment_status=succeeded, moves to PENDING_RESTAURANT |
| `order_flow.py:249` | `send_driver_pool_notification()` — fixed in Quick-172 |
| `main_new.py:15099` | `/erp/orders/{id}/restaurant-accept` |
| `main_new.py:15115` | `/erp/orders/{id}/restaurant-accept-delivery` ("I Will Deliver") |
| `apps/ios/restaurant/.../Views/` | Restaurant order detail UI |
