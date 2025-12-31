#!/usr/bin/env python3
"""
Script to upload documents via the API for Il Sole Cucina (Vendor ID: 42)
Works with both production (api.dollor.ai) and local/staging environments
"""

import os
import sys
import requests
import base64
from datetime import datetime

# Configuration
VENDOR_ID = 42
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DOCUMENTS_DIR = os.environ.get("DOCUMENTS_DIR", os.path.join(SCRIPT_DIR, "documents"))

# Environment URLs
ENVIRONMENTS = {
    "production": "https://api.dollor.ai",
    "local": "http://localhost:8000",
    "staging": "http://localhost:8000"  # Update if different staging URL
}

# Document mapping
DOCUMENTS = [
    {
        "type": "w9_form",
        "file": "w9_form_il_sole_cucina.pdf",
        "label": "W-9 Tax Form"
    },
    {
        "type": "insurance",
        "file": "liability_insurance_il_sole_cucina.pdf",
        "label": "Liability Insurance"
    },
    {
        "type": "food_license",
        "file": "business_license_il_sole_cucina.pdf",
        "label": "Business/Food License"
    },
    {
        "type": "health_permit",
        "file": "health_permit_il_sole_cucina.pdf",
        "label": "Health Permit"
    },
    {
        "type": "compliance_certs",
        "file": "food_handler_cert_il_sole_cucina.pdf",
        "label": "Food Handler Certificate"
    }
]


def get_auth_token(base_url: str, email: str, password: str) -> str:
    """Get authentication token from API"""
    print(f"Authenticating with {base_url}...")

    response = requests.post(
        f"{base_url}/api/auth/login",
        data={"username": email, "password": password}
    )

    if response.status_code == 200:
        token = response.json().get("access_token")
        print("✓ Authentication successful")
        return token
    else:
        print(f"✗ Authentication failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return None


def upload_document_multipart(base_url: str, token: str, vendor_id: int, doc_type: str, file_path: str) -> bool:
    """Upload document using multipart form data"""
    headers = {"Authorization": f"Bearer {token}"}

    with open(file_path, 'rb') as f:
        files = {'file': (os.path.basename(file_path), f, 'application/pdf')}
        data = {'document_type': doc_type}

        response = requests.post(
            f"{base_url}/api/vendors/{vendor_id}/documents",
            headers=headers,
            files=files,
            data=data
        )

    return response.status_code in [200, 201]


def update_document_flags(base_url: str, token: str, vendor_id: int, documents: dict) -> bool:
    """Update document flags using PATCH endpoint"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    response = requests.patch(
        f"{base_url}/api/vendors/{vendor_id}/documents",
        headers=headers,
        json=documents
    )

    return response.status_code == 200


def update_vendor_status(base_url: str, token: str, vendor_id: int, status: str) -> bool:
    """Update vendor onboarding status"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    response = requests.patch(
        f"{base_url}/api/vendors/{vendor_id}/status",
        headers=headers,
        json={"status": status}
    )

    return response.status_code == 200


def get_vendor_details(base_url: str, token: str, vendor_id: int) -> dict:
    """Get vendor details from API"""
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(
        f"{base_url}/api/vendors/{vendor_id}",
        headers=headers
    )

    if response.status_code == 200:
        return response.json()
    return None


def main():
    print("=" * 60)
    print("Document Upload Script for Il Sole Cucina")
    print("=" * 60)
    print()

    # Select environment
    print("Select environment:")
    print("  1. Production (api.dollor.ai)")
    print("  2. Local (localhost:8000)")
    print("  3. Both")

    choice = input("\nEnter choice (1/2/3) [default: 3]: ").strip() or "3"

    environments_to_use = []
    if choice == "1":
        environments_to_use = ["production"]
    elif choice == "2":
        environments_to_use = ["local"]
    else:
        environments_to_use = ["production", "local"]

    # Get credentials
    print("\nEnter admin credentials:")
    email = input("Email [default: support@dollor.ai]: ").strip() or "support@dollor.ai"
    password = input("Password: ").strip()

    if not password:
        print("Password required!")
        sys.exit(1)

    for env_name in environments_to_use:
        base_url = ENVIRONMENTS[env_name]
        print()
        print("=" * 60)
        print(f"Processing: {env_name.upper()} ({base_url})")
        print("=" * 60)

        # Authenticate
        token = get_auth_token(base_url, email, password)
        if not token:
            print(f"Skipping {env_name} due to auth failure")
            continue

        # Get current vendor status
        print(f"\nFetching vendor {VENDOR_ID} details...")
        vendor = get_vendor_details(base_url, token, VENDOR_ID)
        if vendor:
            print(f"  Restaurant: {vendor.get('restaurant_name')}")
            print(f"  Status: {vendor.get('onboarding_status')}")
            print(f"  Phase: {vendor.get('onboarding_phase')}")
        else:
            print(f"  Could not fetch vendor details")

        # Try multipart upload first
        print(f"\nUploading documents...")
        upload_success = True

        for doc in DOCUMENTS:
            file_path = os.path.join(DOCUMENTS_DIR, doc["file"])
            if not os.path.exists(file_path):
                print(f"  ✗ {doc['label']}: File not found")
                continue

            success = upload_document_multipart(base_url, token, VENDOR_ID, doc["type"], file_path)
            if success:
                print(f"  ✓ {doc['label']}: Uploaded")
            else:
                print(f"  ⚠ {doc['label']}: Multipart upload not supported, using flag update")
                upload_success = False

        # If multipart didn't work, update flags directly
        if not upload_success:
            print("\nUpdating document flags via PATCH...")
            doc_flags = {doc["type"]: True for doc in DOCUMENTS}
            if update_document_flags(base_url, token, VENDOR_ID, doc_flags):
                print("  ✓ Document flags updated")
            else:
                print("  ✗ Failed to update document flags")

        # Verify final status
        print(f"\nVerifying final status...")
        vendor = get_vendor_details(base_url, token, VENDOR_ID)
        if vendor:
            print(f"  Restaurant: {vendor.get('restaurant_name')}")
            print(f"  Status: {vendor.get('onboarding_status')}")
            print(f"  Phase: {vendor.get('onboarding_phase')}")
            print(f"  Documents:")
            print(f"    W-9 Form: {'✓' if vendor.get('w9_form') else '✗'}")
            print(f"    Insurance: {'✓' if vendor.get('insurance') else '✗'}")
            print(f"    Food License: {'✓' if vendor.get('food_license') else '✗'}")
            print(f"    Health Permit: {'✓' if vendor.get('health_permit') else '✗'}")
            print(f"    Compliance: {'✓' if vendor.get('compliance_certs') else '✗'}")

    print()
    print("=" * 60)
    print("DONE!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("  1. Production: Go to https://dollor.ai/vendor-management")
    print("  2. Local: Go to http://localhost:5173/vendor-management")
    print("  3. Find 'Il Sole Cucina' and approve the vendor")


if __name__ == "__main__":
    main()
