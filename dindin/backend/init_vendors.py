import os
from dotenv import load_dotenv
from database import init_db, SessionLocal
from models import Vendor, VendorStatus, OnboardingPhase, RiskRating
from datetime import datetime, timedelta

load_dotenv()

def create_sample_vendors():
    """Create sample vendor data for testing ZIP integration"""
    db = SessionLocal()
    
    try:
        # Check if vendors exist
        if db.query(Vendor).count() > 0:
            print("✓ Vendors already exist")
            return
        
        vendors = [
            Vendor(
                vendor_id="VEN-202411-0001",
                company_name="Tech Solutions Inc.",
                tax_id="12-3456789",
                business_type="Corporation",
                industry="Technology",
                website="https://techsolutions.com",
                contact_name="John Smith",
                contact_email="john.smith@techsolutions.com",
                contact_phone="(555) 123-4567",
                contact_title="VP of Sales",
                street="123 Tech Street",
                city="San Francisco",
                state="CA",
                zip_code="94105",
                country="US",
                onboarding_status=VendorStatus.APPROVED,
                onboarding_phase=OnboardingPhase.COMPLETED,
                risk_rating=RiskRating.LOW,
                performance_score=95,
                contract_status="active",
                zip_status="approved",
                w9_form=True,
                insurance=True,
                financial_statements=True,
                compliance_certs=True,
                security_policy=True,
                created_at=datetime.now() - timedelta(days=90),
                approved_at=datetime.now() - timedelta(days=60),
                last_activity=datetime.now() - timedelta(days=5)
            ),
            Vendor(
                vendor_id="VEN-202411-0002",
                company_name="Marketing Pros LLC",
                tax_id="98-7654321",
                business_type="LLC",
                industry="Marketing",
                website="https://marketingpros.com",
                contact_name="Sarah Johnson",
                contact_email="sarah@marketingpros.com",
                contact_phone="(555) 987-6543",
                contact_title="Account Manager",
                street="456 Marketing Ave",
                city="New York",
                state="NY",
                zip_code="10001",
                country="US",
                onboarding_status=VendorStatus.IN_REVIEW,
                onboarding_phase=OnboardingPhase.UNDER_REVIEW,
                risk_rating=RiskRating.MEDIUM,
                performance_score=78,
                contract_status="pending",
                zip_status="pending",
                w9_form=True,
                insurance=True,
                financial_statements=False,
                compliance_certs=True,
                security_policy=False,
                created_at=datetime.now() - timedelta(days=30),
                last_activity=datetime.now() - timedelta(days=2)
            ),
            Vendor(
                vendor_id="VEN-202411-0003",
                company_name="Global Services Corp",
                tax_id="45-6789012",
                business_type="Corporation",
                industry="Professional Services",
                website="https://globalservices.com",
                contact_name="Michael Chen",
                contact_email="mchen@globalservices.com",
                contact_phone="(555) 456-7890",
                contact_title="Business Development",
                street="789 Service Blvd",
                city="Chicago",
                state="IL",
                zip_code="60601",
                country="US",
                onboarding_status=VendorStatus.PENDING,
                onboarding_phase=OnboardingPhase.DOCUMENTS_PENDING,
                risk_rating=RiskRating.HIGH,
                performance_score=0,
                contract_status="not_started",
                zip_status="pending",
                w9_form=False,
                insurance=False,
                financial_statements=False,
                compliance_certs=False,
                security_policy=False,
                created_at=datetime.now() - timedelta(days=7),
                last_activity=datetime.now() - timedelta(days=1)
            ),
            Vendor(
                vendor_id="VEN-202411-0004",
                company_name="Facility Solutions Inc",
                tax_id="78-9012345",
                business_type="Corporation",
                industry="Facilities Management",
                website="https://facilitysolutions.com",
                contact_name="Emily Rodriguez",
                contact_email="emily@facilitysolutions.com",
                contact_phone="(555) 321-9876",
                contact_title="Operations Manager",
                street="321 Facility Way",
                city="Austin",
                state="TX",
                zip_code="78701",
                country="US",
                onboarding_status=VendorStatus.APPROVED,
                onboarding_phase=OnboardingPhase.COMPLETED,
                risk_rating=RiskRating.LOW,
                performance_score=88,
                contract_status="active",
                zip_status="approved",
                w9_form=True,
                insurance=True,
                financial_statements=True,
                compliance_certs=True,
                security_policy=True,
                created_at=datetime.now() - timedelta(days=120),
                approved_at=datetime.now() - timedelta(days=90),
                last_activity=datetime.now() - timedelta(days=3)
            ),
            Vendor(
                vendor_id="VEN-202411-0005",
                company_name="IT Services Group",
                tax_id="23-4567890",
                business_type="Partnership",
                industry="IT Services",
                website="https://itservicesgroup.com",
                contact_name="David Kim",
                contact_email="david@itservicesgroup.com",
                contact_phone="(555) 654-3210",
                contact_title="Director",
                street="654 IT Plaza",
                city="Seattle",
                state="WA",
                zip_code="98101",
                country="US",
                onboarding_status=VendorStatus.IN_REVIEW,
                onboarding_phase=OnboardingPhase.COMPLIANCE_CHECK,
                risk_rating=RiskRating.MEDIUM,
                performance_score=82,
                contract_status="pending",
                zip_status="under_review",
                w9_form=True,
                insurance=True,
                financial_statements=True,
                compliance_certs=False,
                security_policy=True,
                created_at=datetime.now() - timedelta(days=45),
                last_activity=datetime.now() - timedelta(days=1)
            )
        ]
        
        for vendor in vendors:
            db.add(vendor)
        
        db.commit()
        print(f"✓ Created {len(vendors)} sample vendors")
        print("\n📋 Sample Vendors:")
        for vendor in vendors:
            print(f"   • {vendor.company_name} ({vendor.vendor_id}) - Status: {vendor.onboarding_status.value}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 Initializing vendor tables...")
    init_db()
    print("✓ Database tables created")
    print("\n📦 Creating sample vendor data...")
    create_sample_vendors()
    print("\n✅ Vendor database initialization completed successfully!")
