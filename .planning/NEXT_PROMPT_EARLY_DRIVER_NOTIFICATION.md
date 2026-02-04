# Next Prompt: Early Driver Notification Feature

## Context Handoff

**Date:** 2026-02-04
**Feature:** Early Driver Notification with Prep Time ETA
**Status:** 90% Complete

---

## What Was Done

### Backend (100% Complete)
- Added 5 new database columns to `orders` table:
  - `estimated_prep_minutes` (INTEGER)
  - `estimated_ready_at` (TIMESTAMP)
  - `driver_en_route` (BOOLEAN)
  - `driver_accepted_at` (TIMESTAMP)
  - `driver_eta_to_restaurant` (INTEGER)
- Updated startup migrations in `main_new.py` for automatic column creation
- Added fields to all customer and vendor order API responses
- Implemented `is_ready` calculation logic (returns true for ready_for_pickup status)

### iOS Shared Library (100% Complete)
- Updated `P2PCustomerOrder` with 12 new fields
- Updated `P2PVendorOrder` with `driverEtaText`
- Fixed `toOrder()` mappings to populate all new fields

### iOS Apps (95% Complete)
- **Customer App:** Driver en-route tracking banner in `DeliveryTrackingView.swift`
- **Restaurant App:** Driver info display for PREPARING orders in `EnhancedDashboardView.swift`
- **Driver App:** ETA badge support (fields present, UI may need polish)

### QA Infrastructure (100% Complete)
- Created QA report: `.planning/qa-reports/early-driver-notification-qa-report.md`
- Added Agent 15 (Early Driver Notification) to `scripts/qa-runner.sh`
- Knowledge transfer document: `.planning/EARLY_DRIVER_NOTIFICATION_QA.md`

---

## What's Left To Do

### Critical (Before Production)
1. **Update Driver Available Orders Endpoint**
   - File: `apps/web/p2p-platform/backend/main_new.py` or `order_flow.py`
   - Endpoint: `/api/v2/driver/deliveries/available`
   - Add fields: `estimated_prep_minutes`, `estimated_ready_at`, `minutes_until_ready`, `is_ready`
   - This is the primary gap identified in QA

### Medium Priority
2. **Populate estimated_prep_minutes on Restaurant Accept**
   - When restaurant confirms order, they should provide prep time estimate
   - Currently all values are NULL
   - Backend: Update `restaurant_accept()` in `order_flow.py`

3. **Calculate driver_eta_to_restaurant Dynamically**
   - When driver accepts, calculate ETA based on driver location
   - Update `driver_eta_text` with human-readable format

4. **Set driver_en_route = true When Appropriate**
   - When driver accepts order while status is PREPARING
   - Needs endpoint or logic in `assign_driver()`

### Low Priority
5. **Push Notification for Early Driver**
   - Notify restaurant when driver accepts while food is preparing
   - Include driver ETA in notification

---

## How To Continue

### Prompt to Use

```
Continue working on the Early Driver Notification feature. The main gap is:

1. Update `/api/v2/driver/deliveries/available` endpoint to include ETA fields:
   - estimated_prep_minutes
   - estimated_ready_at
   - minutes_until_ready
   - is_ready

2. Ensure restaurant_accept stores estimated_prep_minutes when restaurant confirms order

Read the knowledge transfer at `.planning/EARLY_DRIVER_NOTIFICATION_QA.md` for full context.
```

### Key Files to Read
- `.planning/EARLY_DRIVER_NOTIFICATION_QA.md` - Full feature spec
- `.planning/qa-reports/early-driver-notification-qa-report.md` - QA results
- `apps/web/p2p-platform/backend/order_flow.py` - Order lifecycle functions
- `apps/web/p2p-platform/backend/main_new.py` - API endpoints

### Test After Changes
```bash
# Run QA agent
./scripts/qa-runner.sh staging post-deploy

# Or test specific endpoint manually
curl -s -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/auth/driver/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.driver@dollor.ai&password=DemoDriver2025!"
# Use token to call:
curl -s "https://d3kuu45w6kl8hr.cloudfront.net/api/v2/driver/deliveries/available" \
  -H "Authorization: Bearer TOKEN"
```

---

## Test Credentials (Staging)

| Role | Email | Password |
|------|-------|----------|
| Customer | demo.customer@dollor.ai | DemoCustomer2025! |
| Driver | demo.driver@dollor.ai | DemoDriver2025! |
| Restaurant | demo.restaurant@dollor.ai | DemoRestaurant2025! |

---

## Code Changes Summary

### Git Commits Made
1. Database columns added via startup migrations
2. iOS P2PAPIService updated with all new fields
3. iOS apps updated with UI components

### Files Modified
| File | Changes |
|------|---------|
| `backend/main_new.py` | Startup migrations, customer orders, order tracking |
| `backend/order_flow.py` | Vendor orders response |
| `eatfair-ios-shared/P2PAPIService.swift` | P2PCustomerOrder, P2PVendorOrder |
| `customer/DeliveryTrackingView.swift` | Driver en-route banner |
| `restaurant/EnhancedDashboardView.swift` | Driver info for PREPARING |
| `scripts/qa-runner.sh` | Agent 15 for Early Driver Notification |

---

*Last Updated: 2026-02-04*
