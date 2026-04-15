#!/bin/bash
# artha.build Cloudflare Setup — Plan 01
# Run with: CF_API_TOKEN=<token> bash scripts/cloudflare-setup.sh
#
# Configures:
#   - DNS A records proxied through Cloudflare (orange-cloud) for artha.build + www.artha.build
#   - SSL/TLS Full Strict mode
#   - Email obfuscation + hotlink protection
#   - HTTPS Redirect Rule (replaces deprecated Page Rules)
#   - Cache Rules: /api/* bypass + static assets 1 year
#
# Requirements:
#   - jq must be installed
#   - CF_API_TOKEN must have: Zone:DNS:Edit, Zone:Firewall Services:Edit,
#     Zone:Cache Purge:Edit, Zone:Zone Settings:Edit,
#     Zone:Workers Routes:Edit, Account:Workers Scripts:Edit
#
# chmod +x scripts/cloudflare-setup.sh

set -euo pipefail

: "${CF_API_TOKEN:?CF_API_TOKEN is required. Create at: https://dash.cloudflare.com/profile/api-tokens}"

CF_API="https://api.cloudflare.com/client/v4"
ORIGIN_IP="44.194.34.223"

# ============================================================
echo "=== Step 0: Verify artha.build zone exists ==="
# ============================================================

ZONE_RESPONSE=$(curl -s -X GET "${CF_API}/zones?name=artha.build" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json")

ZONE_ID=$(echo "$ZONE_RESPONSE" | jq -r '.result[0].id // empty')

if [ -z "$ZONE_ID" ]; then
  echo "ERROR: artha.build zone not found in Cloudflare account."
  echo "Add artha.build to your Cloudflare account and update nameservers at your registrar first."
  echo "Dashboard: https://dash.cloudflare.com → Add a Site → artha.build"
  exit 1
fi

PLAN_TIER=$(echo "$ZONE_RESPONSE" | jq -r '.result[0].plan.id // "free"')
echo "Zone ID: $ZONE_ID"
echo "Plan tier: $PLAN_TIER"
echo "NOTE: WAF Managed Rules (SEC-CF-02) require Pro plan. Plan 02 will check this."

# ============================================================
echo ""
echo "=== Step 1: Enable DNS proxy for artha.build (SEC-CF-01) ==="
# ============================================================

# artha.build A record
RECORD_ID=$(curl -s "${CF_API}/zones/${ZONE_ID}/dns_records?type=A&name=artha.build" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq -r '.result[0].id // empty')

if [ -n "$RECORD_ID" ]; then
  echo "Patching existing artha.build A record to proxied=true..."
  curl -s -X PATCH "${CF_API}/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"proxied": true}' | jq '.success'
else
  echo "Creating artha.build A record (proxied=true)..."
  curl -s -X POST "${CF_API}/zones/${ZONE_ID}/dns_records" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"A\",\"name\":\"artha.build\",\"content\":\"${ORIGIN_IP}\",\"proxied\":true}" | jq '.success'
fi

# www.artha.build A record
WWW_RECORD_ID=$(curl -s "${CF_API}/zones/${ZONE_ID}/dns_records?type=A&name=www.artha.build" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq -r '.result[0].id // empty')

if [ -n "$WWW_RECORD_ID" ]; then
  echo "Patching existing www.artha.build A record to proxied=true..."
  curl -s -X PATCH "${CF_API}/zones/${ZONE_ID}/dns_records/${WWW_RECORD_ID}" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"proxied": true}' | jq '.success'
else
  echo "Creating www.artha.build A record (proxied=true)..."
  curl -s -X POST "${CF_API}/zones/${ZONE_ID}/dns_records" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"A\",\"name\":\"www.artha.build\",\"content\":\"${ORIGIN_IP}\",\"proxied\":true}" | jq '.success'
fi

# ============================================================
echo ""
echo "=== Step 2: Set SSL/TLS mode to Full Strict (SEC-CF-09) ==="
# ============================================================
# CRITICAL: Set SSL mode BEFORE traffic flows through proxy to avoid 525/526 errors.
# artha.build already has a valid Let's Encrypt cert — Full Strict is safe.

