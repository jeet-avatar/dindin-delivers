"""
Pytest configuration and shared fixtures for all tests.

Provides:
- Test database setup (with PostgreSQL schema recreation for clean state)
- FastAPI TestClient
- Authentication fixtures
- Mock data factories
"""

import pytest
import os
import sys
import tempfile
from datetime import datetime
from typing import Generator, Dict, Any
from unittest.mock import MagicMock, patch

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool, NullPool

# Import app and models
from main_new import app, get_db, create_access_token, get_password_hash
from database import Base
from models import User, Vendor, Driver, Customer


# Get database URL from environment or use a temp SQLite file
# Using temp file instead of :memory: to avoid index conflict issues
_temp_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_temp_db_path = _temp_db_file.name
_temp_db_file.close()

# Check if we're in CI with PostgreSQL available
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and "postgresql" in DATABASE_URL:
    # Use PostgreSQL in CI
    engine = create_engine(DATABASE_URL, poolclass=NullPool)
else:
    # Use SQLite temp file for local testing
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{_temp_db_path}"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session")
def test_db():
    """Create test database tables"""
    DATABASE_URL = os.getenv("DATABASE_URL", "")

    # For PostgreSQL, drop and recreate entire schema to ensure clean state
    if "postgresql" in DATABASE_URL:
        with engine.connect() as conn:
            try:
                # Drop all objects by recreating the schema
                conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
                conn.execute(text("CREATE SCHEMA public"))
                conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
                conn.commit()
            except Exception as e:
                print(f"Warning: Error recreating schema: {e}")
                conn.rollback()
                # Fallback: try dropping tables one by one
                try:
                    result = conn.execute(text(
                        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
                    ))
                    tables = [row[0] for row in result]
                    for table in tables:
                        conn.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
                    conn.commit()
                except Exception as e2:
                    print(f"Warning: Fallback drop also failed: {e2}")
                    conn.rollback()
    else:
        # For SQLite, regular drop_all works
        try:
            Base.metadata.drop_all(bind=engine)
        except Exception:
            pass

    # Create all tables with checkfirst to avoid conflicts
    Base.metadata.create_all(bind=engine, checkfirst=True)
    yield

    # Cleanup
    try:
        Base.metadata.drop_all(bind=engine)
    except Exception:
        pass  # Ignore errors on cleanup


