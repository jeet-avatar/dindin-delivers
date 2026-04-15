---
id: CASE-180
title: "POST /api/admin/teams creates a new team with name and assigns admin"
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
feature: "POST /api/admin/teams"
test_ref: ""
files:
  - path: src/backend/routers/admin.py
    lines: ""
---

## Why This Case Was Created
The admin panel allows creating new teams (groups of users sharing a NetSuite connection). Team creation requires a name and an assigned team admin. Without this endpoint, all users exist in a single default team — no multi-tenant isolation within an installation. No test verifies team creation.

## What Is Wrong
No test exists for this behavior. The team creation endpoint is a planned feature for Phase 10 with no existing implementation.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 10. The `Team` model is expected to have `name`, `admin_user_id`, and `created_at` fields. Multi-team support enables enterprise customers to partition access by department.

## What Is Done Right
The RBAC system from Phase 09 establishes team-based permissions. The admin middleware exists. The `User.team_id` foreign key exists in the user model.

## How To Fix It
Write the following test in `tests/test_admin.py`:

```python
@pytest.mark.asyncio
async def test_admin_create_team_returns_201_with_team_id(client, admin_headers, db_session, test_user):
    """
    Verify POST /api/admin/teams creates a team and returns the team record.
    """
    resp = await client.post(
        "/api/admin/teams",
        json={"name": "Finance Team", "admin_user_id": str(test_user.id)},
        headers=admin_headers,
    )
    assert resp.status_code == 201

    data = resp.json()
    assert "id" in data, "Missing team id in response"
    assert data["name"] == "Finance Team"
    assert "admin_user_id" in data or "admin" in data


@pytest.mark.asyncio
async def test_admin_create_team_rejects_duplicate_name(client, admin_headers):
    """Verify duplicate team names return 409."""
    await client.post(
        "/api/admin/teams",
        json={"name": "Unique Team", "admin_user_id": "some-user-id"},
        headers=admin_headers,
    )
    resp = await client.post(
        "/api/admin/teams",
        json={"name": "Unique Team", "admin_user_id": "some-user-id"},
        headers=admin_headers,
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_admin_create_team_requires_admin_role(client, user_headers):
    """Verify non-admins cannot create teams."""
    resp = await client.post(
        "/api/admin/teams",
        json={"name": "Unauthorized Team", "admin_user_id": "some-id"},
        headers=user_headers,
    )
    assert resp.status_code == 403
```

## Architecture Mapping

**Layer:** Admin API / Team Management (Backend)

**Flow:**
    POST /api/admin/teams (admin only) → validate name unique → create Team record → assign admin → return {id, name, admin_user_id} ← NO TEST EXISTS HERE

**Upstream:** Admin creates a new department team for multi-team enterprise deployment
**Downstream:** If broken, enterprise customers cannot partition access by team — all users share one context

## Verification
- [ ] Write test: `pytest tests/test_admin.py::test_admin_create_team_returns_201_with_team_id -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for team creation. Enterprise multi-team support is completely broken.

## Links
- Phase SUMMARY: `.planning/phases/10-admin-panel/10-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-174, CASE-175, CASE-150
