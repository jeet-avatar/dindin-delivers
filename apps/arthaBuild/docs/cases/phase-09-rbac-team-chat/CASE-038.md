---
id: CASE-038
title: "No test for admin self-removal 400 response"
phase: "09"
phase_name: "RBAC & Team Management"
category: TEST_GAP
severity: LOW
status: PASS
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/routers/admin.py
    lines: "156-158"
  - path: src/backend/tests/test_chats.py
    lines: "340-382"
---

## Why This Case Was Created
Backend guard coverage audit. The admin self-removal protection exists at two layers: the frontend (`AdminPanel.tsx`) does not show a "Remove" button for the authenticated admin's own row, and the backend (`admin.py:157-158`) returns 400 if an admin attempts to delete themselves. The frontend guard is a UX concern. The backend guard is the security-relevant one, and it is not tested. If the backend guard is accidentally removed in a refactor, an admin could self-delete via a direct API call (e.g., `curl`) — causing their account to be deactivated and potentially leaving the team with no admin.

## What Is Wrong
`src/backend/routers/admin.py:156-158`:
```python
if user.id == admin.id:
    raise HTTPException(status_code=400, detail="Cannot remove yourself")
```

This guard is correct and important. However, reviewing `test_chats.py:343-382` (the `test_admin_remove_member_endpoint_exists` test), the test only covers the success case (removing a different user). There is no test that:

1. Authenticates as an admin
2. Calls `DELETE /api/admin/team/{admin.id}` (same user_id as the authenticated admin)
3. Asserts the response is 400 with `detail: "Cannot remove yourself"`

Without this test, a future refactor that removes or reorders the `user.id == admin.id` check would go undetected in CI.

## Why It Was Done This Way (Root Cause)
The Phase 9 test for admin removal (`test_admin_remove_member_endpoint_exists`) was written to verify the primary use case (successful removal). Testing the self-removal guard requires knowing the admin's own user ID, which is available in the JWT payload but requires an extra DB lookup or response field to extract in the test context. This added complexity was not addressed during the initial test authorship.

## What Is Done Right
The backend guard at `admin.py:157-158` is correctly placed — it executes after verifying the target user exists and is on the admin's team (`admin.py:154-156`), so the self-removal check happens in the right order. The check uses `user.id == admin.id` (integer comparison), not email comparison, which is the correct identity check. The frontend guard provides an additional UX safeguard.

## How To Fix It
Add the following test to `src/backend/tests/test_chats.py` inside the `TestAdminChats` class, or add to the existing test file as a new test:

```python
async def test_admin_cannot_remove_themselves(self, client, db_session):
    """
    DELETE /api/admin/team/{admin_id} where user_id == authenticated admin's id
    must return 400.

    Guards against an admin accidentally (or maliciously via direct API call)
    deactivating their own account.
    """
    # Find alice (admin user with known credentials)
    alice_result = await db_session.execute(
        select(User).where(User.email == "alice@arthaBuild-test.com")
    )
    alice = alice_result.scalar_one_or_none()
    if alice is None or alice.role != "admin":
        pytest.skip("Alice not admin in this session")

    # Give alice a team so the self-removal path doesn't 400 on "no team" first
    if alice.team_id is None:
        from models import Team
        team = Team(name="AliceTeam")
        db_session.add(team)
        await db_session.commit()
        await db_session.refresh(team)
        alice.team_id = team.id
        await db_session.commit()

    login_resp = await client.post("/api/auth/login", json={
        "username": "alice@arthaBuild-test.com",
        "password": "AlicePass1!",
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Alice tries to delete herself
    resp = await client.delete(
        f"/api/admin/team/{alice.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400, (
        f"Admin self-removal should return 400, got {resp.status_code}: {resp.text}"
    )
    assert "Cannot remove yourself" in resp.json().get("detail", ""), (
        f"Expected 'Cannot remove yourself' detail, got: {resp.json()}"
    )
```

**Run:**
```bash
pytest src/backend/tests/test_chats.py::TestAdminChats::test_admin_cannot_remove_themselves -v
```

## Architecture Mapping

**Layer:** Backend Router (admin.py) + Test layer

**Flow:**

    [DELETE /api/admin/team/{user_id}]  where user_id == authenticated admin's id
               ↓
    [require_admin → admin loaded from DB]
               ↓
    [select(User).where(User.id == user_id) → user = admin]
               ↓
    [user.id == admin.id] → True
               ↓
    [raise HTTPException(400, "Cannot remove yourself")]  ← NO TEST COVERS THIS PATH

**Upstream:** Direct API call (curl, Postman, or a future UI bug) with admin's own user_id
**Downstream:** If guard removed: `user.is_active = False` → admin account deactivated → team has no admin

## Verification
- [ ] Grep proof: `grep -n "Cannot remove yourself\|user.id == admin.id" src/backend/routers/admin.py`
- [ ] Test proof: After adding the test: `pytest src/backend/tests/test_chats.py::TestAdminChats::test_admin_cannot_remove_themselves -v` — should pass
- [ ] Runtime proof: `curl -X DELETE http://localhost:8000/api/admin/team/<own_user_id> -H "Authorization: Bearer <admin_token>"` — should return `{"detail": "Cannot remove yourself"}` with status 400

## Downstream Impact
**Impact if unfixed:** Security Risk (if guard is accidentally removed)

Currently the guard works correctly — no data loss or security issue exists. If the guard is removed in a future refactor without this test catching it, an admin could deactivate their own account via direct API call. In a single-admin organization, this leaves the team without any admin capable of managing team membership — effectively locking the organization out of admin features.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-chat/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-037, CASE-039
