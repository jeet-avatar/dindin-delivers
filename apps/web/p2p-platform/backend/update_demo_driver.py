#!/usr/bin/env python3
"""
Update demo driver: Set vehicle to Toyota Camry and mark as verified.
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Ensure JWT_SECRET_KEY is set for imports
if not os.getenv("JWT_SECRET_KEY"):
    os.environ["JWT_SECRET_KEY"] = "temp_key_for_script"

from database import SessionLocal
from models import Driver, DriverStatus
from datetime import datetime

DEMO_DRIVER_EMAIL = "demo.driver@dollor.ai"

def update_demo_driver():
    """Update demo driver vehicle info and verification status."""
    print("\n" + "="*60)
    print("UPDATING DEMO DRIVER")
    print("="*60)

    db = SessionLocal()

    try:
        # Find demo driver
        driver = db.query(Driver).filter(Driver.email == DEMO_DRIVER_EMAIL).first()

        if not driver:
            print(f"ERROR: Demo driver not found: {DEMO_DRIVER_EMAIL}")
            return False

        print(f"\nFound driver: {driver.first_name} {driver.last_name}")
        print(f"  ID: {driver.id}")
        print(f"  Email: {driver.email}")

        # Current state
        print(f"\n--- CURRENT STATE ---")
        print(f"  Vehicle Make:  {driver.vehicle_make or 'NOT SET'}")
        print(f"  Vehicle Model: {driver.vehicle_model or 'NOT SET'}")
        print(f"  Vehicle Year:  {driver.vehicle_year or 'NOT SET'}")
        print(f"  Vehicle Color: {driver.vehicle_color or 'NOT SET'}")
        print(f"  Vehicle Type:  {driver.vehicle_type or 'NOT SET'}")
        print(f"  License Plate: {driver.license_plate or 'NOT SET'}")
        print(f"  Status:        {driver.status}")
        print(f"  Documents Verified: {driver.documents_verified}")
        print(f"  Verification Status: {driver.verification_status}")

        # Update vehicle info
        driver.vehicle_type = "car"
        driver.vehicle_make = "Toyota"
        driver.vehicle_model = "Camry"
        driver.vehicle_year = 2024
        driver.vehicle_color = "Silver"
        driver.license_plate = "WY-DRV-2024"

        # Mark as verified/approved
        driver.status = DriverStatus.APPROVED
        driver.documents_verified = True
        driver.verification_status = "verified"
        driver.documents_verified_at = datetime.utcnow()
        driver.approved_at = datetime.utcnow()

        # Also mark documents as uploaded
        driver.drivers_license = True
        driver.insurance = True
        driver.background_check = True

        db.commit()
        db.refresh(driver)

        # Verify update
        print(f"\n--- UPDATED STATE ---")
        print(f"  Vehicle Make:  {driver.vehicle_make}")
        print(f"  Vehicle Model: {driver.vehicle_model}")
        print(f"  Vehicle Year:  {driver.vehicle_year}")
        print(f"  Vehicle Color: {driver.vehicle_color}")
        print(f"  Vehicle Type:  {driver.vehicle_type}")
        print(f"  License Plate: {driver.license_plate}")
        print(f"  Status:        {driver.status}")
        print(f"  Documents Verified: {driver.documents_verified}")
        print(f"  Verification Status: {driver.verification_status}")

        print(f"\n" + "="*60)
        print("DEMO DRIVER UPDATED SUCCESSFULLY!")
        print("="*60 + "\n")

        return True

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = update_demo_driver()
    sys.exit(0 if success else 1)
