---
phase: quick-56
plan: 56
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
autonomous: true
requirements: [ROUTE-COLLISION-FIX]

must_haves:
  truths:
    - "GET /api/vendors/published returns restaurant list, not int_parsing error"
    - "POST /api/vendors/public registration works without collision"
    - "GET /api/erp/rides/{ride_id}/status has exactly one handler (no duplicates)"
    - "No dead AppConfig.swift endpoint constants referencing non-existent backend routes"
    - "All existing client API calls (iOS + Android) still resolve to correct backend handlers"
    - "pytest test suite passes with zero regressions"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Clean route registry with no collisions or duplicates"
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift"
      provides: "Only valid, referenced endpoint constants"
  key_links:
    - from: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift"
      to: "apps/web/p2p-platform/backend/main_new.py"
      via: "HTTP API calls"
      pattern: "baseURL.*?/erp/|baseURL.*?/api/"
    - from: "apps/web/p2p-platform/backend/main_new.py"
      to: "apps/web/p2p-platform/backend/order_flow.py"
      via: "include_router(order_flow_router) at line 14104"
      pattern: "app\\.include_router"
---

<objective>
Audit and fix all route collisions, duplicate routes, and dead endpoint references in the backend (main_new.py) and iOS client (AppConfig.swift).

Purpose: The `/api/vendors/{vendor_id}` catch-all swallows requests to non-existent literal routes like `/api/vendors/orders`, returning confusing `int_parsing` errors instead of 404s. Dead iOS constants reference backend routes that don't exist. One exact duplicate route wastes handler registration. Fixing these prevents subtle routing bugs and removes misleading dead code.

Output: Clean main_new.py with no route collisions or duplicates, clean AppConfig.swift with no dead endpoint constants, passing test suite.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/main_new.py
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove duplicate route and dead iOS endpoint constants</name>
  <files>
    apps/web/p2p-platform/backend/main_new.py
    apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
  </files>
  <action>
**Backend: Remove duplicate GET /api/erp/rides/{ride_id}/status**

At line 14291-14297 in main_new.py, there is an iOS alias `get_ride_status_ios_alias` that re-registers `GET /api/erp/rides/{ride_id}/status` which already exists at line 3679 (`get_ride_status`). The alias at 14292 just delegates to the original. FastAPI uses the first-registered handler, making the alias dead code.

- Delete the `@app.get("/erp/rides/{ride_id}/status")` decorator at line 14291
- Delete the `@app.get("/api/erp/rides/{ride_id}/status")` decorator at line 14292
- Delete the `get_ride_status_ios_alias` function (lines 14293-14297)
- Keep the `@app.get("/erp/rides/{ride_id}/status")` single decorator pointing to line 3679 if it doesn't already exist there. WAIT -- the original at line 3679 only registers `/api/erp/rides/{ride_id}/status`. The alias at 14291 also registers the bare `/erp/rides/{ride_id}/status` (without `/api` prefix). So we need to ADD `@app.get("/erp/rides/{ride_id}/status")` as an additional decorator on the ORIGINAL `get_ride_status` function at line 3679, then delete the entire alias block at 14291-14297. This preserves the bare `/erp/` path for any clients using it.

**iOS: Remove dead AppConfig.swift endpoint constants**

In `AppConfig.swift` lines 508-509:
- `vendorOrders = "/api/vendors/orders"` -- NO backend route exists at this path, and this constant is NEVER referenced anywhere in the iOS codebase (verified via grep)
- `vendorMenu = "/api/vendors/menu"` -- NO backend route exists at this path (the actual menu endpoints are `/api/vendors/{vendor_id}/menu`), and this constant is NEVER referenced anywhere in the iOS codebase

Delete both lines. The actual iOS code uses:
- Vendor orders: `P2PAPIService.swift:3131` uses `/erp/orders/vendor/{vendorId}` directly (hardcoded URL, not via AppConfig constant)
- Vendor menu: `P2PAPIService.swift` uses `/api/vendors/{vendor_id}/menu` directly (hardcoded URL with vendor ID interpolation)

Also verify: `vendorAuth = "/api/vendors/google-auth"` at line 507 -- check if this is referenced. If not, delete it too (the iOS app uses hardcoded URLs in P2PAPIService.swift for auth calls).

