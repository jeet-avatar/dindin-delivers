---
phase: quick-29
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/29-verify-e2e-rideshare-flow-and-push-notif/E2E_RIDESHARE_VERIFICATION_REPORT.md
autonomous: true
requirements: [VERIFY-E2E-RIDESHARE]

must_haves:
  truths:
    - "Every rideshare lifecycle step (12 steps) has backend endpoint verified via grep"
    - "iOS and Android API calls are cross-referenced against backend for path/method/body matches"
    - "Push notification triggers are mapped for every ride state transition"
    - "Payment flow correctness is verified including tiered fees and Stripe Connect transfers"
    - "All API mismatches, notification gaps, and payment issues are documented"
  artifacts:
    - path: ".planning/quick/29-verify-e2e-rideshare-flow-and-push-notif/E2E_RIDESHARE_VERIFICATION_REPORT.md"
      provides: "Complete E2E verification report"
      min_lines: 200
  key_links:
    - from: "bid_routes.py"
      to: "P2PAPIService.swift"
      via: "API endpoint path matching"
      pattern: "/api/rides/"
    - from: "bid_routes.py"
      to: "CustomerRideshareApiService.kt"
      via: "API endpoint path matching"
      pattern: "/api/rides/"
    - from: "order_flow.py send_push_notification"
      to: "bid_routes.py state transitions"
      via: "push triggers at each ride status change"
      pattern: "send_push_notification"
---

<objective>
Verify the complete end-to-end rideshare flow across backend, iOS, and Android — covering all 12 lifecycle steps, push notifications, WebSocket events, and payment processing.

Purpose: Produce a definitive verification report that documents whether every rideshare API endpoint, notification trigger, and payment calculation is correctly wired across all three platforms. This is the single source of truth for rideshare system health.

Output: `E2E_RIDESHARE_VERIFICATION_REPORT.md` with per-step verification tables, mismatch list, notification gap analysis, and payment flow audit.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/E2E_RIDESHARE_SESSION_PROMPT.md (pre-researched flow with file:line references — USE AS STARTING POINT)
@.planning/STATE.md

Backend source files (READ these — they are the source of truth):
- apps/web/p2p-platform/backend/bid_routes.py (3147 lines — rideshare lifecycle)
- apps/web/p2p-platform/backend/rideshare_payments.py (207 lines — fee calculation)
- apps/web/p2p-platform/backend/order_flow.py (4715 lines — push notifications, FCM)
- apps/web/p2p-platform/backend/stripe_integration.py (713 lines — Stripe webhooks)
- apps/web/p2p-platform/backend/realtime_events.py (WebSocket events)
- apps/web/p2p-platform/backend/main_new.py (21369 lines — ride endpoints in main file: tip, rate, track, negotiate)

iOS source files:
- apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift

Android source files (in /Users/jeet/StudioProjects/eatfair-android/):
- app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt
- shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt
- shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify Rideshare Lifecycle API Endpoints (12 Steps) Across All Platforms</name>
  <files>.planning/quick/29-verify-e2e-rideshare-flow-and-push-notif/E2E_RIDESHARE_VERIFICATION_REPORT.md</files>
  <action>
Trace the complete 12-step rideshare lifecycle through backend, iOS, and Android code. For EACH step, perform grep-based verification (per CLAUDE.md anti-hallucination rules — NEVER guess endpoints).

**Step-by-step verification process for each of the 12 lifecycle steps:**

1. **Customer Requests Ride**: grep `bid_routes.py` for `POST /api/rides/request`, then grep P2PAPIService.swift for `requestRide` and CustomerRideshareApiService.kt for `createRideRequest`. Compare: HTTP method, URL path, request body fields, auth header presence.

2. **Rides Available for Drivers**: grep `bid_routes.py` for `GET /api/rides/available`, then grep iOS driver code and Android DollorApiService.kt/DollorRepository.kt. Check polling interval.

3. **Driver Submits Bid**: grep `bid_routes.py` for `POST /api/rides/request/{id}/bid`, then iOS `submitRideBid` and Android equivalent.

4. **Customer Responds to Bid** (accept/reject/counter): grep `bid_routes.py` for `POST /api/rides/bid/{id}/respond`, then iOS `acceptDriverBid`/`rejectDriverBid`/`counterDriverBid` and Android equivalents.

5. **Fare Negotiation**: grep `bid_routes.py` for `POST /api/rides/bid/{id}/driver-counter` and `main_new.py` for `POST /api/rides/negotiate`.

6. **Ride Matched**: Verify status transition logic in bid_routes.py when bid accepted (MATCHED state, matched_driver_id set).

7. **Driver Arrives**: grep `bid_routes.py` for `POST /api/rides/request/{id}/arrived`.

8. **Ride Started**: grep `bid_routes.py` for `POST /api/rides/request/{id}/start`.

9. **Active Ride Tracking**: grep `main_new.py` for `GET /api/erp/rides/{id}/track`, then iOS `trackMyRide` and Android `trackRide`.

