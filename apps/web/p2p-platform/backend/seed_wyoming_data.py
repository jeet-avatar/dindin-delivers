#!/usr/bin/env python3
"""
Wyoming Test Data Seeder
========================

Seeds the staging database with Wyoming-specific test data for TNC operations.

WYOMING ZIP CODES:
- Cheyenne: 82001-82010 (Capital, largest city)
- Casper: 82601-82644 (Second largest)
- Laramie: 82070-82073 (University town)
- Jackson: 83001-83014 (Tourist destination)
- Gillette: 82716-82718 (Energy sector)
- Rock Springs: 82901-82902 (Southwest)
- Sheridan: 82801 (North)
- Cody: 82414 (Yellowstone gateway)

This ensures proper state detection for Wyoming TNC compliance.
"""

import os
import sys

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Driver, Customer, DriverStatus
import random

# Wyoming ZIP codes by city
WYOMING_LOCATIONS = {
    "Cheyenne": {
        "zip_codes": ["82001", "82002", "82003", "82007", "82009"],
        "lat": 41.1400,
        "lng": -104.8202,
        "population": 65132,
        "description": "State capital, largest city"
    },
    "Casper": {
        "zip_codes": ["82601", "82602", "82604", "82609"],
        "lat": 42.8666,
        "lng": -106.3131,
        "population": 58720,
        "description": "Second largest city, central Wyoming"
    },
    "Laramie": {
        "zip_codes": ["82070", "82071", "82072", "82073"],
        "lat": 41.3114,
        "lng": -105.5911,
        "population": 32711,
        "description": "University of Wyoming"
    },
    "Jackson": {
        "zip_codes": ["83001", "83002", "83014"],
        "lat": 43.4799,
        "lng": -110.7624,
        "population": 10585,
        "description": "Jackson Hole, tourism hub"
    },
    "Gillette": {
        "zip_codes": ["82716", "82717", "82718"],
        "lat": 44.2911,
        "lng": -105.5022,
        "population": 33403,
        "description": "Energy capital of the nation"
    },
    "Rock_Springs": {
        "zip_codes": ["82901", "82902"],
        "lat": 41.5875,
        "lng": -109.2029,
        "population": 23036,
        "description": "Southwest Wyoming"
    },
    "Sheridan": {
        "zip_codes": ["82801"],
        "lat": 44.7972,
        "lng": -106.9561,
        "population": 18239,
        "description": "Northern Wyoming"
    },
    "Cody": {
        "zip_codes": ["82414"],
        "lat": 44.5263,
        "lng": -109.0565,
        "population": 10014,
        "description": "Yellowstone gateway"
    }
}

# Wyoming-specific driver names
WYOMING_DRIVER_NAMES = [
    ("Jake", "Thornton"),
    ("Sarah", "Bridger"),
    ("Mike", "Yellowstone"),
    ("Emily", "Teton"),
    ("Ryan", "Shoshone"),
    ("Jessica", "Laramie"),
    ("Chris", "Casper"),
    ("Amanda", "Cheyenne"),
    ("Tyler", "Jackson"),
    ("Nicole", "Cody"),
]

# Wyoming-specific customer names
WYOMING_CUSTOMER_NAMES = [
    ("Tom", "Westbrook"),
    ("Lisa", "Prairie"),
    ("Dave", "Mountain"),
    ("Kelly", "Rivers"),
    ("Josh", "Frontier"),
    ("Rachel", "Rancher"),
    ("Matt", "Cowboy"),
    ("Amy", "Valley"),
    ("Steve", "Highland"),
    ("Laura", "Meadow"),
]

# Wyoming vehicle types (more trucks/SUVs for the terrain)
WYOMING_VEHICLES = [
    ("Ford", "F-150", 2022, "White", "WY-F150-"),
    ("Chevrolet", "Silverado", 2023, "Black", "WY-SLV-"),
    ("Toyota", "4Runner", 2022, "Silver", "WY-4RN-"),
    ("Jeep", "Wrangler", 2023, "Green", "WY-JEP-"),
    ("Subaru", "Outback", 2022, "Blue", "WY-SUB-"),
    ("Ford", "Explorer", 2023, "Gray", "WY-EXP-"),
    ("GMC", "Yukon", 2022, "Black", "WY-YUK-"),
    ("Ram", "1500", 2023, "Red", "WY-RAM-"),
    ("Toyota", "Tacoma", 2022, "White", "WY-TAC-"),
    ("Honda", "Pilot", 2023, "Silver", "WY-PLT-"),
]


def create_wyoming_drivers(db: Session) -> list:
    """Create Wyoming-compliant test drivers."""
    drivers = []
    import uuid

    for i, (first_name, last_name) in enumerate(WYOMING_DRIVER_NAMES):
        city_name = list(WYOMING_LOCATIONS.keys())[i % len(WYOMING_LOCATIONS)]
        city_data = WYOMING_LOCATIONS[city_name]
        zip_code = random.choice(city_data["zip_codes"])
        vehicle = WYOMING_VEHICLES[i % len(WYOMING_VEHICLES)]

        driver = Driver(
            driver_id=f"WY-DRV-{uuid.uuid4().hex[:8].upper()}",
            first_name=first_name,
            last_name=last_name,
            email=f"{first_name.lower()}.{last_name.lower()}@wydriver.com",
            phone=f"+1307555{1000 + i:04d}",  # 307 is Wyoming area code
            # date_of_birth skipped due to model/db type mismatch
            status=DriverStatus.APPROVED,

            # Wyoming address (using actual model fields)
            street=f"{100 + i * 10} Main Street",
            city=city_name.replace("_", " "),
            state="WY",
            zip_code=zip_code,

            # Vehicle info (Wyoming plates)
            vehicle_type="car",
            vehicle_make=vehicle[0],
            vehicle_model=vehicle[1],
            vehicle_year=vehicle[2],
            vehicle_color=vehicle[3],
            license_plate=f"{vehicle[4]}{1000 + i}",

            # Wyoming TNC compliance (W.S. 31-20-106, 31-20-107)
            background_check=True,  # W.S. 31-20-106 compliant
            background_check_date=datetime.utcnow() - timedelta(days=random.randint(30, 90)),
            insurance=True,  # W.S. 31-20-107 compliant
            insurance_expiry=datetime.utcnow() + timedelta(days=random.randint(90, 365)),

            # Rating
            rating=round(4.5 + random.random() * 0.5, 1),
            total_deliveries=random.randint(50, 500),

            # Location (Wyoming coordinates)
            current_latitude=city_data["lat"] + (random.random() - 0.5) * 0.1,
            current_longitude=city_data["lng"] + (random.random() - 0.5) * 0.1,

            created_at=datetime.utcnow() - timedelta(days=random.randint(30, 180)),
        )

        drivers.append(driver)

    return drivers


