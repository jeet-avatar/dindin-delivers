---
phase: quick-103
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/103-e2e-ui-audit-buttons-navigation-clicks-s/UI_AUDIT_REPORT.md
  - apps/web/p2p-platform/backend/tests/e2e/test_ui_wiring_e2e.py
autonomous: true
requirements: [QUICK-103]

must_haves:
  truths:
    - "Every button and tap handler in all 6 apps maps to a real action (navigation, API call, or state change)"
    - "Every tab bar item in all 6 apps navigates to the correct screen"
    - "Every form submission in all 6 apps sends the correct API endpoint with correct fields"
    - "Phase 10 features (OrderChat, LiveChat, Call Support) are correctly wired in both iOS and Android"
    - "Backend E2E tests cover the complete user journeys that the apps rely on"
  artifacts:
    - path: ".planning/quick/103-e2e-ui-audit-buttons-navigation-clicks-s/UI_AUDIT_REPORT.md"
      provides: "Complete audit findings for all 6 apps"
      contains: "## iOS Customer App"
    - path: "apps/web/p2p-platform/backend/tests/e2e/test_ui_wiring_e2e.py"
      provides: "E2E tests covering critical user flows that app UI buttons trigger"
      exports: ["test_customer_full_flow", "test_driver_full_flow", "test_vendor_full_flow"]
  key_links:
    - from: "iOS/Android button handlers"
      to: "Backend API endpoints"
      via: "P2PAPIService / ApiService HTTP calls"
      pattern: "POST|GET|PUT.*api/"
    - from: "Tab bar items"
      to: "Screen views"
      via: "TabView tags / NavGraph routes"
      pattern: "tag\\(|composable\\("
    - from: "E2E test file"
      to: "Backend endpoints"
      via: "TestClient HTTP calls"
      pattern: "client\\.(post|get|put|delete)"
---

<objective>
End-to-end UI audit of all 6 apps (3 iOS + 3 Android) to verify every button, navigation, and data flow is correctly wired, followed by backend E2E tests covering the full user journeys.

Purpose: Ensure no dead buttons, broken navigation, or disconnected API calls exist across the platform before next App Store/Play Store submission.
Output: Comprehensive audit report + E2E test suite covering critical flows.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/ios/customer/eatfaircustomer/Views/MainAppView.swift
@apps/ios/delivery/eatffairdelivery/Views/
@apps/ios/restaurant/eatffairrestaurant/Views/
@apps/web/p2p-platform/backend/tests/e2e/test_critical_flows.py
@apps/web/p2p-platform/backend/tests/conftest.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Static code audit of all 6 apps — trace every button/tap/navigation handler</name>
  <files>
    .planning/quick/103-e2e-ui-audit-buttons-navigation-clicks-s/UI_AUDIT_REPORT.md
  </files>
  <action>
Systematically audit all 6 apps by reading every view/screen file and tracing button handlers, navigation links, and API calls. For each app, check:

