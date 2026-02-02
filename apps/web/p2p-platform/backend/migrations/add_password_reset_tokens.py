"""
Migration: Add password_reset_tokens table

This migration creates the database-backed password reset token storage.
CRITICAL: This replaces in-memory storage which was unreliable.

Run with:
    python migrations/add_password_reset_tokens.py
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import DATABASE_URL

def run_migration():
    """Create the password_reset_tokens table."""
    engine = create_engine(DATABASE_URL)

    migration_sql = """
    -- Create password_reset_tokens table for bulletproof password reset
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,

        -- User identification
        email VARCHAR(255) NOT NULL,
        user_type VARCHAR(50) NOT NULL,  -- 'customer', 'driver', 'vendor'
        user_id INTEGER NOT NULL,

        -- Secure code storage (hashed, not plaintext)
        code_hash VARCHAR(255) NOT NULL,

        -- Expiration
        expires_at TIMESTAMP NOT NULL,

        -- Usage tracking
        used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP,
        failed_attempts INTEGER DEFAULT 0,

        -- Delivery tracking
        delivery_status VARCHAR(50) DEFAULT 'pending',
        delivery_provider VARCHAR(50),
        delivery_message_id VARCHAR(255),
        delivery_error TEXT,

        -- Audit trail
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for efficient queries
    CREATE INDEX IF NOT EXISTS idx_password_reset_email ON password_reset_tokens(email);
    CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_password_reset_used ON password_reset_tokens(used);
    CREATE INDEX IF NOT EXISTS idx_password_reset_created ON password_reset_tokens(created_at);
    """

    print("=" * 60)
    print("Running migration: Add password_reset_tokens table")
    print("=" * 60)

    with engine.connect() as conn:
        # Execute migration
        for statement in migration_sql.split(';'):
            statement = statement.strip()
            if statement:
                try:
                    conn.execute(text(statement))
                    print(f"  [OK] Executed: {statement[:60]}...")
                except Exception as e:
                    print(f"  [WARN] {e}")

        conn.commit()

    print("\n[SUCCESS] Migration completed!")
    print("Password reset tokens will now be stored in database.")


if __name__ == "__main__":
    run_migration()
