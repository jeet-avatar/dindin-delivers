#!/usr/bin/env python3
"""
Seed Test Data for Dollor.ai Staging Environment
Creates test users and fixes vendor status for E2E testing

Requires DATABASE_URL environment variable.
"""

import os
import sys
import hashlib
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Installing psycopg2...")
    os.system("pip install psycopg2-binary")
    import psycopg2
    from psycopg2.extras import RealDictCursor

def hash_password(password: str) -> str:
    """Hash password using SHA256 (matching backend auth)"""
    return hashlib.sha256(password.encode()).hexdigest()

def get_connection():
    """Get database connection"""
    return psycopg2.connect(DATABASE_URL)

def seed_customers(conn):
    """Seed test customer accounts"""
    print("\n=== Seeding Customer Accounts ===")

    customers = [
        {
            "email": "test.customer.la@dollor.ai",
            "password": "Test123!",
            "first_name": "LA Test",
            "last_name": "Customer",
            "phone": "+12135550101",
            "customer_code": "CUST-TEST-LA"
        },
        {
            "email": "test.customer@dollor.ai",
            "password": "Test123!",
            "first_name": "Test",
            "last_name": "Customer",
            "phone": "+14155551234",
            "customer_code": "CUST-TEST-01"
        }
    ]

    cursor = conn.cursor(cursor_factory=RealDictCursor)

    for customer in customers:
        # Check if customer exists
        cursor.execute("SELECT id FROM customers WHERE email = %s", (customer["email"],))
        existing = cursor.fetchone()

        if existing:
            print(f"  Customer {customer['email']} already exists (ID: {existing['id']})")
            # Update password to ensure it matches
            cursor.execute("""
                UPDATE customers
                SET password_hash = %s, is_active = true
                WHERE email = %s
            """, (hash_password(customer["password"]), customer["email"]))
            print(f"    Updated password and set active")
        else:
            cursor.execute("""
                INSERT INTO customers (
                    email, password_hash, first_name, last_name,
                    phone, customer_code, is_active, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, true, %s)
                RETURNING id
            """, (
                customer["email"],
                hash_password(customer["password"]),
                customer["first_name"],
                customer["last_name"],
                customer["phone"],
                customer["customer_code"],
                datetime.utcnow()
            ))
            new_id = cursor.fetchone()["id"]
            print(f"  Created customer {customer['email']} (ID: {new_id})")

    conn.commit()
    print("  Customers seeded successfully!")

def seed_drivers(conn):
    """Seed test driver accounts"""
    print("\n=== Seeding Driver Accounts ===")

    drivers = [
        {
            "email": "test.driver.la@dollor.ai",
            "password": "Test123!",
            "first_name": "LA Test",
            "last_name": "Driver",
            "phone": "+12135550202",
            "driver_code": "DRV-TEST-LA",
            "vehicle_type": "car",
            "license_plate": "TEST123"
        },
        {
            "email": "test.driver@dollor.ai",
            "password": "Test123!",
            "first_name": "Test",
            "last_name": "Driver",
            "phone": "+14155555678",
            "driver_code": "DRV-TEST-01",
            "vehicle_type": "car",
            "license_plate": "DRV001"
        }
    ]

    cursor = conn.cursor(cursor_factory=RealDictCursor)

    for driver in drivers:
        # Check if driver exists
        cursor.execute("SELECT id FROM drivers WHERE email = %s", (driver["email"],))
        existing = cursor.fetchone()

        if existing:
            print(f"  Driver {driver['email']} already exists (ID: {existing['id']})")
            # Update password and status
            cursor.execute("""
                UPDATE drivers
                SET password_hash = %s, is_active = true, is_online = true,
                    verification_status = 'approved'
                WHERE email = %s
            """, (hash_password(driver["password"]), driver["email"]))
            print(f"    Updated password, set active and online")
        else:
            cursor.execute("""
                INSERT INTO drivers (
                    email, password_hash, first_name, last_name,
                    phone, driver_code, vehicle_type, license_plate,
                    is_active, is_online, verification_status, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, true, true, 'approved', %s)
                RETURNING id
            """, (
                driver["email"],
                hash_password(driver["password"]),
                driver["first_name"],
                driver["last_name"],
                driver["phone"],
                driver["driver_code"],
                driver["vehicle_type"],
                driver["license_plate"],
                datetime.utcnow()
            ))
            new_id = cursor.fetchone()["id"]
            print(f"  Created driver {driver['email']} (ID: {new_id})")

    conn.commit()
    print("  Drivers seeded successfully!")

def seed_vendors(conn):
    """Seed test vendor accounts"""
    print("\n=== Seeding Vendor Accounts ===")

    vendors = [
        {
            "email": "test.vendor@dollor.ai",
            "password": "Test123!",
            "company_name": "Test Restaurant LA",
            "contact_name": "Test Vendor",
            "phone": "+12135550303"
        },
        {
            "email": "test.vendor2@dollor.ai",
            "password": "Test123!",
            "company_name": "Test Restaurant SF",
            "contact_name": "Test Vendor 2",
            "phone": "+14155550404"
        }
    ]

    cursor = conn.cursor(cursor_factory=RealDictCursor)

    for vendor in vendors:
        # Check if vendor exists
        cursor.execute("SELECT id FROM vendors WHERE email = %s", (vendor["email"],))
        existing = cursor.fetchone()

        if existing:
            print(f"  Vendor {vendor['email']} already exists (ID: {existing['id']})")
            # Update password
            cursor.execute("""
                UPDATE vendors
                SET password_hash = %s, is_active = true
                WHERE email = %s
            """, (hash_password(vendor["password"]), vendor["email"]))
            print(f"    Updated password and set active")
        else:
            cursor.execute("""
                INSERT INTO vendors (
                    email, password_hash, company_name, contact_name,
                    phone, is_active, created_at
                ) VALUES (%s, %s, %s, %s, %s, true, %s)
                RETURNING id
            """, (
                vendor["email"],
                hash_password(vendor["password"]),
                vendor["company_name"],
                vendor["contact_name"],
                vendor["phone"],
                datetime.utcnow()
            ))
            new_id = cursor.fetchone()["id"]
            print(f"  Created vendor {vendor['email']} (ID: {new_id})")

    conn.commit()
    print("  Vendors seeded successfully!")

