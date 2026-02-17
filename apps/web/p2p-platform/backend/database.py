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
engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=7,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_timeout=10,
    connect_args={"options": "-c statement_timeout=30000"}
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
