---
id: CASE-115
title: "Login response includes 'role' field for admin user"
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
feature: "POST /api/auth/login (role in response)"
test_ref: "tests/test_rbac.py::TestFirstUserIsAdmin::test_admin_role_in_login_response"
files:
  - path: src/backend/routers/auth.py
    lines: ""
---

## Why This Case Was Created
Verifies that the login response includes a `role` field, and that an admin user sees
`role="admin"` in that response. The frontend uses this field to decide whether to render
admin-only UI elements such as the admin panel link.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/auth.py` — the login response dict may have `role` removed or renamed
- The JWT payload may include `role` but it may not be surfaced in the HTTP response body
- The frozen login response interface (`CLAUDE.md`) specifies the flat response shape —
  nesting `role` inside a `user` sub-object would break this contract

## Why It Was Done This Way (Root Cause)
The `login()` handler in `routers/auth.py` constructs a response that includes `role` as a
top-level field alongside `access_token`, `refresh_token`, `first_name`, `last_name`, and
`email`. The `role` value is read from the `User` ORM object after DB lookup. This matches
the frozen interface defined in `CLAUDE.md` and ensures the frontend auth layer has all
necessary data in a single login call.

## What Is Done Right
- Logs in as the first registered user (admin)
- Asserts `response.json()["role"] == "admin"`
- Verifies the field is present in the response body, not only in the JWT payload

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_rbac.py::TestFirstUserIsAdmin::test_admin_role_in_login_response -v
```

## Architecture Mapping

**Layer:** Backend Router → ORM Model → JWT

**Flow:**
    POST /api/auth/login {email, password}
      → routers/auth.py:login()
        → validate credentials
          → user = db.get(User, user_id)
            → create_access_token(sub=str(user.id), role=user.role, ...)
              → return {access_token, refresh_token, role="admin", ...}  ← THIS TEST COVERS THIS

**Upstream:** User submits login form
**Downstream:** Frontend stores role; shows/hides admin nav link accordingly

## Verification
- [ ] Test passes: `pytest tests/test_rbac.py::TestFirstUserIsAdmin::test_admin_role_in_login_response -v`

## Downstream Impact
**Impact if unfixed:** Frontend cannot distinguish admin from regular user at login;
admin panel link either always shows (security issue) or never shows (usability issue).

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-113 (first user is admin), CASE-119 (role in JWT payload), CASE-116 (admin can access endpoints)
