#!/usr/bin/env python3
"""
One-time script to populate delivery_available, pickup_available, and operating_hours
for restaurants with zip code 92688 (real scraped restaurants).
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import get_db, engine
from models import Vendor
from sqlalchemy.orm import Session

def update_restaurant_service_info():
    """Update restaurants with zip 92688 to have delivery/pickup/hours data"""

    db = Session(bind=engine)

    try:
        # Get all vendors with zip code 92688 (real scraped restaurants)
        vendors = db.query(Vendor).filter(Vendor.zip_code == "92688").all()

        print(f"Found {len(vendors)} restaurants with zip code 92688")

        for vendor in vendors:
            print(f"\nUpdating: {vendor.restaurant_name or vendor.company_name} (ID: {vendor.id})")

            # Set delivery and pickup availability
            if vendor.delivery_available is None:
                vendor.delivery_available = True
                print(f"  - Set delivery_available = True")

            if vendor.pickup_available is None:
                vendor.pickup_available = True
                print(f"  - Set pickup_available = True")

            # Set operating hours if not set
            if vendor.operating_hours is None:
                # Default hours - can be updated individually later
                vendor.operating_hours = "Mon-Thu: 11:00 AM - 9:00 PM, Fri-Sat: 11:00 AM - 10:00 PM, Sun: 12:00 PM - 8:00 PM"
                print(f"  - Set operating_hours")

        db.commit()
        print(f"\n✅ Successfully updated {len(vendors)} restaurants!")

        # Verify updates
        print("\n--- Verification ---")
        for vendor in vendors[:3]:  # Show first 3
            print(f"\n{vendor.restaurant_name}:")
            print(f"  delivery_available: {vendor.delivery_available}")
            print(f"  pickup_available: {vendor.pickup_available}")
            print(f"  operating_hours: {vendor.operating_hours}")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    update_restaurant_service_info()
