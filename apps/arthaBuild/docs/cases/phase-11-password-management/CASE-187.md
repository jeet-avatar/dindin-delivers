---
id: CASE-187
title: "PATCH /api/user/me updates first_name and last_name in DB"
phase: "11"
phase_name: "Password Management"
category: FEATURE_TEST
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "PATCH /api/user/me"
test_ref: "tests/test_user.py"
files:
  - path: src/backend/routers/user.py
    lines: ""
---

## Why This Case Was Created
Users must be able to update their own profile information (first name, last name) without admin intervention. The profile update endpoint should only allow updating the user's own record (not other users'), should persist changes to the database, and should return the updated user object. No test verifies this profile update endpoint.

## What Is Wrong
No test exists for this behavior. The profile update endpoint is planned for Phase 11 with no existing implementation.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 11. The `User` model has `first_name` and `last_name` fields. The endpoint uses the JWT token to identify which user's record to update.

## What Is Done Right
The `User` model has `first_name` and `last_name` fields. The JWT auth provides user identity. The Pydantic partial update pattern (`Optional` fields) is well-supported for PATCH endpoints.

## How To Fix It
Write the following test in `tests/test_user.py`:

```python
@pytest.mark.asyncio
async def test_patch_user_me_updates_name_fields(client, auth_headers, db_session, test_user):
    """
    Verify PATCH /api/user/me updates first_name and last_name in the DB.
    """
    resp = await client.patch(
        "/api/user/me",
        json={"first_name": "UpdatedFirst", "last_name": "UpdatedLast"},
        headers=auth_headers,
    )
    assert resp.status_code == 200

    data = resp.json()
    assert data.get("first_name") == "UpdatedFirst"
    assert data.get("last_name") == "UpdatedLast"

    # Verify persisted in DB
    db_session.refresh(test_user)
    assert test_user.first_name == "UpdatedFirst"
    assert test_user.last_name == "UpdatedLast"


@pytest.mark.asyncio
async def test_patch_user_me_partial_update(client, auth_headers, db_session, test_user):
    """
    Verify PATCH /api/user/me supports partial updates (only first_name).
    last_name should not be changed if not provided.
    """
    original_last = test_user.last_name

    resp = await client.patch(
        "/api/user/me",
        json={"first_name": "OnlyFirst"},
        headers=auth_headers,
    )
    assert resp.status_code == 200

    db_session.refresh(test_user)
    assert test_user.first_name == "OnlyFirst"
    assert test_user.last_name == original_last, "last_name should not change if not in request"


@pytest.mark.asyncio
async def test_patch_user_me_cannot_change_email(client, auth_headers):
    """
    Verify PATCH /api/user/me does not allow changing email.
    """
    resp = await client.patch(
        "/api/user/me",
        json={"email": "hacker@evil.com"},
        headers=auth_headers,
    )
    # Either 422 (field not allowed) or email silently ignored
    if resp.status_code == 200:
        data = resp.json()
        assert data.get("email") != "hacker@evil.com", "Email change should not be allowed via PATCH /me"
```

## Architecture Mapping

**Layer:** User Management / Profile Update (Backend)

**Flow:**
    PATCH /api/user/me → verify JWT → update User(first_name, last_name) for current user → return updated User ← NO TEST EXISTS HERE

**Upstream:** User updates their display name in account settings
**Downstream:** If broken, users cannot update their own profile without admin help

## Verification
- [ ] Write test: `pytest tests/test_user.py::test_patch_user_me_updates_name_fields -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for profile updates. Users must contact admin to fix name typos.

## Links
- Phase SUMMARY: `.planning/phases/11-password-management/11-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-181, CASE-184
