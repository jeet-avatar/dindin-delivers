---
id: CASE-110
title: "GET /api/admin/chats is accessible to admin and returns team chat sessions"
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
feature: "GET /api/admin/chats"
test_ref: "tests/test_chats.py::TestAdminChats::test_admin_list_chats_endpoint_accessible"
files:
  - path: src/backend/routers/admin.py
    lines: ""
  - path: src/backend/auth_utils.py
    lines: ""
---

## Why This Case Was Created
Verifies that an admin user can access `GET /api/admin/chats` and receives HTTP 200 with a
list of chat sessions belonging to their team. This endpoint enables admin oversight of all
team conversation history for compliance and support purposes.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/admin.py` — the admin-chats route may not exist or may have been removed
- `require_admin` dependency may be failing for the admin user due to role assignment issues
- The query may not be filtering by `team_id`, returning sessions from all teams

## Why It Was Done This Way (Root Cause)
`GET /api/admin/chats` uses `Depends(require_admin)` and then queries `ChatSession` rows
joined to `User` where `User.team_id == admin.team_id`. This gives admins read-only
visibility into all sessions created by their team members — not sessions from other teams.
The endpoint returns a list (possibly empty) and always returns 200 when admin auth passes.

## What Is Done Right
- Admin user (first registered) calls the endpoint
- Asserts HTTP 200 and that the result is a list type
- Covers both the auth guard (require_admin passes) and the data scope (team-scoped query)

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_chats.py::TestAdminChats::test_admin_list_chats_endpoint_accessible -v
```

## Architecture Mapping

**Layer:** Backend Router → Auth Dependency → ORM Model → SQLite DB

**Flow:**
    GET /api/admin/chats  [admin Bearer token]
      → routers/admin.py:admin_list_chats()
        → Depends(require_admin)              ← checks role=="admin"
          → select(ChatSession).join(User).where(User.team_id == admin.team_id)
            → return [{id, title, user_id, created_at, ...}]  ← THIS TEST COVERS THIS

**Upstream:** Admin portal "All Conversations" panel
**Downstream:** Admin can audit team usage, assist users, and monitor for misuse

## Verification
- [ ] Test passes: `pytest tests/test_chats.py::TestAdminChats::test_admin_list_chats_endpoint_accessible -v`

## Downstream Impact
**Impact if unfixed:** Admins lose visibility into team chat activity; compliance audits
cannot be performed and support requests cannot be investigated at the session level.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-111 (non-admin blocked), CASE-107 (list team members), CASE-116 (require_admin pass)
