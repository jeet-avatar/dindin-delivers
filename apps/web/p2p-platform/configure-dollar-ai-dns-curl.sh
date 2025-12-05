#!/bin/bash
# Configure GoDaddy DNS for dollar.ai using REST API

# Configuration
DOMAIN="dollar.ai"
CLOUDFRONT_DOMAIN="d3pus2gxlb5cer.cloudfront.net"
EC2_IP="44.192.34.143"

# Check for API credentials
if [ -z "$GODADDY_API_KEY" ] || [ -z "$GODADDY_API_SECRET" ]; then
    echo "================================================================="
    echo "GoDaddy API Credentials Required"
    echo "================================================================="
    echo ""
    echo "Please set your GoDaddy API credentials:"
    echo ""
    echo "  export GODADDY_API_KEY='your_api_key'"
    echo "  export GODADDY_API_SECRET='your_api_secret'"
    echo ""
    echo "Get credentials at: https://developer.godaddy.com/keys"
    echo ""
    echo "Then run this script again."
    echo "================================================================="
    exit 1
fi

AUTH_HEADER="Authorization: sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}"

echo "================================================================="
echo "Configuring DNS for $DOMAIN"
echo "================================================================="
echo ""

# Check if domain exists in account
echo "Verifying domain access..."
DOMAIN_CHECK=$(curl -s -X GET "https://api.godaddy.com/v1/domains/$DOMAIN" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json")

if echo "$DOMAIN_CHECK" | grep -q "error"; then
    echo "Error accessing domain: $DOMAIN_CHECK"
    exit 1
fi
echo "Domain verified: $DOMAIN"
echo ""

# Get current DNS records
echo "Current DNS records:"
curl -s -X GET "https://api.godaddy.com/v1/domains/$DOMAIN/records" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" | python3 -c "
import sys, json
try:
    records = json.load(sys.stdin)
    for r in records[:10]:
        print(f\"  {r['type']:6} {r['name']:15} -> {r['data']}\")
except: pass
"
echo ""

# Configure A record for root domain
echo "Setting A record for @ (root) -> $EC2_IP..."
curl -s -X PUT "https://api.godaddy.com/v1/domains/$DOMAIN/records/A/@" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "[{\"data\": \"$EC2_IP\", \"ttl\": 3600}]"
echo "  A @ -> $EC2_IP"

# Configure CNAME for www
echo "Setting CNAME record for www -> $CLOUDFRONT_DOMAIN..."
curl -s -X PUT "https://api.godaddy.com/v1/domains/$DOMAIN/records/CNAME/www" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "[{\"data\": \"$CLOUDFRONT_DOMAIN\", \"ttl\": 3600}]"
echo "  CNAME www -> $CLOUDFRONT_DOMAIN"

# Configure A record for api subdomain
echo "Setting A record for api -> $EC2_IP..."
curl -s -X PUT "https://api.godaddy.com/v1/domains/$DOMAIN/records/A/api" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "[{\"data\": \"$EC2_IP\", \"ttl\": 3600}]"
echo "  A api -> $EC2_IP"

echo ""
echo "================================================================="
echo "DNS Configuration Complete!"
echo "================================================================="
echo ""
echo "Records configured:"
echo "  A     @   -> $EC2_IP"
echo "  CNAME www -> $CLOUDFRONT_DOMAIN"
echo "  A     api -> $EC2_IP"
echo ""
echo "After propagation (15-60 mins):"
echo "  https://www.dollar.ai     -> Frontend (CloudFront)"
echo "  http://api.dollar.ai:3000 -> Backend API (EC2)"
echo ""
echo "Verify with: dig www.dollar.ai"
echo "================================================================="
