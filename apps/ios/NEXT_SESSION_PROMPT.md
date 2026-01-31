# Next Session Prompt - Build 57

Copy and paste this into your next Claude Code session:

---

## Session Start Command

```
/gsd:resume-work
```

If that doesn't work or you're starting fresh, use:

```
/gsd:progress
```

---

## Context for New Session

**Previous Build:** 56 - Restaurant Rating Feature (COMPLETED)
**Current Build:** 57

### What Was Just Completed (Build 56)
- Restaurant rating UI (RateRestaurantView.swift)
- Backend endpoint: POST /api/customer/orders/{order_id}/rate-restaurant
- Order model: Added `isRestaurantRated` field
- OrderHistoryView: "Rate Food" and "Rate Driver" buttons for delivered orders

### Commits
```
364446d0 feat(rating): Add restaurant rating feature for customer app
bdfccbdf fix(address): Include lat/lng coordinates in food delivery orders
6a1b624c feat(vehicle): Add vehicle photo upload and display
```

---

## Build 57 Options

Choose one of these priorities for the next session:

### Option A: Backend Rating Storage (Recommended)
```
/gsd:plan-phase

Phase: Implement persistent rating storage
Goal: Store restaurant and driver ratings in database with aggregate calculation

Requirements:
1. Create restaurant_ratings table (order_id, restaurant_id, customer_id, rating, review, categories, created_at)
2. Create driver_ratings table (similar structure)
3. Update rate-restaurant endpoint to persist ratings
4. Update rate-driver endpoint to persist ratings
5. Calculate and update aggregate ratings on vendors/drivers
6. Return new_restaurant_rating in API response
```

### Option B: Real-time Order Updates
```
/gsd:plan-phase

Phase: Implement WebSocket for live order tracking
Goal: Replace polling with real-time updates for order status

Requirements:
1. Add WebSocket support to backend (FastAPI WebSocket)
2. Create order status change events
3. Update iOS DeliveryTrackingView to use WebSocket
4. Fallback to polling if WebSocket fails
```

### Option C: Push Notification Deep Links
```
/gsd:plan-phase

Phase: Implement push notification deep linking
Goal: Tap notification → open specific order/screen

Requirements:
1. Parse notification payload for order_id
2. Navigate to DeliveryTrackingView or OrderHistoryView
3. Handle app launch from notification
4. Handle notification while app is open
```

### Option D: TestFlight Build
```
/gsd:quick

Task: Prepare Customer App Build 57 for TestFlight
- Bump version to 1.0.57
- Run build validation
- Archive and upload to App Store Connect
```

---

## Quick Commands Reference

| Command | Purpose |
|---------|---------|
| `/gsd:progress` | Check current state and next actions |
| `/gsd:resume-work` | Resume from previous session |
| `/gsd:plan-phase` | Plan a new phase of work |
| `/gsd:quick` | Execute quick task with tracking |
| `/gsd:verify-work` | Validate completed features |

---

## Key Files Reference

```
# Rating Feature (just completed)
apps/ios/customer/eatfaircustomer/Views/RateRestaurantView.swift
apps/ios/customer/eatfaircustomer/Views/RateDriverView.swift
apps/ios/customer/eatfaircustomer/Views/OrderHistoryView.swift

# Order Tracking
apps/ios/customer/eatfaircustomer/Views/DeliveryTrackingView.swift

# Backend
apps/web/p2p-platform/backend/main_new.py

# Session Handoff
apps/ios/SESSION_HANDOFF_BUILD56.md
```

---

## Environment

- **Staging API:** https://d3kuu45w6kl8hr.cloudfront.net
- **Production API:** https://api.dollor.ai
- **Branch:** main

---

*Generated: January 31, 2026*
*Build 56 Complete → Ready for Build 57*
