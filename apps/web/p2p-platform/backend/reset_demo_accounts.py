#!/usr/bin/env python3
"""
Reset all demo account passwords for App Store review.
Run this script to ensure demo accounts work correctly.
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Ensure JWT_SECRET_KEY is set for imports
if not os.getenv("JWT_SECRET_KEY"):
    os.environ["JWT_SECRET_KEY"] = "temp_key_for_script"

from database import SessionLocal
from models import Customer, Driver, Vendor, User
from passlib.context import CryptContext
from sqlalchemy import text

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Demo account credentials
DEMO_ACCOUNTS = {
    "customer": {
        "email": "demo.customer@dollor.ai",
        "password": "DemoCustomer2025!",
        "model": Customer,
        "table": "customers"
    },
    "driver": {
        "email": "demo.driver@dollor.ai",
        "password": "DemoDriver2025!",
        "model": Driver,
        "table": "drivers"
    },
    "vendor": {
        "email": "demo.restaurant@dollor.ai",
        "password": "DemoRestaurant2025!",
        "model": Vendor,
        "table": "vendors"
    },
    "admin": {
        "email": "support@dollor.ai",
        "password": "DollorAdmin2026!",
        "model": User,
        "table": "users"
    }
}

def reset_password(db, account_type: str, config: dict) -> bool:
    """Reset password for a specific account type."""
    email = config["email"]
    password = config["password"]
    model = config["model"]
    table = config["table"]

    print(f"\n{'='*50}")
    print(f"Resetting {account_type.upper()} account: {email}")
    print(f"{'='*50}")

    try:
        # Find account
        account = db.query(model).filter(model.email == email).first()

        if not account:
            print(f"  Account not found in database!")
            return False

        print(f"  Found account ID: {account.id}")

        # Get current hash
        current_hash = account.password_hash or "NO_HASH"
        print(f"  Current hash: {current_hash[:40]}..." if len(current_hash) > 40 else f"  Current hash: {current_hash}")

        # Generate new hash
        new_hash = pwd_context.hash(password)
        print(f"  New hash:     {new_hash[:40]}...")

        # Update using raw SQL to ensure it works
        db.execute(
            text(f"UPDATE {table} SET password_hash = :hash WHERE email = :email"),
            {"hash": new_hash, "email": email}
        )
        db.commit()

        # Verify the update
        db.refresh(account)

        # Test password verification
        if pwd_context.verify(password, account.password_hash):
            print(f"  Password verification: SUCCESS")
            return True
        else:
            print(f"  Password verification: FAILED")
            return False

    except Exception as e:
        print(f"  ERROR: {str(e)}")
        db.rollback()
        return False

def main():
    """Reset all demo account passwords."""
    print("\n" + "="*60)
    print("DOLLOR.AI DEMO ACCOUNT PASSWORD RESET")
    print("="*60)

    db = SessionLocal()
    results = {}

    try:
        for account_type, config in DEMO_ACCOUNTS.items():
            success = reset_password(db, account_type, config)
            results[account_type] = success

        # Summary
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)

        all_success = True
        for account_type, success in results.items():
            status = "SUCCESS" if success else "FAILED"
            email = DEMO_ACCOUNTS[account_type]["email"]
            password = DEMO_ACCOUNTS[account_type]["password"]
            print(f"  {account_type.upper():10} | {status:7} | {email} / {password}")
            if not success:
                all_success = False

        print("\n" + "="*60)
        if all_success:
            print("ALL DEMO ACCOUNTS RESET SUCCESSFULLY!")
        else:
            print("SOME ACCOUNTS FAILED - CHECK ERRORS ABOVE")
        print("="*60 + "\n")

        return 0 if all_success else 1

    except Exception as e:
        print(f"\nFATAL ERROR: {str(e)}")
        return 1
    finally:
        db.close()

if __name__ == "__main__":
    sys.exit(main())
