---
id: CASE-107
title: "GET /api/admin/team returns team member list for admin (200)"
phase: "09"
phase_name: "RBAC & Team Management"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Arjun"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "GET /api/admin/team"
test_ref: "tests/test_chats.py::TestAdminChats::test_admin_can_list_team_members"
files:
  - path: src/backend/routers/admin.py
    lines: ""
  - path: src/backend/auth_utils.py
    lines: ""
---

## Why This Case Was Created
Verifies that an admin user can call `GET /api/admin/team` and receive HTTP 200 with a list
of team members. In a fresh test database, the first registered user becomes admin
automatically, so this test also exercises the first-user promotion path.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/admin.py` — `list_team_members()` may not be filtering by `User.team_id ==
  admin.team_id`, returning an empty list or all users
- `auth_utils.py` — `require_admin` dependency may be failing for the first user because the
  role field was not set during registration
- The response may be returning a non-list value (e.g., a dict) instead of a JSON array

## Why It Was Done This Way (Root Cause)
`GET /api/admin/team` uses `Depends(require_admin)` which loads the current user, checks
`user.role == "admin"`, and raises 403 otherwise. The handler then queries
`select(User).where(User.team_id == admin.team_id)` and returns the list. The first
registered user in an empty DB receives `role="admin"` automatically
(`routers/auth.py` or `routers/user.py`: `if user_count == 0: user.role = "admin"`).

## What Is Done Right
- Uses the first registered user (admin) to call the endpoint
- Asserts HTTP 200 and that the response is a list
- Implicitly tests the `require_admin` dependency passes for a genuine admin

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_chats.py::TestAdminChats::test_admin_can_list_team_members -v
```

## Architecture Mapping

**Layer:** Backend Router → Auth Dependency → ORM Model → SQLite DB

**Flow:**
    GET /api/admin/team  [admin Bearer token]
      → routers/admin.py:list_team_members()
        → Depends(require_admin)              ← checks role=="admin"
          → select(User).where(User.team_id == admin.team_id)
            → return [{id, email, role, ...}]  ← THIS TEST COVERS THIS

**Upstream:** Admin portal team management page loads member list
**Downstream:** Admin sees all team members; can invite or remove them

## Verification
- [ ] Test passes: `pytest tests/test_chats.py::TestAdminChats::test_admin_can_list_team_members -v`

## Downstream Impact
**Impact if unfixed:** Admin cannot view their team roster; team management UI is entirely
non-functional, blocking user onboarding and role assignment workflows.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-108 (invite), CASE-109 (non-admin invite block), CASE-112 (remove member)
