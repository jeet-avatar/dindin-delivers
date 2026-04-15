---
id: CASE-177
title: "GET /api/admin/audit returns recent admin actions with timestamp and actor"
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
feature: "GET /api/admin/audit"
test_ref: ""
files:
  - path: src/backend/routers/admin.py
    lines: ""
---

## Why This Case Was Created
The audit log endpoint returns recent admin actions (role changes, user deactivations, config changes) with the timestamp and actor email. This is required for SOC2 compliance and security investigations. No test verifies this endpoint exists and returns correctly structured audit records.

## What Is Wrong
No test exists for this behavior. The audit log endpoint is a planned feature for Phase 10 with no existing implementation.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 10. The audit log requires an `AuditLog` model and middleware to write entries on each admin action.

## What Is Done Right
The admin auth middleware exists. The pattern for logging admin actions is established (see Phase 12 CASE-192 for SOC2 audit). The audit log feature in Phase 10 is a prerequisite for the SOC2 immutable audit log in Phase 12.

## How To Fix It
Write the following test in `tests/test_admin.py`:

```python
@pytest.mark.asyncio
async def test_admin_audit_log_returns_recent_actions(client, admin_headers, db_session):
    """
    Verify GET /api/admin/audit returns audit entries with timestamp, actor, and action.
    """
    # Trigger an auditable action
    await client.patch(
        "/api/admin/config",
        json={"max_chat_history": 100},
        headers=admin_headers,
    )

    resp = await client.get("/api/admin/audit", headers=admin_headers)
    assert resp.status_code == 200

    entries = resp.json()
    assert isinstance(entries, list)
    assert len(entries) > 0, "Expected at least one audit entry"

    entry = entries[0]
    assert "timestamp" in entry, "Missing timestamp in audit entry"
    assert "actor" in entry, "Missing actor (email) in audit entry"
    assert "action" in entry, "Missing action description in audit entry"


@pytest.mark.asyncio
async def test_admin_audit_requires_admin_role(client, user_headers):
    """Verify non-admins cannot access audit log."""
    resp = await client.get("/api/admin/audit", headers=user_headers)
    assert resp.status_code == 403
```

## Architecture Mapping

**Layer:** Admin API / Audit Log (Backend)

**Flow:**
    admin action → write AuditLog entry → GET /api/admin/audit → return [{timestamp, actor, action}] ← NO TEST EXISTS HERE

**Upstream:** Admin performs any configuration change
**Downstream:** If broken, no audit trail — SOC2 compliance gap, security investigations impossible

## Verification
- [ ] Write test: `pytest tests/test_admin.py::test_admin_audit_log_returns_recent_actions -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for audit log. Security incidents have no audit trail for investigation.

## Links
- Phase SUMMARY: `.planning/phases/10-admin-panel/10-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-192, CASE-176, CASE-178
