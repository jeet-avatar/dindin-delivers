---
id: CASE-039
title: "No deploy quota enforcement test (402 response)"
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
  - path: src/backend/routers/license.py
    lines: "131-144"
  - path: src/backend/routers/deploy.py
    lines: "1-50"
  - path: src/backend/tests/
    lines: ""
---

## Why This Case Was Created
Monetization gate coverage audit. The license system enforces a deploy quota per tier: 10 deploys for `starter`, 100 for `growth`, unlimited for `enterprise` (`license.py:37-41`). The `check_deploy_quota()` function at `license.py:131-144` returns `{allowed, used, limit}`. When the quota is exceeded, the deploy endpoint is expected to return 402 Payment Required. This is a critical monetization gate — it is the mechanism that converts free/starter users into paid customers. No test verifies the 402 response when the quota is exhausted. If the quota check is accidentally bypassed in a future refactor, the monetization gate silently fails open.

## What Is Wrong
`src/backend/routers/license.py:131-144`:
```python
async def check_deploy_quota(db: AsyncSession, user_id: int, plan: str) -> dict:
    """Check if user can deploy another production script. Returns {allowed, used, limit}."""
    limit = TIER_LIMITS.get(plan)
    if limit is None:
        return {"allowed": True, "used": None, "limit": None}  # enterprise = unlimited

    result = await db.execute(
        select(sqlfunc.count(ScriptDeployment.id))
        .where(ScriptDeployment.user_id == user_id)
        .where(ScriptDeployment.target == "production")
        .where(ScriptDeployment.license_key == LICENSE_KEY)
    )
    used = result.scalar() or 0
    return {"allowed": used < limit, "used": used, "limit": limit}
```

The function is correct, but searching the test suite for quota-related tests:
- `test_auth.py`: no quota tests
- `test_chats.py`: no quota tests
- `test_health.py`: no quota tests
- `test_netsuite.py`: no quota tests
- `test_rbac.py`: no quota tests
- `test_security.py`: no quota tests
- `test_user.py`: no quota tests

No test exists that:
1. Sets a user's deploy count to the quota limit (e.g., 10 for `starter`)
2. Calls the deploy endpoint
3. Asserts the response is 402

## Why It Was Done This Way (Root Cause)
Testing quota enforcement requires either: (a) inserting 10 `ScriptDeployment` records into the test DB and then attempting an 11th deploy, or (b) mocking the quota check. The deploy endpoint itself requires SuiteCloud CLI to be available, which makes integration testing difficult. The Phase 7 quota logic was implemented but the test was deferred as it required complex setup.

## What Is Done Right
The `check_deploy_quota()` function is cleanly separated from the deploy logic — it is a pure DB query that returns `{allowed, used, limit}`. The `TIER_LIMITS` dict at `license.py:37-41` correctly handles unlimited enterprise tier. The `record_deploy()` function at `license.py:147-153` correctly records only production deploys against the quota.

## How To Fix It
Add a new test file `src/backend/tests/test_quota.py`:

