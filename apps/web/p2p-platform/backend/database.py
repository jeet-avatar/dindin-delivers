from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/invoice_db")

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
    from models_extended import (
        Promotion, PromotionRedemption, RestaurantInvitation,
        OnboardingLog, ScrapedMenuItem, RealTimeEvent,
        Communication, Customer, CustomerFavorite, VendorAnalytics
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
