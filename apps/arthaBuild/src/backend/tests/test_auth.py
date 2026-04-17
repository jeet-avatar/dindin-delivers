"""
Authentication Endpoint Tests
==============================
Covers: TC-AUTH-06 through TC-AUTH-23 (FR-AUTH-02 through FR-AUTH-06)

Architecture layers tested:
  check-user : routers/auth.py → users table (email lookup only)
  login      : routers/auth.py → bcrypt verify → JWT create (auth_utils.py)
  forgot-pw  : routers/auth.py → PasswordResetToken → email_utils.py (SMTP suppressed in test)
  reset-pw   : routers/auth.py → SHA-256 hash lookup → token expiry/used check
  refresh    : routers/auth.py → decode_token(type='refresh') → new access token

JWT frozen interface (CLAUDE.md):
  sub = str(user_id)    algorithm = HS256    library = PyJWT
"""
import pytest
import hashlib
import sqlalchemy
from models import User, PasswordResetToken
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
import sqlalchemy
from models import User, PasswordResetToken


# ---------------------------------------------------------------------------
# FR-AUTH-02: Email Check (check-user)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_check_user_known_email(client, registered_user):
    """
    TC-AUTH-06: check-user with registered email returns success:true.

    Architecture: routers/auth.py /check-user → SELECT from users WHERE email=?
    Response must NOT include user_id (enumeration risk — fixed in code review).
    Frontend uses this to decide: show 'Login' form vs 'Register' flow.
    If this fails:
      1. User may not be in the DB (registered_user fixture issue)
      2. Email lookup may be case-sensitive — check .lower() normalization in route
    Next action: grep routers/auth.py for 'check_user'
    """
    resp = await client.post("/api/auth/check-user", json={
        "email": registered_user["email"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    # user_id must NOT be in response (enumeration prevention)
    assert "user_id" not in body


@pytest.mark.asyncio
async def test_check_user_unknown_email(client):
    """
    TC-AUTH-07: check-user with unknown email returns success:false.

    Architecture: same route, user not found → success:false.
    No 404 — always 200 to prevent timing attacks distinguishing registered vs unregistered.
    If this fails: check the 'else' branch in check_user() returns success:false.
    Next action: grep routers/auth.py for 'success.*False'
    """
    resp = await client.post("/api/auth/check-user", json={
        "email": "nobody@nowhere.com",
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is False
    assert "user_id" not in body


@pytest.mark.asyncio
async def test_check_user_malformed_email_returns_422(client):
    """
    TC-AUTH-08: Malformed email in check-user returns 422.

    Architecture: CheckUserRequest uses EmailStr (Pydantic validation).
    Route handler never runs — Pydantic rejects before DB query.
    If this fails: ensure CheckUserRequest.email is EmailStr in schemas.py.
    """
    resp = await client.post("/api/auth/check-user", json={
        "email": "not-an-email",
    })
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# FR-AUTH-03: Login
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_valid_credentials(client, registered_user):
    """
    TC-AUTH-09: Valid login returns 200 with access + refresh tokens.

    Architecture: routers/auth.py → verify_password(bcrypt) → create_access_token()
    JWT frozen interface: sub=str(user_id), type=access, exp=24h (auth_utils.py)
    Response shape: {access_token, refresh_token, token_type:'bearer', first_name, last_name, email}
    If this fails:
      1. Password hash mismatch — check bcrypt rounds (must be 12, not default 12 is fine)
      2. JWT_SECRET_KEY not matching between token creation and decode
      3. Check 'username' field name (frontend sends email as 'username')
    Next action: grep routers/auth.py for 'def login'
    """
    resp = await client.post("/api/auth/login", json={
        "username": registered_user["email"],
        "password": registered_user["password"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"
    # Email is lowercased on storage (.lower() in route) — compare lowercase
    assert body["email"] == registered_user["email"].lower()


@pytest.mark.asyncio
async def test_login_wrong_password(client, registered_user):
    """
    TC-AUTH-10: Wrong password returns 401 with generic error.

    Architecture: verify_password() fails → generic_error raised (no enumeration).
    MUST return same message as unknown email (TC-AUTH-11) — prevents guessing registered emails.
    If this fails: check the generic_error HTTPException in login() uses same message for both paths.
    Next action: grep routers/auth.py for 'generic_error'
    """
    resp = await client.post("/api/auth/login", json={
        "username": registered_user["email"],
        "password": "WrongPassword99!",
    })
    assert resp.status_code == 401
    body = resp.json()
    assert "invalid" in body["detail"].lower() or "incorrect" in body["detail"].lower()


@pytest.mark.asyncio
async def test_login_unknown_email_same_error_as_wrong_password(client):
    """
    TC-AUTH-11: Unknown email returns same 401 as wrong password (no enumeration).

    Architecture: login() returns generic_error for both 'user not found' and 'wrong password'.
    Security: attacker cannot distinguish registered vs unregistered emails from response.
    If this fails: there are two different error messages — merge them to the same string.
    Next action: compare detail in TC-AUTH-10 and TC-AUTH-11 — must be identical strings.
    """
    r_unknown = await client.post("/api/auth/login", json={
        "username": "unknown@nowhere.com",
        "password": "AnyPass1!",
    })
    r_wrong = await client.post("/api/auth/login", json={
        "username": "alice@arthaBuild-test.com",
        "password": "WrongPass1!",
    })
    assert r_unknown.status_code == 401
    assert r_wrong.status_code == 401
    # Same detail message — no enumeration
    assert r_unknown.json()["detail"] == r_wrong.json()["detail"]


@pytest.mark.asyncio
async def test_login_lockout_after_5_failures(client, registered_user):
    """
    TC-AUTH-12: 5 consecutive wrong passwords triggers 15-minute lockout.

    Architecture: login() increments user.failed_attempts after each failure.
    At 5: sets user.locked_until = now + 15min, raises 429.
    Subsequent attempts: is_locked() check fires at top of login(), returns 429.
    If this fails:
      1. Check failed_attempts increment logic in login() (routers/auth.py)
      2. Check is_locked() in auth_utils.py compares timezone-aware datetimes
    Next action: grep routers/auth.py for 'failed_attempts'
    Note: This test uses a unique email to avoid polluting other tests' lockout state.
    """
    # Register a dedicated lockout test user
    lockout_email = "lockout-test@arthaBuild-test.com"
    await client.post("/api/user/register", json={
        "first_name": "Lock",
        "last_name": "Out",
        "email": lockout_email,
        "password": "LockOut1!",
        "organization": "LockCorp",
    })

    # 5 wrong attempts
    for i in range(5):
        r = await client.post("/api/auth/login", json={
            "username": lockout_email,
            "password": "Wrong!!",
        })
        # First 4: 401. At 5th: 429 lockout
        if i < 4:
            assert r.status_code == 401, f"Attempt {i+1} should be 401, got {r.status_code}"

    # 5th or 6th attempt should be 429
    r = await client.post("/api/auth/login", json={
        "username": lockout_email,
        "password": "Wrong!!",
    })
    assert r.status_code == 429
    assert "too many" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_sql_injection_sanitized(client):
    """
    TC-AUTH-13: SQL injection in email field returns 422 (Pydantic rejects non-email).

    Architecture: LoginRequest.username is a plain str (not EmailStr — frontend sends
    email as username field). However, SQLAlchemy parameterized queries prevent injection.
    The Pydantic EmailStr on check-user prevents injection there. Login accepts any str
    but SQLAlchemy never interpolates it into raw SQL.
    If this fails: check that select(User).where(User.email == data.username) uses
    parameterized query (SQLAlchemy ORM always does this by default).
    Next action: verify no raw SQL f-strings in routers/auth.py login()
    """
    resp = await client.post("/api/auth/login", json={
        "username": "' OR '1'='1",
        "password": "InjectionPass1!",
    })
    # Either 401 (query runs safely, no user found) or 422 (validation)
    assert resp.status_code in (401, 422)
    # Must NOT be 200 (injection succeeded)
    assert resp.status_code != 200


# ---------------------------------------------------------------------------
# FR-AUTH-04: Forgot Password
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_forgot_password_known_email_returns_200(client, registered_user):
    """
    TC-AUTH-14: forgot-password with known email returns 200.

    Architecture: routers/auth.py → find user → generate_reset_token() → insert
    PasswordResetToken → BackgroundTasks.add_task(send_reset_email)
    SMTP is suppressed in test (SMTP_HOST not set) — email is logged at DEBUG level.
    If this fails: check forgot_password() route exists in routers/auth.py
    Next action: grep routers/auth.py for 'def forgot_password'
    """
    resp = await client.post("/api/auth/forgot-password", json={
        "email": registered_user["email"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert "message" in body
    assert "registered" in body["message"].lower()


@pytest.mark.asyncio
async def test_forgot_password_unknown_email_same_response(client):
    """
    TC-AUTH-15: forgot-password with unknown email returns identical 200 (no enumeration).

    Architecture: forgot_password() returns same JSON regardless of whether user exists.
    Security: attacker cannot learn which emails are registered via this endpoint.
    If this fails: two different response messages for found vs not-found — unify them.
    Next action: grep routers/auth.py for the return statement in forgot_password()
                 — must be outside the 'if user:' block
    """
    r_known = await client.post("/api/auth/forgot-password", json={
        "email": "alice@arthaBuild-test.com",
    })
    r_unknown = await client.post("/api/auth/forgot-password", json={
        "email": "ghost@nowhere.com",
    })
    assert r_known.status_code == 200
    assert r_unknown.status_code == 200
    # Same message — no information leak
    assert r_known.json()["message"] == r_unknown.json()["message"]


@pytest.mark.asyncio
async def test_forgot_password_creates_token_in_db(client, db_session, registered_user):
    """
    TC-AUTH-14b: forgot-password creates a PasswordResetToken record in DB.

    Architecture: PasswordResetToken row: user_id FK, SHA-256 hash, expires_at (1hr),
    used=False. Raw token sent in email URL, never stored.
    If this fails:
      1. Check db.add(reset_token) + await db.commit() in forgot_password()
      2. Check that BackgroundTasks doesn't run before commit
    Next action: query password_reset_tokens table directly after calling forgot-password
    """
    # Invalidate old tokens first by calling forgot-password
    await client.post("/api/auth/forgot-password", json={
        "email": registered_user["email"],
    })

    # Refresh session to see data committed by the API (StaticPool shares connection)
    db_session.expire_all()
    result = await db_session.execute(
        sqlalchemy.select(User).where(User.email == registered_user["email"].lower())
    )
    user = result.scalar_one_or_none()
    assert user is not None

    result = await db_session.execute(
        sqlalchemy.select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False,
        )
    )
    tokens = result.scalars().all()
    assert len(tokens) >= 1
    # Token hash should be 64 chars (SHA-256 hex)
    assert len(tokens[-1].token_hash) == 64


@pytest.mark.asyncio
async def test_forgot_password_invalidates_old_tokens(client, db_session, registered_user):
    """
    TC-AUTH-14c: Second forgot-password call invalidates all previous unused tokens.

    Architecture: forgot_password() runs UPDATE...SET used=True before inserting new token.
    Security: prevents old intercepted reset emails from being used after a fresh request.
    If this fails: check the UPDATE statement in forgot_password() (routers/auth.py)
    Next action: grep routers/auth.py for 'update.*PasswordResetToken' or 'used.*True'
    """
    # First request
    await client.post("/api/auth/forgot-password", json={"email": registered_user["email"]})
    # Second request — should invalidate the first token
    await client.post("/api/auth/forgot-password", json={"email": registered_user["email"]})

    # Refresh session + get user
    db_session.expire_all()
    result = await db_session.execute(
        sqlalchemy.select(User).where(User.email == registered_user["email"].lower())
    )
    user = result.scalar_one_or_none()
    assert user is not None

    # All tokens except the latest should be used=True
    result = await db_session.execute(
        sqlalchemy.select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id,
        ).order_by(PasswordResetToken.id)
    )
    tokens = result.scalars().all()
    if len(tokens) >= 2:
        # All but the last should be marked used
        for t in tokens[:-1]:
            assert t.used is True, f"Token {t.id} should be invalidated but used={t.used}"


# ---------------------------------------------------------------------------
# FR-AUTH-05: Reset Password
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reset_password_valid_token(client, valid_reset_token):
    """
    TC-AUTH-18: Valid reset token + strong password → 200, password updated.

    Architecture: reset_password() → hash_token(raw) → DB lookup → expiry check →
    used check → hash_password(new) → user.password_hash update → token.used=True
    If this fails:
      1. Check hash_token() uses SHA-256: hashlib.sha256(raw.encode()).hexdigest()
      2. Check timezone-awareness: expires_at.tzinfo handling for naive SQLite datetimes
    Next action: grep routers/auth.py for 'def reset_password'
    """
    raw_token, email = valid_reset_token
    resp = await client.post("/api/auth/reset-password", json={
        "token": raw_token,
        "password": "NewStrongPass1!",
    })
    assert resp.status_code == 200
    assert "updated" in resp.json()["message"].lower()


@pytest.mark.asyncio
async def test_reset_password_marks_token_used(client, db_session, valid_reset_token):
    """
    TC-AUTH-18b: After successful reset, token is marked used=True in DB.

    Architecture: token_record.used = True → await db.commit() in reset_password().
    Prevents the same link being used twice (TC-AUTH-17).
    If this fails: check 'token_record.used = True' line in reset_password().
    Next action: grep routers/auth.py for 'token_record.used'
    """
    raw_token, email = valid_reset_token
    await client.post("/api/auth/reset-password", json={
        "token": raw_token,
        "password": "MarkUsedPass1!",
    })

    import hashlib
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    result = await db_session.execute(
        sqlalchemy.select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash
        )
    )
    token_record = result.scalar_one_or_none()
    assert token_record is not None
    assert token_record.used is True


@pytest.mark.asyncio
async def test_reset_password_already_used_token(client, valid_reset_token):
    """
    TC-AUTH-17: Already-used reset token returns 400 'Link already used'.

    Architecture: reset_password() checks token_record.used before processing.
    One-time-use guarantee: even if attacker copies the URL from email, second use fails.
    If this fails: check 'if token_record.used: raise HTTPException(400, "Link already used")'
    Next action: grep routers/auth.py for 'Link already used'
    """
    raw_token, _ = valid_reset_token
    # First use — succeeds
    await client.post("/api/auth/reset-password", json={
        "token": raw_token,
        "password": "FirstUse1!",
    })
    # Second use — must fail
    resp = await client.post("/api/auth/reset-password", json={
        "token": raw_token,
        "password": "SecondUse1!",
    })
    assert resp.status_code == 400
    assert "already used" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_reset_password_expired_token(client, expired_reset_token):
    """
    TC-AUTH-16 / TC-AUTH-19: Expired reset token returns 400 'Link expired'.

    Architecture: reset_password() checks expires_at < now(UTC).
    Timezone handling: SQLite stores naive datetimes — code adds tzinfo=UTC if missing.
    Token TTL: 1 hour (set in email_utils.token_expiry()).
    If this fails:
      1. Check expired_at comparison is timezone-aware (auth.py ~line 145)
      2. Verify the expired_reset_token fixture sets expires_at to 2 hours ago
    Next action: grep routers/auth.py for 'Link expired'
    """
    raw_token, _ = expired_reset_token
    resp = await client.post("/api/auth/reset-password", json={
        "token": raw_token,
        "password": "ExpiredPass1!",
    })
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_reset_password_invalid_token(client):
    """
    TC-AUTH-18c: Completely fake token returns 400 (no DB match for hash).

    Architecture: hash_token(fake) produces a SHA-256 hash → DB lookup finds nothing
    → HTTPException(400, 'Invalid or expired reset link').
    If this fails: the 'if not token_record' guard is missing in reset_password().
    """
    resp = await client.post("/api/auth/reset-password", json={
        "token": "completelyfaketoken12345",
        "password": "FakePass1!",
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_reset_password_weak_new_password(client, valid_reset_token):
    """
    TC-AUTH-20: Weak new password on reset returns 400 (policy enforced).

    Architecture: reset_password() calls validate_password() BEFORE hash lookup.
    This is the correct order — avoids consuming a valid token on a bad request.
    If this fails: validate_password() call may be missing or after token lookup.
    Next action: grep routers/auth.py for 'validate_password' — must appear before 'hash_token'
    """
    raw_token, _ = valid_reset_token
    resp = await client.post("/api/auth/reset-password", json={
        "token": raw_token,
        "password": "weak",  # too short, no uppercase, no digit, no special
    })
    assert resp.status_code == 400
    body = resp.json()
    assert "password" in body["detail"].lower() or "characters" in body["detail"].lower()


@pytest.mark.asyncio
async def test_reset_password_can_login_with_new_password(client, valid_reset_token):
    """
    TC-AUTH-18d: After successful reset, user can log in with new password.

    Architecture: Full end-to-end reset flow validation.
    reset_password() → user.password_hash = hash_password(new) → commit
    Then: login() → verify_password(new, stored_hash) → success
    If this fails: password hash update in reset_password() didn't persist to DB.
    Next action: check 'await db.commit()' is called after setting user.password_hash
    """
    raw_token, email = valid_reset_token
    new_password = "AfterReset1!"

    # Reset password
    r1 = await client.post("/api/auth/reset-password", json={
        "token": raw_token,
        "password": new_password,
    })
    assert r1.status_code == 200

    # Login with new password
    r2 = await client.post("/api/auth/login", json={
        "username": email,
        "password": new_password,
    })
    assert r2.status_code == 200
    assert "access_token" in r2.json()


# ---------------------------------------------------------------------------
# FR-AUTH-06: JWT Refresh
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_refresh_valid_token(client, auth_tokens):
    """
    TC-AUTH-21: Valid refresh token returns 200 with new access token.

    Architecture: refresh_token() → decode_token(type='refresh') → create_access_token()
    JWT frozen interface: sub=str(user_id), algorithm=HS256, library=PyJWT.
    If this fails:
      1. Check decode_token() in auth_utils.py checks token_type == 'refresh'
      2. Verify create_access_token(user_id) uses str(user_id) as sub
    Next action: grep auth_utils.py for 'def decode_token'
    """
    resp = await client.post("/api/auth/refresh", json={
        "refresh_token": auth_tokens["refresh_token"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_refresh_expired_token_returns_401(client, expired_refresh_token_jwt):
    """
    TC-AUTH-22: Expired refresh token returns 401.

    Architecture: refresh_token() → decode_token(type='refresh') → jwt.decode() raises
    ExpiredSignatureError → caught at routers/auth.py:181 → HTTPException(401).
    Token is correctly signed (same secret, correct type) but exp is 1 day in the past.
    If this fails:
      1. Check routers/auth.py:181 catches jwt.ExpiredSignatureError specifically
      2. Ensure PyJWT raises ExpiredSignatureError (not InvalidTokenError) for expired tokens
    Next action: grep routers/auth.py for 'ExpiredSignatureError'
    """
    resp = await client.post("/api/auth/refresh", json={
        "refresh_token": expired_refresh_token_jwt,
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_tampered_token_returns_401(client):
    """
    TC-AUTH-23: Tampered refresh token returns 401.

    Architecture: PyJWT signature verification catches signature mismatch.
    'fakesig' does not match the HMAC-SHA256 of the payload with JWT_SECRET_KEY.
    If this fails: JWT library is not verifying signatures (wrong algorithm or key).
    Next action: grep auth_utils.py for 'jwt.decode' — must include algorithms=[ALGORITHM]
    """
    resp = await client.post("/api/auth/refresh", json={
        "refresh_token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwidG9rZW5fdHlwZSI6InJlZnJlc2gifQ.fakesig",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_access_token_as_refresh_rejected(client, auth_tokens):
    """
    TC-AUTH-23b: Access token cannot be used as refresh token (wrong type).

    Architecture: decode_token() checks payload['token_type'] == expected_type.
    Prevents an access token (24hr) being used in place of a refresh token (7d).
    If this fails: token_type check missing in decode_token() or refresh_token() route.
    Next action: grep auth_utils.py for 'token_type'
    """
    resp = await client.post("/api/auth/refresh", json={
        "refresh_token": auth_tokens["access_token"],  # access token used as refresh
    })
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# CASE-008: Login success resets failed_attempts counter
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_success_resets_failed_attempts(client, registered_user):
    """
    CASE-008: A successful login resets failed_attempts to 0.

    Lockout fires at failed_attempts >= 5 (returns 429).
    Proof the counter was reset: if reset was skipped (counter stayed at 1),
    then 4 more failures would reach 5 and lock the account (429).
    If the counter was properly reset to 0, 4 more failures = counter 4 → still 401.
    """
    email = registered_user["email"]
    password = registered_user["password"]  # "AlicePass1!" from fixture

    # Fail once to increment counter to 1
    await client.post("/api/auth/login", json={"username": email, "password": "wrong"})
    # Succeed — must reset counter to 0
    resp = await client.post("/api/auth/login", json={"username": email, "password": password})
    assert resp.status_code == 200, \
        f"Login with correct password should return 200, got {resp.status_code}"

    # Fail 4 times — if counter was reset to 0, counter reaches 4 (no lockout)
    # If counter was NOT reset (left at 1), counter reaches 5 → 429 lockout on 4th failure
    for i in range(3):
        r = await client.post("/api/auth/login", json={"username": email, "password": "wrong"})
        assert r.status_code == 401, \
            f"CASE-008: Failure {i+1} after reset should be 401 (counter not at 5 yet)"
    fourth = await client.post("/api/auth/login", json={"username": email, "password": "wrong"})
    assert fourth.status_code == 401, \
        "CASE-008: 4th failure after reset = 401 (counter=4). If counter wasn't reset it'd be 429"


# ---------------------------------------------------------------------------
# CASE-169: Token signed with wrong secret is rejected
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_old_token_invalid_after_secret_rotation(client, registered_user):
    """
    CASE-169: Token signed with a different secret must return 401.

    Simulates a JWT_SECRET_KEY rotation — old tokens become invalid.
    """
    import jwt
    import os
    old_secret = "old-secret-key-that-is-long-enough-for-hs256-algorithm"
    old_token = jwt.encode(
        {"sub": "1", "exp": 9999999999, "jti": "rotation-test", "token_type": "access"},
        old_secret,
        algorithm="HS256",
    )
    resp = await client.get("/api/chats", headers={"Authorization": f"Bearer {old_token}"})
    assert resp.status_code == 401, \
        f"Token with wrong secret should be rejected (CASE-169), got {resp.status_code}"