```python
"""
Deploy quota enforcement tests.
Tests that the 402 gate fires correctly when deploy quota is exhausted.
"""
import pytest
import pytest_asyncio
from sqlalchemy import select
from models import User, ScriptDeployment


async def _register_and_login(client, email: str, password: str = "Quota1!"):
    await client.post("/api/user/register", json={
        "first_name": "Quota", "last_name": "Test",
        "email": email, "password": password,
    })
    resp = await client.post("/api/auth/login", json={"username": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.mark.asyncio
class TestDeployQuota:

    async def test_check_deploy_quota_allowed_when_under_limit(self, db_session):
        """check_deploy_quota returns allowed=True when deployments < limit."""
        from routers.license import check_deploy_quota, TIER_LIMITS
        # Starter limit is 10, fresh user has 0 deployments
        quota = await check_deploy_quota(db_session, user_id=99999, plan="starter")
        assert quota["allowed"] is True
        assert quota["limit"] == TIER_LIMITS["starter"]

    async def test_check_deploy_quota_blocked_when_at_limit(self, db_session):
        """check_deploy_quota returns allowed=False when deployments == limit."""
        from routers.license import check_deploy_quota, LICENSE_KEY
        from models import ScriptDeployment

        # Insert 10 ScriptDeployment records for a fake user_id
        test_user_id = 88888
        for i in range(10):
            db_session.add(ScriptDeployment(
                user_id=test_user_id,
                script_name=f"test_script_{i}.js",
                target="production",
                license_key=LICENSE_KEY or "test-key",
            ))
        await db_session.commit()

        quota = await check_deploy_quota(db_session, user_id=test_user_id, plan="starter")
        assert quota["allowed"] is False, (
            f"Quota should be exhausted after 10 deploys. Got: {quota}"
        )
        assert quota["used"] == 10
        assert quota["limit"] == 10

    async def test_enterprise_plan_has_no_quota(self, db_session):
        """enterprise plan returns allowed=True regardless of deploy count."""
        from routers.license import check_deploy_quota

        quota = await check_deploy_quota(db_session, user_id=77777, plan="enterprise")
        assert quota["allowed"] is True
        assert quota["limit"] is None  # unlimited

    async def test_deploy_endpoint_returns_402_when_quota_exhausted(self, client, db_session):
        """
        POST /api/deploy/suitescript should return 402 when the user's deploy quota is exhausted.
        This is the critical monetization gate.
        """
        from unittest.mock import patch, AsyncMock
        from routers.license import TIER_LIMITS, LICENSE_KEY

        # Register a user who will hit the quota
        email = "quota-user@arthaBuild-test.com"
        token = await _register_and_login(client, email)

        result = await db_session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            pytest.skip("Could not create quota test user")

        # Insert 10 records to exhaust starter quota
        for i in range(10):
            db_session.add(ScriptDeployment(
                user_id=user.id,
                script_name=f"script_{i}.js",
                target="production",
                license_key=LICENSE_KEY or "test-key",
            ))
        await db_session.commit()

        # Mock validate_license to return starter plan
        mock_license = {"valid": True, "plan": "starter", "mode": "active"}

        with patch("routers.deploy.validate_license", new=AsyncMock(return_value=mock_license)):
            resp = await client.post(
                "/api/deploy/suitescript",
                json={"script_name": "test.js", "target": "production"},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 402, (
                f"Expected 402 when quota exhausted, got {resp.status_code}: {resp.text}"
            )
```

**Run:**
```bash
pytest src/backend/tests/test_quota.py -v
```

## Architecture Mapping

**Layer:** Backend Router (deploy.py) + License system (license.py)

**Flow:**

    [POST /api/deploy/suitescript]
               ↓
    [validate_license() → plan = "starter"]
               ↓
    [check_deploy_quota(user_id, "starter") → {allowed: False, used: 10, limit: 10}]
               ↓
    [return 402 "Deploy quota exhausted"]   ← NO TEST COVERS THIS PATH
               ↓ (expected)
    [Frontend shows upgrade prompt]

**Upstream:** Frontend deploy button, `POST /api/deploy/suitescript`
**Downstream:** `check_deploy_quota()` (license.py:131), `ScriptDeployment` ORM model

## Verification
- [ ] Grep proof: `grep -n "check_deploy_quota\|402\|quota" src/backend/routers/license.py src/backend/routers/deploy.py`
- [ ] Test proof: After adding `test_quota.py`: `pytest src/backend/tests/test_quota.py -v` — quota logic tests should pass; deploy endpoint 402 test may need adjustment based on actual deploy router implementation
- [ ] Runtime proof: Insert 10 `ScriptDeployment` records for a user, then `POST /api/deploy/suitescript` — should return 402

## Downstream Impact
**Impact if unfixed:** System Failure (monetization gate)

If the quota check is accidentally bypassed (wrong plan passed, wrong user_id, missing quota call), free-tier users can deploy unlimited scripts without upgrading. This is a direct revenue impact. The test acts as the only automated verification that the monetization gate is functioning.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-chat/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-037, CASE-038
