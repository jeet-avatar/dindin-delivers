---
id: CASE-111
title: "GET /api/admin/chats returns 403 for non-admin user"
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
feature: "GET /api/admin/chats (admin guard)"
test_ref: "tests/test_chats.py::TestAdminChats::test_non_admin_cannot_access_admin_chats"
files:
  - path: src/backend/routers/admin.py
    lines: ""
  - path: src/backend/auth_utils.py
    lines: ""
---

## Why This Case Was Created
Verifies that a regular (non-admin) user cannot access the admin chat list endpoint.
`GET /api/admin/chats` with a non-admin token must return HTTP 403. Without this guard,
any team member could read all other team members' conversation histories.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/admin.py` — `require_admin` dependency may have been removed from this route
- `auth_utils.py` — `require_admin` may not be raising 403 for `role="user"` correctly
- The route may have been inadvertently duplicated on a public or user-auth router

## Why It Was Done This Way (Root Cause)
`GET /api/admin/chats` declares `admin: User = Depends(require_admin)`. A second registered
user (non-admin) has `role="user"`, so `require_admin` raises
`HTTPException(status_code=403, detail="Admin access required")` before any data query runs.
This preserves privacy: regular users can only access their own sessions via
`GET /api/chats`, never the team-wide admin view.

## What Is Done Right
- Registers two users and uses the second (non-admin) to call the endpoint
- Asserts HTTP 403 — not 200 or 404
- Mirrors the CASE-109 pattern for invite, confirming the admin guard is consistent across
  all admin routes

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_chats.py::TestAdminChats::test_non_admin_cannot_access_admin_chats -v
```

## Architecture Mapping

**Layer:** Backend Router → Auth Dependency

**Flow:**
    GET /api/admin/chats  [non-admin Bearer token]
      → routers/admin.py:admin_list_chats()
        → Depends(require_admin)
          → user.role == "user" → raise HTTPException(403)  ← THIS TEST COVERS THIS
              (no DB query runs)

**Upstream:** Regular user navigating to an admin URL they are not entitled to
**Downstream:** 403 returned; no session data exposed

## Verification
- [ ] Test passes: `pytest tests/test_chats.py::TestAdminChats::test_non_admin_cannot_access_admin_chats -v`

## Downstream Impact
**Impact if unfixed:** Any authenticated team member could read every other member's chat
history through the admin endpoint, constituting a serious data-privacy violation.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-110 (admin access pass), CASE-109 (non-admin invite block), CASE-117 (require_admin 403 unit)
