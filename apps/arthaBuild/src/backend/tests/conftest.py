"""
ArthaBuild Test Configuration
==============================
Provides:
  - Isolated in-memory SQLite DB per test session (never touches arthaBuild.db)
  - Async HTTPX test client with FastAPI app
  - Fixtures: registered user, auth tokens, reset token

Architecture layer: Cross-cutting (test infrastructure)
"""
import os
import sys
import hashlib
import secrets
import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

# Ensure JWT_SECRET_KEY is set before any app import
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest-32chars!!")
os.environ.setdefault("FRONTEND_BASE_URL", "http://localhost:5173")
# Point to in-memory DB so tests never touch the dev DB
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

# Add backend dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import Base, get_db
from models import User, PasswordResetToken, Team, ChatSession, ChatMessage, TeamInvite, EmailVerificationToken, AnalyticsEvent, BlogReaction, BlogComment  # noqa: F401 — imported to register with Base.metadata so test DB creates all tables
from auth_utils import hash_password
from sqlalchemy import event


# ---------------------------------------------------------------------------
# Test-mode: auto-verify all new users (tests that need unverified users
# explicitly set user.is_verified = False after creation)
# ---------------------------------------------------------------------------
@event.listens_for(User, "init")
def _auto_verify_in_tests(target, args, kwargs):
    """Auto-set is_verified=True for all User objects created in the test suite.
    Tests that specifically test unverified behavior must manually set
    user.is_verified = False after creation/registration."""
    target.is_verified = True


# ---------------------------------------------------------------------------
# In-memory DB engine (shared across test session, StaticPool = single connection)
# ---------------------------------------------------------------------------
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(
    test_engine, expire_on_commit=False, class_=AsyncSession
)


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    """Create all tables once per test session in the in-memory DB."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture()
async def client():
    """
    HTTPX async client with FastAPI app.
    DB dependency overridden to use in-memory test DB.
    Rate limiter storage reset before each test so rate limits don't bleed across tests.
    Architecture: entry point for all HTTP-level tests.
    """
    from rawapi import app
    app.dependency_overrides[get_db] = override_get_db

    # Reset rate limiter storage before each test — prevents cross-test rate limit bleed.
    # SlowAPI uses an in-memory dict by default; clearing it gives each test a clean slate.
    try:
        storage = app.state.limiter._storage
        if hasattr(storage, "_storage"):
            storage._storage.clear()
        elif hasattr(storage, "storage"):
            storage.storage.clear()
    except Exception:
        pass  # limiter reset is best-effort; test isolation via unique IPs handles the rest

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"X-Real-IP": f"10.0.0.{id(object()) % 254 + 1}"},  # unique IP per test
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def db_session():
    """Direct DB session for test setup (inserting tokens, checking state)."""
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture()
async def registered_user(client):
    """
    Pre-registered user fixture.
    Returns dict with email, password, first_name, last_name.
    Used by: test_auth.py login, check-user, forgot-password tests.
    """
    user = {
        "first_name": "Alice",
        "last_name": "Test",
        "email": "alice@arthaBuild-test.com",
        "password": "AlicePass1!",
        "organization": "TestCorp",
    }
    resp = await client.post("/api/user/register", json=user)
    # 201 first time, 409 if fixture re-used — both are fine
    assert resp.status_code in (201, 409)
    return user


@pytest_asyncio.fixture()
async def auth_tokens(client, registered_user):
    """
    Valid access + refresh tokens for the registered_user.
    Sets is_verified=True so existing tests are not blocked by email verification enforcement.
    Architecture: represents an authenticated session.
    """
    # Set Alice's is_verified=True so Phase 11 verification enforcement doesn't block existing tests
    async with TestSessionLocal() as session:
        from sqlalchemy import select as sa_select
        result = await session.execute(
            sa_select(User).where(User.email == registered_user["email"].lower())
        )
        user = result.scalar_one_or_none()
        if user:
            user.is_verified = True
            await session.commit()

    resp = await client.post("/api/auth/login", json={
        "username": registered_user["email"],
        "password": registered_user["password"],
    })
    assert resp.status_code == 200
    return resp.json()


@pytest_asyncio.fixture()
async def valid_reset_token(client, db_session):
    """
    Inserts a fresh valid PasswordResetToken into the test DB.
    Returns (raw_token, user_email).
    Uses a dedicated user so password-reset tests don't mutate Alice's state.
    Architecture: simulates the forgot-password email flow without SMTP.
    """
    reset_email = "reset-valid@arthaBuild-test.com"
    await client.post("/api/user/register", json={
        "first_name": "Reset",
        "last_name": "Valid",
        "email": reset_email,
        "password": "ResetValid1!",
        "organization": "ResetCorp",
    })
    db_session.expire_all()
    result = await db_session.execute(
        __import__("sqlalchemy").select(User).where(
            User.email == reset_email.lower()
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        pytest.skip("reset-valid user not found in DB")

    raw = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    token = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
    )
    db_session.add(token)
    await db_session.commit()
    return raw, reset_email


@pytest_asyncio.fixture()
async def expired_reset_token(client, db_session):
    """
    Inserts an already-expired token. Used for TC-AUTH-16, TC-AUTH-19.
    Uses a dedicated user so reset tests don't mutate Alice's state.
    """
    reset_email = "reset-expired@arthaBuild-test.com"
    await client.post("/api/user/register", json={
        "first_name": "Reset",
        "last_name": "Expired",
        "email": reset_email,
        "password": "ResetExpired1!",
        "organization": "ResetCorp",
    })
    db_session.expire_all()
    result = await db_session.execute(
        __import__("sqlalchemy").select(User).where(
            User.email == reset_email.lower()
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        pytest.skip("reset-expired user not found in DB")

    raw = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    token = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=2),  # already expired
    )
    db_session.add(token)
    await db_session.commit()
    return raw, reset_email


@pytest.fixture()
def expired_refresh_token_jwt():
    """
    TC-AUTH-22: A syntactically valid, correctly signed refresh token whose exp is in the past.
    Uses the same JWT_SECRET_KEY set in os.environ at top of conftest so the backend
    validates the signature but rejects it as expired.
    Architecture: decode_token() → jwt.decode() raises ExpiredSignatureError → 401.
    """
    import jwt as pyjwt
    payload = {
        "sub": "1",
        "token_type": "refresh",
        "exp": datetime.now(timezone.utc) - timedelta(days=1),
    }
    secret = os.environ["JWT_SECRET_KEY"]
    return pyjwt.encode(payload, secret, algorithm="HS256")
