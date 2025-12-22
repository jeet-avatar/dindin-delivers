from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base
import os
from dotenv import load_dotenv

load_dotenv()

# STAGING ENVIRONMENT - Default to staging RDS
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://dollor_admin:f4QA0dDzfpDXYpSRWsJMbXSD7WwfESKa@dollor-staging.c23qcukqe810.us-east-1.rds.amazonaws.com:5432/dollor_staging")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import extended models to ensure they're registered
    # Note: Customer is already imported from models.py - don't reimport to avoid mapper conflict
    from models_extended import (
        Promotion, PromotionRedemption, RestaurantInvitation,
        OnboardingLog, ScrapedMenuItem, RealTimeEvent,
        Communication, CustomerFavorite, VendorAnalytics
    )
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
