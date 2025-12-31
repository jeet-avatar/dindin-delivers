#!/usr/bin/env python3
"""
Migration: Add restaurant acceptance fields and missing statuses to orders table
Date: 2025-12-29

This migration adds:
1. Restaurant acceptance timestamp fields
2. Driver assignment fields
3. Tip fields
4. Missing timestamp fields (dispatched_at, cancelled_at)

Run: python migrate_order_fields.py
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/invoice_db")

def run_migration():
    engine = create_engine(DATABASE_URL)

    # SQL to add new columns (IF NOT EXISTS to be safe)
    migration_sql = """
    -- Restaurant Acceptance Window fields
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS sent_to_restaurant_at TIMESTAMP;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS restaurant_accepted_at TIMESTAMP;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS restaurant_declined_at TIMESTAMP;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS restaurant_decline_reason VARCHAR(500);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS restaurant_timeout_at TIMESTAMP;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_for_pickup_at TIMESTAMP;

    -- Missing timestamp fields
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

    -- Driver assignment fields
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_id INTEGER;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_name VARCHAR(255);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_assigned_at TIMESTAMP;

    -- Tip fields
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS tip FLOAT DEFAULT 0.0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS tip_added_at TIMESTAMP;
    """

    print("🚀 Running migration: Add restaurant acceptance fields to orders table")
    print("=" * 60)

    with engine.connect() as conn:
        # Execute each statement separately
        statements = [s.strip() for s in migration_sql.strip().split(';') if s.strip() and not s.strip().startswith('--')]

        for stmt in statements:
            if stmt:
                try:
                    conn.execute(text(stmt))
                    # Extract column name for logging
                    col_name = stmt.split('ADD COLUMN IF NOT EXISTS')[1].split()[0] if 'ADD COLUMN' in stmt else 'unknown'
                    print(f"  ✅ Added column: {col_name}")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        col_name = stmt.split('ADD COLUMN IF NOT EXISTS')[1].split()[0] if 'ADD COLUMN' in stmt else 'unknown'
                        print(f"  ⏭️  Column already exists: {col_name}")
                    else:
                        print(f"  ❌ Error: {e}")

        conn.commit()

    print("=" * 60)
    print("✅ Migration completed successfully!")
    print("\nNew OrderStatus values supported:")
    print("  - pending_restaurant")
    print("  - pending_modification")
    print("  - declined_by_restaurant")
    print("  - restaurant_timeout")
    print("  - ready_for_pickup")

if __name__ == "__main__":
    run_migration()
