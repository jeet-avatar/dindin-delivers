---
phase: quick-30
type: quick
description: "Live E2E rideshare test: Android customer ↔ iOS driver — bidding, negotiation, match, notifications"
---

# Quick Task 30: Live E2E Rideshare Test

## Goal

Run a complete rideshare lifecycle test against production API using demo accounts, simulating Android customer and iOS driver interaction. Verify every step works, negotiation completes, and push notifications fire correctly.

## Tasks

### Task 1: Execute Full Ride Lifecycle (12 Steps)
- **files:** bid_routes.py, main_new.py, order_flow.py, rideshare_payments.py
- **action:**
  1. Login as demo customer + demo driver → get JWT tokens
  2. Create ride request (NYC: 5th Ave → WTC)
  3. Driver bids $30
  4. Customer counters $22
  5. Driver counters $26
  6. Customer accepts → ride matched at $26
  7. Driver arrives → starts → completes ride
  8. Customer tips $5, rates 5 stars
  9. Verify receipt: fare $26, fee $1, tip $5, total $32
- **verify:** All 12 API calls return success, final ride status = completed
- **done:** Receipt shows correct fare breakdown

### Task 2: Verify Push Notifications and Write Report
- **files:** bid_routes.py (notification lines), E2E_LIVE_TEST_REPORT.md
- **action:**
  1. Map each lifecycle step to its `send_push_notification` call in bid_routes.py
  2. Cross-reference notification types with iOS NotificationManager and Android FirebaseMessagingService
  3. Document which notifications fire, which are handled, and which have gaps
- **verify:** Report covers all 12 steps with notification status
- **done:** E2E_LIVE_TEST_REPORT.md written with full results
