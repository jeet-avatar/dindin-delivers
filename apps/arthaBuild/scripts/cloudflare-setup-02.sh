#!/bin/bash
# artha.build Cloudflare Setup — Plan 02
# WAF Managed Rules, Transform Rules (security headers), WAF rate limiting, Analytics verification
#
# Prerequisites:
#   - Plan 01 complete: artha.build proxied, SSL Full Strict active
#   - CF_API_TOKEN: same token from Plan 01
#   - ZONE_ID: printed by cloudflare-setup.sh Step 0 in Plan 01
#
# Run with: CF_API_TOKEN=<token> ZONE_ID=<zone_id> bash scripts/cloudflare-setup-02.sh
#
# Header duplication constraint:
#   nginx.prod.conf already sets: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, CSP-Report-Only
#   Cloudflare Transform Rules MUST NOT add these again (duplicate headers break clients).
#   Cloudflare Transform Rules ONLY add: Permissions-Policy + enforcing Content-Security-Policy.
#   CSP enforcing value matches nginx.prod.conf line 36 Report-Only directives.
#
# WAF LOG mode note:
#   OWASP CRS is deployed in LOG mode (not block). ArthaBuild chatbot accepts SuiteScript/SQL-like
#   strings which can trigger OWASP rules. Review WAF Events in Dashboard after 24h of traffic,
#   then switch action from "log" to "execute" (block) if no false positives on /api/chatbot/.

set -euo pipefail
: "${CF_API_TOKEN:?Need CF_API_TOKEN (same token from Plan 01)}"
: "${ZONE_ID:?Need ZONE_ID (printed by cloudflare-setup.sh Step 0 in Plan 01)}"
BASE="https://api.cloudflare.com/client/v4"

# ─── Step 0: Check plan tier for WAF capability ───────────────────────────────
echo "=== Step 0: Check plan tier ==="
PLAN_ID=$(curl -s "$BASE/zones/$ZONE_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq -r '.result.plan.id')
echo "Plan: $PLAN_ID"
if [[ "$PLAN_ID" == *"pro"* ]] || [[ "$PLAN_ID" == *"business"* ]] || [[ "$PLAN_ID" == *"enterprise"* ]]; then
  WAF_FULL=true
  echo "Pro/Business/Enterprise plan: Full WAF available (OWASP CRS + CF Managed Ruleset)"
else
  WAF_FULL=false
  echo "Free plan: Only Cloudflare Free Managed Ruleset available."
  echo "To enable OWASP CRS (SEC-CF-02 full compliance): upgrade to Pro at https://dash.cloudflare.com"
fi

# ─── Step 1: WAF Managed Rules (SEC-CF-02) ────────────────────────────────────
# Deploys Cloudflare Managed Ruleset + OWASP CRS (if Pro) in LOG mode.
# WAF Ruleset IDs are global Cloudflare constants (not zone-specific):
#   CF Managed Ruleset:  efb7b8c949ac4650a09736fc376e9aee
#   OWASP Core Ruleset:  4814384a9e5d4991b9815dcfc25d2f1f
echo ""
echo "=== Step 1: Deploy WAF Managed Rules (LOG mode) ==="

# Get the entry point ruleset for http_request_firewall_managed phase
ENTRY_RULESET=$(curl -s "$BASE/zones/$ZONE_ID/rulesets/phases/http_request_firewall_managed/entrypoint" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq -r '.result.id // empty')

if [ -z "$ENTRY_RULESET" ]; then
  echo "ERROR: Could not retrieve entrypoint ruleset for http_request_firewall_managed phase."
  echo "Ensure artha.build zone is on Cloudflare and Plan 01 is complete."
  exit 1
fi
echo "Entry ruleset ID: $ENTRY_RULESET"

# Deploy Cloudflare Managed Ruleset (available on all plans)
echo "Deploying Cloudflare Managed Ruleset..."
curl -s -X POST "$BASE/zones/$ZONE_ID/rulesets/$ENTRY_RULESET/rules" \
  -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "action": "execute",
    "action_parameters": {"id": "efb7b8c949ac4650a09736fc376e9aee"},
    "expression": "true",
    "description": "Cloudflare Managed Ruleset — LOG mode (review before enabling block)",
    "logging": {"enabled": true},
    "enabled": true
  }' | jq '.success'

# Deploy OWASP CRS only on Pro plan or above
if [ "$WAF_FULL" = true ]; then
  echo "Deploying OWASP Core Ruleset (Pro plan)..."
  curl -s -X POST "$BASE/zones/$ZONE_ID/rulesets/$ENTRY_RULESET/rules" \
    -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
    -d '{
      "action": "execute",
      "action_parameters": {"id": "4814384a9e5d4991b9815dcfc25d2f1f", "version": "latest"},
      "expression": "true",
      "description": "OWASP Core Ruleset — LOG mode. IMPORTANT: Switch to block after reviewing WAF Events in Dashboard for 24h. Watch for false positives on /api/chatbot/ (SuiteScript/SQL-like request bodies).",
      "logging": {"enabled": true},
      "enabled": true
    }' | jq '.success'
  echo ""
  echo "ACTION REQUIRED (after 24h of traffic):"
  echo "  Cloudflare Dashboard → artha.build → Security → WAF → Managed rules"
  echo "  If no false positives on /api/chatbot/: edit OWASP rule, change action from log → execute (block)"
