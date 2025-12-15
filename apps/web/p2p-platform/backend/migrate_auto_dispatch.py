"""
Migration script to add auto-dispatch columns to the orders table
Run this once to update the database schema
"""

from database import engine
from sqlalchemy import text

def run_migration():
    print("Running auto-dispatch migration...")
    
    migrations = [
        # Order table - auto dispatch columns
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_dispatched BOOLEAN DEFAULT FALSE",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS broadcast_to_drivers BOOLEAN DEFAULT FALSE", 
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS broadcast_at TIMESTAMP",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS broadcast_radius_km FLOAT",
        
        # Driver table - location and FCM columns
        "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP",
        "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS went_online_at TIMESTAMP",
        "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS went_offline_at TIMESTAMP",
        "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(500)",
        "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS device_type VARCHAR(20)",
        "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMP",
        "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500)",
    ]
    
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"✓ {sql[:50]}...")
            except Exception as e:
                print(f"⚠ Skipped (may already exist): {str(e)[:50]}...")
    
    print("\n✅ Migration complete!")

if __name__ == "__main__":
    run_migration()