@pytest.fixture(scope="function")
def db_session(test_db) -> Generator:
    """Get a test database session"""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session) -> Generator:
    """Get a TestClient with test database"""
    def override_get_db_fixture():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db_fixture
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_user(db_session) -> User:
    """Create a test user"""
    user = User(
        email=f"testuser_{datetime.now().timestamp()}@test.com",
        hashed_password=get_password_hash("TestPassword123!"),
        full_name="Test User",
        role="user",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_admin(db_session) -> User:
    """Create a test admin user"""
    admin = User(
        email=f"admin_{datetime.now().timestamp()}@test.com",
        hashed_password=get_password_hash("AdminPassword123!"),
        full_name="Test Admin",
        role="admin",
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture(scope="function")
def test_vendor(db_session) -> Vendor:
    """Create a test vendor"""
    vendor = Vendor(
        business_name=f"Test Restaurant {datetime.now().timestamp()}",
        contact_email=f"vendor_{datetime.now().timestamp()}@test.com",
        contact_phone="+14155551234",
        password_hash=get_password_hash("VendorPassword123!"),
        address="123 Test St",
        city="San Francisco",
        state="CA",
        zip_code="94102",
        status="approved",
        is_approved=True,
    )
    db_session.add(vendor)
    db_session.commit()
    db_session.refresh(vendor)
    return vendor


@pytest.fixture(scope="function")
def test_driver(db_session) -> Driver:
    """Create a test driver"""
    driver = Driver(
        email=f"driver_{datetime.now().timestamp()}@test.com",
        password_hash=get_password_hash("DriverPassword123!"),
        name="Test Driver",
        phone="+14155551234",
        status="approved",
        is_active=True,
    )
    db_session.add(driver)
    db_session.commit()
    db_session.refresh(driver)
    return driver


@pytest.fixture(scope="function")
def auth_headers(test_user) -> Dict[str, str]:
    """Get authentication headers for test user"""
    token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def admin_auth_headers(test_admin) -> Dict[str, str]:
    """Get authentication headers for admin user"""
    token = create_access_token(data={"sub": test_admin.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def vendor_auth_headers(test_vendor) -> Dict[str, str]:
    """Get authentication headers for vendor"""
    token = create_access_token(data={"sub": test_vendor.contact_email, "vendor_id": test_vendor.id})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def driver_auth_headers(test_driver) -> Dict[str, str]:
    """Get authentication headers for driver"""
    token = create_access_token(data={"sub": test_driver.email, "driver_id": test_driver.id})
    return {"Authorization": f"Bearer {token}"}


# Mock data factories
class UserFactory:
    """Factory for creating test users"""
    counter = 0

    @classmethod
    def create(cls, db_session, **kwargs) -> User:
        cls.counter += 1
        defaults = {
            "email": f"user_{cls.counter}_{datetime.now().timestamp()}@test.com",
            "hashed_password": get_password_hash("Password123!"),
            "full_name": f"Test User {cls.counter}",
            "role": "user",
            "is_active": True,
        }
        defaults.update(kwargs)
        user = User(**defaults)
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user


class VendorFactory:
    """Factory for creating test vendors"""
    counter = 0

    @classmethod
    def create(cls, db_session, **kwargs) -> Vendor:
        cls.counter += 1
        defaults = {
            "business_name": f"Test Restaurant {cls.counter}",
            "contact_email": f"vendor_{cls.counter}_{datetime.now().timestamp()}@test.com",
            "contact_phone": f"+1415555{1000 + cls.counter}",
            "password_hash": get_password_hash("VendorPass123!"),
            "address": f"{100 + cls.counter} Test St",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94102",
            "status": "pending",
        }
        defaults.update(kwargs)
        vendor = Vendor(**defaults)
        db_session.add(vendor)
        db_session.commit()
        db_session.refresh(vendor)
        return vendor


class DriverFactory:
    """Factory for creating test drivers"""
    counter = 0

    @classmethod
    def create(cls, db_session, **kwargs) -> Driver:
        cls.counter += 1
        defaults = {
            "email": f"driver_{cls.counter}_{datetime.now().timestamp()}@test.com",
            "password_hash": get_password_hash("DriverPass123!"),
            "name": f"Test Driver {cls.counter}",
            "phone": f"+1415555{2000 + cls.counter}",
            "status": "pending",
        }
        defaults.update(kwargs)
        driver = Driver(**defaults)
        db_session.add(driver)
        db_session.commit()
        db_session.refresh(driver)
        return driver


@pytest.fixture
def user_factory():
    """Get user factory"""
    return UserFactory


@pytest.fixture
def vendor_factory():
    """Get vendor factory"""
    return VendorFactory


@pytest.fixture
def driver_factory():
    """Get driver factory"""
    return DriverFactory


# Test data helpers
@pytest.fixture
def sample_user_data() -> Dict[str, Any]:
    """Sample user registration data"""
    return {
        "email": f"sample_{datetime.now().timestamp()}@test.com",
        "password": "SamplePassword123!",
        "full_name": "Sample User",
        "role": "user",
    }


@pytest.fixture
def sample_vendor_data() -> Dict[str, Any]:
    """Sample vendor registration data"""
    return {
        "restaurant_name": "Sample Restaurant",
        "cuisine_type": "Italian",
        "contact_name": "John Owner",
        "contact_email": f"restaurant_{datetime.now().timestamp()}@test.com",
        "contact_phone": "+14155559999",
        "password": "RestaurantPass123!",
        "street_address": "456 Main St",
        "city": "San Francisco",
        "state": "CA",
        "zip_code": "94102",
        "description": "A great Italian restaurant",
    }


@pytest.fixture
def sample_driver_data() -> Dict[str, Any]:
    """Sample driver registration data"""
    return {
        "email": f"newdriver_{datetime.now().timestamp()}@test.com",
        "password": "DriverPass123!",
        "name": "New Driver",
        "phone": "+14155558888",
    }
