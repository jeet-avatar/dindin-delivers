"""
Safe Database Migration Script
Adds missing columns to the drivers table without breaking existing data.
This script is idempotent - safe to run multiple times.
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

# Columns to add to drivers table (only if they don't exist)
COLUMNS_TO_ADD = [
    ("password_reset_token", "VARCHAR(100)", "NULL"),
    ("password_reset_expiry", "TIMESTAMP", "NULL"),
]

def get_existing_columns(table_name):
    """Get list of existing columns in a table"""
    inspector = inspect(engine)
    columns = inspector.get_columns(table_name)
    return [col['name'] for col in columns]

def add_column_if_not_exists(table_name, column_name, column_type, default):
    """Add a column to a table if it doesn't already exist"""
    existing_columns = get_existing_columns(table_name)

    if column_name in existing_columns:
        print(f"  [SKIP] Column '{column_name}' already exists in '{table_name}'")
        return False

    sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type} DEFAULT {default}"

    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()

    print(f"  [ADDED] Column '{column_name}' ({column_type}) to '{table_name}'")
    return True

def main():
    print("=" * 60)
    print("  DOLLOR DATABASE MIGRATION")
    print("  Adding missing columns to drivers table")
    print("=" * 60)
    print()

    # Check connection
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("[OK] Database connection successful")
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        sys.exit(1)

    print()
    print("Migrating 'drivers' table:")

    added_count = 0
    for column_name, column_type, default in COLUMNS_TO_ADD:
        try:
            if add_column_if_not_exists("drivers", column_name, column_type, default):
                added_count += 1
        except Exception as e:
            print(f"  [ERROR] Failed to add '{column_name}': {e}")

    print()
    print("=" * 60)
    if added_count > 0:
        print(f"  MIGRATION COMPLETE - {added_count} column(s) added")
    else:
        print("  MIGRATION COMPLETE - No changes needed (all columns exist)")
    print("=" * 60)

    # Verify
    print()
    print("Verification - Current drivers table columns:")
    existing = get_existing_columns("drivers")
    for col in ["password_reset_token", "password_reset_expiry"]:
        status = "EXISTS" if col in existing else "MISSING"
        print(f"  {col}: {status}")

if __name__ == "__main__":
    main()
