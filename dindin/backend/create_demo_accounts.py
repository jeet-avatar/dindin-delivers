#!/usr/bin/env python3
"""
Create Demo Accounts for App Store Review

This script creates the demo accounts required for Apple App Store review:
- demo@dollor.ai - Customer App
- demodriver@dollor.ai - Driver App
- demobusiness@dollor.ai - Restaurant App

All accounts use password: Demo2024!

Run this script after the database is set up:
    python create_demo_accounts.py
"""

import sys
import os

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from datetime import datetime

# Import models
from models import Base, User, UserRole, Driver, DriverStatus, Vendor, VendorStatus

# Database URL - use environment variable or default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dindin")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# Demo account credentials
DEMO_PASSWORD = "Demo2024!"
DEMO_PASSWORD_HASH = get_password_hash(DEMO_PASSWORD)

def create_demo_accounts():
    """Create all demo accounts for App Store review"""

    print("=" * 60)
    print("Creating Demo Accounts for App Store Review")
    print("=" * 60)

    # Create database connection
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # =============================================
        # 1. CUSTOMER DEMO ACCOUNT
        # =============================================
        print("\n[1/3] Creating Customer Demo Account...")

        customer_email = "demo@dollor.ai"
        existing_customer = db.query(User).filter(User.email == customer_email).first()

        if existing_customer:
            print(f"  - Customer account already exists: {customer_email}")
            # Update password to ensure it matches
            existing_customer.password_hash = DEMO_PASSWORD_HASH
            db.commit()
            print(f"  - Password updated to: {DEMO_PASSWORD}")
        else:
            customer_user = User(
                email=customer_email,
                password_hash=DEMO_PASSWORD_HASH,
                full_name="Demo Customer",
                role=UserRole.USER,
                phone="5551234567"
            )
            db.add(customer_user)
            db.commit()
            print(f"  - Created: {customer_email}")
            print(f"  - Password: {DEMO_PASSWORD}")

        # =============================================
        # 2. DRIVER DEMO ACCOUNT
        # =============================================
        print("\n[2/3] Creating Driver Demo Account...")

        driver_email = "demodriver@dollor.ai"
        existing_driver_user = db.query(User).filter(User.email == driver_email).first()

        if existing_driver_user:
            print(f"  - Driver user account already exists: {driver_email}")
            existing_driver_user.password_hash = DEMO_PASSWORD_HASH
            db.commit()
            print(f"  - Password updated to: {DEMO_PASSWORD}")
        else:
            # Create driver record first
            existing_driver = db.query(Driver).filter(Driver.email == driver_email).first()

            if existing_driver:
                driver = existing_driver
                print(f"  - Driver record already exists, using existing")
            else:
                driver_count = db.query(Driver).count()
                driver = Driver(
                    driver_id=f"DRV-DEMO-{driver_count + 1:05d}",
                    first_name="Demo",
                    last_name="Driver",
                    email=driver_email,
                    phone="5559876543",
                    status=DriverStatus.APPROVED,  # Pre-approved for demo
                    vehicle_type="Car",
                    vehicle_make="Toyota",
                    vehicle_model="Camry",
                    vehicle_year="2022",
                    vehicle_color="Silver",
                    license_plate="DEMO123"
                )
                db.add(driver)
                db.commit()
                db.refresh(driver)
                print(f"  - Created driver record: {driver.driver_id}")

            # Create user linked to driver
            driver_user = User(
                email=driver_email,
                password_hash=DEMO_PASSWORD_HASH,
                full_name="Demo Driver",
                role=UserRole.DRIVER,
                driver_id=driver.id
            )
            db.add(driver_user)
            db.commit()
            print(f"  - Created: {driver_email}")
            print(f"  - Password: {DEMO_PASSWORD}")
            print(f"  - Status: APPROVED (ready for delivery)")

        # =============================================
        # 3. RESTAURANT/VENDOR DEMO ACCOUNT
        # =============================================
        print("\n[3/3] Creating Restaurant Demo Account...")

        vendor_email = "demobusiness@dollor.ai"
        existing_vendor_user = db.query(User).filter(User.email == vendor_email).first()

        if existing_vendor_user:
            print(f"  - Vendor user account already exists: {vendor_email}")
            existing_vendor_user.password_hash = DEMO_PASSWORD_HASH
            db.commit()
            print(f"  - Password updated to: {DEMO_PASSWORD}")
        else:
            # Create vendor record first
            existing_vendor = db.query(Vendor).filter(Vendor.contact_email == vendor_email).first()

            if existing_vendor:
                vendor = existing_vendor
                print(f"  - Vendor record already exists, using existing")
            else:
                vendor_count = db.query(Vendor).count()
                vendor = Vendor(
                    vendor_id=f"VEN-DEMO-{vendor_count + 1:04d}",
                    name="Demo Restaurant",
                    contact_name="Demo Owner",
                    contact_email=vendor_email,
                    onboarding_status=VendorStatus.APPROVED,  # Pre-approved for demo
                    street="123 Demo Street",
                    city="San Francisco",
                    state="CA",
                    zip_code="94102",
                    country="US",
                    phone="5555551234",
                    cuisine_type="American",
                    description="Demo restaurant for App Store review. Serving delicious American cuisine.",
                    is_active=True
                )
                db.add(vendor)
                db.commit()
                db.refresh(vendor)
                print(f"  - Created vendor record: {vendor.vendor_id}")

            # Create user linked to vendor
            vendor_user = User(
                email=vendor_email,
                password_hash=DEMO_PASSWORD_HASH,
                full_name="Demo Restaurant Owner",
                role=UserRole.VENDOR,
                vendor_id=vendor.id
            )
            db.add(vendor_user)
            db.commit()
            print(f"  - Created: {vendor_email}")
            print(f"  - Password: {DEMO_PASSWORD}")
            print(f"  - Status: APPROVED (ready to receive orders)")

        # =============================================
        # SUMMARY
        # =============================================
        print("\n" + "=" * 60)
        print("DEMO ACCOUNTS CREATED SUCCESSFULLY")
        print("=" * 60)
        print("\nFor App Store Review, use these credentials:\n")
        print("CUSTOMER APP (Dollor - Food Delivery):")
        print(f"  Email: demo@dollor.ai")
        print(f"  Password: {DEMO_PASSWORD}")
        print()
        print("DRIVER APP (Dollor Driver):")
        print(f"  Email: demodriver@dollor.ai")
        print(f"  Password: {DEMO_PASSWORD}")
        print()
        print("RESTAURANT APP (Dollor Business):")
        print(f"  Email: demobusiness@dollor.ai")
        print(f"  Password: {DEMO_PASSWORD}")
        print()
        print("=" * 60)

        return True

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        db.rollback()
        return False

    finally:
        db.close()


