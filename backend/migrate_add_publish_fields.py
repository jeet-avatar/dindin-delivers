#!/usr/bin/env python3
"""
Migration: Add publish fields to vendors table
Fields: is_published, published_at, published_platforms

Run: python migrate_add_publish_fields.py
"""

import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env")
    exit(1)

# Parse the DATABASE_URL for psycopg2
# Format: postgresql://user:password@host:port/database
def parse_db_url(url):
    """Parse PostgreSQL URL into connection params"""
    # Remove postgresql:// prefix
    url = url.replace("postgresql://", "").replace("postgres://", "")

    # Split user:password@host:port/database
    auth, rest = url.split("@")
    user, password = auth.split(":")

    if "/" in rest:
        host_port, database = rest.split("/")
    else:
        host_port = rest
        database = "postgres"

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "database": database.split("?")[0]  # Remove query params
    }

def run_migration():
    print("=" * 60)
    print("Migration: Add publish fields to vendors table")
    print("=" * 60)

    try:
        params = parse_db_url(DATABASE_URL)
        print(f"Connecting to: {params['host']}:{params['port']}/{params['database']}")

        conn = psycopg2.connect(
            host=params["host"],
            port=params["port"],
            user=params["user"],
            password=params["password"],
            database=params["database"]
        )
        conn.autocommit = True
        cursor = conn.cursor()

        # Check if columns already exist
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'vendors'
            AND column_name IN ('is_published', 'published_at', 'published_platforms')
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]

        print(f"Existing columns: {existing_columns}")

        # Add is_published column
        if 'is_published' not in existing_columns:
            print("Adding column: is_published (BOOLEAN DEFAULT FALSE)")
            cursor.execute("""
                ALTER TABLE vendors
                ADD COLUMN is_published BOOLEAN DEFAULT FALSE
            """)
            print("  ✓ Added is_published")
        else:
            print("  - is_published already exists")

        # Add published_at column
        if 'published_at' not in existing_columns:
            print("Adding column: published_at (TIMESTAMP)")
            cursor.execute("""
                ALTER TABLE vendors
                ADD COLUMN published_at TIMESTAMP
            """)
            print("  ✓ Added published_at")
        else:
            print("  - published_at already exists")

        # Add published_platforms column
        if 'published_platforms' not in existing_columns:
            print("Adding column: published_platforms (TEXT)")
            cursor.execute("""
                ALTER TABLE vendors
                ADD COLUMN published_platforms TEXT
            """)
            print("  ✓ Added published_platforms")
        else:
            print("  - published_platforms already exists")

        cursor.close()
        conn.close()

        print("=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        exit(1)

if __name__ == "__main__":
    run_migration()