curl -s -X PATCH "${CF_API}/zones/${ZONE_ID}/settings/ssl" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "strict"}' | jq '.success'

# ============================================================
echo ""
echo "=== Step 3: Zone settings — email obfuscation + hotlink protection (SEC-CF-08) ==="
# ============================================================

echo "Enabling email obfuscation..."
curl -s -X PATCH "${CF_API}/zones/${ZONE_ID}/settings/email_obfuscation" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "on"}' | jq '.success'

echo "Enabling hotlink protection..."
curl -s -X PATCH "${CF_API}/zones/${ZONE_ID}/settings/hotlink_protection" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "on"}' | jq '.success'

# ============================================================
echo ""
echo "=== Step 4: HTTPS Redirect Rule (SEC-CF-07 part 1 — replaces deprecated Page Rules) ==="
# ============================================================
# Uses http_request_dynamic_redirect phase (NOT Page Rules — deprecated 2024)

curl -s -X POST "${CF_API}/zones/${ZONE_ID}/rulesets" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "artha.build HTTPS redirect",
    "kind": "zone",
    "phase": "http_request_dynamic_redirect",
    "rules": [
      {
        "description": "Force HTTPS",
        "expression": "(http.request.uri.scheme eq \"http\")",
        "action": "redirect",
        "action_parameters": {
          "from_value": {
            "status_code": 301,
            "target_url": {
              "expression": "concat(\"https://\", http.request.full_uri)"
            },
            "preserve_query_string": true
          }
        },
        "enabled": true
      }
    ]
  }' | jq '.success'

# ============================================================
echo ""
echo "=== Step 5: Cache Rules — API bypass + static assets (SEC-CF-07 part 2) ==="
# ============================================================
# CRITICAL: API bypass rule MUST be listed FIRST.
# Cloudflare evaluates cache rules in order — first match wins.

curl -s -X POST "${CF_API}/zones/${ZONE_ID}/rulesets" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "artha.build cache rules",
    "kind": "zone",
    "phase": "http_request_cache_settings",
    "rules": [
      {
        "description": "Bypass cache for API and health endpoints",
        "expression": "(http.request.uri.path matches \"^/api/\") or (http.request.uri.path eq \"/health\")",
        "action": "set_cache_settings",
        "action_parameters": {"cache": false},
        "enabled": true
      },
      {
        "description": "Cache static assets 1 year",
        "expression": "(http.request.uri.path matches \"\\.(js|css|woff2?|png|jpg|svg|ico|webp)$\")",
        "action": "set_cache_settings",
        "action_parameters": {
          "cache": true,
          "edge_ttl": {"mode": "override_origin", "default": 31536000},
          "browser_ttl": {"mode": "override_origin", "default": 31536000}
        },
        "enabled": true
      }
    ]
  }' | jq '.success'

# ============================================================
echo ""
echo "=== Step 6: Verification summary ==="
# ============================================================

echo ""
echo "Verify DNS proxy is active (should print: true):"
curl -s "${CF_API}/zones/${ZONE_ID}/dns_records?type=A&name=artha.build" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq '.result[0].proxied'

echo "Verify SSL mode (should print: \"strict\"):"
curl -s "${CF_API}/zones/${ZONE_ID}/settings/ssl" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq '.result.value'

echo "Verify email obfuscation (should print: \"on\"):"
curl -s "${CF_API}/zones/${ZONE_ID}/settings/email_obfuscation" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq '.result.value'

echo "Verify hotlink protection (should print: \"on\"):"
curl -s "${CF_API}/zones/${ZONE_ID}/settings/hotlink_protection" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq '.result.value'

echo ""
echo "=== Setup Complete ==="
echo "Once DNS propagates (up to 5 min), verify end-to-end:"
echo "  curl -sI https://artha.build | grep -i 'cf-ray'      # CF-Ray present = orange-cloud active"
echo "  curl -sI http://artha.build | grep -i 'location'     # Should show: https://artha.build/"
echo ""
echo "Next: Run Plan 02 for WAF rules, security headers Transform Rules, rate limiting, and analytics."
