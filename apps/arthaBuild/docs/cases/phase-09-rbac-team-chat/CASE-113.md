---
id: CASE-113
title: "First user registered in empty DB automatically receives role='admin'"
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
feature: "First-user admin promotion"
test_ref: "tests/test_rbac.py::TestFirstUserIsAdmin::test_first_user_becomes_admin"
files:
  - path: src/backend/routers/auth.py
    lines: ""
  - path: src/backend/models.py
    lines: ""
---

## Why This Case Was Created
Verifies the bootstrapping rule: when the first user registers in a completely empty
database, the system automatically promotes them to `role="admin"`. This is the mechanism
by which every fresh ArthaBuild deployment acquires an admin without manual DB intervention.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/auth.py` (or `routers/user.py`) — the `if user_count == 0: user.role = "admin"`
  logic may have been removed or moved to a different code path
- The count query may be counting against the wrong table or scope
- The role field may not be persisted before the token is returned

## Why It Was Done This Way (Root Cause)
After inserting the new user but before committing, the registration handler counts existing
users (`select(func.count(User.id))`). If `user_count == 0` (i.e., this is the very first
user), it sets `user.role = "admin"`. Otherwise `role` defaults to `"user"`. The check-and-
set runs in the same transaction as the insert, preventing a race condition where two
simultaneous first registrations both receive admin.

## What Is Done Right
- Uses a fresh test database (empty) so the count is reliably zero
- Queries the login response or the user record after registration to assert `role=="admin"`
- Covers the bootstrapping path that all real deployments depend on

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_rbac.py::TestFirstUserIsAdmin::test_first_user_becomes_admin -v
```

## Architecture Mapping

**Layer:** Backend Router → ORM Model → SQLite DB

**Flow:**
    POST /api/auth/register {email, password, ...}  [first user, empty DB]
      → routers/auth.py:register()
        → select(func.count(User.id)) → count == 0
          → user.role = "admin"
            → db.add(user) → db.commit()
              → return token + role=="admin"  ← THIS TEST COVERS THIS

**Upstream:** First deployment of ArthaBuild for a new customer
**Downstream:** Admin can access all /api/admin/* endpoints, invite team members, manage roles

## Verification
- [ ] Test passes: `pytest tests/test_rbac.py::TestFirstUserIsAdmin::test_first_user_becomes_admin -v`

## Downstream Impact
**Impact if unfixed:** No user is ever promoted to admin; the admin panel is permanently
inaccessible without manual DB edits, breaking team onboarding for every new deployment.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-114 (second user is regular), CASE-115 (role in login response), CASE-116 (admin can access)
