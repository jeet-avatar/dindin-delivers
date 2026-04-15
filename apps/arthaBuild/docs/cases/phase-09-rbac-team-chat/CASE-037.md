---
id: CASE-037
title: "No cross-team isolation test for admin endpoints"
phase: "09"
phase_name: "RBAC & Team Management"
category: TEST_GAP
severity: MEDIUM
status: PASS
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/tests/test_chats.py
    lines: "218-383"
  - path: src/backend/tests/test_rbac.py
    lines: "160-211"
  - path: src/backend/routers/admin.py
    lines: "68-99"
---

## Why This Case Was Created
Security test coverage audit for multi-team isolation. The Phase 9 admin endpoints filter data by the authenticated admin's `team_id`. The tests in `test_chats.py` and `test_rbac.py` verify that non-admins receive 403, and that admins receive 200. However, no test verifies the more critical boundary: an admin from Team A should receive only Team A's data, not Team B's data. If the `team_id` filter in the ORM query were accidentally removed or broken, an admin would see all users and chat sessions across all teams — a critical data isolation failure. This boundary is untested.

## What Is Wrong
`src/backend/routers/admin.py:86-89` — the team member list endpoint filters by `admin.team_id`:
```python
result = await db.execute(
    select(User).where(User.team_id == admin.team_id)
)
```

`src/backend/routers/admin.py:38-43` — the team chats endpoint similarly filters:
```python
user_result = await db.execute(
    select(User).where(User.team_id == admin.team_id)
)
team_users = user_result.scalars().all()
team_user_ids = [u.id for u in team_users]
```

These filters are correct, but they are not tested for cross-team isolation. The current test `test_admin_can_list_team_members` (`test_chats.py:221`) verifies that an admin gets a 200 response and a list, but does not verify that the list excludes users from other teams.

The gap: no test registers two admins in two different teams, creates a member in Team B, and verifies that Team A's admin cannot see that member via `GET /api/admin/team`.

## Why It Was Done This Way (Root Cause)
Setting up two distinct teams with two distinct admins in a test requires significantly more fixture infrastructure than a single-team test. The Phase 9 test suite prioritized covering the auth boundary (non-admin vs admin) over the isolation boundary (admin from Team A vs Team B). Cross-team isolation was implicitly trusted to the ORM filter.

## What Is Done Right
The ORM filters in `admin.py` are correct — `where(User.team_id == admin.team_id)` correctly restricts queries to the admin's team. The `user.team_id != admin.team_id` check at `admin.py:155` in the remove endpoint explicitly validates team membership before allowing deletion. The `require_admin` dependency correctly authenticates and loads the admin user from DB.

## How To Fix It
Add the following test class to `src/backend/tests/test_chats.py` or create a new `src/backend/tests/test_team_isolation.py`:

```python
import pytest
import pytest_asyncio
from sqlalchemy import select
from models import User, Team


async def _register_and_login(client, email: str, password: str = "Isolate1!"):
    await client.post("/api/user/register", json={
        "first_name": "Iso", "last_name": "Test",
        "email": email, "password": password,
    })
    login_resp = await client.post("/api/auth/login", json={"username": email, "password": password})
    assert login_resp.status_code == 200
    return login_resp.json()


@pytest.mark.asyncio
class TestCrossTeamIsolation:

    async def test_admin_team_a_cannot_see_team_b_members(self, client, db_session):
        """
        Admin from Team A must not see Team B's members in GET /api/admin/team.

        Setup:
          - Create Team A, Team B in DB
          - Set admin_a.team_id = team_a.id, role = "admin"
          - Set member_b.team_id = team_b.id
          - Admin A logs in, calls GET /api/admin/team
          - Response must NOT include member_b
        """
        # Create two teams
        team_a = Team(name="TeamA")
        team_b = Team(name="TeamB")
        db_session.add(team_a)
        db_session.add(team_b)
        await db_session.commit()
        await db_session.refresh(team_a)
        await db_session.refresh(team_b)

        # Register admin_a and member_b
        email_a = "cross-admin-a@arthaBuild-test.com"
        email_b = "cross-member-b@arthaBuild-test.com"

        await client.post("/api/user/register", json={
            "first_name": "Admin", "last_name": "A",
            "email": email_a, "password": "AdminA1!",
        })
        await client.post("/api/user/register", json={
            "first_name": "Member", "last_name": "B",
            "email": email_b, "password": "MemberB1!",
        })

        # Assign teams and roles directly in DB
        result_a = await db_session.execute(select(User).where(User.email == email_a))
        admin_a = result_a.scalar_one_or_none()
        result_b = await db_session.execute(select(User).where(User.email == email_b))
        member_b = result_b.scalar_one_or_none()

        if admin_a is None or member_b is None:
            pytest.skip("Could not create test users")

        admin_a.role = "admin"
        admin_a.team_id = team_a.id
        member_b.team_id = team_b.id
        await db_session.commit()

        # Admin A logs in
        login_resp = await client.post("/api/auth/login", json={"username": email_a, "password": "AdminA1!"})
        assert login_resp.status_code == 200
        token_a = login_resp.json()["access_token"]

        # Admin A fetches team members
        resp = await client.get("/api/admin/team", headers={"Authorization": f"Bearer {token_a}"})
        assert resp.status_code == 200
        members = resp.json()
        member_emails = [m["email"] for m in members]

        assert email_b not in member_emails, (
            f"Admin A should not see Team B member. Got: {member_emails}"
        )
```

**Run:**
```bash
pytest src/backend/tests/test_team_isolation.py::TestCrossTeamIsolation::test_admin_team_a_cannot_see_team_b_members -v
```

## Architecture Mapping

**Layer:** Backend Router (admin.py) + Test layer

**Flow:**

    [Admin A: GET /api/admin/team]
           ↓
    [require_admin → admin = current_user from DB]
           ↓
    [select(User).where(User.team_id == admin.team_id)]
           ↓  ← NO TEST VERIFIES THIS FILTER EXCLUDES TEAM B
    [Returns only Team A members]

    [If filter broken: returns ALL users from ALL teams]
           ↑
    UNTESTED ISOLATION BOUNDARY

**Upstream:** `require_admin` dependency (auth_utils.py:154), `GET /api/admin/team` (admin.py:68)
**Downstream:** Admin dashboard team management UI (team member list)

## Verification
- [ ] Grep proof: `grep -n "team_id" src/backend/routers/admin.py` — shows the filter exists
- [ ] Test proof: After adding the test: `pytest src/backend/tests/test_team_isolation.py -v` — should pass (verifying the existing filter is correct)
- [ ] Runtime proof: Manually set two users to different team_ids, log in as admin of Team A, call `GET /api/admin/team`, confirm Team B's member is absent

## Downstream Impact
**Impact if unfixed:** Security Risk (if filter is accidentally removed in a future refactor)

Currently the filter is correct, so there is no active data leak. However, if the ORM query in `admin.py:86-89` is refactored without the test catching a regression, an admin from Team A would see all users from all teams. This is a GDPR/privacy violation in multi-tenant deployments where users from different organizations share the same ArthaBuild instance. The test acts as a safety net for future regressions.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-chat/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-038, CASE-040
