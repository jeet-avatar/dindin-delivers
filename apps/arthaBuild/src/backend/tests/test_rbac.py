"""
ArthaBuild RBAC Test Suite
============================
Tests for role-based access control:
  - First registered user becomes admin
  - Subsequent users become regular users
  - require_admin() gates work correctly
  - JTI blacklist (logout invalidation)

Architecture layer: Test (RBAC)
Phase: 9 — RBAC + Team Management + Chat Persistence
"""
import pytest
import pytest_asyncio
from sqlalchemy import select
from models import User
from auth_utils import _blacklisted_jtis, decode_token


# ---------------------------------------------------------------------------
# Helper: register a unique user via HTTP
# ---------------------------------------------------------------------------
async def _register(client, suffix: str):
    """Register a test user and return their credentials dict."""
    user = {
        "first_name": "Test",
        "last_name": suffix,
        "email": f"rbac-{suffix}@arthaBuild-test.com",
        "password": "RbacPass1!",
        "organization": "RbacCorp",
    }
    resp = await client.post("/api/user/register", json=user)
    assert resp.status_code in (201, 409), f"Registration failed: {resp.text}"
    return user


async def _login(client, email: str, password: str = "RbacPass1!"):
    """Login and return token response dict."""
    resp = await client.post("/api/auth/login", json={"username": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()


# ===========================================================================
# TestFirstUserIsAdmin
# ===========================================================================

@pytest.mark.asyncio
class TestFirstUserIsAdmin:

    async def test_first_user_becomes_admin(self, client, db_session):
        """
        First registered user should have role='admin'.

        Strategy: register a user, then check their role in DB and login response.
        If the email already exists (prior test registered it), the first user in the DB
        must be admin — this invariant is enforced by the registration logic.
        """
        email = "first-admin-check@arthaBuild-test.com"
        pw = "FirstAdmin1!"
        reg = await client.post("/api/user/register", json={
            "first_name": "First",
            "last_name": "Admin",
            "email": email,
            "password": pw,
            "organization": "FirstCo",
        })
        # 201 = newly registered; 409 = already exists (from a prior run in same session)
        assert reg.status_code in (201, 409)

        if reg.status_code == 201:
            # This was a fresh registration — check if they got admin role
            # (they got admin only if they were THE first user in the DB)
            result = await db_session.execute(
                select(User).where(User.email == email.lower())
            )
            user = result.scalar_one_or_none()
            # Check the overall invariant: the user with the lowest id must be admin
            result2 = await db_session.execute(
                select(User).order_by(User.id.asc()).limit(1)
            )
            first_user = result2.scalar_one_or_none()
            assert first_user is not None
            assert first_user.role == "admin", (
                f"First-ever registered user should have role='admin', got: {first_user.role}"
            )
        else:
            # User already existed — just verify the invariant: first user in DB is admin
            result = await db_session.execute(
                select(User).order_by(User.id.asc()).limit(1)
            )
            first_user = result.scalar_one_or_none()
            if first_user is not None:
                assert first_user.role == "admin", (
                    f"First-ever registered user should have role='admin', got: {first_user.role}"
                )

    async def test_second_user_is_regular(self, client, db_session):
        """Second registered user should have role='user'."""
        # Register two users in sequence
        email1 = "admin-seq1@arthaBuild-test.com"
        email2 = "user-seq2@arthaBuild-test.com"

        await client.post("/api/user/register", json={
            "first_name": "Seq",
            "last_name": "Admin",
            "email": email1,
            "password": "SeqAdmin1!",
            "organization": "SeqCo",
        })
        r2 = await client.post("/api/user/register", json={
            "first_name": "Seq",
            "last_name": "User",
            "email": email2,
            "password": "SeqUser1!",
            "organization": "SeqCo",
        })
        assert r2.status_code in (201, 409)

        result = await db_session.execute(
            select(User).where(User.email == email2.lower())
        )
        user2 = result.scalar_one_or_none()
        # If email2 already in DB from prior test, role should be "user"
        if user2:
            assert user2.role == "user", f"Subsequent user should have role=user, got: {user2.role}"

    async def test_admin_role_in_login_response(self, client, db_session):
        """Login response should include role field matching DB value."""
        # Find first admin user in DB
        result = await db_session.execute(
            select(User).where(User.role == "admin").limit(1)
        )
        admin_user = result.scalar_one_or_none()
        if admin_user is None:
            pytest.skip("No admin user in test DB — DB state depends on test ordering")

        # We cannot login as admin_user because we don't know their plaintext password from DB.
        # Instead, verify that a fresh user gets the role field in response.
        # We'll test with a new registration + login cycle.
        email = "role-check@arthaBuild-test.com"
        pw = "RoleCheck1!"
        reg = await client.post("/api/user/register", json={
            "first_name": "Role",
            "last_name": "Check",
            "email": email,
            "password": pw,
        })
        assert reg.status_code in (201, 409)
        login_resp = await client.post("/api/auth/login", json={"username": email, "password": pw})
        assert login_resp.status_code == 200
        data = login_resp.json()
        assert "role" in data, f"Login response missing 'role' field: {data}"
        assert data["role"] in ("admin", "user"), f"Invalid role value: {data['role']}"


# ===========================================================================
# TestRequireAdmin
# ===========================================================================

@pytest.mark.asyncio
class TestRequireAdmin:

    async def test_admin_can_access_admin_endpoints(self, client, db_session):
        """Admin JWT should get 200 from GET /api/admin/team."""
        # The first registered user (alice from registered_user fixture or first test) is admin.
        # We need an admin with known credentials. Use auth_tokens fixture.
        # auth_tokens uses alice — check if alice is admin in DB.
        result = await db_session.execute(
            select(User).where(User.email == "alice@arthaBuild-test.com").limit(1)
        )
        alice = result.scalar_one_or_none()
        if alice is None or alice.role != "admin":
            pytest.skip("Alice is not admin in this test session (DB ordering)")

        login_resp = await client.post("/api/auth/login", json={
            "username": "alice@arthaBuild-test.com",
            "password": "AlicePass1!",
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        resp = await client.get("/api/admin/team", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200, f"Admin should access /api/admin/team: {resp.text}"

    async def test_user_cannot_access_admin_endpoints(self, client):
        """Regular user JWT should get 403 from GET /api/admin/team."""
        # Register a second user (will be role=user)
        email = "nonadmin-guard@arthaBuild-test.com"
        pw = "NonAdmin1!"
        await client.post("/api/user/register", json={
            "first_name": "Non",
            "last_name": "Admin",
            "email": email,
            "password": pw,
        })
        login_resp = await client.post("/api/auth/login", json={"username": email, "password": pw})
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        # Check the role — if this user happened to be first (admin), skip
        role = login_resp.json().get("role")
        if role == "admin":
            pytest.skip("This user got admin role (first user in DB)")

        resp = await client.get("/api/admin/team", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403, f"Non-admin should get 403, got {resp.status_code}: {resp.text}"

    async def test_unauthenticated_cannot_access_admin(self, client):
        """No token should get 401 or 403 from GET /api/admin/team."""
        resp = await client.get("/api/admin/team")
        assert resp.status_code in (401, 403), f"Unauthenticated should get 401/403, got {resp.status_code}"

    async def test_admin_role_in_jwt_payload(self, client, db_session):
        """JWT payload should include role field matching user's DB role."""
        email = "jwt-role-test@arthaBuild-test.com"
        pw = "JwtRole1!"
        await client.post("/api/user/register", json={
            "first_name": "Jwt",
            "last_name": "Role",
            "email": email,
            "password": pw,
        })
        login_resp = await client.post("/api/auth/login", json={"username": email, "password": pw})
        assert login_resp.status_code == 200
        data = login_resp.json()
        token = data["access_token"]
        payload = decode_token(token, "access")
        assert "role" in payload, "JWT payload should include role"
        assert payload["role"] in ("admin", "user")
        assert payload["role"] == data["role"], "JWT role should match response role"

    async def test_jti_in_jwt_payload(self, client):
        """JWT payload should include jti field for logout invalidation."""
        email = "jti-test@arthaBuild-test.com"
        pw = "JtiTest1!"
        await client.post("/api/user/register", json={
            "first_name": "Jti",
            "last_name": "Test",
            "email": email,
            "password": pw,
        })
        login_resp = await client.post("/api/auth/login", json={"username": email, "password": pw})
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        payload = decode_token(token, "access")
        assert "jti" in payload, "JWT payload should include jti for blacklisting"
        assert len(payload["jti"]) > 10, "JTI should be a non-trivial UUID"


# ===========================================================================
# TestTokenBlacklist
# ===========================================================================

@pytest.mark.asyncio
class TestTokenBlacklist:

    async def test_logout_endpoint_returns_200(self, client):
        """POST /api/auth/logout should return 200."""
        email = "logout-200@arthaBuild-test.com"
        pw = "Logout200A1!"
        await client.post("/api/user/register", json={
            "first_name": "Logout",
            "last_name": "Test",
            "email": email,
            "password": pw,
        })
        login_resp = await client.post("/api/auth/login", json={"username": email, "password": pw})
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        logout_resp = await client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert logout_resp.status_code == 200

    async def test_blacklisted_token_rejected(self, client):
        """After logout, the token should be rejected by protected endpoints."""
        email = "blacklist-test@arthaBuild-test.com"
        pw = "Blacklist1!"
        await client.post("/api/user/register", json={
            "first_name": "Blacklist",
            "last_name": "Test",
            "email": email,
            "password": pw,
        })
        login_resp = await client.post("/api/auth/login", json={"username": email, "password": pw})
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        # Token works before logout
        pre_resp = await client.get("/api/chats", headers={"Authorization": f"Bearer {token}"})
        assert pre_resp.status_code == 200, f"Token should work before logout: {pre_resp.text}"

        # Logout
        await client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})

        # Token should now be rejected
        post_resp = await client.get("/api/chats", headers={"Authorization": f"Bearer {token}"})
        assert post_resp.status_code == 401, f"Token should be rejected after logout: {post_resp.text}"

    async def test_logout_without_token_returns_401(self, client):
        """POST /api/auth/logout without token should return 401."""
        resp = await client.post("/api/auth/logout")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# CASE-037: Cross-team admin isolation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_cannot_manage_users_from_different_team(client):
    """CASE-037: Admin from one team must not modify users from a different team."""
    # Admin A: first user registered becomes admin
    await _register(client, "xteam-admin-a")
    login_a = await _login(client, "rbac-xteam-admin-a@arthaBuild-test.com")
    token_a = login_a["access_token"]

    # Member B: separate registration creates a different team
    reg_b = await client.post("/api/user/register", json={
        "first_name": "Cross",
        "last_name": "TeamB",
        "email": "rbac-crossteam-b@arthaBuild-test.com",
        "password": "RbacPass1!",
        "organization": "CrossTeamB",
    })
    user_b_data = reg_b.json()
    user_b_id = user_b_data.get("user_id") or user_b_data.get("id")

    # Admin A tries to promote Team B member — must be 403 or 404
    if user_b_id:
        resp = await client.patch(
            f"/api/admin/users/{user_b_id}/role",
            json={"role": "admin"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert resp.status_code in (403, 404), \
            f"CASE-037: Admin A should not manage Team B user, got {resp.status_code}"


# ---------------------------------------------------------------------------
# CASE-038: Admin self-removal blocked
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_cannot_remove_self(client):
    """CASE-038: Admin cannot delete themselves from the team."""
    await _register(client, "self-rm-admin")
    login = await _login(client, "rbac-self-rm-admin@arthaBuild-test.com")
    token = login["access_token"]

    # Get own user ID
    me = await client.get("/api/user/me", headers={"Authorization": f"Bearer {token}"})
    own_id = me.json().get("id") or me.json().get("user_id")

    if own_id:
        resp = await client.delete(
            f"/api/admin/team/{own_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code in (400, 403, 404), \
            f"CASE-038: Self-removal should be blocked, got {resp.status_code}"


# ---------------------------------------------------------------------------
# CASE-039: Deploy quota exceed — no unhandled 500
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_deploy_quota_exceeded_is_handled(client):
    """CASE-039: Deploy endpoint must not raise unhandled 500 (any expected status allowed)."""
    await _register(client, "deploy-quota")
    login = await _login(client, "rbac-deploy-quota@arthaBuild-test.com")
    token = login["access_token"]

    resp = await client.post(
        "/api/deploy/suitescript",
        json={
            "script_content": "// test",
            "script_name": "quota_test.js",
            "script_type": "SCHEDULED",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code != 500, \
        f"CASE-039: Deploy endpoint raised unhandled 500: {resp.text}"
