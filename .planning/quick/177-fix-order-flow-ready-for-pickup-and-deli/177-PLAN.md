---
phase: quick-177
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
autonomous: true
requirements: [QUICK-177]

must_haves:
  truths:
    - "Marking order READY_FOR_PICKUP sets status=READY_FOR_PICKUP (not PENDING_DELIVERY_DECISION)"
    - "Restaurant app shows 'Delivering now' card when order is out_for_delivery and driver picked up"
    - "Demo payment bypass sets delivery_decision_sent_at so the 3-min window starts immediately"
  artifacts:
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "Fixed READY_FOR_PICKUP status transition + demo bypass delivery_decision_sent_at"
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift"
      provides: "out_for_delivery status card in order detail view"
  key_links:
    - from: "order_flow.py:3231"
      to: "order.status"
      via: "direct assignment"
      pattern: "order\\.status = OrderStatus\\.READY_FOR_PICKUP"
    - from: "EnhancedDashboardView.swift"
      to: "out_for_delivery card"
      via: "else if order.status check"
      pattern: "out_for_delivery"
---

<objective>
Fix three order flow bugs: (1) READY_FOR_PICKUP status incorrectly transitions to PENDING_DELIVERY_DECISION in the backend, (2) restaurant app has no UI card for out_for_delivery status, (3) demo payment bypass doesn't start the delivery decision timer immediately.

Purpose: Correct order state machine behavior and restaurant dashboard completeness for driver-pool delivery orders.
Output: Backend order_flow.py with correct status handling, iOS restaurant app with full status card coverage.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix READY_FOR_PICKUP status transition in order_flow.py</name>
  <files>apps/web/p2p-platform/backend/order_flow.py</files>
  <action>
    Two changes in order_flow.py:

    FIX 1 — update_order_status READY_FOR_PICKUP handler (line ~3231):
    The current code sets `order.status = OrderStatus.PENDING_DELIVERY_DECISION` when new_status is READY_FOR_PICKUP. This is wrong. Change it to set `order.status = OrderStatus.READY_FOR_PICKUP` directly. Keep `order.ready_for_pickup_at = datetime.now()` and `order.delivery_decision_sent_at = datetime.now()` — the decision window timestamp is still needed for the delivery decision timer. Remove the line `order.status = OrderStatus.PENDING_DELIVERY_DECISION`. The block should become:

    ```python
    elif new_status == OrderStatus.READY_FOR_PICKUP:
        order.status = OrderStatus.READY_FOR_PICKUP
        order.ready_for_pickup_at = datetime.now()
        order.delivery_decision_sent_at = datetime.now()
        # ... rest of notification code unchanged
    ```

    FIX 2 — demo payment bypass block (line ~1395-1405):
    After `new_order.status = OrderStatus.PENDING_RESTAURANT` and `new_order.sent_to_restaurant_at = datetime.now()`, add:
    ```python
    new_order.delivery_decision_sent_at = datetime.now()
    ```
    This ensures the 3-minute delivery decision window starts immediately when the demo order lands at the restaurant, so the auto-advance timer fires correctly during App Store review demos.
  </action>
  <verify>
    grep -n "order\.status = OrderStatus\.READY_FOR_PICKUP" apps/web/p2p-platform/backend/order_flow.py
    grep -n "PENDING_DELIVERY_DECISION" apps/web/p2p-platform/backend/order_flow.py | grep -v "elif\|==\|decision_sent"
    grep -n "delivery_decision_sent_at" apps/web/p2p-platform/backend/order_flow.py | head -10
    cd apps/web/p2p-platform/backend && python -c "import order_flow; print('syntax OK')"
  </verify>
  <done>
    - READY_FOR_PICKUP handler sets order.status = READY_FOR_PICKUP (not PENDING_DELIVERY_DECISION)
    - delivery_decision_sent_at is still set in READY_FOR_PICKUP handler (timer support)
    - Demo bypass block sets delivery_decision_sent_at = datetime.now()
    - Python syntax check passes
  </done>
</task>

<task type="auto">
  <name>Task 2: Add out_for_delivery card to EnhancedDashboardView.swift</name>
  <files>apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift</files>
  <action>
    In EnhancedDashboardView.swift, in the order detail status section, after the `ready_for_pickup`/`ready` block (which ends around line 1860) and before the `restaurant_will_deliver` block (line 1862), insert a new `else if` branch for `out_for_delivery` status:

    ```swift
    } else if order.status.lowercased() == "out_for_delivery" {
        // Driver picked up the order — show "Delivering now" card
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "shippingbox.fill")
                    .foregroundColor(RestaurantTheme.brandGreen)
                Text("Delivering now")
                    .font(.headline)
                    .foregroundColor(RestaurantTheme.brandGreen)
            }
            if let driverName = order.driverName, !driverName.isEmpty {
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(RestaurantTheme.brandBlue.opacity(0.2))
                            .frame(width: 50, height: 50)
                        Image(systemName: "person.fill")
                            .foregroundColor(RestaurantTheme.brandBlue)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(driverName)
                            .font(.headline)
                        if let phone = order.driverPhone {
                            Text(phone)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    Spacer()
                    if let driverPhone = order.driverPhone {
                        Button(action: {
                            let cleanPhone = driverPhone
                                .replacingOccurrences(of: "-", with: "")
                                .replacingOccurrences(of: " ", with: "")
                                .replacingOccurrences(of: "(", with: "")
                                .replacingOccurrences(of: ")", with: "")
                            if let url = URL(string: "tel:\(cleanPhone)") {
                                UIApplication.shared.open(url)
                            }
                        }) {
                            Image(systemName: "phone.fill")
                                .foregroundColor(.white)
                                .padding(12)
                                .background(RestaurantTheme.brandGreen)
                                .clipShape(Circle())
                        }
                        .accessibilityLabel("Call driver")
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            } else {
                Text("Driver is on the way to the customer")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding()
    ```

    Insert this block between the closing `}` of the `ready_for_pickup`/`ready` block (the `.padding()` at ~line 1861) and the `} else if order.status.lowercased() == "restaurant_will_deliver"` line (~line 1862).
  </action>
  <verify>
    grep -n "out_for_delivery" apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
    grep -n "Delivering now" apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
    xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -destination 'generic/platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
  </verify>
  <done>
    - "out_for_delivery" case exists in EnhancedDashboardView.swift
    - "Delivering now" text present
    - Xcode build succeeds without errors
  </done>
</task>

</tasks>

<verification>
1. Backend syntax: `cd apps/web/p2p-platform/backend && python -c "import order_flow; print('OK')"`
2. Status logic: grep confirms READY_FOR_PICKUP sets READY_FOR_PICKUP status (not PENDING_DELIVERY_DECISION)
3. Demo bypass: grep confirms delivery_decision_sent_at set in demo bypass block
4. iOS build: xcodebuild for eatffairrestaurant scheme succeeds
5. Run backend tests: `cd apps/web/p2p-platform/backend && pytest tests/test_order_flow.py -v -x 2>&1 | tail -20`
</verification>

<success_criteria>
- order_flow.py: READY_FOR_PICKUP → status stays READY_FOR_PICKUP (not PENDING_DELIVERY_DECISION); delivery_decision_sent_at still set for timer
- order_flow.py: demo payment bypass sets delivery_decision_sent_at = datetime.now()
- EnhancedDashboardView.swift: out_for_delivery status shows "Delivering now" with driver info card
- Backend tests pass, iOS build compiles
</success_criteria>

<output>
After completion, create `.planning/quick/177-fix-order-flow-ready-for-pickup-and-deli/177-SUMMARY.md`
</output>
