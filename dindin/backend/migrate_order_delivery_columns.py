"""
Migration Script: Add Delivery Decision Columns to Orders Table
================================================================
This script adds the new columns needed for the restaurant delivery decision feature:
- delivery_method: enum for tracking delivery method (pending, restaurant, driver, pickup)
- restaurant_delivery_decision_at: timestamp when decision was made
- restaurant_delivery_deadline: deadline for restaurant to decide
- restaurant_deliverer_name: name of restaurant staff delivering

This script is idempotent - safe to run multiple times.
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

# Columns to add to the orders table
ORDER_COLUMNS = [
    ("delivery_method", "VARCHAR(20)", "'pending'"),
    ("restaurant_delivery_decision_at", "TIMESTAMP", "NULL"),
    ("restaurant_delivery_deadline", "TIMESTAMP", "NULL"),
    ("restaurant_deliverer_name", "VARCHAR(255)", "NULL"),
]

def add_column_if_not_exists(table_name: str, column_name: str, column_type: str, default: str):
    """Add a column if it doesn't already exist"""
    check_sql = text(f"""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = :table_name AND column_name = :column_name
    """)

    with engine.connect() as conn:
        result = conn.execute(check_sql, {"table_name": table_name, "column_name": column_name})
        exists = result.fetchone() is not None

        if not exists:
            alter_sql = text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type} DEFAULT {default}")
            try:
                conn.execute(alter_sql)
                conn.commit()
                print(f"  [+] Added column: {column_name} ({column_type}) DEFAULT {default}")
                return True
            except Exception as e:
                print(f"  [!] Error adding {column_name}: {e}")
                conn.rollback()
                return False
        else:
            print(f"  [=] Column exists: {column_name}")
            return True

def run_migration():
    """Run the migration to add delivery decision columns"""
    print("=" * 60)
    print("ORDERS TABLE MIGRATION - Delivery Decision Columns")
    print("=" * 60)
    print()

    print("Adding delivery decision columns to orders table...")
    print()

    success_count = 0
    for column_name, column_type, default in ORDER_COLUMNS:
        if add_column_if_not_exists("orders", column_name, column_type, default):
            success_count += 1

    print()
    print("=" * 60)
    print(f"Migration complete: {success_count}/{len(ORDER_COLUMNS)} columns processed")
    print("=" * 60)

    return success_count == len(ORDER_COLUMNS)

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
