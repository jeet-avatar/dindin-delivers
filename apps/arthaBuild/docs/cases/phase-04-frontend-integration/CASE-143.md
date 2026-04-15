---
id: CASE-143
title: "Frontend NetSuiteConnectPanel sends all 5 TBA fields to /api/netsuite/authenticate"
phase: "04"
phase_name: "Frontend Integration"
category: FEATURE_TEST
severity: LOW
status: DEFERRED
deferred_reason: "Playwright browser testing infrastructure required — deferred to M2 staging validation phase"
created: 2026-04-10
updated: 2026-04-11
assignee: "Priya"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "Frontend NetSuite connection"
test_ref: ""
files:
  - path: src/frontend/src/components/ChatMessage.tsx
    lines: ""
---

## Why This Case Was Created
The NetSuite connection panel must send all 5 TBA (Token-Based Authentication) fields to `/api/netsuite/authenticate`: `account_id`, `token_key`, `token_secret`, `consumer_key`, `consumer_secret`. If any field is missing or misnamed, NetSuite authentication fails silently on the backend. No E2E test verifies all 5 fields are sent with correct names.

## What Is Wrong
No test exists for this behavior. A field rename in the frontend form or the backend Pydantic schema could silently break NetSuite connection for all customers.

## Why It Was Done This Way (Root Cause)
Phase 04 implemented the NetSuite connection UI. The 5 field names were defined in the backend Pydantic schema. Manual testing verified the connection works, but no automated E2E test captures the request payload structure.

## What Is Done Right
The backend `NetSuiteAuthRequest` Pydantic schema validates all 5 fields and returns 422 if any are missing. The frontend form renders 5 input fields. The connection panel exists in the UI.

## How To Fix It
Write the following test in `tests/e2e/test_netsuite_connect.py`:

```python
@pytest.mark.asyncio
async def test_netsuite_connect_panel_sends_all_five_tba_fields(page):
    """
    Verify that the NetSuite connection panel sends all 5 TBA fields
    to /api/netsuite/authenticate with correct field names.
    """
    captured_request = {}

    async def capture_auth_request(request):
        if "/api/netsuite/authenticate" in request.url:
            captured_request["body"] = await request.json()

    page.on("request", capture_auth_request)

    await page.goto("http://localhost:5173/settings")
    await page.fill('[data-testid="account-id"]', "1234567")
    await page.fill('[data-testid="token-key"]', "test_token_key")
    await page.fill('[data-testid="token-secret"]', "test_token_secret")
    await page.fill('[data-testid="consumer-key"]', "test_consumer_key")
    await page.fill('[data-testid="consumer-secret"]', "test_consumer_secret")
    await page.click('[data-testid="connect-button"]')

    body = captured_request.get("body", {})
    required_fields = ["account_id", "token_key", "token_secret", "consumer_key", "consumer_secret"]
    for field in required_fields:
        assert field in body, f"Missing TBA field in request: {field}"
```

## Architecture Mapping

**Layer:** Frontend → Backend NetSuite Auth (E2E)

**Flow:**
    NetSuiteConnectPanel → submit form → POST /api/netsuite/authenticate {account_id, token_key, token_secret, consumer_key, consumer_secret} ← NO TEST EXISTS HERE

**Upstream:** Customer enters their NetSuite TBA credentials during onboarding
**Downstream:** If any field is missing, NetSuite auth fails — customers cannot connect their account

## Verification
- [ ] Write test: `pytest tests/e2e/test_netsuite_connect.py::test_netsuite_connect_panel_sends_all_five_tba_fields -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for TBA field completeness. A schema rename silently breaks NetSuite connectivity.

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-144, CASE-141
