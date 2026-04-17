---
id: CASE-114
title: "Second registered user receives role='user' (not admin)"
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
feature: "Default role assignment"
test_ref: "tests/test_rbac.py::TestFirstUserIsAdmin::test_second_user_is_regular"
files:
  - path: src/backend/routers/auth.py
    lines: ""
  - path: src/backend/models.py
    lines: ""
---

## Why This Case Was Created
Verifies the complement of the first-user promotion rule: every user registered after the
first receives `role="user"` by default, not `role="admin"`. This ensures admin rights are
never accidentally granted to subsequent registrants.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/auth.py` — the `user_count == 0` check may be off-by-one, promoting the second
  user to admin when it should not
- The `role` column default in `models.py` may be set to `"admin"` instead of `"user"`
- A migration may have altered the default value of the `role` column

## Why It Was Done This Way (Root Cause)
After the first user exists, subsequent `register()` calls find `user_count >= 1`, so the
`role="admin"` branch is skipped. The `User.role` column has a default of `"user"` in the
model definition. This means only the very first user in an empty DB gets elevated; all
others start as regular users and must be promoted explicitly by an admin.

## What Is Done Right
- Registers the first user (to trigger the admin promotion path) then registers a second
- Asserts the second user's role is `"user"` via login response or DB query
- Confirms the admin promotion is strictly a once-per-deployment bootstrap, not recurring

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_rbac.py::TestFirstUserIsAdmin::test_second_user_is_regular -v
```

## Architecture Mapping

**Layer:** Backend Router → ORM Model → SQLite DB

**Flow:**
    POST /api/auth/register {email, password, ...}  [second user, DB has 1 user]
      → routers/auth.py:register()
        → select(func.count(User.id)) → count == 1
          → (admin branch skipped)
            → user.role = "user"  (model default)
              → db.add(user) → db.commit()
                → return token + role=="user"  ← THIS TEST COVERS THIS

**Upstream:** Second (and all subsequent) team member registrations
**Downstream:** User cannot access admin endpoints; must be invited and promoted by admin

## Verification
- [ ] Test passes: `pytest tests/test_rbac.py::TestFirstUserIsAdmin::test_second_user_is_regular -v`

## Downstream Impact
**Impact if unfixed:** All users would receive admin rights on registration, completely
breaking RBAC and exposing admin endpoints to every team member.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-113 (first user is admin), CASE-117 (non-admin blocked from admin endpoints)
