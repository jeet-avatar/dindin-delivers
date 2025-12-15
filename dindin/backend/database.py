from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from models import Base
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL - REQUIRED in production
DATABASE_URL = os.getenv("DATABASE_URL")

# Validate in production
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"
if IS_PRODUCTION and not DATABASE_URL:
    raise RuntimeError("CRITICAL: DATABASE_URL must be set in environment for production")

# Development fallback only
if not DATABASE_URL:
    print("[DEV WARNING] Using local development database - set DATABASE_URL for production")
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/invoice_db"

# Production-grade connection pooling for millions of users
# Pool settings tuned for high concurrency
POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "20" if IS_PRODUCTION else "5"))
MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "40" if IS_PRODUCTION else "10"))
POOL_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", "30"))
POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "1800"))  # 30 minutes

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=POOL_SIZE,
    max_overflow=MAX_OVERFLOW,
    pool_timeout=POOL_TIMEOUT,
    pool_recycle=POOL_RECYCLE,
    pool_pre_ping=True,  # Verify connections are alive before use
    echo=not IS_PRODUCTION  # Only log SQL in development
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import extended models to ensure they're registered
    from models_extended import (
        Promotion, PromotionRedemption, RestaurantInvitation,
        OnboardingLog, ScrapedMenuItem, RealTimeEvent,
        Communication, VendorAnalytics
    )
    # Customer and CustomerFavorite are in models.py
    from models import Customer, CustomerFavorite
    Base.metadata.create_all(bind=engine)
