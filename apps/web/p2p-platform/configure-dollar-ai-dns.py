#!/usr/bin/env python3
"""
Automated GoDaddy DNS Configuration for Dollar.ai
Configures dollar.ai DNS records for CloudFront and EC2 backend
"""

import os
import sys

try:
    from godaddypy import Client, Account
except ImportError:
    print("Installing godaddypy...")
    os.system("pip3 install godaddypy")
    from godaddypy import Client, Account

# Domain configuration
DOMAIN = "dollar.ai"

# AWS Infrastructure
CLOUDFRONT_DOMAIN = "d3pus2gxlb5cer.cloudfront.net"
EC2_PUBLIC_IP = "44.192.34.143"

def configure_dns(api_key: str, api_secret: str):
    """Configure DNS records via GoDaddy API"""

    print("=" * 65)
    print("GoDaddy DNS Configuration for dollar.ai")
    print("=" * 65)
    print("")

    try:
        # Initialize GoDaddy client
        print("Connecting to GoDaddy API...")
        account = Account(api_key=api_key, api_secret=api_secret)
        client = Client(account)

        print("Connected to GoDaddy API")
        print("")

        # Get current DNS records
        print("Current DNS records:")
        try:
            current_records = client.get_records(DOMAIN)
            for record in current_records[:10]:
                print(f"   {record.get('type')} {record.get('name')} -> {record.get('data')}")
        except Exception as e:
            print(f"   Could not fetch current records: {e}")
        print("")

        # Configure A record for root domain (points to EC2 for API or redirect)
        print("Adding/Updating A record for root domain (@)...")
        a_record = {
            "type": "A",
            "name": "@",
            "data": EC2_PUBLIC_IP,
            "ttl": 3600
        }
        try:
            client.update_record(DOMAIN, a_record)
            print(f"   A @ -> {EC2_PUBLIC_IP}")
        except Exception as e:
            print(f"   Error setting A record: {e}")
            # Try adding instead of updating
            try:
                client.add_record(DOMAIN, a_record)
                print(f"   A @ -> {EC2_PUBLIC_IP} (added)")
            except Exception as e2:
                print(f"   Could not add A record: {e2}")

        # Configure CNAME for www subdomain
        print("Adding/Updating CNAME record for www...")
        www_record = {
            "type": "CNAME",
            "name": "www",
            "data": CLOUDFRONT_DOMAIN,
            "ttl": 3600
        }
        try:
            client.update_record(DOMAIN, www_record)
            print(f"   CNAME www -> {CLOUDFRONT_DOMAIN}")
        except Exception as e:
            try:
                client.add_record(DOMAIN, www_record)
                print(f"   CNAME www -> {CLOUDFRONT_DOMAIN} (added)")
            except Exception as e2:
                print(f"   Error with www CNAME: {e2}")

        # Configure A record for api subdomain
        print("Adding/Updating A record for api subdomain...")
        api_record = {
            "type": "A",
            "name": "api",
            "data": EC2_PUBLIC_IP,
            "ttl": 3600
        }
        try:
            client.update_record(DOMAIN, api_record)
            print(f"   A api -> {EC2_PUBLIC_IP}")
        except Exception as e:
            try:
                client.add_record(DOMAIN, api_record)
                print(f"   A api -> {EC2_PUBLIC_IP} (added)")
            except Exception as e2:
                print(f"   Error with api A record: {e2}")

        print("")
        print("=" * 65)
        print("DNS CONFIGURATION COMPLETE!")
        print("=" * 65)
        print("")
        print("Configured records:")
        print(f"  A     @   -> {EC2_PUBLIC_IP}")
        print(f"  CNAME www -> {CLOUDFRONT_DOMAIN}")
        print(f"  A     api -> {EC2_PUBLIC_IP}")
        print("")
        print("DNS propagation will take 15-60 minutes")
        print("")
        print("After propagation, your sites will be available at:")
        print("  Frontend: https://www.dollar.ai (via CloudFront)")
        print("  Backend:  http://api.dollar.ai:3000")
        print("")
        print("To verify DNS propagation:")
        print("  dig www.dollar.ai")
        print("  dig api.dollar.ai")
        print("  Or visit: https://dnschecker.org")
        print("=" * 65)

        return True

    except Exception as e:
        print(f"Error: {e}")
        print("")
        print("Please check:")
        print("  1. API credentials are correct")
        print("  2. Domain 'dollar.ai' is in your GoDaddy account")
        print("  3. API key has DNS management permissions")
        return False


def print_manual_instructions():
    """Print manual DNS configuration instructions"""
    print("")
    print("=" * 65)
    print("MANUAL DNS CONFIGURATION FOR DOLLAR.AI")
    print("=" * 65)
    print("")
    print("Since GoDaddy API credentials are not available,")
    print("please configure DNS manually in GoDaddy dashboard:")
    print("")
    print("1. Log in to GoDaddy: https://dcc.godaddy.com/")
    print("2. Go to 'My Products' -> 'DNS' for dollar.ai")
    print("3. Add/Update the following DNS records:")
    print("")
    print("-" * 65)
    print("| Type  | Name | Value                           | TTL    |")
    print("-" * 65)
    print(f"| A     | @    | {EC2_PUBLIC_IP:<32} | 1 Hour |")
    print(f"| CNAME | www  | {CLOUDFRONT_DOMAIN:<32} | 1 Hour |")
    print(f"| A     | api  | {EC2_PUBLIC_IP:<32} | 1 Hour |")
    print("-" * 65)
    print("")
    print("After configuration:")
    print("  - www.dollar.ai -> CloudFront (frontend)")
    print("  - api.dollar.ai -> EC2 backend (44.192.34.143:3000)")
    print("  - dollar.ai     -> EC2 (can redirect to www)")
    print("")
    print("=" * 65)


if __name__ == "__main__":
    # Check for API credentials
    api_key = os.environ.get("GODADDY_API_KEY")
    api_secret = os.environ.get("GODADDY_API_SECRET")

    # Allow passing credentials as command line arguments
    if len(sys.argv) == 3:
        api_key = sys.argv[1]
        api_secret = sys.argv[2]

    if not api_key or not api_secret:
        print("=" * 65)
        print("GoDaddy API Credentials Required")
        print("=" * 65)
        print("")
        print("To get your API credentials:")
        print("  1. Go to: https://developer.godaddy.com/keys")
        print("  2. Click 'Create New API Key'")
        print("  3. Select 'Production' environment")
        print("  4. Copy the Key and Secret")
        print("")
        print("Then run one of:")
        print("  export GODADDY_API_KEY='your_key'")
        print("  export GODADDY_API_SECRET='your_secret'")
        print("  python3 configure-dollar-ai-dns.py")
        print("")
        print("Or:")
        print("  python3 configure-dollar-ai-dns.py YOUR_API_KEY YOUR_API_SECRET")
        print("")

        print_manual_instructions()
        sys.exit(1)

    success = configure_dns(api_key, api_secret)
    sys.exit(0 if success else 1)