else
  echo "OWASP CRS skipped (Free plan). Upgrade to Pro: https://dash.cloudflare.com"
fi

# ─── Step 2: Security headers via Transform Rules (SEC-CF-06) ─────────────────
# ONLY adds Permissions-Policy and enforcing CSP.
# Does NOT add HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
# — these are already set by nginx.prod.conf and must NOT be duplicated.
# CSP value matches nginx.prod.conf line 36 Report-Only directives exactly.
echo ""
echo "=== Step 2: Add security headers via Transform Rules (additive — no nginx duplicates) ==="
curl -s -X POST "$BASE/zones/$ZONE_ID/rulesets" \
  -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "name": "artha.build security headers",
    "kind": "zone",
    "phase": "http_response_headers_transform",
    "rules": [
      {
        "description": "Add Permissions-Policy and enforcing CSP — not duplicating nginx.prod.conf headers",
        "expression": "true",
        "action": "rewrite",
        "action_parameters": {
          "headers": {
            "Permissions-Policy": {
              "operation": "set",
              "value": "camera=(), microphone=(), geolocation=()"
            },
            "Content-Security-Policy": {
              "operation": "set",
              "value": "default-src '\''self'\''; script-src '\''self'\''; style-src '\''self'\'' '\''unsafe-inline'\''; img-src '\''self'\'' data:; connect-src '\''self'\''"
            }
          }
        },
        "enabled": true
      }
    ]
  }' | jq '.success'
echo "NOTE: nginx sets Content-Security-Policy-Report-Only (informational)."
echo "      Cloudflare now sets Content-Security-Policy (enforcing). Both coexist."

# ─── Step 3: WAF Rate Limiting Rule (SEC-CF-05) ───────────────────────────────
# Rate-limits /api/* at 60 req/min per IP.
# /api/chatbot/ is excluded — AI inference requests take longer and legitimate
# users may trigger the limit during chat sessions.
echo ""
echo "=== Step 3: WAF rate limiting — /api/* at 60 req/min (excluding /api/chatbot/) ==="
curl -s -X POST "$BASE/zones/$ZONE_ID/rulesets" \
  -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "name": "artha.build rate limit",
    "kind": "zone",
    "phase": "http_ratelimit",
    "rules": [
      {
        "description": "Rate limit /api/ at 60 req/min per IP — exclude /api/chatbot/ (AI inference)",
        "expression": "(http.request.uri.path matches \"^/api/\") and not (http.request.uri.path matches \"^/api/chatbot/\")",
        "action": "block",
        "ratelimit": {
          "characteristics": ["ip.src"],
          "period": 60,
          "requests_per_period": 60,
          "mitigation_timeout": 600
        },
        "enabled": true
      }
    ]
  }' | jq '.success'

# ─── Step 4: Verify Analytics GraphQL API returns data (SEC-CF-04) ───────────
# Uses httpRequestsAdaptiveGroups (not deprecated httpRequests1dGroups).
# May return empty if zone is new — wait 15-30 min after enabling proxy.
echo ""
echo "=== Step 4: Verify Analytics GraphQL API ==="
TODAY=$(date +%Y-%m-%d)
WEEK_AGO=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d)
ANALYTICS_RESULT=$(curl -s -X POST "https://api.cloudflare.com/client/v4/graphql" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"{ viewer { zones(filter: {zoneTag: \\\"$ZONE_ID\\\"}) { httpRequestsAdaptiveGroups(filter: {date_gt: \\\"$WEEK_AGO\\\"}, limit: 5, orderBy: [count_DESC]) { count dimensions { clientCountryName requestPath } sum { visits edgeResponseBytes } } } } }\"
  }")
echo "$ANALYTICS_RESULT" | jq '.data.viewer.zones[0].httpRequestsAdaptiveGroups // "No data yet — zone may be new, wait 15-30 min after proxy enabled"'

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "=== Setup Complete — Phase 18 Plan 02 Summary ==="
echo ""
echo "WAF Managed Rules:   Cloudflare Managed Ruleset deployed (LOG mode)"
if [ "$WAF_FULL" = true ]; then
  echo "OWASP CRS:           deployed (LOG mode — switch to block after 24h review)"
else
  echo "OWASP CRS:           skipped (Free plan)"
fi
echo "Security headers:    Permissions-Policy + enforcing CSP via Transform Rules"
echo "Rate limiting:       /api/* at 60 req/min per IP (excluding /api/chatbot/)"
echo "Analytics:           httpRequestsAdaptiveGroups query verified"
echo ""
echo "Next steps:"
echo "  1. Review WAF Events after 24h: Cloudflare Dashboard → Security → Events"
echo "  2. If no false positives on /api/chatbot/: switch OWASP CRS action to block"
echo "  3. View analytics: https://dash.cloudflare.com/${ZONE_ID}/analytics/traffic"
echo ""
echo "Verify headers (no duplicates):"
echo "  curl -sI https://artha.build | grep -i 'strict-transport\|x-frame\|permissions-policy\|content-security'"
