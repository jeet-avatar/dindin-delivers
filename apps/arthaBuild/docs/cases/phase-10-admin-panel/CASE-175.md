---
id: CASE-175
title: "PATCH /api/admin/users/{id}/role changes user role (admin/user)"
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
feature: "PATCH /api/admin/users/{id}/role"
test_ref: ""
files:
  - path: src/backend/routers/admin.py
    lines: ""
---

## Why This Case Was Created
Admins must be able to promote users to admin role and demote admins to user role. This endpoint changes the user's role field in the database. No test verifies the role change is persisted and only admin users can perform this action.

## What Is Wrong
No test exists for this behavior. The role change endpoint is a planned feature for Phase 10 with no existing implementation.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 10. The `User.role` field exists in the data model. The PATCH endpoint and validation logic need to be built.

## What Is Done Right
The `User.role` field exists in the SQLAlchemy model. The admin middleware exists. Role-based access control patterns are established from Phase 09 (RBAC).

## How To Fix It
Write the following test in `tests/test_admin.py`:

```python
@pytest.mark.asyncio
async def test_admin_can_change_user_role(client, admin_headers, db_session, test_user):
    """
    Verify PATCH /api/admin/users/{id}/role changes the user's role.
    """
    resp = await client.patch(
        f"/api/admin/users/{test_user.id}/role",
        json={"role": "admin"},
        headers=admin_headers,
    )
    assert resp.status_code == 200

    # Verify role persisted in DB
    db_session.refresh(test_user)
    assert test_user.role == "admin"


@pytest.mark.asyncio
async def test_admin_role_change_requires_admin_privilege(client, user_headers, test_user):
    """Verify non-admin cannot change roles."""
    resp = await client.patch(
        f"/api/admin/users/{test_user.id}/role",
        json={"role": "admin"},
        headers=user_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_role_change_rejects_invalid_role(client, admin_headers, test_user):
    """Verify invalid role values return 422."""
    resp = await client.patch(
        f"/api/admin/users/{test_user.id}/role",
        json={"role": "superuser"},
        headers=admin_headers,
    )
    assert resp.status_code == 422
```

## Architecture Mapping

**Layer:** Admin API / User Management (Backend)

**Flow:**
    PATCH /api/admin/users/{id}/role (admin only) → validate role ∈ {admin, user} → db.update(User.role) → return updated user ← NO TEST EXISTS HERE

**Upstream:** Admin promotes a team member to admin role
**Downstream:** If broken, admins cannot manage team permissions — stuck with initial role assignments

## Verification
- [ ] Write test: `pytest tests/test_admin.py::test_admin_can_change_user_role -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for role management. Role changes silently fail or apply to wrong user.

## Links
- Phase SUMMARY: `.planning/phases/10-admin-panel/10-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-174, CASE-176
