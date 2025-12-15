import os
from dotenv import load_dotenv
from database import init_db, SessionLocal
from models import User, Client, Invoice, InvoiceItem, Payment, UserRole, InvoiceStatus
from datetime import datetime, timedelta
from passlib.context import CryptContext

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_sample_data():
    """Create sample data for testing"""
    db = SessionLocal()
    
    try:
        # Check if admin user exists
        admin = db.query(User).filter(User.email == "admin@invoice.com").first()
        if not admin:
            admin = User(
                email="admin@invoice.com",
                password_hash=pwd_context.hash("admin123"),
                full_name="Admin User",
                role=UserRole.ADMIN
            )
            db.add(admin)
            print("✓ Created admin user (email: admin@invoice.com, password: admin123)")
        
        # Create sample clients
        if db.query(Client).count() == 0:
            clients = [
                Client(
                    name="Acme Corporation",
                    email="contact@acme.com",
                    phone="+1 (555) 123-4567",
                    company="Acme Corp",
                    address="123 Business St",
                    city="New York",
                    state="NY",
                    zip_code="10001",
                    country="USA",
                    notes="Major client - Net 30 terms"
                ),
                Client(
                    name="TechStart Inc",
                    email="billing@techstart.com",
                    phone="+1 (555) 987-6543",
                    company="TechStart",
                    address="456 Tech Ave",
                    city="San Francisco",
                    state="CA",
                    zip_code="94102",
                    country="USA"
                ),
                Client(
                    name="Global Solutions Ltd",
                    email="ap@globalsolutions.com",
                    phone="+1 (555) 456-7890",
                    company="Global Solutions",
                    address="789 Enterprise Blvd",
                    city="Chicago",
                    state="IL",
                    zip_code="60601",
                    country="USA"
                )
            ]
            for client in clients:
                db.add(client)
            print(f"✓ Created {len(clients)} sample clients")
        
        db.commit()
        
        # Create sample invoices
        if db.query(Invoice).count() == 0:
            clients = db.query(Client).all()
            today = datetime.now()
            
            # Invoice 1 - Paid
            inv1 = Invoice(
                invoice_number="INV-202411-0001",
                user_id=admin.id,
                client_id=clients[0].id,
                issue_date=today - timedelta(days=30),
                due_date=today - timedelta(days=15),
                subtotal=5000.00,
                tax_rate=8.5,
                tax_amount=425.00,
                discount_amount=0,
                total_amount=5425.00,
                status=InvoiceStatus.PAID,
                notes="Website development services",
                terms="Net 30"
            )
            db.add(inv1)
            db.flush()
            
            items1 = [
                InvoiceItem(invoice_id=inv1.id, description="Website Design", quantity=1, unit_price=2500, amount=2500),
                InvoiceItem(invoice_id=inv1.id, description="Backend Development", quantity=1, unit_price=2000, amount=2000),
                InvoiceItem(invoice_id=inv1.id, description="Testing & QA", quantity=1, unit_price=500, amount=500)
            ]
            for item in items1:
                db.add(item)
            
            # Invoice 2 - Sent (Partially Paid)
            inv2 = Invoice(
                invoice_number="INV-202411-0002",
                user_id=admin.id,
                client_id=clients[1].id,
                issue_date=today - timedelta(days=15),
                due_date=today + timedelta(days=15),
                subtotal=3200.00,
                tax_rate=8.5,
                tax_amount=272.00,
                discount_amount=100,
                total_amount=3372.00,
                status=InvoiceStatus.SENT,
                notes="Monthly consulting services",
                terms="Net 30"
            )
            db.add(inv2)
            db.flush()
            
            items2 = [
                InvoiceItem(invoice_id=inv2.id, description="Consulting Hours (40hrs)", quantity=40, unit_price=80, amount=3200)
            ]
            for item in items2:
                db.add(item)
            
            # Invoice 3 - Overdue
            inv3 = Invoice(
                invoice_number="INV-202411-0003",
                user_id=admin.id,
                client_id=clients[2].id,
                issue_date=today - timedelta(days=45),
                due_date=today - timedelta(days=15),
                subtotal=1500.00,
                tax_rate=8.5,
                tax_amount=127.50,
                discount_amount=0,
                total_amount=1627.50,
                status=InvoiceStatus.OVERDUE,
                notes="Logo design and branding",
                terms="Net 30"
            )
            db.add(inv3)
            db.flush()
            
            items3 = [
                InvoiceItem(invoice_id=inv3.id, description="Logo Design", quantity=1, unit_price=1000, amount=1000),
                InvoiceItem(invoice_id=inv3.id, description="Brand Guidelines", quantity=1, unit_price=500, amount=500)
            ]
            for item in items3:
                db.add(item)
            
            # Invoice 4 - Draft
            inv4 = Invoice(
                invoice_number="INV-202411-0004",
                user_id=admin.id,
                client_id=clients[0].id,
                issue_date=today,
                due_date=today + timedelta(days=30),
                subtotal=2400.00,
                tax_rate=8.5,
                tax_amount=204.00,
                discount_amount=0,
                total_amount=2604.00,
                status=InvoiceStatus.DRAFT,
                notes="Mobile app maintenance",
                terms="Net 30"
            )
            db.add(inv4)
            db.flush()
            
            items4 = [
                InvoiceItem(invoice_id=inv4.id, description="Bug Fixes", quantity=10, unit_price=120, amount=1200),
                InvoiceItem(invoice_id=inv4.id, description="Feature Updates", quantity=12, unit_price=100, amount=1200)
            ]
            for item in items4:
                db.add(item)
            
            print("✓ Created 4 sample invoices")
            
            # Add payment for invoice 1
            payment1 = Payment(
                invoice_id=inv1.id,
                amount=5425.00,
                payment_date=today - timedelta(days=10),
                payment_method="Bank Transfer",
                reference_number="TXN-20241115-001"
            )
            db.add(payment1)
            
            # Add partial payment for invoice 2
            payment2 = Payment(
                invoice_id=inv2.id,
                amount=1686.00,
                payment_date=today - timedelta(days=5),
                payment_method="Credit Card",
                reference_number="TXN-20241120-002"
            )
            db.add(payment2)
            
            print("✓ Created 2 sample payments")
        
        db.commit()
        print("\n✅ Database initialization completed successfully!")
        print("\n📋 Login credentials:")
        print("   Email: admin@invoice.com")
        print("   Password: admin123")
        print("\n🚀 Start the server with: uvicorn main:app --reload --port 3000")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 Initializing database...")
    init_db()
    print("✓ Database tables created")
    print("\n📦 Creating sample data...")
    create_sample_data()
