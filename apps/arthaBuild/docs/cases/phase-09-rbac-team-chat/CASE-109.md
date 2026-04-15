---
id: CASE-109
title: "POST /api/admin/invite returns 403 for non-admin user"
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
feature: "POST /api/admin/invite (admin guard)"
test_ref: "tests/test_chats.py::TestAdminChats::test_non_admin_cannot_invite"
files:
  - path: src/backend/routers/admin.py
    lines: ""
  - path: src/backend/auth_utils.py
    lines: ""
---

## Why This Case Was Created
Verifies that a regular (non-admin) user cannot send invitations. Calling
`POST /api/admin/invite` with a non-admin token must return HTTP 403. Without this guard,
any team member could invite arbitrary external users to the workspace.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/admin.py` — `require_admin` dependency may have been removed from the invite route
- `auth_utils.py` — `require_admin` may not be checking `user.role == "admin"` correctly,
  e.g., defaulting to pass when role is None or missing

## Why It Was Done This Way (Root Cause)
`POST /api/admin/invite` declares `admin: User = Depends(require_admin)`. The `require_admin`
function loads the current user from the DB, checks `user.role == "admin"`, and raises
`HTTPException(status_code=403, detail="Admin access required")` for any other role value.
A second registered user (who did not receive the first-user admin promotion) has
`role="user"` and therefore hits this 403 gate.

## What Is Done Right
- Registers two users: the first (admin) and the second (regular)
- Second user calls invite endpoint with their valid token
- Asserts HTTP 403 — not 201 or 422
- No invitation record should be created in the DB

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_chats.py::TestAdminChats::test_non_admin_cannot_invite -v
```

## Architecture Mapping

**Layer:** Backend Router → Auth Dependency

**Flow:**
    POST /api/admin/invite {email: "target@example.com"}  [non-admin Bearer token]
      → routers/admin.py:invite_user()
        → Depends(require_admin)
          → user.role == "user"  → raise HTTPException(403)  ← THIS TEST COVERS THIS
              (no Invitation row created)

**Upstream:** Regular team member attempting to invite colleagues without admin rights
**Downstream:** 403 returned; no DB write; admin retains exclusive invite control

## Verification
- [ ] Test passes: `pytest tests/test_chats.py::TestAdminChats::test_non_admin_cannot_invite -v`

## Downstream Impact
**Impact if unfixed:** Any authenticated user could invite external parties to the workspace,
bypassing admin control and potentially exposing proprietary NetSuite data to unauthorised
users.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-108 (invite happy-path), CASE-111 (non-admin admin-chats block), CASE-117 (require_admin 403)
