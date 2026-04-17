---
id: CASE-173
title: "GET /api/admin/stats returns total_users, total_chats, active_sessions"
phase: "10"
phase_name: "Admin Panel"
category: FEATURE_TEST
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-10T21:55:53Z
assignee: "Priya"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "GET /api/admin/stats"
test_ref: ""
files:
  - path: src/backend/routers/admin.py
    lines: ""
---

## Why This Case Was Created
The admin dashboard requires a stats endpoint that returns key system metrics: total number of users, total chat sessions, and currently active sessions. This data powers the admin overview page. No test verifies this endpoint exists, is admin-only, and returns the correct fields.

## What Is Wrong
No test exists for this behavior. The stats endpoint is a planned feature for Phase 10 with no existing implementation.

## Why It Was Done This Way (Root Cause)
Phase 10 is the Admin Panel phase, currently planned but not yet implemented. No code exists yet for this feature — it is planned for Phase 10. The admin router is expected to be created in this phase.

## What Is Done Right
The admin auth middleware exists (restricts to admin role). The `User`, `ChatSession`, and `ChatMessage` SQLAlchemy models exist and can provide the aggregate counts.

## How To Fix It
Write the following test in `tests/test_admin.py`:

```python
@pytest.mark.asyncio
async def test_admin_stats_returns_correct_fields(client, admin_headers):
    """
    Verify GET /api/admin/stats returns total_users, total_chats, active_sessions.
    Must be admin-only (403 for non-admin).
    """
    resp = await client.get("/api/admin/stats", headers=admin_headers)
    assert resp.status_code == 200

    data = resp.json()
    assert "total_users" in data, "Missing total_users"
    assert "total_chats" in data, "Missing total_chats"
    assert "active_sessions" in data, "Missing active_sessions"
    assert isinstance(data["total_users"], int)
    assert isinstance(data["total_chats"], int)
    assert isinstance(data["active_sessions"], int)


@pytest.mark.asyncio
async def test_admin_stats_requires_admin_role(client, user_headers):
    """Verify non-admin users cannot access admin stats."""
    resp = await client.get("/api/admin/stats", headers=user_headers)
    assert resp.status_code == 403
```

## Architecture Mapping

**Layer:** Admin API (Backend)

**Flow:**
    GET /api/admin/stats (admin only) → count(User) + count(ChatSession) + active_sessions → return stats dict ← NO TEST EXISTS HERE

**Upstream:** Admin opens the dashboard overview page
**Downstream:** If broken, admin dashboard shows no stats — operators have no system visibility

## Verification
- [ ] Write test: `pytest tests/test_admin.py::test_admin_stats_returns_correct_fields -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for admin stats endpoint. Dashboard shows empty data without indication of failure.

## Links
- Phase SUMMARY: `.planning/phases/10-admin-panel/10-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-174, CASE-150
