#!/usr/bin/env python3
"""
GoDaddy DNS Configuration for Dollor.ai
Adds MX record for AWS SES email receiving
"""

import os
import sys
import requests

# Domain configuration
DOMAIN = "dollor.ai"

# AWS SES MX record for us-east-1
SES_MX_RECORD = "inbound-smtp.us-east-1.amazonaws.com"

def get_godaddy_records(api_key, api_secret, domain):
    """Get current DNS records"""
    headers = {
        "Authorization": f"sso-key {api_key}:{api_secret}",
        "Content-Type": "application/json"
    }

    url = f"https://api.godaddy.com/v1/domains/{domain}/records"
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error getting records: {response.status_code} - {response.text}")
        return None

def add_mx_record(api_key, api_secret, domain, mx_server, priority=10):
    """Add MX record to domain"""
    headers = {
        "Authorization": f"sso-key {api_key}:{api_secret}",
        "Content-Type": "application/json"
    }

    # Add MX record - name "@" for root domain
    mx_record = [{
        "data": mx_server,
        "name": "@",
        "priority": priority,
        "ttl": 3600
    }]

    url = f"https://api.godaddy.com/v1/domains/{domain}/records/MX"
    response = requests.put(url, headers=headers, json=mx_record)

    if response.status_code in [200, 204]:
        return True
    else:
        print(f"Error adding MX record: {response.status_code} - {response.text}")
        return False

def add_txt_record(api_key, api_secret, domain, name, value):
    """Add TXT record (for SPF/DKIM)"""
    headers = {
        "Authorization": f"sso-key {api_key}:{api_secret}",
        "Content-Type": "application/json"
    }

    txt_record = [{
        "data": value,
        "name": name,
        "ttl": 3600
    }]

    url = f"https://api.godaddy.com/v1/domains/{domain}/records/TXT/{name}"
    response = requests.put(url, headers=headers, json=txt_record)

    return response.status_code in [200, 204]

def configure_dns():
    """Configure DNS records for email"""

    print("=" * 65)
    print("🌐 GoDaddy DNS Configuration for dollor.ai")
    print("=" * 65)
    print("")

    # Get API credentials
    api_key = os.environ.get('GODADDY_API_KEY')
    api_secret = os.environ.get('GODADDY_API_SECRET')

    if not api_key or not api_secret:
        if len(sys.argv) == 3:
            api_key = sys.argv[1]
            api_secret = sys.argv[2]
        else:
            print("⚠️  GoDaddy API Credentials Required")
            print("")
            print("To get your API credentials:")
            print("  1. Go to: https://developer.godaddy.com/keys")
            print("  2. Click 'Create New API Key'")
            print("  3. Select 'Production' environment")
            print("  4. Copy the Key and Secret")
            print("")
            print("Then run one of:")
            print("  export GODADDY_API_KEY=your_key")
            print("  export GODADDY_API_SECRET=your_secret")
            print("  python3 configure-dollor-dns.py")
            print("")
            print("Or:")
            print("  python3 configure-dollor-dns.py YOUR_API_KEY YOUR_API_SECRET")
            print("=" * 65)
            return False

    try:
        # Get current records
        print("📋 Getting current DNS records...")
        records = get_godaddy_records(api_key, api_secret, DOMAIN)

        if records:
            print("   Current records found:")
            mx_exists = False
            for record in records:
                if record.get('type') == 'MX':
                    print(f"   ✓ MX: {record.get('data')} (priority: {record.get('priority', 'N/A')})")
                    mx_exists = True

            if not mx_exists:
                print("   ⚠️  No MX records found")
        print("")

        # Add MX record for AWS SES
        print("➕ Adding MX record for AWS SES...")
        if add_mx_record(api_key, api_secret, DOMAIN, SES_MX_RECORD, 10):
            print(f"   ✅ MX record added: {DOMAIN} → {SES_MX_RECORD}")
        else:
            print("   ❌ Failed to add MX record")
            return False
        print("")

        # Add SPF record for SES
        print("➕ Adding SPF record for email authentication...")
        spf_value = "v=spf1 include:amazonses.com ~all"
        if add_txt_record(api_key, api_secret, DOMAIN, "@", spf_value):
            print(f"   ✅ SPF record added: {spf_value}")
        else:
            print("   ⚠️  SPF record may need manual update")
        print("")

        # Verify final configuration
        print("📋 Verifying configuration...")
        records = get_godaddy_records(api_key, api_secret, DOMAIN)
        if records:
            for record in records:
                if record.get('type') == 'MX':
                    print(f"   ✅ MX: {record.get('data')} (priority: {record.get('priority')})")
                if record.get('type') == 'TXT' and 'spf' in str(record.get('data', '')).lower():
                    print(f"   ✅ SPF: {record.get('data')}")
        print("")

        # Summary
        print("=" * 65)
        print("✅ DNS CONFIGURATION COMPLETE!")
        print("=" * 65)
        print("")
        print("Email addresses now available:")
        print("  • support@dollor.ai")
        print("  • privacy@dollor.ai")
        print("  • legal@dollor.ai")
        print("  • noreply@dollor.ai")
        print("  • *@dollor.ai (catch-all)")
        print("")
        print("Emails will be stored in S3:")
        print("  • s3://dollor-emails/support/")
        print("  • s3://dollor-emails/privacy/")
        print("  • s3://dollor-emails/catchall/")
        print("")
        print("⏳ DNS propagation: 5-30 minutes")
        print("")
        print("Test with:")
        print("  dig MX dollor.ai")
        print("=" * 65)

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = configure_dns()
    sys.exit(0 if success else 1)
