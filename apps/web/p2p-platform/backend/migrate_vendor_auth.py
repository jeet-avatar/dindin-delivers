"""
Migration script to add vendor_id column to users table
Run this after updating the models.py to include vendor_id
"""

from sqlalchemy import text
from database import engine, SessionLocal

def migrate():
    """Add vendor_id column to users table"""
    
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='vendor_id'
        """))
        
        if result.fetchone():
            print("✓ Column 'vendor_id' already exists in users table")
            return
        
        # Add vendor_id column
        print("Adding vendor_id column to users table...")
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN vendor_id INTEGER REFERENCES vendors(id)
        """))
        conn.commit()
        print("✓ Successfully added vendor_id column")
        
        # Create sample vendor user for testing
        db = SessionLocal()
        try:
            from models import User, Vendor, UserRole
            from passlib.context import CryptContext
            
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            
            # Check if any approved vendors exist
            approved_vendor = db.query(Vendor).filter(Vendor.onboarding_status == "approved").first()
            
            if approved_vendor:
                # Check if vendor user already exists
                existing_user = db.query(User).filter(User.email == approved_vendor.contact_email).first()
                
                if not existing_user:
                    vendor_user = User(
                        email=approved_vendor.contact_email,
                        password_hash=pwd_context.hash("vendor123"),
                        full_name=approved_vendor.contact_name or approved_vendor.restaurant_name,
                        role=UserRole.VENDOR,
                        vendor_id=approved_vendor.id
                    )
                    db.add(vendor_user)
                    db.commit()
                    print(f"✓ Created vendor user: {approved_vendor.contact_email} / vendor123")
                else:
                    print(f"✓ Vendor user already exists: {approved_vendor.contact_email}")
            else:
                print("ℹ No approved vendors found. Vendor users will be created upon approval.")
                
        except Exception as e:
            print(f"Warning: Could not create sample vendor user: {e}")
            db.rollback()
        finally:
            db.close()

if __name__ == "__main__":
    print("🔧 Running migration: Add vendor_id to users table...")
    try:
        migrate()
        print("\n✅ Migration completed successfully!")
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
