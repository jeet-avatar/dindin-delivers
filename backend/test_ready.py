#!/usr/bin/env python3
"""
Minimal test to check if the backend can start
"""

print("Testing backend setup...")
print("-" * 60)

# Test 1: Check imports
print("\n1. Testing imports...")
try:
    from fastapi import FastAPI
    print("   ✓ FastAPI")
except ImportError as e:
    print(f"   ✗ FastAPI: {e}")
    print("\n   FIX: pip install fastapi")
    exit(1)

try:
    import uvicorn
    print("   ✓ Uvicorn")
except ImportError as e:
    print(f"   ✗ Uvicorn: {e}")
    print("\n   FIX: pip install uvicorn[standard]")
    exit(1)

try:
    from sqlalchemy import create_engine
    print("   ✓ SQLAlchemy")
except ImportError as e:
    print(f"   ✗ SQLAlchemy: {e}")
    print("\n   FIX: pip install sqlalchemy")
    exit(1)

try:
    import psycopg2
    print("   ✓ psycopg2")
except ImportError as e:
    print(f"   ✗ psycopg2: {e}")
    print("\n   FIX: pip install psycopg2-binary")
    exit(1)

try:
    from passlib.context import CryptContext
    print("   ✓ passlib")
except ImportError as e:
    print(f"   ✗ passlib: {e}")
    print("\n   FIX: pip install passlib[bcrypt]")
    exit(1)

try:
    from jose import jwt
    print("   ✓ python-jose")
except ImportError as e:
    print(f"   ✗ python-jose: {e}")
    print("\n   FIX: pip install python-jose[cryptography]")
    exit(1)

# Test 2: Check database connection
print("\n2. Testing database connection...")
try:
    from dotenv import load_dotenv
    import os
    
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/invoice_db")
    
    # Hide password in output
    safe_url = DATABASE_URL.split('@')[0].split('://')[0] + "://***@" + DATABASE_URL.split('@')[1]
    print(f"   URL: {safe_url}")
    
    engine = create_engine(DATABASE_URL)
    from sqlalchemy import text
    
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("   ✓ Database connection successful")
except Exception as e:
    print(f"   ✗ Database connection failed: {e}")
    print("\n   FIX:")
    print("   1. Start PostgreSQL: brew services start postgresql@14")
    print("   2. Create database: createdb invoice_db")
    exit(1)

# Test 3: Check if tables exist
print("\n3. Testing database tables...")
try:
    from sqlalchemy import inspect
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    expected = ['users', 'clients', 'invoices', 'invoice_items', 'payments']
    
    if not tables:
        print("   ⚠ No tables found")
        print("\n   FIX: python init_db.py")
    else:
        for table in expected:
            if table in tables:
                print(f"   ✓ {table}")
            else:
                print(f"   ✗ {table} missing")
        
        if not all(t in tables for t in expected):
            print("\n   FIX: python init_db.py")
            exit(1)
except Exception as e:
    print(f"   ✗ Error checking tables: {e}")
    print("\n   FIX: python init_db.py")
    exit(1)

# Test 4: Try to import the app
print("\n4. Testing app import...")
try:
    import sys
    sys.path.insert(0, '.')
    from main_new import app
    print("   ✓ App imports successfully")
except Exception as e:
    print(f"   ✗ App import failed: {e}")
    exit(1)

print("\n" + "=" * 60)
print("✅ ALL CHECKS PASSED!")
print("=" * 60)
print("\nStart the server with:")
print("   uvicorn main_new:app --reload --port 3000")
print("\nThen open: http://localhost:5173")
print("\nLogin:")
print("   Email: admin@invoice.com")
print("   Password: [set in .env]")
print()