def fix_restaurant_status(conn):
    """Fix restaurant/vendor onboarding status to allow orders"""
    print("\n=== Fixing Restaurant Status ===")

    cursor = conn.cursor(cursor_factory=RealDictCursor)

    # Update all restaurants to be active and accepting orders
    cursor.execute("""
        UPDATE restaurants
        SET onboarding_status = 'active',
            onboarding_phase = 'completed',
            is_accepting_orders = true,
            is_online = true
        WHERE onboarding_status != 'active'
        RETURNING id, restaurant_name
    """)

    updated = cursor.fetchall()
    if updated:
        for r in updated:
            print(f"  Activated restaurant: {r['restaurant_name']} (ID: {r['id']})")
    else:
        print("  All restaurants already active")

    # Also update vendors table if it has status field
    try:
        cursor.execute("""
            UPDATE vendors
            SET is_active = true, is_online = true
            WHERE is_active = false OR is_online = false
        """)
        print(f"  Updated {cursor.rowcount} vendors to active/online")
    except Exception as e:
        print(f"  Note: Vendor status update skipped ({e})")

    conn.commit()
    print("  Restaurant status fixed!")

def add_menu_items(conn):
    """Add menu items if missing"""
    print("\n=== Adding Menu Items ===")

    cursor = conn.cursor(cursor_factory=RealDictCursor)

    # Check if vendor 1 has menu items
    cursor.execute("SELECT COUNT(*) as count FROM menu_items WHERE vendor_id = 1")
    count = cursor.fetchone()["count"]

    if count < 3:
        menu_items = [
            ("Classic Burger", "Juicy beef patty with lettuce, tomato, and special sauce", "Main Course", 12.99),
            ("Chicken Wings", "Crispy wings with your choice of sauce", "Appetizers", 9.99),
            ("Caesar Salad", "Fresh romaine with parmesan and croutons", "Salads", 8.99),
            ("French Fries", "Golden crispy fries", "Sides", 4.99),
            ("Chocolate Shake", "Rich chocolate milkshake", "Beverages", 5.99)
        ]

        for name, desc, category, price in menu_items:
            cursor.execute("""
                INSERT INTO menu_items (vendor_id, item_name, description, category, price, is_available, in_stock)
                VALUES (1, %s, %s, %s, %s, true, true)
                ON CONFLICT DO NOTHING
            """, (name, desc, category, price))
            print(f"  Added: {name} - ${price}")

        conn.commit()
        print("  Menu items added!")
    else:
        print(f"  Vendor 1 already has {count} menu items")

def verify_setup(conn):
    """Verify the seeded data"""
    print("\n=== Verification ===")

    cursor = conn.cursor(cursor_factory=RealDictCursor)

    # Check customers
    cursor.execute("SELECT id, email, is_active FROM customers WHERE email LIKE '%test%' OR email LIKE '%admin%'")
    customers = cursor.fetchall()
    print(f"\nCustomers ({len(customers)}):")
    for c in customers:
        print(f"  ID: {c['id']}, Email: {c['email']}, Active: {c['is_active']}")

    # Check drivers
    cursor.execute("SELECT id, email, is_active, is_online FROM drivers WHERE email LIKE '%test%'")
    drivers = cursor.fetchall()
    print(f"\nDrivers ({len(drivers)}):")
    for d in drivers:
        print(f"  ID: {d['id']}, Email: {d['email']}, Active: {d['is_active']}, Online: {d['is_online']}")

    # Check vendors
    cursor.execute("SELECT id, email, is_active FROM vendors WHERE email LIKE '%test%' OR email LIKE '%admin%'")
    vendors = cursor.fetchall()
    print(f"\nVendors ({len(vendors)}):")
    for v in vendors:
        print(f"  ID: {v['id']}, Email: {v['email']}, Active: {v['is_active']}")

    # Check restaurants
    cursor.execute("SELECT id, restaurant_name, onboarding_status, is_accepting_orders FROM restaurants LIMIT 5")
    restaurants = cursor.fetchall()
    print(f"\nRestaurants ({len(restaurants)}):")
    for r in restaurants:
        accepting = r.get('is_accepting_orders', 'N/A')
        print(f"  ID: {r['id']}, Name: {r['restaurant_name']}, Status: {r['onboarding_status']}, Accepting: {accepting}")

def main():
    print("=" * 50)
    print("Dollor.ai Staging - Test Data Seeder")
    print("=" * 50)

    try:
        conn = get_connection()
        print("Connected to database successfully!")

        seed_customers(conn)
        seed_drivers(conn)
        seed_vendors(conn)
        fix_restaurant_status(conn)
        add_menu_items(conn)
        verify_setup(conn)

        conn.close()

        print("\n" + "=" * 50)
        print("TEST DATA SEEDING COMPLETE!")
        print("=" * 50)
        print("\nTest Credentials (Staging Only):")
        print("  Customer: test.customer.la@dollor.ai / Test123!")
        print("  Driver:   test.driver.la@dollor.ai / Test123!")
        print("  Vendor:   test.vendor@dollor.ai / Test123!")
        print("=" * 50)

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
