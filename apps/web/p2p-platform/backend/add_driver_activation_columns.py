"""
Migration script to add activation_token and terms_accepted_at columns to drivers table.
Run this script once to update the database schema.
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine
from sqlalchemy import text

def add_columns():
    """Add activation_token and terms_accepted_at columns to drivers table"""
    with engine.connect() as conn:
        # Check if columns already exist
        try:
            result = conn.execute(text("SELECT activation_token FROM drivers LIMIT 1"))
            print("activation_token column already exists")
        except Exception:
            print("Adding activation_token column...")
            conn.execute(text("ALTER TABLE drivers ADD COLUMN activation_token VARCHAR(64) UNIQUE"))
            conn.commit()
            print("activation_token column added successfully")

        try:
            result = conn.execute(text("SELECT terms_accepted_at FROM drivers LIMIT 1"))
            print("terms_accepted_at column already exists")
        except Exception:
            print("Adding terms_accepted_at column...")
            conn.execute(text("ALTER TABLE drivers ADD COLUMN terms_accepted_at TIMESTAMP"))
            conn.commit()
            print("terms_accepted_at column added successfully")

        # Create index on activation_token for faster lookups
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_drivers_activation_token ON drivers(activation_token)"))
            conn.commit()
            print("Index created on activation_token")
        except Exception as e:
            print(f"Index may already exist: {e}")

        print("\n✅ Migration complete!")

if __name__ == "__main__":
    add_columns()
