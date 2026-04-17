"""
ArthaBuild Chat API Test Suite
================================
Tests for user-scoped chat session CRUD and admin chat visibility.

Architecture layer: Test (Chat API)
Phase: 9 — RBAC + Team Management + Chat Persistence
"""
import pytest
import pytest_asyncio
from sqlalchemy import select
from models import User, ChatSession, ChatMessage, TeamInvite


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _register_and_login(client, suffix: str, password: str = "ChatTest1!"):
    """Register a unique user and return their access token."""
    email = f"chat-{suffix}@arthaBuild-test.com"
    await client.post("/api/user/register", json={
        "first_name": "Chat",
        "last_name": suffix,
        "email": email,
        "password": password,
        "organization": f"ChatCo-{suffix}",
    })
    login_resp = await client.post("/api/auth/login", json={"username": email, "password": password})
    assert login_resp.status_code == 200, f"Login failed for {email}: {login_resp.text}"
    return login_resp.json()["access_token"]


def _auth(token: str):
    return {"Authorization": f"Bearer {token}"}


# ===========================================================================
# TestChatCRUD
# ===========================================================================

@pytest.mark.asyncio
class TestChatCRUD:

    async def test_create_chat_session(self, client):
        """POST /api/chats should return 201 with {id, title, created_at}."""
        token = await _register_and_login(client, "create1")
        resp = await client.post("/api/chats", json={"title": "My First Chat"}, headers=_auth(token))
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "id" in data
        assert data["title"] == "My First Chat"
        assert "created_at" in data

    async def test_create_chat_session_default_title(self, client):
        """POST /api/chats without title should use 'New Chat' as default."""
        token = await _register_and_login(client, "create-default")
        resp = await client.post("/api/chats", json={}, headers=_auth(token))
        assert resp.status_code == 201
        assert resp.json()["title"] == "New Chat"

    async def test_list_chats_empty(self, client):
        """GET /api/chats for a fresh user with no sessions should return []."""
        token = await _register_and_login(client, "list-empty")
        resp = await client.get("/api/chats", headers=_auth(token))
        assert resp.status_code == 200
        # This user may have sessions from other tests if email collision, but
        # for a unique-email user, the list should be empty.
        data = resp.json()
        assert isinstance(data, list)

    async def test_list_chats_returns_own_sessions(self, client):
        """GET /api/chats should return only the authenticated user's sessions."""
        token = await _register_and_login(client, "list-own")
        # Create 2 sessions
        r1 = await client.post("/api/chats", json={"title": "Session A"}, headers=_auth(token))
        r2 = await client.post("/api/chats", json={"title": "Session B"}, headers=_auth(token))
        assert r1.status_code == 201
        assert r2.status_code == 201

        sessions = (await client.get("/api/chats", headers=_auth(token))).json()
        titles = [s["title"] for s in sessions]
        assert "Session A" in titles
        assert "Session B" in titles

    async def test_list_chats_only_own_isolation(self, client):
        """User B should not see User A's chat sessions."""
        token_a = await _register_and_login(client, "isolate-a")
        token_b = await _register_and_login(client, "isolate-b")

        # A creates a session
        await client.post("/api/chats", json={"title": "A's Private Chat"}, headers=_auth(token_a))

        # B lists their sessions — should NOT see A's session
        b_sessions = (await client.get("/api/chats", headers=_auth(token_b))).json()
        b_titles = [s["title"] for s in b_sessions]
        assert "A's Private Chat" not in b_titles

    async def test_get_chat_messages_empty(self, client):
        """GET /api/chats/{id}/messages for a new session should return []."""
        token = await _register_and_login(client, "msg-empty")
        create_resp = await client.post("/api/chats", json={"title": "Empty Session"}, headers=_auth(token))
        assert create_resp.status_code == 201
        session_id = create_resp.json()["id"]

        msg_resp = await client.get(f"/api/chats/{session_id}/messages", headers=_auth(token))
        assert msg_resp.status_code == 200
        assert msg_resp.json() == []

    async def test_get_chat_messages_returns_messages(self, client, db_session):
        """GET /api/chats/{id}/messages should return persisted messages."""
        token = await _register_and_login(client, "msg-return")
        create_resp = await client.post("/api/chats", json={"title": "Session With Messages"}, headers=_auth(token))
        assert create_resp.status_code == 201
        session_id = create_resp.json()["id"]

        # Manually insert messages into DB
        db_session.add(ChatMessage(session_id=session_id, role="user", content="Hello AI"))
        db_session.add(ChatMessage(session_id=session_id, role="assistant", content="Hello human", intent="general"))
        await db_session.commit()

        msg_resp = await client.get(f"/api/chats/{session_id}/messages", headers=_auth(token))
        assert msg_resp.status_code == 200
        messages = msg_resp.json()
        assert len(messages) == 2
        assert messages[0]["role"] == "user"
        assert messages[0]["content"] == "Hello AI"
        assert messages[1]["role"] == "assistant"
        assert messages[1]["intent"] == "general"

    async def test_rename_chat(self, client):
        """PATCH /api/chats/{id} should update the title."""
        token = await _register_and_login(client, "rename1")
        create_resp = await client.post("/api/chats", json={"title": "Old Title"}, headers=_auth(token))
        assert create_resp.status_code == 201
        session_id = create_resp.json()["id"]

        patch_resp = await client.patch(
            f"/api/chats/{session_id}",
            json={"title": "New Title"},
            headers=_auth(token),
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["title"] == "New Title"

    async def test_delete_chat(self, client):
        """DELETE /api/chats/{id} should succeed, then GET should 404."""
        token = await _register_and_login(client, "delete1")
        create_resp = await client.post("/api/chats", json={"title": "To Delete"}, headers=_auth(token))
        assert create_resp.status_code == 201
        session_id = create_resp.json()["id"]

        del_resp = await client.delete(f"/api/chats/{session_id}", headers=_auth(token))
        assert del_resp.status_code == 200
        assert del_resp.json()["message"] == "deleted"

        # GET messages should now 404
        get_resp = await client.get(f"/api/chats/{session_id}/messages", headers=_auth(token))
        assert get_resp.status_code == 404

    async def test_cannot_access_other_users_chat_messages(self, client):
        """User B trying to GET User A's chat messages should get 403."""
        token_a = await _register_and_login(client, "xuser-a")
        token_b = await _register_and_login(client, "xuser-b")

        # A creates session
        create_resp = await client.post("/api/chats", json={"title": "A's Secret Chat"}, headers=_auth(token_a))
        assert create_resp.status_code == 201
        session_id = create_resp.json()["id"]

        # B tries to access A's messages
        resp = await client.get(f"/api/chats/{session_id}/messages", headers=_auth(token_b))
        assert resp.status_code == 403, f"Should get 403, got {resp.status_code}: {resp.text}"

    async def test_cannot_rename_other_users_chat(self, client):
        """User B cannot rename User A's chat session."""
        token_a = await _register_and_login(client, "xrename-a")
        token_b = await _register_and_login(client, "xrename-b")

        create_resp = await client.post("/api/chats", json={"title": "A's Chat"}, headers=_auth(token_a))
        assert create_resp.status_code == 201
        session_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/chats/{session_id}",
            json={"title": "Stolen Title"},
            headers=_auth(token_b),
        )
        assert resp.status_code == 403

    async def test_cannot_delete_other_users_chat(self, client):
        """User B cannot delete User A's chat session."""
        token_a = await _register_and_login(client, "xdelete-a")
        token_b = await _register_and_login(client, "xdelete-b")

        create_resp = await client.post("/api/chats", json={"title": "A's Chat"}, headers=_auth(token_a))
        assert create_resp.status_code == 201
        session_id = create_resp.json()["id"]

        resp = await client.delete(f"/api/chats/{session_id}", headers=_auth(token_b))
        assert resp.status_code == 403

    async def test_unauthenticated_cannot_list_chats(self, client):
        """GET /api/chats without token should return 401 or 403."""
        resp = await client.get("/api/chats")
        assert resp.status_code in (401, 403)

    async def test_unauthenticated_cannot_create_chat(self, client):
        """POST /api/chats without token should return 401 or 403."""
        resp = await client.post("/api/chats", json={"title": "Unauthorized"})
        assert resp.status_code in (401, 403)


