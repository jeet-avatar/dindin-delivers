#!/usr/bin/env python3
"""
Script to upload documents for Il Sole Cucina (Vendor ID: 42)
Updates the database directly with document flags and URLs
"""

import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load environment
from dotenv import load_dotenv
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# Vendor ID to update
VENDOR_ID = 42

# Document URLs - Using placeholder URLs for demonstration
# In production, these would be S3 or cloud storage URLs
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DOCUMENTS_DIR = os.environ.get("DOCUMENTS_DIR", os.path.join(SCRIPT_DIR, "documents"))

# Document data
documents = {
    "w9_form": {
        "flag": True,
        "url": f"file://{DOCUMENTS_DIR}/w9_form_il_sole_cucina.pdf"
    },
    "insurance": {
        "flag": True,
        "url": f"file://{DOCUMENTS_DIR}/liability_insurance_il_sole_cucina.pdf"
    },
    "food_license": {
        "flag": True,
        "url": f"file://{DOCUMENTS_DIR}/business_license_il_sole_cucina.pdf"
    },
    "health_permit": {
        "flag": True,
        "url": f"file://{DOCUMENTS_DIR}/health_permit_il_sole_cucina.pdf"
    },
    "compliance_certs": {
        "flag": True,
        "url": f"file://{DOCUMENTS_DIR}/food_handler_cert_il_sole_cucina.pdf"
    }
}


def update_vendor_documents():
    """Update vendor document flags and URLs"""
    session = Session()

    try:
        # Check if vendor exists
        result = session.execute(
            text("SELECT id, vendor_id, restaurant_name, onboarding_status FROM vendors WHERE id = :id"),
            {"id": VENDOR_ID}
        )
        vendor = result.fetchone()

        if not vendor:
            print(f"ERROR: Vendor with ID {VENDOR_ID} not found")
            return False

        print(f"Found vendor: {vendor.restaurant_name} (ID: {vendor.id})")
        print(f"Current status: {vendor.onboarding_status}")
        print()

        # Update document flags and URLs
        update_query = """
            UPDATE vendors SET
                w9_form = :w9_form,
                w9_form_url = :w9_form_url,
                insurance = :insurance,
                insurance_url = :insurance_url,
                food_license = :food_license,
                food_license_url = :food_license_url,
                health_permit = :health_permit,
                health_permit_url = :health_permit_url,
                compliance_certs = :compliance_certs,
                compliance_certs_url = :compliance_certs_url,
                onboarding_phase = 'UNDER_REVIEW',
                last_activity = :last_activity
            WHERE id = :vendor_id
        """

        session.execute(
            text(update_query),
            {
                "w9_form": documents["w9_form"]["flag"],
                "w9_form_url": documents["w9_form"]["url"],
                "insurance": documents["insurance"]["flag"],
                "insurance_url": documents["insurance"]["url"],
                "food_license": documents["food_license"]["flag"],
                "food_license_url": documents["food_license"]["url"],
                "health_permit": documents["health_permit"]["flag"],
                "health_permit_url": documents["health_permit"]["url"],
                "compliance_certs": documents["compliance_certs"]["flag"],
                "compliance_certs_url": documents["compliance_certs"]["url"],
                "last_activity": datetime.now(),
                "vendor_id": VENDOR_ID
            }
        )

        session.commit()
        print("=" * 50)
        print("Documents updated successfully!")
        print("=" * 50)
        print()
        print("Updated documents:")
        for doc_type, doc_info in documents.items():
            print(f"  - {doc_type}: {doc_info['flag']}")
            print(f"    URL: {doc_info['url']}")
        print()
        print("Onboarding phase set to: under_review")

        return True

    except Exception as e:
        print(f"ERROR: {str(e)}")
        session.rollback()
        return False
    finally:
        session.close()


def verify_update():
    """Verify the update was successful"""
    session = Session()

    try:
        result = session.execute(
            text("""
                SELECT id, vendor_id, restaurant_name, onboarding_status, onboarding_phase,
                       w9_form, insurance, food_license, health_permit, compliance_certs,
                       w9_form_url, insurance_url, food_license_url, health_permit_url, compliance_certs_url
                FROM vendors WHERE id = :id
            """),
            {"id": VENDOR_ID}
        )
        vendor = result.fetchone()

        if vendor:
            print()
            print("=" * 50)
            print("VERIFICATION - Current Vendor Status:")
            print("=" * 50)
            print(f"Restaurant: {vendor.restaurant_name}")
            print(f"Vendor ID: {vendor.vendor_id}")
            print(f"Onboarding Status: {vendor.onboarding_status}")
            print(f"Onboarding Phase: {vendor.onboarding_phase}")
            print()
            print("Document Status:")
            print(f"  W-9 Form: {'✓' if vendor.w9_form else '✗'}")
            print(f"  Insurance: {'✓' if vendor.insurance else '✗'}")
            print(f"  Food License: {'✓' if vendor.food_license else '✗'}")
            print(f"  Health Permit: {'✓' if vendor.health_permit else '✗'}")
            print(f"  Compliance Certs: {'✓' if vendor.compliance_certs else '✗'}")

    except Exception as e:
        print(f"Verification error: {str(e)}")
    finally:
        session.close()


if __name__ == "__main__":
    print("Uploading documents for Il Sole Cucina...")
    print()

    success = update_vendor_documents()

    if success:
        verify_update()
        print()
        print("=" * 50)
        print("NEXT STEPS:")
        print("=" * 50)
        print("1. Go to the Admin Dashboard: https://api.dollor.ai/vendor-management")
        print("2. Find 'Il Sole Cucina' in the vendor list")
        print("3. Review and approve the vendor")
        print()
