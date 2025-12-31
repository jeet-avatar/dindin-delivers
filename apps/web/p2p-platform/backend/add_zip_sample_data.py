"""
Add sample vendor data for ZIP Dashboard
This populates the vendors table with test data for the ZIP onboarding dashboard
"""

from database import SessionLocal
from models import Vendor, VendorStatus, OnboardingPhase, RiskRating
from datetime import datetime, timedelta
import random

def add_sample_vendors():
    db = SessionLocal()
    
    # Check if we already have vendors
    existing_count = db.query(Vendor).count()
    if existing_count > 5:
        print(f"✓ Already have {existing_count} vendors in database")
        db.close()
        return
    
    print("Adding sample vendors for ZIP Dashboard...")
    
    # Sample vendor data
    vendors_data = [
        {
            "restaurant_name": "The Golden Spoon",
            "cuisine_type": "American",
            "contact_name": "Sarah Johnson",
            "contact_email": "sarah@goldenspoon.com",
            "contact_phone": "(555) 100-2001",
            "status": VendorStatus.APPROVED,
            "phase": OnboardingPhase.COMPLETED,
            "days_ago": 120
        },
        {
            "restaurant_name": "Dragon Wok Express",
            "cuisine_type": "Chinese",
            "contact_name": "Michael Chen",
            "contact_email": "michael@dragonwok.com",
            "contact_phone": "(555) 100-2002",
            "status": VendorStatus.APPROVED,
            "phase": OnboardingPhase.COMPLETED,
            "days_ago": 90
        },
        {
            "restaurant_name": "Mama's Italian Kitchen",
            "cuisine_type": "Italian",
            "contact_name": "Giuseppe Romano",
            "contact_email": "giuseppe@mamaskitchen.com",
            "contact_phone": "(555) 100-2003",
            "status": VendorStatus.APPROVED,
            "phase": OnboardingPhase.COMPLETED,
            "days_ago": 60
        },
        {
            "restaurant_name": "Taco Fiesta",
            "cuisine_type": "Mexican",
            "contact_name": "Carlos Rodriguez",
            "contact_email": "carlos@tacofiesta.com",
            "contact_phone": "(555) 100-2004",
            "status": VendorStatus.IN_REVIEW,
            "phase": OnboardingPhase.UNDER_REVIEW,
            "days_ago": 5
        },
        {
            "restaurant_name": "Curry House",
            "cuisine_type": "Indian",
            "contact_name": "Priya Patel",
            "contact_email": "priya@curryhouse.com",
            "contact_phone": "(555) 100-2005",
            "status": VendorStatus.IN_REVIEW,
            "phase": OnboardingPhase.COMPLIANCE_CHECK,
            "days_ago": 8
        },
        {
            "restaurant_name": "Sushi Bar Tokyo",
            "cuisine_type": "Japanese",
            "contact_name": "Yuki Tanaka",
            "contact_email": "yuki@sushibartokyo.com",
            "contact_phone": "(555) 100-2006",
            "status": VendorStatus.PENDING,
            "phase": OnboardingPhase.DOCUMENTS_PENDING,
            "days_ago": 3
        },
        {
            "restaurant_name": "Thai Basil",
            "cuisine_type": "Thai",
            "contact_name": "Somchai Wong",
            "contact_email": "somchai@thaibasil.com",
            "contact_phone": "(555) 100-2007",
            "status": VendorStatus.PENDING,
            "phase": OnboardingPhase.DOCUMENTS_PENDING,
            "days_ago": 2
        },
        {
            "restaurant_name": "Mediterranean Grill",
            "cuisine_type": "Mediterranean",
            "contact_name": "Ahmed Hassan",
            "contact_email": "ahmed@medgrill.com",
            "contact_phone": "(555) 100-2008",
            "status": VendorStatus.IN_REVIEW,
            "phase": OnboardingPhase.UNDER_REVIEW,
            "days_ago": 6
        },
        {
            "restaurant_name": "Le Petit Bistro",
            "cuisine_type": "French",
            "contact_name": "Pierre Dubois",
            "contact_email": "pierre@petitbistro.com",
            "contact_phone": "(555) 100-2009",
            "status": VendorStatus.REJECTED,
            "phase": OnboardingPhase.NOT_STARTED,
            "days_ago": 15
        },
        {
            "restaurant_name": "Seoul BBQ House",
            "cuisine_type": "Korean",
            "contact_name": "Kim Min-jun",
            "contact_email": "minjun@seoulbbq.com",
            "contact_phone": "(555) 100-2010",
            "status": VendorStatus.APPROVED,
            "phase": OnboardingPhase.COMPLETED,
            "days_ago": 45
        }
    ]
    
    vendor_count = db.query(Vendor).count()
    
    for idx, vendor_data in enumerate(vendors_data):
        vendor_num = vendor_count + idx + 1
        vendor_id = f"VEN-{datetime.now().year}{datetime.now().month:02d}-{vendor_num:04d}"
        
        created_date = datetime.now() - timedelta(days=vendor_data["days_ago"])
        
        vendor = Vendor(
            vendor_id=vendor_id,
            company_name=vendor_data["restaurant_name"],
            restaurant_name=vendor_data["restaurant_name"],
            cuisine_type=vendor_data["cuisine_type"],
            contact_name=vendor_data["contact_name"],
            contact_email=vendor_data["contact_email"],
            contact_phone=vendor_data["contact_phone"],
            street=f"{random.randint(100, 9999)} Main Street",
            city="San Francisco",
            state="CA",
            zip_code=f"941{random.randint(10, 99)}",
            onboarding_status=vendor_data["status"],
            onboarding_phase=vendor_data["phase"],
            risk_rating=random.choice([RiskRating.LOW, RiskRating.MEDIUM]),
            performance_score=random.randint(75, 100),
            seating_capacity=random.randint(20, 100),
            delivery_available=random.choice([True, False]),
            pickup_available=True,
            average_prep_time=random.randint(15, 45),
            w9_form=vendor_data["status"] in [VendorStatus.APPROVED, VendorStatus.IN_REVIEW],
            insurance=vendor_data["status"] == VendorStatus.APPROVED,
            food_license=vendor_data["status"] in [VendorStatus.APPROVED, VendorStatus.IN_REVIEW],
            health_permit=vendor_data["status"] == VendorStatus.APPROVED,
            created_at=created_date,
            approved_at=created_date + timedelta(days=12) if vendor_data["status"] == VendorStatus.APPROVED else None,
            last_activity=created_date + timedelta(days=random.randint(0, 3))
        )
        
        db.add(vendor)
        print(f"  ✓ Added {vendor_data['restaurant_name']} ({vendor_data['status'].value})")
    
    db.commit()
    print(f"\n✅ Successfully added {len(vendors_data)} sample vendors!")
    print("\n📊 Vendor Status Summary:")
    for status in VendorStatus:
        count = db.query(Vendor).filter(Vendor.onboarding_status == status).count()
        if count > 0:
            print(f"   {status.value.upper()}: {count} vendors")
    
    db.close()

if __name__ == "__main__":
    print("Adding sample vendor data for ZIP Dashboard...")
    print("-" * 50)
    add_sample_vendors()
    print("\nZIP Dashboard is now ready with sample data!")
