#!/usr/bin/env python3
"""Reset admin password and verify login"""
import os
from dotenv import load_dotenv
from database import SessionLocal
from models import User
from passlib.context import CryptContext

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def reset_admin_password():
    """Reset admin password from environment variable"""
    db = SessionLocal()

    try:
        admin = db.query(User).filter(User.email == "admin@invoice.com").first()
        if not admin:
            print("❌ Admin user not found!")
            return False

        # Hash the password from env var
        new_password = os.getenv("SAMPLE_ADMIN_PASSWORD")
        if not new_password:
            print("❌ SAMPLE_ADMIN_PASSWORD environment variable not set!")
            return False
        password_hash = pwd_context.hash(new_password)
        
        print(f"Old hash: {admin.password_hash[:50]}...")
        print(f"New hash: {password_hash[:50]}...")
        
        # Update password
        admin.password_hash = password_hash
        db.commit()
        
        # Verify the password works
        if pwd_context.verify(new_password, admin.password_hash):
            print("✅ Password reset successful and verified!")
            print(f"   Email: {admin.email}")
            print("   Password: [from SAMPLE_ADMIN_PASSWORD env var]")
            return True
        else:
            print("❌ Password verification failed after reset!")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 Resetting admin password...")
    reset_admin_password()
