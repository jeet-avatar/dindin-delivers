# apps/hospital-pricing/backend/database.py
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from config import settings


class Base(DeclarativeBase):
    pass


def _make_engine():
    return create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)


def _make_session_factory(eng):
    return async_sessionmaker(eng, expire_on_commit=False)


# Lazy singletons — only initialised when first accessed, so test modules that
# only import Base or models can load without asyncpg being installed.
_engine = None
_session_factory = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = _make_engine()
    return _engine


def get_session_factory():
    global _session_factory
    if _session_factory is None:
        _session_factory = _make_session_factory(get_engine())
    return _session_factory


# Keep module-level aliases so existing code that does `from database import engine` works
# after first call to get_engine(); router code always uses get_db() which is fine.
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with get_session_factory()() as session:
        yield session
