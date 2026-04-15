---
id: CASE-174
title: "GET /api/admin/users returns all users with role and team assignment"
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
feature: "GET /api/admin/users"
test_ref: ""
files:
  - path: src/backend/routers/admin.py
    lines: ""
---

## Why This Case Was Created
The admin user management page requires a list of all users with their role (admin/user) and team assignment. Without this endpoint, admins cannot see who has access to the system. No test verifies this endpoint exists, is admin-only, and returns the correct user fields.

## What Is Wrong
No test exists for this behavior. The admin users endpoint is a planned feature for Phase 10 with no existing implementation.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 10. The `User` model has `role` and `team_id` fields that will be used to build this response.

## What Is Done Right
The `User` SQLAlchemy model exists with `email`, `role`, `is_active`, and `team_id` fields. The admin auth middleware exists. The `/api/admin` router namespace is available.

## How To Fix It
Write the following test in `tests/test_admin.py`:

```python
@pytest.mark.asyncio
async def test_admin_users_list_includes_role_and_team(client, admin_headers, db_session):
    """
    Verify GET /api/admin/users returns all users with role and team_id.
    """
    resp = await client.get("/api/admin/users", headers=admin_headers)
    assert resp.status_code == 200

    users = resp.json()
    assert isinstance(users, list)
    assert len(users) > 0, "Expected at least one user in the list"

    user = users[0]
    assert "email" in user, "Missing email field"
    assert "role" in user, "Missing role field"
    assert "team_id" in user or "team" in user, "Missing team assignment field"
    assert "is_active" in user, "Missing is_active field"


@pytest.mark.asyncio
async def test_admin_users_requires_admin_role(client, user_headers):
    """Verify non-admin cannot access user list."""
    resp = await client.get("/api/admin/users", headers=user_headers)
    assert resp.status_code == 403
```

## Architecture Mapping

**Layer:** Admin API (Backend)

**Flow:**
    GET /api/admin/users (admin only) → db.query(User).all() → return [{email, role, team_id, is_active}] ← NO TEST EXISTS HERE

**Upstream:** Admin opens user management page
**Downstream:** If broken, admins cannot view or manage system users

## Verification
- [ ] Write test: `pytest tests/test_admin.py::test_admin_users_list_includes_role_and_team -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for admin user listing. User management page is empty without indication of failure.

## Links
- Phase SUMMARY: `.planning/phases/10-admin-panel/10-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-173, CASE-175, CASE-176
