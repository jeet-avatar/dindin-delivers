# apps/hospital-pricing/backend/tests/conftest.py
import os
# Set required env vars BEFORE any imports that touch config
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-at-least-32-chars-long")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-placeholder")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("DATABASE_URL_SYNC", "sqlite:///:memory:")

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import create_app


# ---------- in-memory SQLite test engine ----------
@pytest.fixture(scope="session")
def event_loop_policy():
    import asyncio
    return asyncio.DefaultEventLoopPolicy()


@pytest_asyncio.fixture(scope="function")
async def test_db():
    """Per-test in-memory SQLite database with all tables created."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(test_db: AsyncSession):
    """HTTP test client with DB dependency overridden."""
    app = create_app()

    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.fixture
def auth_headers(client) -> dict:
    """Sync helper — use in async tests with: await async_auth_headers(client)"""
    return {}  # Tests that need auth will create tokens directly via auth.jwt


@pytest.fixture
def procurement_officer_token() -> str:
    """Create a test JWT for procurement_officer role."""
    from auth.jwt import create_access_token
    import uuid
    return create_access_token({
        "sub": str(uuid.uuid4()),
        "entity_id": str(uuid.uuid4()),
        "role": "procurement_officer",
    })


@pytest.fixture
def platform_admin_token() -> str:
    """Create a test JWT for platform_admin role."""
    from auth.jwt import create_access_token
    import uuid
    return create_access_token({
        "sub": str(uuid.uuid4()),
        "entity_id": str(uuid.uuid4()),
        "role": "platform_admin",
    })
