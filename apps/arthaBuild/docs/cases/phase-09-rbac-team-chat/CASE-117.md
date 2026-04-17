---
id: CASE-117
title: "Non-admin user receives 403 on admin endpoints"
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
feature: "require_admin dependency (403 guard)"
test_ref: "tests/test_rbac.py::TestRequireAdmin::test_user_cannot_access_admin_endpoints"
files:
  - path: src/backend/auth_utils.py
    lines: ""
  - path: src/backend/routers/admin.py
    lines: ""
---

## Why This Case Was Created
Verifies the `require_admin` dependency's rejection path: a user with `role="user"` calling
any admin endpoint receives HTTP 403 with a meaningful detail message. This is the primary
RBAC enforcement test for the entire admin surface.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `auth_utils.py` — `require_admin` may not be checking `user.role`, allowing any
  authenticated user through
- The check condition may be `role != "user"` instead of `role == "admin"`, which would
  behave differently for custom roles
- The 403 response may be returning a 404 or 401 instead, causing the assertion to fail

## Why It Was Done This Way (Root Cause)
`require_admin` in `auth_utils.py` loads the user from DB and evaluates
`if user.role != "admin": raise HTTPException(status_code=403, detail="Admin access required")`.
A second registered user in the test DB has `role="user"` (CASE-114 establishes this), so
the check triggers. HTTP 403 is the correct status — the user is authenticated but not
authorised.

## What Is Done Right
- Registers both admin (first) and regular (second) users
- Uses the second user's token to call an admin endpoint
- Asserts exactly HTTP 403 (distinguishes "authenticated but unauthorised" from 401/404)

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_rbac.py::TestRequireAdmin::test_user_cannot_access_admin_endpoints -v
```

## Architecture Mapping

**Layer:** Backend Router → Auth Dependency

**Flow:**
    GET /api/admin/team  [non-admin Bearer token]
      → routers/admin.py:list_team_members()
        → Depends(require_admin)
          → decode JWT → sub → load User
            → user.role == "user"
              → raise HTTPException(403, "Admin access required")  ← THIS TEST COVERS THIS

**Upstream:** Regular user manually navigating to /admin/* routes
**Downstream:** 403 returned; no admin data exposed

## Verification
- [ ] Test passes: `pytest tests/test_rbac.py::TestRequireAdmin::test_user_cannot_access_admin_endpoints -v`

## Downstream Impact
**Impact if unfixed:** RBAC is entirely defeated; every authenticated user becomes a de-facto
admin, exposing team management, invitation, and chat audit capabilities to all users.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-116 (admin passes), CASE-118 (unauthenticated blocked), CASE-109 (non-admin invite block)
