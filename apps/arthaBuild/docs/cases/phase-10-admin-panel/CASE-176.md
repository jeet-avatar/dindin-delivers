---
id: CASE-176
title: "DELETE /api/admin/users/{id} deactivates (soft-deletes) a user"
phase: "10"
phase_name: "Admin Panel"
category: FEATURE_TEST
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-10T21:55:53Z
assignee: "Priya"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "DELETE /api/admin/users/{id}"
test_ref: ""
files:
  - path: src/backend/routers/admin.py
    lines: ""
---

## Why This Case Was Created
When a user leaves the team, an admin must be able to deactivate their account. This should be a soft-delete (setting `is_active = False`) so that chat history and audit logs are preserved. A hard delete would violate data integrity. No test verifies that the delete endpoint soft-deletes and that deactivated users cannot log in.

## What Is Wrong
No test exists for this behavior. The user deactivation endpoint is a planned feature for Phase 10 with no existing implementation.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 10. The `User.is_active` field exists in the model. Soft-delete is the correct approach for audit trail preservation.

## What Is Done Right
The `User.is_active` field exists in the SQLAlchemy model. The admin middleware exists. The login flow checks `is_active` before issuing tokens.

## How To Fix It
Write the following test in `tests/test_admin.py`:

```python
@pytest.mark.asyncio
async def test_admin_delete_user_soft_deletes(client, admin_headers, db_session, test_user):
    """
    Verify DELETE /api/admin/users/{id} sets is_active=False (soft-delete).
    User record must still exist in DB.
    """
    resp = await client.delete(
        f"/api/admin/users/{test_user.id}",
        headers=admin_headers,
    )
    assert resp.status_code == 200

    # Verify soft-delete: record exists but is_active is False
    db_session.refresh(test_user)
    assert test_user.is_active is False, "User should be soft-deleted (is_active=False)"


@pytest.mark.asyncio
async def test_deactivated_user_cannot_login(client, db_session, test_user):
    """
    Verify a deactivated user cannot obtain a new token via login.
    """
    test_user.is_active = False
    db_session.commit()

    resp = await client.post("/api/auth/login", data={
        "username": test_user.email,
        "password": "TestPass123!",
    })
    assert resp.status_code in (401, 403), (
        f"Deactivated user should not be able to login, got {resp.status_code}"
    )
```

## Architecture Mapping

**Layer:** Admin API / User Lifecycle (Backend)

**Flow:**
    DELETE /api/admin/users/{id} (admin only) → db.update(User.is_active=False) → deactivated user cannot login ← NO TEST EXISTS HERE

**Upstream:** Admin removes a former employee from the system
**Downstream:** If hard-delete instead of soft-delete, chat history orphaned and audit log broken

## Verification
- [ ] Write test: `pytest tests/test_admin.py::test_admin_delete_user_soft_deletes -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for user deactivation. Former employees could retain access if deactivation silently fails.

## Links
- Phase SUMMARY: `.planning/phases/10-admin-panel/10-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-174, CASE-175, CASE-192
