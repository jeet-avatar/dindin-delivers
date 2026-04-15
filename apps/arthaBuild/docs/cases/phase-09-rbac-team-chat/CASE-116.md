---
id: CASE-116
title: "Admin user can access GET /api/admin/team (200)"
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
feature: "require_admin dependency"
test_ref: "tests/test_rbac.py::TestRequireAdmin::test_admin_can_access_admin_endpoints"
files:
  - path: src/backend/auth_utils.py
    lines: ""
  - path: src/backend/routers/admin.py
    lines: ""
---

## Why This Case Was Created
Verifies that the `require_admin` dependency grants access when the authenticated user has
`role="admin"`. Uses `GET /api/admin/team` as a representative admin endpoint. This is the
positive (happy-path) companion to CASE-117.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `auth_utils.py` — `require_admin` may be raising 403 even for admin users, e.g., if the
  role check is inverted or the DB lookup is failing
- The `role` field may not be committed to the DB when registration sets it
- The JWT `sub` may not match the user's `id` field, causing the DB lookup to return None

## Why It Was Done This Way (Root Cause)
`require_admin` decodes the JWT, extracts `sub` (user ID), loads the `User` row from the
DB, then checks `user.role == "admin"`. When this passes, the handler receives the `admin`
User object and proceeds normally. The test uses the first registered user (automatically
promoted to admin) to confirm the entire happy-path chain works.

## What Is Done Right
- Registers first user (auto-promoted admin)
- Logs in to obtain a valid admin token
- Calls `GET /api/admin/team` and asserts HTTP 200
- Confirms `require_admin` passes correctly for a genuine admin user

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_rbac.py::TestRequireAdmin::test_admin_can_access_admin_endpoints -v
```

## Architecture Mapping

**Layer:** Backend Router → Auth Dependency → ORM Model

**Flow:**
    GET /api/admin/team  [admin Bearer token]
      → routers/admin.py:list_team_members()
        → Depends(require_admin)
          → decode JWT → sub → load User
            → user.role == "admin" → pass
              → handler executes → return 200  ← THIS TEST COVERS THIS

**Upstream:** Admin logs in and navigates to team management
**Downstream:** Admin sees team roster; can invite or remove members

## Verification
- [ ] Test passes: `pytest tests/test_rbac.py::TestRequireAdmin::test_admin_can_access_admin_endpoints -v`

## Downstream Impact
**Impact if unfixed:** Admin users are locked out of all admin endpoints despite having the
correct role, making team management and platform administration impossible.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-117 (non-admin blocked), CASE-118 (unauthenticated blocked), CASE-107 (admin team list)