10. **Ride Completed**: grep `bid_routes.py` for `POST /api/rides/request/{id}/complete`, then iOS `completeRideRequest` and Android `completeRide`.

11. **Customer Tips Driver**: grep `main_new.py` for `POST /api/rides/{id}/tip`, then check iOS and Android tip methods.

12. **Ratings**: grep `main_new.py` for `POST /api/erp/rides/{id}/rate` (customer rates driver) and `bid_routes.py` for `POST /api/rides/request/{id}/rate-passenger` (driver rates customer).

**Also verify special features:**
- Cancel (customer): `POST /api/rides/request/{id}/cancel`
- Cancel (driver): `POST /api/rides/request/{id}/driver-cancel`
- No-show: `POST /api/rides/request/{id}/no-show`
- Recurring rides: `POST /api/rides/customer/{id}/recurring-rides`, `DELETE /api/rides/recurring-rides/{id}`
- Receipt: `GET /api/rides/request/{id}/receipt`
- Email receipt: `POST /api/rides/request/{id}/email-receipt`
- Dispute: `POST /api/rides/dispute`

**For each endpoint, record in the report:**
- Backend: file, line number, HTTP method, path, auth requirement
- iOS: file, method name, URL path used, auth header present (yes/no)
- Android: file, method name, URL path used, auth header present (yes/no)
- Status: MATCH (all 3 align), MISMATCH (path/method/body differs), MISSING (client doesn't call it), DEAD (backend doesn't have it)

**CRITICAL**: Use `grep -n` on actual source files. Do NOT rely on the E2E_RIDESHARE_SESSION_PROMPT.md alone — it was pre-researched but may be stale. Verify every claim against current code.
  </action>
  <verify>
Report contains a verification table for all 12 lifecycle steps plus special features. Every backend endpoint has a `grep -n` citation. Every iOS/Android call has a file:line reference. No endpoint is listed without grep proof.
  </verify>
  <done>
All 12 rideshare lifecycle steps verified across 3 platforms with file:line references. Mismatches documented with specific field/path differences. Special features (cancel, recurring, dispute, receipt) also verified.
  </done>
</task>

<task type="auto">
  <name>Task 2: Verify Push Notifications and WebSocket Events at Each State Transition</name>
  <files>.planning/quick/29-verify-e2e-rideshare-flow-and-push-notif/E2E_RIDESHARE_VERIFICATION_REPORT.md</files>
  <action>
Append to the report from Task 1. Trace every push notification and WebSocket event in the rideshare flow.

**Push Notification Audit:**

1. grep `order_flow.py` for `send_push_notification` and `_send_fcm_direct` — document the notification infrastructure (Firebase init, fallback behavior, user_type dispatch).

2. For EACH of the 12 lifecycle steps, grep `bid_routes.py` and `main_new.py` for `send_push_notification` calls near the state transition code. Record:
   - Which state transition triggers it
   - The `title` and `body` text
   - The `data` payload (notification type key)
   - Who receives it (customer, driver, or both)

3. Verify iOS notification handling: grep P2PAPIService.swift and the NotificationManager for notification type constants (`newRideRequest`, `bidAccepted`, `driverArrived`, `rideStarted`, `rideCompleted`, `rideCancelled`, etc.). Cross-reference against backend `data` payloads.

4. Verify Android notification handling: grep the Firebase messaging services (`CustomerFirebaseMessagingService.kt`, `DriverFirebaseMessagingService.kt`) for the same notification type constants. Verify channel routing (CHANNEL_RIDES vs CHANNEL_DELIVERIES).

5. FCM Token Registration: Verify the 3 token registration endpoints exist in backend (`/api/erp/customers/{id}/fcm-token`, `/api/erp/drivers/{id}/fcm-token`, `/api/erp/vendors/{id}/fcm-token`) and that both iOS and Android call the correct one for their user type. Note the known divergence: Android uses `POST notifications/register-token` (form fields) vs iOS uses `/erp/{type}/{id}/fcm-token` (JSON).

**WebSocket Event Audit:**

1. grep `bid_routes.py` for all `broadcast_event` or `send_event` or WebSocket dispatch calls. Record event names: `new_ride_request`, `new_bid`, `bid_accepted`, `bid_rejected`, `counter_offer`, `driver_arrived`, `ride_started`, `ride_completed`, `driver_cancelled`.

2. grep `realtime_events.py` for event dispatch infrastructure and any additional rideshare events.

3. Verify iOS WebSocket client handles these events (grep for event name strings in iOS code).

4. Verify Android WebSocket client handles these events (grep for event name strings in Android code).

**Produce in report:**
- Notification matrix: Step | Push Sent? | To Whom | Title | Notification Type | iOS Handles? | Android Handles?
- WebSocket matrix: Step | Event Name | To Whom | iOS Listens? | Android Listens?
- Gaps: Any state transition with NO notification, or notification types the clients dont handle
  </action>
  <verify>