def verify_accounts():
    """Verify that demo accounts exist and can authenticate"""

    print("\n" + "=" * 60)
    print("Verifying Demo Accounts")
    print("=" * 60)

    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        accounts = [
            ("demo@dollor.ai", "Customer"),
            ("demodriver@dollor.ai", "Driver"),
            ("demobusiness@dollor.ai", "Restaurant")
        ]

        all_valid = True

        for email, account_type in accounts:
            user = db.query(User).filter(User.email == email).first()
            if user:
                # Verify password works
                if pwd_context.verify(DEMO_PASSWORD, user.password_hash):
                    print(f"  [OK] {account_type}: {email}")
                else:
                    print(f"  [FAIL] {account_type}: {email} - Password mismatch")
                    all_valid = False
            else:
                print(f"  [MISSING] {account_type}: {email}")
                all_valid = False

        if all_valid:
            print("\nAll demo accounts are ready for App Store review!")
        else:
            print("\nSome accounts need attention. Run this script again to fix.")

        return all_valid

    finally:
        db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Create demo accounts for App Store review")
    parser.add_argument("--verify", action="store_true", help="Only verify existing accounts")
    parser.add_argument("--db-url", type=str, help="Database URL override")

    args = parser.parse_args()

    if args.db_url:
        DATABASE_URL = args.db_url

    if args.verify:
        verify_accounts()
    else:
        if create_demo_accounts():
            verify_accounts()