**Do NOT touch any route ordering in main_new.py.** FastAPI 0.115.0 (Starlette) correctly resolves literal paths before parameterized paths regardless of registration order. The `/api/vendors/published` (line 10024) and `/api/vendors/public` (line 9478) routes work correctly even though `/api/vendors/{vendor_id}` (line 10184) exists. The `int_parsing` error only happens when a client hits a path like `/api/vendors/orders` that has NO matching literal route -- this is correct 422 behavior (not a routing collision).
  </action>
  <verify>
1. Run: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python3 -c "import main_new; print('Import OK')"` -- confirms no import errors after changes
2. Run: `grep -n "get_ride_status_ios_alias" apps/web/p2p-platform/backend/main_new.py` -- should return 0 matches
3. Run: `grep -n 'vendorOrders\|vendorMenu' apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift` -- should return 0 matches
4. Run: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python3 -c "
import re
with open('main_new.py') as f: content = f.read()
routes = re.findall(r'@app\.\w+\([\"\'](.*?)[\"\']', content)
from collections import Counter
dupes = {r: c for r, c in Counter(routes).items() if c > 1}
print('Duplicates:', dupes if dupes else 'NONE')
"` -- should show NONE (no more duplicate registrations)
  </verify>
  <done>
- `get_ride_status_ios_alias` function removed from main_new.py
- Bare `/erp/rides/{ride_id}/status` path preserved on original handler at line 3679
- Dead `vendorOrders` and `vendorMenu` constants removed from AppConfig.swift
- Zero duplicate route registrations in main_new.py
- main_new.py imports cleanly
  </done>
</task>

<task type="auto">
  <name>Task 2: Run full test suite and verify no regressions</name>
  <files>
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
Run the full backend test suite to verify the route changes cause zero regressions:

1. Run `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -m pytest tests/ -v --tb=short 2>&1 | tail -50`
2. If any tests fail, investigate whether they are related to the route changes:
   - Tests hitting `/api/erp/rides/{ride_id}/status` should still pass because the original handler at line 3679 is unchanged
   - Tests hitting `/erp/rides/{ride_id}/status` (bare prefix) should still pass because we added this decorator to the original handler
   - Any test importing or calling `get_ride_status_ios_alias` directly must be updated to call `get_ride_status` instead
3. Verify the iOS integration tests still reference valid routes:
   - `grep -n "ride_status\|rides.*status" apps/web/p2p-platform/backend/tests/integration/test_ios_api_contracts.py` -- check these still hit valid endpoints
4. Run a quick Python script to verify no route shadows exist:
   ```python
   cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python3 -c "
   from fastapi.testclient import TestClient
   from main_new import app
   # Verify literal vendor routes work
   client = TestClient(app)
   # These should NOT return int_parsing errors:
   r = client.get('/api/vendors/published')
   print(f'GET /api/vendors/published: {r.status_code}')
   r = client.post('/api/vendors/public', json={})
   print(f'POST /api/vendors/public: {r.status_code} (expect 4xx, not int_parsing)')
   "
   ```
5. If tests pass, the task is complete. If pre-existing test failures exist (unrelated to route changes), note them but do not fix them.
  </action>
  <verify>
Run: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -m pytest tests/ -v --tb=short 2>&1 | grep -E "passed|failed|error"` -- expect all tests pass (or only pre-existing failures unrelated to route changes)
  </verify>
  <done>
- Full test suite passes with zero new failures from route changes
- GET /api/vendors/published does NOT return int_parsing error
- POST /api/vendors/public does NOT return int_parsing error
- GET /erp/rides/{ride_id}/status still resolves to the correct handler
  </done>
</task>

</tasks>

<verification>
1. No duplicate route registrations in main_new.py (python script counts route occurrences)
2. No dead endpoint constants in AppConfig.swift (grep confirms removal)
3. All client API calls (iOS P2PAPIService.swift, Android DollorApiService.kt) still resolve to valid backend routes
4. Backend test suite passes with zero regressions
5. The bare `/erp/rides/{ride_id}/status` path is preserved on the original handler
</verification>

<success_criteria>
- Zero duplicate route registrations in main_new.py
- Zero dead endpoint constants in AppConfig.swift referencing non-existent backend routes
- Backend test suite: zero new failures
- GET /api/vendors/published returns restaurant data (not int_parsing)
- POST /api/vendors/public returns registration response (not int_parsing)
</success_criteria>

<output>
After completion, create `.planning/quick/56-audit-fix-route-collisions-duplicate-rou/56-SUMMARY.md`
</output>