Report contains notification matrix covering all 12 steps. Every `send_push_notification` call in bid_routes.py is accounted for. WebSocket events are cross-referenced against client handlers. Gaps are explicitly listed.
  </verify>
  <done>
Push notification audit complete with per-step coverage. WebSocket event audit complete. FCM token registration verified across platforms. All gaps (missing notifications, unhandled events) documented.
  </done>
</task>

<task type="auto">
  <name>Task 3: Verify Payment Flow and Produce Final Summary</name>
  <files>.planning/quick/29-verify-e2e-rideshare-flow-and-push-notif/E2E_RIDESHARE_VERIFICATION_REPORT.md</files>
  <action>
Append to the report from Tasks 1-2. Verify the complete rideshare payment flow from fare calculation to driver payout.

**Payment Flow Verification:**

1. **Fare Calculation**: grep `rideshare_payments.py` for the tiered fee logic. Verify:
   - Fare <= $35: customer service fee = $1, driver platform fee = $1
   - Fare $35-70: customer fee = $2, driver fee = $2
   - Fare > $70: customer fee = $3, driver fee = $3
   - Document the exact function name, line numbers, and fee variables

2. **Payment Intent Creation**: grep `bid_routes.py` and `stripe_integration.py` for Stripe PaymentIntent creation for rides. When is the payment intent created (at ride request? at bid accept? at completion?). What amount is charged?

3. **Ride Completion Payment**: grep `bid_routes.py` near the `/complete` endpoint for payment processing. Verify:
   - `final_price` (negotiated fare) is used, not `estimated_fare`
   - Platform fee is calculated correctly using `rideshare_payments.py`
   - Driver earnings = fare - platform_fee
   - `driver_paid_at` timestamp is set

4. **Auto-Payout via Stripe Connect**: grep `bid_routes.py` for Stripe Transfer/payout calls after ride completion. Verify the driver receives payment to their Stripe Connect account. Check both bid_routes.py AND order_flow.py `ride_completed()` (Android calls the order_flow path).

5. **Tip Processing**: grep `main_new.py` for the tip endpoint. Verify:
   - Tip is capped at $500
   - 100% of tip transferred to driver Stripe Connect account
   - Tip is idempotent (no double-charge)

6. **Webhook Handling**: grep `stripe_integration.py` for ride payment webhook handling (`payment_intent.succeeded`, `payment_intent.payment_failed`). Verify it updates ride payment_status.

7. **Demo Mode**: grep for demo ride payment handling (should skip Stripe, mark as `payment_status="demo"`).

**iOS/Android Payment Client Verification:**
- grep iOS for Stripe payment sheet / payment intent confirmation calls related to rides
- grep Android for the same
- Verify both platforms send the correct payment amount (fare + customer_service_fee)

**Final Summary Section:**
Produce a summary at the top of the report with:
- Total endpoints verified: N
- Matches: N (backend + iOS + Android all align)
- Mismatches: N (with severity: CRITICAL / HIGH / MEDIUM)
- Missing client calls: N (backend exists but client doesn't call)
- Push notification coverage: N/12 steps have notifications
- WebSocket coverage: N events across N steps
- Payment flow: CORRECT / HAS ISSUES (list issues)
- Recommended fixes: prioritized list of all issues found

Format the report with clear markdown headers, tables, and severity ratings. This report should be the definitive reference for rideshare system health.
  </action>
  <verify>
Report contains payment flow verification with file:line references for fee calculation, Stripe intent creation, auto-payout, tip processing, and webhook handling. Final summary section exists at top of report with aggregate counts. All findings have severity ratings.
  </verify>
  <done>
Complete E2E rideshare verification report produced with: (1) 12-step lifecycle API cross-reference across 3 platforms, (2) push notification and WebSocket coverage matrix, (3) payment flow audit with fee calculation verification, (4) executive summary with mismatch counts and prioritized fix list.
  </done>
</task>

</tasks>

<verification>
1. Report file exists at `.planning/quick/29-verify-e2e-rideshare-flow-and-push-notif/E2E_RIDESHARE_VERIFICATION_REPORT.md`
2. Report has 200+ lines with structured markdown tables
3. Every backend endpoint claim has a `grep -n` proof (file:line)
4. Every client call has a file:method reference
5. No endpoint is listed without verification against actual source code
6. Payment fee tiers verified against `rideshare_payments.py` source
</verification>

<success_criteria>
- All 12 rideshare lifecycle steps have a verification row with backend/iOS/Android status
- Special features (cancel, recurring, dispute, receipt) verified
- Push notification matrix covers every state transition
- WebSocket events cross-referenced against both client platforms
- Payment flow verified end-to-end (fare calc -> Stripe intent -> payout -> tip)
- Executive summary with total match/mismatch/missing counts
- Every finding has a severity (CRITICAL/HIGH/MEDIUM/LOW/INFO)
- Prioritized fix list for any issues found
</success_criteria>

<output>
After completion, create `.planning/quick/29-verify-e2e-rideshare-flow-and-push-notif/29-SUMMARY.md`
</output>
