"""
Update database with Stripe payment tables
Run this after adding Order, StripePaymentLog, and VendorPayout models
"""

from database import engine, init_db
from models import Base, Order, StripePaymentLog, VendorPayout

def update_database():
    print("🔄 Updating database schema...")
    print("Adding tables: orders, stripe_payment_logs, vendor_payouts")
    
    try:
        # Create all tables (will skip existing ones)
        Base.metadata.create_all(bind=engine)
        print("✅ Database updated successfully!")
        print("\nNew tables added:")
        print("  • orders - Complete order management with Stripe integration")
        print("  • stripe_payment_logs - Payment event audit trail")
        print("  • vendor_payouts - Vendor accounting and Coupa sync")
        
    except Exception as e:
        print(f"❌ Error updating database: {e}")
        raise

if __name__ == "__main__":
    update_database()
