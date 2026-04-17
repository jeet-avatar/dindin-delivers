---
id: CASE-108
title: "POST /api/admin/invite creates an invitation record in DB"
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
feature: "POST /api/admin/invite"
test_ref: "tests/test_chats.py::TestAdminChats::test_invite_creates_record"
files:
  - path: src/backend/routers/admin.py
    lines: ""
  - path: src/backend/models.py
    lines: ""
---

## Why This Case Was Created
Verifies that an admin sending `POST /api/admin/invite` with an email address causes an
invitation record to be created in the database and returns HTTP 201. This is the entry
point for adding new team members to an ArthaBuild workspace.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/admin.py` — `invite_user()` may not be inserting an `Invitation` (or
  `TeamInvitation`) row before returning
- The handler may return 200 instead of 201 (test asserts 201)
- The `require_admin` dependency may be failing, blocking the route entirely

## Why It Was Done This Way (Root Cause)
`POST /api/admin/invite` accepts `{email: str}`, validates admin credentials via
`Depends(require_admin)`, creates an `Invitation` model instance with the target email and
admin's `team_id`, commits it, and returns HTTP 201. An optional email dispatch may also
occur but the test focuses on the DB record creation and status code.

## What Is Done Right
- Admin user sends invite to a fresh email address
- Asserts HTTP 201 (not 200)
- Verifies a DB record is created (either by re-querying or checking response body contains
  an invitation id/token)

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_chats.py::TestAdminChats::test_invite_creates_record -v
```

## Architecture Mapping

**Layer:** Backend Router → ORM Model → SQLite DB

**Flow:**
    POST /api/admin/invite {email: "newuser@example.com"}  [admin Bearer token]
      → routers/admin.py:invite_user()
        → Depends(require_admin)                 ← checks role=="admin"
          → Invitation(email=email, team_id=admin.team_id, token=uuid)
            → db.add() → db.commit()
              → return 201 {token, ...}           ← THIS TEST COVERS THIS

**Upstream:** Admin clicks "Invite Member" in the admin portal
**Downstream:** Invitee receives link; accepts → account created with correct team_id

## Verification
- [ ] Test passes: `pytest tests/test_chats.py::TestAdminChats::test_invite_creates_record -v`

## Downstream Impact
**Impact if unfixed:** Team growth is blocked; no new users can be added to the workspace
through the invite flow. Admin must manually create accounts in the DB.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-107 (list team), CASE-109 (non-admin invite block), CASE-112 (remove member)
