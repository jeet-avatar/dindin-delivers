---
id: CASE-007
title: "No 422 validation error tests for /api/user/register"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: TEST_GAP
severity: MEDIUM
status: PASS
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/tests/test_user.py
    lines: "98-132"
  - path: src/backend/routers/user.py
    lines: "~1-50"
---

## Why This Case Was Created
Triggered by the TEST_GAP audit dimension. The registration test suite in `test_user.py` covers the happy path, duplicate email (409), and password policy failures (400), but has partial coverage for HTTP 422 validation errors — only `missing email` and `invalid email format` are tested. Missing fields other than email, wrong field types, and malformed JSON are not tested. This creates a gap where Pydantic schema changes could silently break input validation.

## What Is Wrong
`src/backend/tests/test_user.py` lines 98–132 cover only two 422 scenarios:

```python
async def test_register_missing_email_returns_422(client):
    # TC-AUTH-04: Missing email → 422
    resp = await client.post("/api/user/register", json={
        "first_name": "Bob", "last_name": "B",
        "password": "BobPass1!", "organization": "Org",
        # email is omitted
    })
    assert resp.status_code == 422

async def test_register_invalid_email_format_returns_422(client):
    # TC-AUTH-05: Invalid email format → 422
    resp = await client.post("/api/user/register", json={
        "first_name": "Bob", "last_name": "B",
        "email": "not-an-email", "password": "BobPass1!", "organization": "Org",
    })
    assert resp.status_code == 422
```

**Missing 422 test coverage for /api/user/register:**
- Missing `first_name` field → should return 422
- Missing `last_name` field → should return 422
- Missing `password` field → should return 422
- Empty string for `first_name` → behavior unclear (may be 422 or pass through to 400)
- Completely empty JSON body `{}` → should return 422
- Non-string value for `email` (e.g., integer `123`) → should return 422

The `RegisterRequest` schema (`src/backend/schemas.py:5–10`) has `first_name`, `last_name`, `email`, and `password` as required fields with no defaults. If any of these are changed to `Optional` by accident, tests would not catch it.

## Why It Was Done This Way (Root Cause)
The test suite was written to cover the functional requirements (FR-AUTH-01) which focused on the success path and the most common error cases (duplicate email, weak password). Exhaustive Pydantic validation testing was not included in the initial Phase 1 scope.

## What Is Done Right
The existing 422 tests for `missing_email` and `invalid_email_format` establish the correct pattern. The success path test (`test_register_valid_user`) and duplicate email test are correct and comprehensive. The password policy tests (lines 75–165) thoroughly cover 400 validation errors.

## How To Fix It
Add the following tests to `src/backend/tests/test_user.py`:

```python
@pytest.mark.asyncio
async def test_register_missing_first_name_returns_422(client):
    """TC-AUTH-REG-422-01: Missing first_name → 422."""
    resp = await client.post("/api/user/register", json={
        "last_name": "Builder", "email": "missing@test.com",
        "password": "MissingFirst1!", "organization": "Org",
    })
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_register_missing_last_name_returns_422(client):
    """TC-AUTH-REG-422-02: Missing last_name → 422."""
    resp = await client.post("/api/user/register", json={
        "first_name": "Bob", "email": "missing@test.com",
        "password": "MissingLast1!", "organization": "Org",
    })
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_register_missing_password_returns_422(client):
    """TC-AUTH-REG-422-03: Missing password → 422."""
    resp = await client.post("/api/user/register", json={
        "first_name": "Bob", "last_name": "Builder",
        "email": "nopw@test.com", "organization": "Org",
    })
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_register_empty_body_returns_422(client):
    """TC-AUTH-REG-422-04: Empty JSON body → 422."""
    resp = await client.post("/api/user/register", json={})
    assert resp.status_code == 422
```

Run the new tests:
```bash
pytest tests/test_user.py -v -k "422"
```

## Architecture Mapping

**Layer:** Backend Router → Request Schema Validation

**Flow:**

    POST /api/user/register
      → FastAPI/Pydantic validates body against RegisterRequest schema
                  ↑
         THIS CASE LIVES HERE (test gap — Pydantic rejection paths not fully tested)
        → 422 Unprocessable Entity (if required field missing)
        → routers/user.py register() (if validation passes)

**Upstream:** Frontend registration form (`src/frontend/src/pages/Password.tsx` or similar) sends the registration payload

**Downstream:** `routers/user.py register()` only runs if Pydantic validation passes; `auth_utils.validate_password()` runs inside the route

## Verification
- [ ] Grep proof: `grep -n "422\|missing\|invalid" src/backend/tests/test_user.py` → shows only 2 existing 422 tests
- [ ] Test proof: `pytest tests/test_user.py::test_register_missing_first_name_returns_422 -v` → PASSED
- [ ] Test proof: `pytest tests/test_user.py::test_register_missing_password_returns_422 -v` → PASSED
- [ ] Test proof: `pytest tests/test_user.py::test_register_empty_body_returns_422 -v` → PASSED

## Downstream Impact
**Impact if unfixed:** Test Gap — no immediate user-visible impact

Without these tests, a schema change that accidentally makes `first_name` or `password` optional would go undetected until a user submits an incomplete form and the server either crashes or stores a null value in the database. The gap also means there is no regression protection against accidental Pydantic schema loosening.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-auth/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-008 (another test gap in auth suite), CASE-009 (migration bypass in conftest)
