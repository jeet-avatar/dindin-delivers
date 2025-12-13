"""
Fix customer_addresses table to have customer_id column
"""
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine
from sqlalchemy import text

def fix_address_column():
    """Add customer_id column if it doesn't exist, or rename user_id to customer_id"""
    with engine.connect() as conn:
        # First, check what columns exist
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'customer_addresses'
        """))
        columns = [row[0] for row in result.fetchall()]
        print(f"Existing columns: {columns}")
        
        if 'customer_id' not in columns and 'user_id' in columns:
            print("Renaming user_id to customer_id...")
            conn.execute(text("ALTER TABLE customer_addresses RENAME COLUMN user_id TO customer_id"))
            conn.commit()
            print("Column renamed successfully!")
        elif 'customer_id' not in columns:
            print("Adding customer_id column...")
            conn.execute(text("ALTER TABLE customer_addresses ADD COLUMN customer_id INTEGER"))
            conn.commit()
            print("Column added successfully!")
        else:
            print("customer_id column already exists!")
        
        # Verify
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'customer_addresses'
        """))
        columns = [row[0] for row in result.fetchall()]
        print(f"Final columns: {columns}")

if __name__ == "__main__":
    fix_address_column()
