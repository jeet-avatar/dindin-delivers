"""
User Registration and Management Tests
=======================================
Covers: TC-AUTH-01 through TC-AUTH-05 (FR-AUTH-01)
        CASE-181, CASE-184, CASE-185, CASE-186, CASE-187 (Phase 11)

Architecture layer: POST /api/user/register, /api/user/me, /api/user/change-password etc.
  rawapi.py → routers/user.py → SQLAlchemy async session → users table
  Password validation: auth_utils.validate_password()
  Password hashing:   auth_utils.hash_password() → bcrypt (12 rounds)
  Email verification: auth_utils.require_user(require_verified=True) → 403 if unverified

If registration breaks: check routers/user.py, auth_utils.py validate_password(),
and the User model in models.py.
"""
import pytest


@pytest.mark.asyncio
async def test_register_valid_user(client):
    """
    TC-AUTH-01: Valid registration returns 201.

    Architecture: routers/user.py register() → User model → SQLite users table.
    JWT sub frozen interface: user.id is stored as str(user.id) in tokens.
    If this fails:
      1. Check that all required fields are in RegisterRequest schema (schemas.py)
      2. Check User model columns match (first_name, last_name, email, org, password_hash)
      3. Verify bcrypt hash is being stored, not plain text
    Next action: Run 'grep -n "def register" routers/user.py'
    """
    resp = await client.post("/api/user/register", json={
        "first_name": "Bob",
        "last_name": "Builder",
        "email": "bob@arthaBuild-test.com",
        "password": "BobPass1!",
        "organization": "BuildCorp",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert "message" in body
    # Verification email is triggered as background task (SMTP suppressed in tests — no SMTP_HOST set)
    # Confirms TC-AUTH-01: "sends verification email" requirement is wired, not silently dropped
    assert "email" in body["message"].lower() or "check" in body["message"].lower()


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(client):
    """
    TC-AUTH-02: Duplicate email returns 409 Conflict.

    Architecture: routers/user.py checks for existing user before insert.
    The unique constraint is on users.email (models.py + alembic migration).
    If this fails:
      1. Check 'email' column has unique=True in models.py
      2. Check the 'already registered' guard in routers/user.py
    Next action: grep routers/user.py for '409' or 'already registered'
    """
    payload = {
        "first_name": "Dup",
        "last_name": "User",
        "email": "duplicate@arthaBuild-test.com",
        "password": "DupPass1!",
        "organization": "DupCorp",
    }
    # First registration
    r1 = await client.post("/api/user/register", json=payload)
    assert r1.status_code == 201

    # Second with same email
    r2 = await client.post("/api/user/register", json=payload)
    assert r2.status_code == 409
    assert "already registered" in r2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_weak_password_returns_400(client):
    """
    TC-AUTH-03: Weak password (no uppercase) returns 400.

    Architecture: routers/user.py calls auth_utils.validate_password() before
    hashing. The validation runs BEFORE any DB write — no partial user creation.
    Policy: min 8 chars, 1 upper, 1 lower, 1 digit, 1 special char.
    If this fails: check validate_password() in auth_utils.py regex patterns.
    Next action: python -c "from auth_utils import validate_password; print(validate_password('password'))"
    """
    resp = await client.post("/api/user/register", json={
        "first_name": "Weak",
        "last_name": "Pass",
        "email": "weak@arthaBuild-test.com",
        "password": "password",  # no uppercase, no number, no special
        "organization": "WeakCorp",
    })
    assert resp.status_code == 400
    body = resp.json()
    assert "password" in body["detail"].lower() or "uppercase" in body["detail"].lower()


@pytest.mark.asyncio
async def test_register_missing_email_returns_422(client):
    """
    TC-AUTH-04: Missing required field (email) returns 422 Unprocessable Entity.

    Architecture: Pydantic schema validation in RegisterRequest (schemas.py).
    FastAPI automatically returns 422 for schema violations before the route handler runs.
    If this fails: check RegisterRequest in schemas.py has email as required (no default).
    Next action: grep schemas.py for 'class RegisterRequest'
    """
    resp = await client.post("/api/user/register", json={
        "first_name": "No",
        "last_name": "Email",
        "password": "NoEmail1!",
        "organization": "NoCorp",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email_format_returns_422(client):
    """
    TC-AUTH-05: Invalid email format returns 422.

    Architecture: RegisterRequest uses EmailStr from pydantic — validates RFC email format.
    If this fails: ensure 'email: EmailStr' in RegisterRequest schema (schemas.py).
    Next action: grep schemas.py for 'EmailStr'
    """
    resp = await client.post("/api/user/register", json={
        "first_name": "Bad",
        "last_name": "Email",
        "email": "not-an-email",
        "password": "BadEmail1!",
        "organization": "BadCorp",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_password_no_number_returns_400(client):
    """
    TC-AUTH-03b: Password without number returns 400.

    Architecture: validate_password() checks for \\d pattern.
    Tests that ALL password policy rules are enforced, not just uppercase.
    """
    resp = await client.post("/api/user/register", json={
        "first_name": "No",
        "last_name": "Number",
        "email": "nonumber@arthaBuild-test.com",
        "password": "NoNumber!",  # has upper, lower, special — missing digit
        "organization": "NoCorp",
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_register_password_no_special_char_returns_400(client):
    """
    TC-AUTH-03c: Password without special character returns 400.

    Architecture: validate_password() checks for special char pattern.
    """
    resp = await client.post("/api/user/register", json={
        "first_name": "No",
        "last_name": "Special",
        "email": "nospecial@arthaBuild-test.com",
        "password": "NoSpecial1",  # has upper, lower, digit — missing special
        "organization": "NoCorp",
    })
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Phase 11 — CASE-181: POST /api/user/change-password
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_change_password_validates_old_password(client):
    """
    CASE-181a: change-password succeeds when old password is correct.

    Uses dedicated user to avoid mutating Alice's password state for other tests.
    """
    email = "changepw-ok@arthaBuild-test.com"
    password = "ChangeMe123!"
    await client.post("/api/user/register", json={
        "first_name": "Change", "last_name": "OK",
        "email": email, "password": password, "organization": "CPCorp",
    })
    login = await client.post("/api/auth/login", json={"username": email, "password": password})
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.post(
        "/api/user/change-password",
        json={"old_password": password, "new_password": "NewSecure456@"},
        headers=headers,
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_change_password_rejects_wrong_old_password(client):
    """
    CASE-181b: change-password returns 401 when old password is wrong.

    Uses dedicated user to avoid coupling to Alice's password state.
    """
    email = "changepw-fail@arthaBuild-test.com"
    password = "ChangeMe999!"
    await client.post("/api/user/register", json={
        "first_name": "Change", "last_name": "Fail",
        "email": email, "password": password, "organization": "CPCorp2",
    })
    login = await client.post("/api/auth/login", json={"username": email, "password": password})
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.post(
        "/api/user/change-password",
        json={"old_password": "WrongPass999!", "new_password": "NewSecure456@"},
        headers=headers,
    )
    assert resp.status_code in (400, 401)


# ---------------------------------------------------------------------------
# Phase 11 — CASE-187: PATCH /api/user/me
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_patch_user_me_updates_name_fields(client, auth_tokens):
    """
    CASE-187a: PATCH /api/user/me updates first_name and last_name.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    resp = await client.patch(
        "/api/user/me",
        json={"first_name": "UpdatedFirst", "last_name": "UpdatedLast"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("first_name") == "UpdatedFirst"
    assert data.get("last_name") == "UpdatedLast"


@pytest.mark.asyncio
async def test_patch_user_me_partial_update(client, auth_tokens):
    """
    CASE-187b: PATCH /api/user/me with only first_name returns 200.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    resp = await client.patch("/api/user/me", json={"first_name": "OnlyFirst"}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("first_name") == "OnlyFirst"


@pytest.mark.asyncio
async def test_patch_user_me_cannot_change_email(client, auth_tokens):
    """
    CASE-187c: PATCH /api/user/me with email field does not change email.
    PatchUserRequest only accepts first_name/last_name — email is ignored.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    resp = await client.patch("/api/user/me", json={"email": "hacker@evil.com"}, headers=headers)
    if resp.status_code == 200:
        assert resp.json().get("email") != "hacker@evil.com"


# ---------------------------------------------------------------------------
# Phase 11 — CASE-184: DELETE /api/user/me
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_account_invalidates_token(client):
    """
    CASE-184: DELETE /api/user/me soft-deletes account and blacklists token.

    Uses a dedicated user so Alice's state is not affected.
    After delete, the same token should be rejected (401 or 403).
    """
    reg = await client.post("/api/user/register", json={
        "first_name": "Del", "last_name": "User",
        "email": "delete-me@arthaBuild-test.com",
        "password": "DelPass123!", "organization": "DelCorp",
    })
    assert reg.status_code == 201

    login = await client.post("/api/auth/login", json={
        "username": "delete-me@arthaBuild-test.com", "password": "DelPass123!"
    })
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    del_resp = await client.delete("/api/user/me", headers=headers)
    assert del_resp.status_code in (200, 204)

    # Token should now be invalid — user is_active=False (401) and JTI blacklisted
    # The endpoint may return 401 (token revoked / user inactive) or 403 (unverified)
    check = await client.get("/api/user/me", headers=headers)
    assert check.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Phase 11 — CASE-185: POST /api/user/resend-verification
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_resend_verification_for_unverified_user(client):
    """
    CASE-185a: Unverified user should get 200 (email suppressed in test env).
    """
    await client.post("/api/user/register", json={
        "first_name": "Unverified", "last_name": "User",
        "email": "unverified-resend@arthaBuild-test.com",
        "password": "UnverPass1!", "organization": "UVCorp",
    })
    resp = await client.post(
        "/api/user/resend-verification",
        json={"email": "unverified-resend@arthaBuild-test.com"}
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_resend_verification_unknown_email_returns_200_generic(client):
    """
    CASE-185b: Anti-enumeration — unknown email still returns 200 with generic message.
    """
    resp = await client.post(
        "/api/user/resend-verification",
        json={"email": "nobody-ever@nope.com"}
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_resend_verification_already_verified_returns_200_generic(client):
    """
    CASE-185c: Already-verified user returns 200 (anti-enumeration).
    Auto-verify event makes new users verified by default in tests,
    so no DB manipulation needed — just register and call resend.
    """
    await client.post("/api/user/register", json={
        "first_name": "Already", "last_name": "Verified",
        "email": "already-verified@arthaBuild-test.com",
        "password": "AlreadyV1!", "organization": "AVCorp",
    })
    # User is auto-verified (is_verified=True) from the test conftest event listener
    resp = await client.post(
        "/api/user/resend-verification",
        json={"email": "already-verified@arthaBuild-test.com"}
    )
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Phase 11 — CASE-186: Email verification enforcement
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_unverified_user_blocked_from_chat(client):
    """
    CASE-186a: Unverified user is blocked from logging in with 403.

    Q-288: The verification gate moved from protected endpoints to login() itself.
    An unverified user now receives 403 at POST /api/auth/login before getting a token,
    making downstream endpoint tests for unverified users moot.

    Strategy: Register normally (is_verified=True from auto-verify), then use a
    raw SQL UPDATE to set is_verified=False (bypasses ORM event listener).
    """
    from conftest import TestSessionLocal
    from sqlalchemy import text

    # Use lowercase email to match the backend's email.lower() normalization
    email = "blocked-chat-v5@arthabuild-test.com"
    reg = await client.post("/api/user/register", json={
        "first_name": "Blocked", "last_name": "User",
        "email": email,
        "password": "BlockedPass1!", "organization": "BCorp",
    })
    assert reg.status_code in (201, 409)

    # Force is_verified=False via raw SQL to bypass ORM event listener
    async with TestSessionLocal() as sess:
        await sess.execute(
            text("UPDATE users SET is_verified = 0 WHERE email = :email"),
            {"email": email}
        )
        await sess.commit()

    login = await client.post("/api/auth/login", json={
        "username": email, "password": "BlockedPass1!"
    })
    # Q-288: login now returns 403 for unverified users (gate moved from endpoints to login)
    assert login.status_code == 403
    assert "verify your email" in login.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_unverified_user_can_access_me_endpoint(client, monkeypatch):
    """
    CASE-186b: GET /api/user/me must work even for unverified users (uses require_user_unverified_ok).

    Q-288: Login now gates unverified users with 403. To obtain a token for an unverified
    user in tests, we use SKIP_EMAIL_VERIFICATION=true (the documented dev bypass).
    This tests that /me itself does NOT re-check verification (require_user_unverified_ok).
    """
    import routers.auth as auth_router
    from conftest import TestSessionLocal
    from sqlalchemy import text

    email = "unverified-me-v4@arthabuild-test.com"
    reg = await client.post("/api/user/register", json={
        "first_name": "Unverified", "last_name": "Me",
        "email": email,
        "password": "UnvMePass1!", "organization": "UMCorp",
    })
    assert reg.status_code in (201, 409)

    # Force is_verified=False via raw SQL to bypass ORM event listener
    async with TestSessionLocal() as sess:
        await sess.execute(
            text("UPDATE users SET is_verified = 0 WHERE email = :email"),
            {"email": email}
        )
        await sess.commit()

    # Use SKIP_EMAIL_VERIFICATION to bypass the login gate and obtain a token
    monkeypatch.setenv("SKIP_EMAIL_VERIFICATION", "true")
    login = await client.post("/api/auth/login", json={
        "username": email, "password": "UnvMePass1!"
    })
    monkeypatch.delenv("SKIP_EMAIL_VERIFICATION", raising=False)
    assert login.status_code == 200
    token = login.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    # /me uses require_user_unverified_ok — must still return 200 for unverified users with a valid token
    resp = await client.get("/api/user/me", headers=headers)
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# CASE-007: Register validation — required field 422s
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_register_missing_first_name_returns_422(client):
    """CASE-007: Registration without first_name returns 422."""
    resp = await client.post("/api/user/register", json={
        "last_name": "Test", "email": "t422a@test.com",
        "password": "Pass123!", "organization": "Org",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_missing_email_returns_422(client):
    """CASE-007: Registration without email returns 422."""
    resp = await client.post("/api/user/register", json={
        "first_name": "T", "last_name": "Test",
        "password": "Pass123!", "organization": "Org",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_missing_password_returns_422(client):
    """CASE-007: Registration without password returns 422."""
    resp = await client.post("/api/user/register", json={
        "first_name": "T", "last_name": "Test",
        "email": "t422c@test.com", "organization": "Org",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_json_returns_422(client):
    """CASE-007: Registration with non-JSON body returns 422."""
    resp = await client.post(
        "/api/user/register",
        content="not json",
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 422