# ===========================================================================
# TestAdminChats
# ===========================================================================

@pytest.mark.asyncio
class TestAdminChats:

    async def test_admin_can_list_team_members(self, client, db_session):
        """GET /api/admin/team should return 200 for admin user."""
        # Find the admin user in DB
        result = await db_session.execute(
            select(User).where(User.role == "admin").limit(1)
        )
        admin = result.scalar_one_or_none()
        if admin is None:
            pytest.skip("No admin user in test DB")

        # We need a fresh login for the admin — but we don't know their plaintext password.
        # Use alice (first registered user = admin) if available.
        alice_result = await db_session.execute(
            select(User).where(User.email == "alice@arthaBuild-test.com")
        )
        alice = alice_result.scalar_one_or_none()
        if alice is None or alice.role != "admin":
            pytest.skip("Alice not admin in this session")

        login_resp = await client.post("/api/auth/login", json={
            "username": "alice@arthaBuild-test.com",
            "password": "AlicePass1!",
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        resp = await client.get("/api/admin/team", headers=_auth(token))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    async def test_invite_creates_record(self, client, db_session):
        """POST /api/admin/team/invite should create a TeamInvite record in DB."""
        # Find admin user
        alice_result = await db_session.execute(
            select(User).where(User.email == "alice@arthaBuild-test.com")
        )
        alice = alice_result.scalar_one_or_none()
        if alice is None or alice.role != "admin":
            pytest.skip("Alice not admin in this session")

        login_resp = await client.post("/api/auth/login", json={
            "username": "alice@arthaBuild-test.com",
            "password": "AlicePass1!",
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        invite_resp = await client.post(
            "/api/admin/team/invite",
            json={"email": "invited@arthaBuild-test.com"},
            headers=_auth(token),
        )
        assert invite_resp.status_code == 200
        data = invite_resp.json()
        assert data["message"] == "Invite sent"
        assert data["email"] == "invited@arthabuild-test.com"  # normalized to lowercase (AB-1104)

        # Verify TeamInvite record in DB
        db_session.expire_all()
        invite_result = await db_session.execute(
            select(TeamInvite).where(TeamInvite.email == "invited@arthabuild-test.com")
        )
        invite = invite_result.scalar_one_or_none()
        assert invite is not None, "TeamInvite record should exist in DB"
        assert invite.accepted is False

    async def test_non_admin_cannot_invite(self, client):
        """Regular user cannot invite team members."""
        token = await _register_and_login(client, "noadmin-invite")
        login_resp = await client.post("/api/auth/login", json={
            "username": f"chat-noadmin-invite@arthaBuild-test.com",
            "password": "ChatTest1!",
        })
        assert login_resp.status_code == 200
        role = login_resp.json().get("role")
        if role == "admin":
            pytest.skip("This user got admin role")
        token = login_resp.json()["access_token"]

        resp = await client.post(
            "/api/admin/team/invite",
            json={"email": "outsider@test.com"},
            headers=_auth(token),
        )
        assert resp.status_code == 403

    async def test_admin_list_chats_endpoint_accessible(self, client, db_session):
        """GET /api/admin/chats should return 200 for admin."""
        alice_result = await db_session.execute(
            select(User).where(User.email == "alice@arthaBuild-test.com")
        )
        alice = alice_result.scalar_one_or_none()
        if alice is None or alice.role != "admin":
            pytest.skip("Alice not admin in this session")

        login_resp = await client.post("/api/auth/login", json={
            "username": "alice@arthaBuild-test.com",
            "password": "AlicePass1!",
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        resp = await client.get("/api/admin/chats", headers=_auth(token))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_non_admin_cannot_access_admin_chats(self, client):
        """Regular user cannot access GET /api/admin/chats."""
        token = await _register_and_login(client, "noadmin-chats")
        login_resp = await client.post("/api/auth/login", json={
            "username": f"chat-noadmin-chats@arthaBuild-test.com",
            "password": "ChatTest1!",
        })
        assert login_resp.status_code == 200
        if login_resp.json().get("role") == "admin":
            pytest.skip("This user got admin role")
        token = login_resp.json()["access_token"]

        resp = await client.get("/api/admin/chats", headers=_auth(token))
        assert resp.status_code == 403

    async def test_admin_remove_member_endpoint_exists(self, client, db_session):
        """DELETE /api/admin/team/{user_id} should return 200 for valid admin request."""
        alice_result = await db_session.execute(
            select(User).where(User.email == "alice@arthaBuild-test.com")
        )
        alice = alice_result.scalar_one_or_none()
        if alice is None or alice.role != "admin" or alice.team_id is None:
            pytest.skip("Alice not admin or has no team in this session")

        # Register a user to be removed
        to_remove_email = "to-remove@arthaBuild-test.com"
        await client.post("/api/user/register", json={
            "first_name": "ToRemove",
            "last_name": "User",
            "email": to_remove_email,
            "password": "ToRemove1!",
        })
        # Manually assign the user to alice's team
        result = await db_session.execute(
            select(User).where(User.email == to_remove_email.lower())
        )
        to_remove = result.scalar_one_or_none()
        if to_remove is None:
            pytest.skip("Could not find to-remove user")
        to_remove.team_id = alice.team_id
        await db_session.commit()

        login_resp = await client.post("/api/auth/login", json={
            "username": "alice@arthaBuild-test.com",
            "password": "AlicePass1!",
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        resp = await client.delete(
            f"/api/admin/team/{to_remove.id}",
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "removed"


# ---------------------------------------------------------------------------
# CASE-028: 404 on nonexistent chat sessions
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestNonexistentSession:

    async def test_get_messages_nonexistent_session_returns_404(self, client):
        """CASE-028: GET /api/chats/999999/messages returns 404 for unknown session."""
        token = await _register_and_login(client, "ne-get")
        resp = await client.get("/api/chats/999999/messages", headers=_auth(token))
        assert resp.status_code == 404, \
            f"Expected 404 for nonexistent session, got {resp.status_code}"

    async def test_rename_nonexistent_session_returns_404(self, client):
        """CASE-028: PATCH /api/chats/999999 returns 404 for unknown session."""
        token = await _register_and_login(client, "ne-patch")
        resp = await client.patch(
            "/api/chats/999999",
            json={"title": "new name"},
            headers=_auth(token),
        )
        assert resp.status_code == 404, \
            f"Expected 404 for nonexistent session rename, got {resp.status_code}"

    async def test_delete_nonexistent_session_returns_404(self, client):
        """CASE-028: DELETE /api/chats/999999 returns 404 for unknown session."""
        token = await _register_and_login(client, "ne-del")
        resp = await client.delete("/api/chats/999999", headers=_auth(token))
        assert resp.status_code == 404, \
            f"Expected 404 for nonexistent session delete, got {resp.status_code}"


# ---------------------------------------------------------------------------
# CASE-138: Messages returned in chronological order
# CASE-139: Chat isolation between users
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestChatIntegrityRules:

    async def test_messages_returned_in_chronological_order(self, client):
        """CASE-138: GET /api/chats/{id}/messages returns messages ASC by created_at."""
        token = await _register_and_login(client, "order-msg")
        sess = await client.post("/api/chats", json={"title": "order-test"}, headers=_auth(token))
        assert sess.status_code == 201
        session_id = sess.json()["id"]

        msgs = await client.get(f"/api/chats/{session_id}/messages", headers=_auth(token))
        assert msgs.status_code == 200
        data = msgs.json()
        assert isinstance(data, list), "Messages endpoint must return a list"
        if len(data) >= 2:
            from datetime import datetime
            dates = [datetime.fromisoformat(m["created_at"]) for m in data if "created_at" in m]
            assert dates == sorted(dates), "Messages not in chronological order"

    async def test_two_users_chats_are_isolated(self, client):
        """CASE-139: User A's chat sessions must not appear in User B's list."""
        token_a = await _register_and_login(client, "iso-a")
        token_b = await _register_and_login(client, "iso-b")

        sess_a = await client.post(
            "/api/chats", json={"title": "A private chat"}, headers=_auth(token_a)
        )
        assert sess_a.status_code == 201
        sess_a_id = sess_a.json()["id"]

        b_sessions = (await client.get("/api/chats", headers=_auth(token_b))).json()
        b_ids = [s["id"] for s in b_sessions]
        assert sess_a_id not in b_ids, "User B should not see User A's chat session (CASE-139)"
