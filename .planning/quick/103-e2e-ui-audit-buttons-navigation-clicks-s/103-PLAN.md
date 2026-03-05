---
phase: quick-103
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/103-e2e-ui-audit-buttons-navigation-clicks-s/UI_AUDIT_IOS_CUSTOMER.md
  - apps/web/p2p-platform/backend/tests/e2e/test_customer_ui_wiring_e2e.py
autonomous: true
requirements: [QUICK-103]

must_haves:
  truths:
    - "Every button and tap handler in the iOS Customer app maps to a real action (navigation, API call, or state change)"
    - "Every tab bar item in the iOS Customer app navigates to the correct screen"
    - "Every form submission in the iOS Customer app sends the correct API endpoint with correct fields"
    - "Phase 10 customer features (OrderChat, LiveChat, Call Support) are correctly wired"
    - "Backend E2E tests cover the customer user journeys that the iOS Customer app UI triggers"
  artifacts:
    - path: ".planning/quick/103-e2e-ui-audit-buttons-navigation-clicks-s/UI_AUDIT_IOS_CUSTOMER.md"
      provides: "Audit findings for iOS Customer app"
      contains: "## iOS Customer App"
    - path: "apps/web/p2p-platform/backend/tests/e2e/test_customer_ui_wiring_e2e.py"
      provides: "E2E tests covering customer user flows"
      exports: ["TestCustomerFullFlow", "TestRideshareCustomerFlow", "TestPhase10CustomerFeatures"]
  key_links:
    - from: "iOS Customer button handlers"
      to: "Backend API endpoints"
      via: "P2PAPIService HTTP calls"
      pattern: "POST|GET|PUT.*api/"
    - from: "Customer tab bar items"
      to: "Screen views"
      via: "TabView tags"
      pattern: "tag\\("
---

<objective>
Audit every button, navigation link, and data flow in the iOS Customer app (~50 views), then write backend E2E tests covering the customer user journeys those UI elements trigger.

Purpose: Ensure no dead buttons, broken navigation, or disconnected API calls exist in the customer app before next App Store submission.
Output: Audit report for iOS Customer + E2E test suite for customer flows.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/ios/customer/eatfaircustomer/Views/MainAppView.swift
@apps/web/p2p-platform/backend/tests/e2e/test_critical_flows.py
@apps/web/p2p-platform/backend/tests/conftest.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Static code audit of iOS Customer app — trace every button/tap/navigation handler</name>
  <files>
    .planning/quick/103-e2e-ui-audit-buttons-navigation-clicks-s/UI_AUDIT_IOS_CUSTOMER.md
  </files>
  <action>
Audit the iOS Customer app by reading every view/screen file in `apps/ios/customer/eatfaircustomer/Views/` (~50 views) and tracing button handlers, navigation links, and API calls.

**Steps:**
1. Read MainAppView.swift for tab structure (4 tabs: Home, Search, Orders, Profile).
2. For each view file, trace every:
   - Button action
   - NavigationLink destination
   - .sheet / .fullScreenCover presentation
   - .onTapGesture
   - .swipeActions
   - .refreshable
   - .onSubmit handler
3. Verify each action either (a) navigates to a real view that exists in the project, (b) calls a real P2PAPIService method, or (c) modifies observable state.
4. For every P2PAPIService method called by customer views, verify the backend endpoint exists:
   ```bash
   grep -rn "the/endpoint/path" apps/web/p2p-platform/backend/main_new.py apps/web/p2p-platform/backend/routers/*.py
   ```
5. Check Phase 10 customer features specifically:
   - OrderChatView: calls /api/orders/{id}/chat/messages GET and POST
   - LiveChatView: calls /api/support/chat POST
   - HelpSupportView: "Call Support" button uses correct phone number

**Categorize each finding as:**
- DEAD: Button/handler exists but target does not (broken wiring)
- MISSING: Expected handler not present (e.g., no pull-to-refresh on a data list)
- WRONG_TARGET: Handler points to wrong endpoint/screen
- OK: Correctly wired

Write findings to UI_AUDIT_IOS_CUSTOMER.md with a summary table at top showing counts per category.
  </action>
  <verify>
    The audit report exists and contains findings with specific file:line references. Run: grep -c "DEAD\|MISSING\|WRONG_TARGET\|OK" .planning/quick/103-e2e-ui-audit-buttons-navigation-clicks-s/UI_AUDIT_IOS_CUSTOMER.md
  </verify>
  <done>
    Audit report covers the iOS Customer app with every button/navigation/form traced to its destination. Each finding has a file path, line number, and category. Summary table shows total findings per category.
  </done>
</task>

<task type="auto">
  <name>Task 2: Write backend E2E tests covering customer and rideshare user journeys</name>
  <files>
    apps/web/p2p-platform/backend/tests/e2e/test_customer_ui_wiring_e2e.py
  </files>
  <action>
Using the audit report from Task 1 and existing test patterns in conftest.py and test_critical_flows.py, write E2E tests that exercise every backend API endpoint that the iOS Customer app UI calls. Use FastAPI TestClient.

**Test classes:**

1. **TestCustomerFullFlow**: Register customer -> login -> browse restaurants (GET /api/vendors/published) -> view menu (GET /api/vendors/{id}/menu) -> place order (POST /api/orders) -> track order (GET /api/orders/{id}) -> order chat (GET+POST /api/orders/{id}/chat/messages) -> rate restaurant (POST /api/vendors/{id}/rate) -> rate driver (POST /api/drivers/{id}/rate) -> view order history (GET /api/orders/my-orders) -> live chat support (POST /api/support/chat)

2. **TestRideshareCustomerFlow**: Request ride (POST /api/rides/request) -> view bids -> accept bid (POST /api/rides/{id}/accept-bid) -> view ride status -> view receipt

3. **TestPhase10CustomerFeatures**: Order chat message flow (customer sends message), live chat support with intents (order_status, refund, general), help support phone number

**IMPORTANT: Before writing ANY test endpoint call, verify the endpoint exists:**
```bash
grep -rn "the/endpoint/path" apps/web/p2p-platform/backend/main_new.py apps/web/p2p-platform/backend/routers/*.py
```

Use conftest.py fixtures (client, db_session). Each test asserts:
- Correct HTTP status codes (200, 201, etc.)
- Response body contains expected fields
- State changes persist (e.g., order status reflected in subsequent GETs)
- Auth required where expected (401 without token)

Target: 12-18 test cases covering the customer+rideshare flows.
  </action>
  <verify>
    cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -m pytest tests/e2e/test_customer_ui_wiring_e2e.py -v --tb=short 2>&1 | tail -30
  </verify>
  <done>
    E2E test file has 12+ test cases covering customer food ordering, rideshare, and Phase 10 features. All tests pass (or failures documented as actual backend bugs). Every API endpoint called by the iOS Customer app has at least one test.
  </done>
</task>

</tasks>

<verification>
1. UI_AUDIT_IOS_CUSTOMER.md exists with categorized findings and file:line references
2. test_customer_ui_wiring_e2e.py has 12+ passing test cases
3. Existing backend test suite still passes: pytest tests/ -v (no regressions)
</verification>

<success_criteria>
- Complete audit report for iOS Customer app covering every button, tab, navigation link, and form with file:line references
- Backend E2E tests exercising every API endpoint the iOS Customer app calls
- Zero regressions in existing test suite
</success_criteria>

<output>
After completion, create `.planning/quick/103-e2e-ui-audit-buttons-navigation-clicks-s/103-01-SUMMARY.md`
</output>