**iOS Apps** (SwiftUI — `/Users/jeet/doordash-p2p/apps/ios/`):
1. **Customer** (`customer/eatfaircustomer/Views/` — ~50 views): Read MainAppView.swift for tab structure (4 tabs: Home, Search, Orders, Profile). For each view file, trace every Button action, NavigationLink destination, .sheet/.fullScreenCover presentation, .onTapGesture, .swipeActions, .refreshable, and .onSubmit handler. Verify each action either (a) navigates to a real view, (b) calls a real P2PAPIService method, or (c) modifies observable state. Check P2PAPIService.swift for all API methods called by views — verify each endpoint exists (grep backend main_new.py).
2. **Driver** (`delivery/eatffairdelivery/Views/` — ~17 views): Same audit. Check tab structure, button handlers, delivery flow (accept/pickup/deliver), rideshare flow (bid/accept/navigate), chat views, and OrderChatView wiring.
3. **Restaurant** (`restaurant/eatffairrestaurant/Views/` — ~12 views): Same audit. Check dashboard, menu management, order acceptance, KOT settings, AI feature hiding (#if ENABLE_AI_EMPLOYEES).

**Android Apps** (Jetpack Compose — `/Users/jeet/StudioProjects/eatfair-android/`):
4. **Customer** (`app/.../customer/` — ~30 screens): Read MainScreen.kt for bottom nav. For each screen, trace every Button onClick, IconButton onClick, clickable modifier, LaunchedEffect API calls, ViewModel function calls. Cross-reference ApiService for endpoint correctness.
5. **Driver** (`driver/.../driver/` — ~20 screens): Same audit. Check DriverNavGraph.kt for route definitions, swipe-to-confirm patterns, ride chat, order chat, delivery proof.
6. **Partner** (`partner/.../partner/` — ~20 screens): Same audit. Check PartnerNavGraph.kt, AI feature visibility (SHOW_AI_FEATURES), order management, menu screens.

**Phase 10 Features** (cross-cutting):
- OrderChatView: Verify customer+driver iOS and Android all call correct /api/orders/{id}/chat/messages GET and POST endpoints
- LiveChatView: Verify customer iOS+Android call /api/support/chat POST correctly
- HelpSupportView: Verify "Call Support" button uses correct phone number (AppConfig.shared.supportPhone / AppConstants)

**For each finding, categorize as:**
- DEAD: Button/handler exists but target doesn't (broken wiring)
- MISSING: Expected handler not present (e.g., no pull-to-refresh on a list)
- WRONG_TARGET: Handler points to wrong endpoint/screen
- OK: Correctly wired

Write findings to UI_AUDIT_REPORT.md organized by app with a summary table at top.
  </action>
  <verify>
    The audit report exists at .planning/quick/103-e2e-ui-audit-buttons-navigation-clicks-s/UI_AUDIT_REPORT.md and contains sections for all 6 apps with specific file:line references for any issues found. grep -c "DEAD\|MISSING\|WRONG_TARGET\|OK" on the report shows categorized findings.
  </verify>
  <done>
    Audit report covers all 6 apps with every button/navigation/form traced to its destination. Each finding has a file path, line number, and category (OK/DEAD/MISSING/WRONG_TARGET). Summary table shows total findings per app and per category.
  </done>
</task>

<task type="auto">
  <name>Task 2: Write backend E2E tests covering full user journeys triggered by app UI</name>
  <files>
    apps/web/p2p-platform/backend/tests/e2e/test_ui_wiring_e2e.py
  </files>
  <action>
Using the audit report from Task 1 and the existing test patterns in conftest.py and test_critical_flows.py, write comprehensive E2E tests that exercise every backend API endpoint that the 6 app UIs call. Use FastAPI TestClient (no running server needed).

**Test classes to create:**

1. **TestCustomerFullFlow**: Register customer -> login -> browse restaurants (GET /api/vendors/published) -> view menu (GET /api/vendors/{id}/menu) -> place order (POST /api/orders) -> track order (GET /api/orders/{id}) -> order chat (GET+POST /api/orders/{id}/chat/messages) -> rate restaurant (POST /api/vendors/{id}/rate) -> rate driver (POST /api/drivers/{id}/rate) -> view order history (GET /api/orders/my-orders) -> live chat support (POST /api/support/chat)

2. **TestDriverFullFlow**: Register driver -> login -> go online (PUT /api/drivers/me/status) -> view available orders (GET /api/deliveries/available) -> accept delivery (POST /api/deliveries/{id}/accept) -> pickup (PUT /api/deliveries/{id}/pickup) -> deliver (PUT /api/deliveries/{id}/deliver) -> view earnings (GET /api/drivers/me/earnings) -> order chat (GET+POST /api/orders/{id}/chat/messages)

3. **TestRideshareFullFlow**: Customer requests ride (POST /api/rides/request) -> driver views available rides (GET /api/rides/available) -> driver bids (POST /api/rides/{id}/bid) -> customer accepts bid (POST /api/rides/{id}/accept-bid) -> driver starts ride (PUT /api/rides/{id}/start) -> driver completes ride (PUT /api/rides/{id}/complete) -> customer rates driver -> view ride receipt

4. **TestVendorFullFlow**: Register vendor -> login -> view dashboard (GET /api/vendors/me/dashboard) -> manage menu (GET+POST+PUT /api/vendors/me/menu) -> accept order (PUT /api/orders/{id}/accept) -> mark preparing -> mark ready -> view earnings (GET /api/vendors/me/earnings)

5. **TestPhase10Features**: Order chat message flow (customer sends, driver receives), live chat support (/api/support/chat with various intents: order_status, refund, general), help support phone number verification

**IMPORTANT: Before writing ANY test endpoint call, verify the endpoint exists:**
```bash
grep -rn "the/endpoint/path" apps/web/p2p-platform/backend/*.py apps/web/p2p-platform/backend/**/*.py
```

Use conftest.py fixtures (client, db_session). Follow existing test patterns from test_critical_flows.py. Each test should assert:
- Correct HTTP status codes (200, 201, etc.)
- Response body contains expected fields
- State changes persist (e.g., order status updates are reflected in subsequent GETs)
- Auth is required where expected (401 without token)

Target: 25-35 test cases covering the full matrix of app UI -> backend API wiring.
  </action>
  <verify>
    cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -m pytest tests/e2e/test_ui_wiring_e2e.py -v --tb=short 2>&1 | tail -30
  </verify>
  <done>
    E2E test file has 25+ test cases covering customer, driver, rideshare, vendor, and Phase 10 flows. All tests pass (or failures are documented as actual backend bugs to fix). Every API endpoint called by the 6 app UIs has at least one test exercising it.
  </done>
</task>

<task type="auto">
  <name>Task 3: Fix broken wiring found in audit</name>
  <files>
    (files identified by Task 1 audit — specific paths TBD based on findings)
  </files>
  <action>
Review the UI_AUDIT_REPORT.md from Task 1. For each finding categorized as DEAD, MISSING, or WRONG_TARGET:

**DEAD buttons/handlers:**
- If the button calls a non-existent API endpoint: Either remove the button or wire it to the correct endpoint
- If the button navigates to a non-existent view: Remove the button or create a placeholder
- If it is aspirational/future feature code: Wrap with #if ENABLE_AI_EMPLOYEES (iOS) or SHOW_AI_FEATURES (Android) guard

**WRONG_TARGET findings:**
- Fix the endpoint URL or navigation destination to the correct one
- Verify the fix by checking the backend endpoint exists (grep)

**MISSING handlers (prioritized):**
- Add pull-to-refresh (.refreshable in SwiftUI, SwipeRefresh in Compose) to any list view that loads data but lacks it
- Add error state handling for any API call that lacks it
- Skip cosmetic/low-priority missing handlers (document in report as "deferred")

**Do NOT fix:**
- Cosmetic issues (alignment, colors, spacing)
- Performance optimizations
- Features that require new backend endpoints

After fixes, rebuild iOS apps to verify compilation:
```bash
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatfaircustomer -configuration Release -destination 'generic/platform=iOS' build 2>&1 | tail -5
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairdelivery -configuration Release -destination 'generic/platform=iOS' build 2>&1 | tail -5
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Release -destination 'generic/platform=iOS' build 2>&1 | tail -5
```

For Android, verify compilation:
```bash
cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :app:compileDebugKotlin :driver:compileDebugKotlin :partner:compileDebugKotlin 2>&1 | tail -10
```
  </action>
  <verify>
    All 6 apps compile successfully. Re-run backend E2E tests to ensure fixes didn't break anything: cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -m pytest tests/e2e/test_ui_wiring_e2e.py -v --tb=short
  </verify>
  <done>
    All DEAD and WRONG_TARGET findings from audit are fixed. All 6 apps compile. E2E tests pass. UI_AUDIT_REPORT.md updated with resolution status for each finding.
  </done>
</task>

</tasks>

<verification>
1. UI_AUDIT_REPORT.md exists with findings for all 6 apps
2. test_ui_wiring_e2e.py has 25+ passing test cases
3. Zero DEAD or WRONG_TARGET findings remain after fixes
4. All 6 apps compile (3 iOS xcodebuild + 3 Android gradlew)
5. Existing backend test suite still passes: pytest tests/ -v
</verification>

<success_criteria>
- Complete audit report covering every button, tab, navigation link, and form in all 6 apps with file:line references
- Backend E2E test suite exercising every API endpoint the apps call
- All broken wiring fixed with compilation verified across all 6 apps
- Zero regressions in existing test suite (1439 tests)
</success_criteria>

<output>
After completion, create `.planning/quick/103-e2e-ui-audit-buttons-navigation-clicks-s/103-SUMMARY.md`
</output>
