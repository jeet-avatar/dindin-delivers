"""
DoorDash P2P - Database Health Check
Verifies database connection and all required tables
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import inspect, text
from database import engine, SessionLocal
from models import Base
import psycopg2
from psycopg2 import sql

def check_postgres_running():
    """Check if PostgreSQL is accessible"""
    try:
        conn = psycopg2.connect(
            host=os.environ.get("POSTGRES_HOST", "localhost"),
            port=os.environ.get("POSTGRES_PORT", "5432"),
            user=os.environ.get("POSTGRES_USER", "postgres"),
            password=os.environ.get("POSTGRES_PASSWORD", ""),
            database="postgres"
        )
        conn.close()
        print("✓ PostgreSQL is running")
        return True
    except Exception as e:
        print(f"❌ PostgreSQL is not accessible: {e}")
        print("\nTo start PostgreSQL:")
        print("  brew services start postgresql")
        return False

def check_database_exists():
    """Check if invoice_db database exists"""
    try:
        conn = psycopg2.connect(
            host=os.environ.get("POSTGRES_HOST", "localhost"),
            port=os.environ.get("POSTGRES_PORT", "5432"),
            user=os.environ.get("POSTGRES_USER", "postgres"),
            password=os.environ.get("POSTGRES_PASSWORD", ""),
            database="postgres"
        )
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM pg_database WHERE datname='invoice_db'")
        exists = cur.fetchone() is not None
        
        if not exists:
            print("⚠️  Database 'invoice_db' does not exist. Creating...")
            cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier("invoice_db")))
            print("✓ Database created")
        else:
            print("✓ Database 'invoice_db' exists")
        
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        return False

def check_tables():
    """Check if all required tables exist"""
    required_tables = [
        'users',
        'clients', 
        'invoices',
        'invoice_items',
        'payments',
        'vendors',
        'vendor_menu_items',
        'orders',
        'stripe_payment_logs',
        'vendor_payouts'
    ]
    
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        print(f"\n📊 Database Tables Status:")
        missing_tables = []
        
        for table in required_tables:
            if table in existing_tables:
                # Count rows
                with engine.connect() as conn:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                print(f"  ✓ {table:25} ({count} rows)")
            else:
                print(f"  ❌ {table:25} (missing)")
                missing_tables.append(table)
        
        if missing_tables:
            print(f"\n⚠️  {len(missing_tables)} tables are missing!")
            print("Run: python init_db.py")
            return False
        else:
            print("\n✅ All required tables exist!")
            return True
            
    except Exception as e:
        print(f"❌ Error checking tables: {e}")
        return False

def check_sample_data():
    """Check if sample data exists"""
    db = SessionLocal()
    try:
        from models import User, Client, Vendor
        
        user_count = db.query(User).count()
        client_count = db.query(Client).count()
        vendor_count = db.query(Vendor).count()
        
        print(f"\n📦 Sample Data:")
        print(f"  Users:   {user_count}")
        print(f"  Clients: {client_count}")
        print(f"  Vendors: {vendor_count}")
        
        if user_count == 0:
            print("\n⚠️  No users found. Run: python init_db.py")
            return False
        
        # Check for admin user
        admin = db.query(User).filter(User.email == "admin@invoice.com").first()
        if admin:
            print(f"  ✓ Admin user exists: admin@invoice.com")
        else:
            print(f"  ⚠️  Admin user not found")
        
        return True
    except Exception as e:
        print(f"❌ Error checking sample data: {e}")
        return False
    finally:
        db.close()

def main():
    print("🔧 DoorDash P2P - Database Health Check")
    print("=" * 50)
    print()
    
    # Check 1: PostgreSQL
    print("1️⃣  Checking PostgreSQL...")
    if not check_postgres_running():
        sys.exit(1)
    print()
    
    # Check 2: Database exists
    print("2️⃣  Checking database...")
    if not check_database_exists():
        sys.exit(1)
    print()
    
    # Check 3: Tables
    print("3️⃣  Checking tables...")
    tables_ok = check_tables()
    print()
    
    # Check 4: Sample data
    if tables_ok:
        print("4️⃣  Checking sample data...")
        check_sample_data()
        print()
    
    # Summary
    print("=" * 50)
    if tables_ok:
        print("✅ Database is ready!")
        print()
        print("🚀 Start the backend server:")
        print("  uvicorn main_new:app --reload --port 3000")
    else:
        print("⚠️  Database needs initialization!")
        print()
        print("📝 Run these commands:")
        print("  python init_db.py")
        print("  python migrate_vendor_auth.py")
        print("  python add_zip_sample_data.py")
    print("=" * 50)

if __name__ == "__main__":
    main()
