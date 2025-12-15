#!/usr/bin/env python3
"""
Quick diagnostic script to check if everything is set up correctly
"""

import sys
import os

print("=" * 60)
print("Invoice Management System - Setup Diagnostics")
print("=" * 60)
print()

# Check Python version
print(f"✓ Python version: {sys.version}")
print()

# Check if we can import required packages
print("Checking required packages...")
packages = [
    "fastapi",
    "uvicorn",
    "sqlalchemy",
    "psycopg2",
    "passlib",
    "jose",
    "pydantic",
    "dotenv"
]

missing_packages = []
for package in packages:
    try:
        __import__(package)
        print(f"  ✓ {package}")
    except ImportError:
        print(f"  ✗ {package} - NOT INSTALLED")
        missing_packages.append(package)

print()

if missing_packages:
    print("❌ Missing packages. Run: pip install -r requirements.txt")
    sys.exit(1)

# Check database connection
print("Checking database connection...")
try:
    from sqlalchemy import create_engine, text
    from dotenv import load_dotenv
    
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/invoice_db")
    print(f"  Database URL: {DATABASE_URL.replace(DATABASE_URL.split('@')[0].split('//')[1], '***')}")
    
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("  ✓ Database connection successful")
except Exception as e:
    print(f"  ✗ Database connection failed: {e}")
    print()
    print("Fix:")
    print("  1. Make sure PostgreSQL is running: brew services start postgresql")
    print("  2. Create database: createdb invoice_db")
    print("  3. Check credentials in .env file")
    sys.exit(1)

print()

# Check if tables exist
print("Checking database tables...")
try:
    from database import engine
    from sqlalchemy import inspect
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    expected_tables = ['users', 'clients', 'invoices', 'invoice_items', 'payments']
    
    if not tables:
        print("  ⚠ No tables found. Run: python init_db.py")
    else:
        for table in expected_tables:
            if table in tables:
                print(f"  ✓ {table}")
            else:
                print(f"  ✗ {table} - MISSING")
        
        if set(expected_tables).issubset(set(tables)):
            print()
            print("  ✓ All required tables exist")
        else:
            print()
            print("  ⚠ Some tables missing. Run: python init_db.py")
except Exception as e:
    print(f"  ⚠ Could not check tables: {e}")
    print("  Run: python init_db.py")

print()
print("=" * 60)
print("✅ Setup looks good! Start the server with:")
print("   uvicorn main_new:app --reload --port 3000")
print("=" * 60)
