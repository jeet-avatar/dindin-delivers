---
id: CASE-178
title: "PUT /api/admin/config updates system settings (e.g., max_chat_history)"
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
feature: "PUT /api/admin/config"
test_ref: ""
files:
  - path: src/backend/routers/admin.py
    lines: ""
---

## Why This Case Was Created
Administrators need to configure system-level settings such as `max_chat_history` (how many messages to include in context), `rate_limit_per_user`, and similar operational parameters. These settings affect product behavior and must be persistable and readable. No test verifies this configuration endpoint.

## What Is Wrong
No test exists for this behavior. The system config endpoint is a planned feature for Phase 10 with no existing implementation.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 10. System configuration can be stored in a `SystemConfig` table or a JSON config file. The admin middleware exists for authorization.

## What Is Done Right
The admin auth middleware exists. Pattern for key-value configuration storage is common in FastAPI applications. The `max_chat_history` setting affects the RAG context window size (how many past messages are included).

## How To Fix It
Write the following test in `tests/test_admin.py`:

```python
@pytest.mark.asyncio
async def test_admin_config_update_persists_setting(client, admin_headers):
    """
    Verify PUT /api/admin/config updates max_chat_history and the
    change is readable via GET /api/admin/config.
    """
    resp = await client.put(
        "/api/admin/config",
        json={"max_chat_history": 50},
        headers=admin_headers,
    )
    assert resp.status_code == 200

    # Verify persisted
    get_resp = await client.get("/api/admin/config", headers=admin_headers)
    assert get_resp.status_code == 200
    config = get_resp.json()
    assert config.get("max_chat_history") == 50


@pytest.mark.asyncio
async def test_admin_config_rejects_invalid_values(client, admin_headers):
    """Verify invalid config values return 422."""
    resp = await client.put(
        "/api/admin/config",
        json={"max_chat_history": -1},  # Must be positive
        headers=admin_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_admin_config_requires_admin_role(client, user_headers):
    """Verify non-admins cannot change config."""
    resp = await client.put(
        "/api/admin/config",
        json={"max_chat_history": 10},
        headers=user_headers,
    )
    assert resp.status_code == 403
```

## Architecture Mapping

**Layer:** Admin API / System Configuration (Backend)

**Flow:**
    PUT /api/admin/config (admin only) → validate values → persist to SystemConfig → return updated config ← NO TEST EXISTS HERE

**Upstream:** Admin adjusts system behavior via admin panel
**Downstream:** If broken, system settings cannot be changed without redeployment

## Verification
- [ ] Write test: `pytest tests/test_admin.py::test_admin_config_update_persists_setting -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for config management. Operational tuning requires code changes instead of UI configuration.

## Links
- Phase SUMMARY: `.planning/phases/10-admin-panel/10-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-177, CASE-173