def create_wyoming_customers(db: Session) -> list:
    """Create Wyoming test customers."""
    customers = []

    for i, (first_name, last_name) in enumerate(WYOMING_CUSTOMER_NAMES):
        city_name = list(WYOMING_LOCATIONS.keys())[i % len(WYOMING_LOCATIONS)]
        city_data = WYOMING_LOCATIONS[city_name]
        zip_code = random.choice(city_data["zip_codes"])

        # Wyoming address as JSON (matches Customer model)
        wyoming_address = {
            "street": f"{200 + i * 10} Oak Avenue",
            "city": city_name.replace("_", " "),
            "state": "WY",
            "zip_code": zip_code,
            "latitude": city_data["lat"] + (random.random() - 0.5) * 0.1,
            "longitude": city_data["lng"] + (random.random() - 0.5) * 0.1,
        }

        customer = Customer(
            first_name=first_name,
            last_name=last_name,
            email=f"{first_name.lower()}.{last_name.lower()}@wymail.com",
            phone=f"+1307555{2000 + i:04d}",  # 307 is Wyoming area code

            # Wyoming address as JSON
            default_address=wyoming_address,
            saved_addresses=[wyoming_address],

            # Status
            is_active=True,
        )

        customers.append(customer)

    return customers


def seed_wyoming_data():
    """Seed Wyoming test data into the database."""
    print("=" * 60)
    print("  SEEDING WYOMING TEST DATA")
    print("  For TNC Compliance Testing (W.S. Title 31, Chapter 20)")
    print("=" * 60)

    db = SessionLocal()

    try:
        # Check if Wyoming data already exists (drivers have state field)
        existing_wy_drivers = db.query(Driver).filter(Driver.state == "WY").count()
        # Customers use email domain to identify Wyoming test users
        existing_wy_customers = db.query(Customer).filter(
            Customer.email.like("%@wymail.com")
        ).count()

        if existing_wy_drivers > 0 or existing_wy_customers > 0:
            print(f"\n  Existing Wyoming data found:")
            print(f"    Drivers: {existing_wy_drivers}")
            print(f"    Customers: {existing_wy_customers}")
            print(f"\n  Skipping seeding to avoid duplicates.")
            print(f"  To reseed, delete existing Wyoming data first.")
            return

        # Create drivers
        print(f"\n  Creating Wyoming drivers...")
        drivers = create_wyoming_drivers(db)
        for driver in drivers:
            db.add(driver)
        db.flush()  # Get IDs assigned

        print(f"    Created {len(drivers)} drivers:")
        for d in drivers:
            print(f"      - {d.first_name} {d.last_name} ({d.city}, {d.zip_code})")

        # Create customers
        print(f"\n  Creating Wyoming customers...")
        customers = create_wyoming_customers(db)
        for customer in customers:
            db.add(customer)
        db.flush()

        print(f"    Created {len(customers)} customers:")
        for c in customers:
            addr = c.default_address or {}
            print(f"      - {c.first_name} {c.last_name} ({addr.get('city', 'N/A')}, {addr.get('zip_code', 'N/A')})")

        # Commit all changes
        db.commit()

        print(f"\n  " + "=" * 50)
        print(f"  WYOMING TEST DATA SEEDED SUCCESSFULLY")
        print(f"  " + "=" * 50)

        print(f"\n  Wyoming ZIP Codes in use:")
        for city, data in WYOMING_LOCATIONS.items():
            print(f"    {city.replace('_', ' ')}: {', '.join(data['zip_codes'][:3])}")

        print(f"\n  Driver Compliance Status:")
        print(f"    - Background checks: All PASSED (W.S. 31-20-106)")
        print(f"    - Insurance: All VERIFIED at $1M (W.S. 31-20-107)")
        print(f"    - Operating state: WY")

        print(f"\n  Ready for Wyoming TNC testing!")

    except Exception as e:
        db.rollback()
        print(f"\n  ERROR: {str(e)}")
        raise
    finally:
        db.close()


def display_wyoming_locations():
    """Display Wyoming service areas."""
    print("\n" + "=" * 60)
    print("  WYOMING SERVICE AREAS")
    print("=" * 60)

    for city, data in WYOMING_LOCATIONS.items():
        print(f"\n  {city.replace('_', ' ').upper()}")
        print(f"    Population: {data['population']:,}")
        print(f"    Description: {data['description']}")
        print(f"    ZIP Codes: {', '.join(data['zip_codes'])}")
        print(f"    Coordinates: ({data['lat']}, {data['lng']})")


if __name__ == "__main__":
    display_wyoming_locations()
    seed_wyoming_data()
