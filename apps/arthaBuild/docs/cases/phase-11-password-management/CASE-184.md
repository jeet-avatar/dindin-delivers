---
id: CASE-184
title: "DELETE /api/user/me deletes account and invalidates all tokens"
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
feature: "DELETE /api/user/me"
test_ref: "tests/test_user.py"
files:
  - path: src/backend/routers/user.py
    lines: ""
---

## Why This Case Was Created
GDPR and privacy compliance requires users to be able to delete their own accounts. After deletion, all existing tokens for that user must be invalidated so the deleted account cannot continue making API calls. No test verifies this self-service deletion endpoint.

## What Is Wrong
No test exists for this behavior. The self-service account deletion endpoint is planned for Phase 11 with no existing implementation.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 11. Account deletion should be a soft-delete (or hard-delete with anonymization) followed by JWT blacklisting for all tokens. The JWT blacklist mechanism exists from the core auth implementation.

## What Is Done Right
The JWT token blacklist exists in the auth system. The `User.is_active` soft-delete pattern is established. The `DELETE /api/user/me` endpoint pattern is well-understood in FastAPI.

## How To Fix It
Write the following test in `tests/test_user.py`:

```python
@pytest.mark.asyncio
async def test_self_service_account_deletion_invalidates_tokens(client, auth_headers, db_session, test_user):
    """
    Verify DELETE /api/user/me:
    1. Returns 200 (or 204)
    2. Subsequent requests with the same token return 401
    3. User cannot log in after deletion
    """
    # Delete own account
    resp = await client.delete("/api/user/me", headers=auth_headers)
    assert resp.status_code in (200, 204), (
        f"Expected 200/204 for self-deletion, got {resp.status_code}"
    )

    # Existing token should be invalid
    resp2 = await client.get("/api/chats", headers=auth_headers)
    assert resp2.status_code == 401, (
        f"Token should be invalid after account deletion, got {resp2.status_code}"
    )

    # Login should fail
    resp3 = await client.post("/api/auth/login", data={
        "username": test_user.email,
        "password": "TestPass123!",
    })
    assert resp3.status_code in (401, 404), (
        f"Deleted user should not be able to login, got {resp3.status_code}"
    )
```

## Architecture Mapping

**Layer:** User Management / Account Lifecycle (Backend)

**Flow:**
    DELETE /api/user/me → soft-delete or anonymize User → blacklist all tokens → return 204 ← NO TEST EXISTS HERE

**Upstream:** User requests account deletion (GDPR right to erasure)
**Downstream:** If tokens not invalidated, deleted user continues to have API access

## Verification
- [ ] Write test: `pytest tests/test_user.py::test_self_service_account_deletion_invalidates_tokens -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for account deletion. GDPR compliance gap if deletion does not fully revoke access.

## Links
- Phase SUMMARY: `.planning/phases/11-password-management/11-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-176, CASE-181
