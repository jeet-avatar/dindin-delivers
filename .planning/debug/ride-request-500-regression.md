---
status: diagnosed
trigger: "Why was the /api/erp/rides/request 500 bug there? Was it always broken or did it regress? Why didn't 1289 tests catch it?"
created: 2026-03-02T00:00:00-08:00
updated: 2026-03-02T00:00:00-08:00
---

## Current Focus

hypothesis: CONFIRMED - Two separate bugs introduced by two different commits, both caused by incomplete code transformations during auth migration
test: Git blame + diff analysis complete
expecting: N/A - root cause confirmed
next_action: Return diagnosis

## Symptoms

expected: /api/erp/rides/request should return 200 with ride data when called with valid customer JWT
actual: Returns HTTP 500 Internal Server Error due to NameError on undefined `authorization` variable
errors: NameError at main_new.py:3770 - `authorization` not defined in function scope. Also `customer.name` at line 3698 - Customer model has no `name` attribute
reproduction: POST /api/erp/rides/request with valid customer JWT token and proper body
started: Feb 20, 2026 (commit ea42673e9)

## Eliminated

- hypothesis: "This was always broken from the original implementation"
  evidence: Before commit ea42673e9 (Feb 20), the function signature had `authorization: Optional[str] = Header(None)` which made both `authorization` references valid. The endpoint worked before the auth migration.
  timestamp: 2026-03-02

- hypothesis: "The test suite had a regression that stopped catching this"
  evidence: The test suite NEVER tested `/api/erp/rides/request`. All 1289 tests hit `/api/rides/request` (bid_routes.py) which is a completely different endpoint. Zero test coverage existed before or after the migration.
  timestamp: 2026-03-02

## Evidence

- timestamp: 2026-03-02
  checked: git blame 73a1a3f4^ -L 3768,3776 (the authorization block)
  found: The `authorization` variable block at lines 3768-3776 was introduced by commit 7ceac8b44 (Feb 5, 2026) titled "fix(backend): Persist ride requests to database for driver bidding". At that time the function signature included `authorization: Optional[str] = Header(None)`, so it was valid code.
  implication: This code was correct when written. It became broken later.

- timestamp: 2026-03-02
  checked: git show ea42673e9 (the auth migration commit)
  found: Commit ea42673e9 (Feb 20, 2026) titled "feat(01-01): add per-endpoint Depends() auth + fix public allowlist" changed the function signature from `authorization: Optional[str] = Header(None)` to `customer: Customer = Depends(require_customer)`. It replaced the FIRST authorization block (customer name/email extraction at lines 3812-3836) but DID NOT replace the SECOND authorization block (customer_id extraction at lines 3768-3776). It also introduced `customer.name` which doesn't exist on the Customer model.
  implication: This is a classic incomplete refactoring bug. The commit touched the top of the function but missed a second usage of the removed parameter lower down.

- timestamp: 2026-03-02
  checked: git show ea42673e9 | grep -c "customer_id_val"
  found: Zero occurrences. The auth migration commit did not touch the customer_id_val/authorization block at all.
  implication: Confirms the second authorization block was simply overlooked during the refactoring.

- timestamp: 2026-03-02
  checked: Customer model in models.py:579-618
  found: Customer model has `first_name` and `last_name` (lines 588-589) but NO `name` attribute.
  implication: The `customer.name` fallback in the replacement code (ea42673e9) was a hallucination - the author assumed Customer had a `name` field.

- timestamp: 2026-03-02
  checked: Test coverage for /api/erp/rides/request
  found: ZERO tests in the entire test suite hit `/api/erp/rides/request`. All ride request tests hit `/api/rides/request` which maps to `bid_routes.py:330` (a completely different endpoint). The E2E tests (test_rideshare_e2e_flow.py) use `/api/rides/request`. The integration tests (test_ios_api_contracts.py) use `/api/rides/request`. The unit test (test_order_flow.py) tests order_flow.request_ride directly.
  implication: The endpoint has been a dead zone for testing since its creation. Any bug introduced here would go undetected.

- timestamp: 2026-03-02
  checked: Route duplication analysis
  found: THREE separate request_ride implementations exist:
    1. `main_new.py:3679` - `@app.post("/api/erp/rides/request")` (the buggy one, registered first on app, WINS for this path)
    2. `order_flow.py:790` - `@router.post("/rides/request")` with prefix `/api/erp` (same final path, but SHADOWED by #1)
    3. `bid_routes.py:330` - `@router.post("/request")` with prefix `/api/rides` (different path: `/api/rides/request`, this is what iOS apps and tests actually use)
  implication: The main_new.py version shadows the order_flow.py version. The bid_routes.py version is what actually serves production traffic. The main_new.py endpoint is effectively dead code that shadows another dead endpoint.

- timestamp: 2026-03-02
  checked: iOS app code (P2PAPIService.swift:5179)
  found: iOS app calls `"\(baseURL)/rides/request"` which resolves to `/api/rides/request` (bid_routes.py), NOT `/api/erp/rides/request` (main_new.py).
  implication: The buggy endpoint was never called by the production iOS apps.

- timestamp: 2026-03-02
  checked: What calls /api/erp/rides/request
  found: Only `rideshare_e2e_test.py` (a standalone test script, not part of pytest suite) and `test_ride_checkout.py` (another standalone script) reference this path. Neither is part of the automated test suite.
  implication: This endpoint exists for a legacy/ERP integration path that was superseded by bid_routes.py but never cleaned up.

## Resolution

root_cause: |
  TWO bugs, both introduced during the Phase 01-01 auth migration (commit ea42673e9, Feb 20, 2026):

  **Bug 1 (line 3698): `customer.name` AttributeError**
  The auth migration replaced the old manual JWT-based customer lookup with `Depends(require_customer)`. When rewriting the customer_name extraction, the author added `customer.name` as a fallback, but Customer model has no `name` attribute (only `first_name`/`last_name`). This was a data model hallucination.

  **Bug 2 (line 3770): `authorization` NameError**
  The function originally had `authorization: Optional[str] = Header(None)` in its signature. Commit 7ceac8b44 (Feb 5) added a SECOND block lower in the function body that used `authorization` to extract customer_id for the DB insert. When commit ea42673e9 (Feb 20) replaced the parameter with `Depends(require_customer)`, it correctly replaced the FIRST authorization usage (customer name/email extraction at the top) but completely MISSED the SECOND usage (customer_id extraction ~70 lines lower). Classic incomplete refactoring.

  **Why tests didn't catch it:**
  The 1289 passing tests test `/api/rides/request` (served by `bid_routes.py`), NOT `/api/erp/rides/request` (served by `main_new.py`). These are two completely different endpoints despite similar names. Zero automated tests ever exercised the buggy endpoint. The iOS apps also call `/api/rides/request`, not the ERP version. The buggy endpoint is effectively dead code that was superseded by `bid_routes.py` but never removed.

  **Was it always broken?**
  NO. Before Feb 20, 2026, the endpoint worked because `authorization` was in the function signature. The auth migration broke it. But since no tests or production traffic hit this endpoint, the breakage was invisible for 8 days until a staging E2E test was manually run against it.

fix: Applied in commit 73a1a3f4 - replaced `authorization` block with `customer.id` and removed `customer.name`
verification: N/A (diagnosis only mode)
files_changed:
  - apps/web/p2p-platform/backend/main_new.py
