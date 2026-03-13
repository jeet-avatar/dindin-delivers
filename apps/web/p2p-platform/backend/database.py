from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL from environment (required)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Pool sizing: db.t3.micro max_connections ≈ 112
# 4 workers × 2 ECS tasks = 8 processes → 12 per process = 96 total (under 112)
# Enforce TLS for RDS connections in production
_is_sqlite = DATABASE_URL.startswith("sqlite")
_is_prod = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod")

if _is_sqlite:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    _connect_args = {"options": "-c statement_timeout=30000"}
    if _is_prod and "sslmode" not in DATABASE_URL:
        _connect_args["sslmode"] = "require"
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=7,
        pool_pre_ping=True,
        pool_recycle=1800,
        pool_timeout=10,
        connect_args=_connect_args
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_pool_stats() -> dict:
    """Return connection pool utilization stats. Logs a WARNING when >= 90% utilized."""
    if _is_sqlite:
        return {"pool_type": "StaticPool (sqlite)", "checked_out": 0, "overflow": 0, "total": 0, "utilization_pct": 0, "status": "ok"}
    try:
        pool = engine.pool
        checked_out = pool.checkedout()
        overflow = pool.overflow()
        pool_size = pool.size()
        total_capacity = pool_size + engine.pool._max_overflow
        utilization_pct = round((checked_out / total_capacity) * 100, 1) if total_capacity > 0 else 0

        if utilization_pct >= 90:
            import logging
            logging.getLogger(__name__).warning(
                f"DB pool HIGH UTILIZATION: {checked_out}/{total_capacity} connections ({utilization_pct}%)"
            )

        return {
            "pool_size": pool_size,
            "checked_out": checked_out,
            "overflow": overflow,
            "total_capacity": total_capacity,
            "utilization_pct": utilization_pct,
            "status": "warning" if utilization_pct >= 90 else "ok",
        }
    except Exception as e:
        return {"error": str(e), "status": "unknown"}

def init_db():
    # Import extended models to ensure they're registered
    # Note: Customer is already imported from models.py - don't reimport to avoid mapper conflict
    from models_extended import (
        Promotion, PromotionRedemption, RestaurantInvitation,
        OnboardingLog, ScrapedMenuItem, RealTimeEvent,
        Communication, CustomerFavorite, VendorAnalytics,
        EmailTemplate, EmailSchedule, EmailABTest
    )
    # Import RateLimitEntry for distributed rate limiting
    # Import PasswordResetToken for bulletproof password reset
    from models import RateLimitEntry, PasswordResetToken
    # Import ProjectCase for project tracker table
    from project_tracker import ProjectCase
    from sqlalchemy.exc import ProgrammingError

    # Try to create all tables/indices, ignore if they already exist
    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
    except ProgrammingError as e:
        # Ignore "already exists" errors (common in CI with persistent DB)
        if "already exists" in str(e):
            pass
        else:
            raise
