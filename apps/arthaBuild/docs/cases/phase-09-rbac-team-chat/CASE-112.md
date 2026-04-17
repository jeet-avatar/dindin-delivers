---
id: CASE-112
title: "DELETE /api/admin/team/{id} removes team member (endpoint exists and returns 2xx)"
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
feature: "DELETE /api/admin/team/{id}"
test_ref: "tests/test_chats.py::TestAdminChats::test_admin_remove_member_endpoint_exists"
files:
  - path: src/backend/routers/admin.py
    lines: ""
  - path: src/backend/auth_utils.py
    lines: ""
---

## Why This Case Was Created
Verifies that the remove-team-member endpoint exists, is reachable by an admin, and returns
HTTP 200 or 204. A guard must also prevent an admin from removing themselves
(`user.team_id != admin.team_id` or `target.id != admin.id`), avoiding orphaned workspaces.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/admin.py` — the DELETE route may be missing or returning a non-2xx status
- The `require_admin` dependency may be blocking the admin caller unexpectedly
- The self-removal guard may be incorrectly preventing valid member removals
- Cascade logic on the removed user's chat sessions may be causing a DB integrity error

## Why It Was Done This Way (Root Cause)
`DELETE /api/admin/team/{id}` loads the target user by `{id}`, verifies admin credentials
via `Depends(require_admin)`, checks that the target is not the calling admin
(`target.id != admin.id`), then either deletes or deactivates the user record and commits.
Returning 200 or 204 signals successful removal. The self-removal guard ensures the admin
role is always held by at least one active user.

## What Is Done Right
- Admin registers a second team member and then removes that member via DELETE
- Asserts the response status is in `{200, 204}` (either is acceptable REST behaviour)
- Implicitly verifies that the endpoint exists and is wired in the router

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_chats.py::TestAdminChats::test_admin_remove_member_endpoint_exists -v
```

## Architecture Mapping

**Layer:** Backend Router → Auth Dependency → ORM Model → SQLite DB

**Flow:**
    DELETE /api/admin/team/{member_id}  [admin Bearer token]
      → routers/admin.py:remove_team_member()
        → Depends(require_admin)              ← checks role=="admin"
          → select(User).where(User.id == member_id)
            → if target.id == admin.id: raise 400 (self-removal blocked)
              → db.delete(target) → db.commit()
                → return 200/204              ← THIS TEST COVERS THIS

**Upstream:** Admin clicks "Remove" next to a team member in the admin portal
**Downstream:** User loses access; their sessions remain in DB for audit but account is inactive

## Verification
- [ ] Test passes: `pytest tests/test_chats.py::TestAdminChats::test_admin_remove_member_endpoint_exists -v`

## Downstream Impact
**Impact if unfixed:** Admins cannot offboard team members; departed employees retain full
access to the ArthaBuild workspace and all associated NetSuite data.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-107 (list team), CASE-108 (invite), CASE-116 (require_admin pass)
