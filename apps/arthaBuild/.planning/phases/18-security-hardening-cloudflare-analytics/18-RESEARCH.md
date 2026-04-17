# Phase 18: Security Hardening + Cloudflare Analytics — Research

**Researched:** 2026-04-13
**Domain:** Cloudflare infrastructure — WAF, DDoS, Workers, Transform Rules, Cache Rules, Analytics
**Confidence:** HIGH (core API calls verified against official Cloudflare docs; plan-limiting findings noted)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-CF-01 | Cloudflare proxy enabled for artha.build (orange-cloud DNS) | DNS A record API with `proxied: true` documented. Orange-cloud is the `proxied` flag. |
| SEC-CF-02 | WAF ruleset active (OWASP Core Rule Set + Cloudflare Managed Rules) | Both ruleset IDs confirmed. Requires Pro plan or higher. API deploy steps documented. |
| SEC-CF-03 | DDoS protection L3/L4/L7 (Cloudflare default under Free/Pro plan) | Automatic — no API config needed. L3/L4 (Magic Transit) and L7 HTTP DDoS protection are automatic when proxy is orange-cloud. |
| SEC-CF-04 | Cloudflare Analytics dashboard — pageviews, unique IPs, country breakdown, top paths, bot score | GraphQL API endpoint and dataset names documented. `httpRequestsAdaptiveGroups` is current. |
| SEC-CF-05 | Cloudflare Workers rate-limiter at edge | Workers Rate Limiting binding documented with wrangler.toml config and script example. WAF Rate Limiting Rules are the simpler alternative. |
| SEC-CF-06 | Security headers via Cloudflare Transform Rules (CSP, HSTS, X-Frame-Options) | Response Header Transform Rules API documented. Available on all plans (10 rules on Free). |
| SEC-CF-07 | Page Rules: force HTTPS, cache static assets, bypass cache for /api/* | **Page Rules are deprecated.** Use Redirect Rules (HTTPS) + Cache Rules (caching) instead. |
| SEC-CF-08 | Email obfuscation + hotlink protection enabled | Both are zone settings PATCH calls. Endpoints confirmed. |
| SEC-CF-09 | SSL/TLS mode = Full (Strict) — verified origin cert | PATCH /zones/{id}/settings/ssl with value "strict". artha.build has Let's Encrypt cert — satisfies Full Strict. |
</phase_requirements>

---

## Summary

Phase 18 is a pure infrastructure configuration phase — no Python backend or React frontend code changes. The work consists of Cloudflare API calls (or equivalent dashboard actions) to configure artha.build's Cloudflare zone. The origin is `44.194.34.223` (Elastic IP, EC2 g5.xlarge) running nginx with a Let's Encrypt TLS cert on port 443. artha.build is already live and HTTP 200 verified.

The key architectural fact is that **Cloudflare sits in front of nginx** once the DNS A record is proxied (orange-cloud). All requests flow: browser → Cloudflare edge → EC2 nginx → FastAPI backend. This means security headers added by Cloudflare's Transform Rules will supplement (not replace) headers already added by nginx.prod.conf — care is needed to avoid header duplication. The nginx.prod.conf already sets HSTS, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy. The plan should either (a) remove them from nginx and exclusively use Cloudflare, or (b) use Cloudflare to add only headers nginx does not set (e.g., Permissions-Policy, a stricter CSP enforcing mode).

A critical finding: **Page Rules are deprecated** as of Cloudflare's 2024 announcement. The replacements are Redirect Rules (for HTTPS forcing) and Cache Rules (for asset caching and API bypass). The ROADMAP requirement SEC-CF-07 references "Page Rules" but the implementation must use the modern equivalents — this is a naming issue, not a scope change.

**Primary recommendation:** Execute all Cloudflare configuration via the Cloudflare API with `curl` commands (or Terraform `cloudflare` provider). This makes the work auditable and reproducible. The plan should be a series of documented API calls the user runs once, with verification steps after each.

---

## Standard Stack

### Core — Cloudflare Services Used

| Service | Plan Required | Purpose | Configuration Method |
|---------|---------------|---------|---------------------|
| Cloudflare Proxy (Orange-cloud DNS) | Free | Routes traffic through Cloudflare network | API: POST /zones/{id}/dns_records with proxied:true |
| WAF Managed Rules | **Pro or higher** | OWASP CRS + Cloudflare Managed Ruleset | API: rulesets endpoint with execute action |
| HTTP DDoS Protection (L7) | Free (automatic) | Blocks volumetric HTTP attacks | Automatic when proxied — no config |
| Network DDoS (L3/L4) | Free (automatic) | IP floods, SYN floods | Automatic — no config needed |
| Transform Rules (Response Headers) | Free (10 rules) | Add security headers | API: rulesets http_response_headers_transform phase |
| Cache Rules | Free | Cache static assets, bypass /api/* | API: rulesets http_request_cache_settings phase |
| Redirect Rules | Free | Force HTTPS (HTTP → HTTPS) | API: rulesets http_request_dynamic_redirect phase |
| Workers (rate limiting) | Free (100K req/day) | Edge rate limiting | Wrangler CLI deploy |
| Analytics GraphQL API | Free | Traffic visibility, bot scores | POST https://api.cloudflare.com/client/v4/graphql |
| Zone Settings | Free | SSL mode, email obfuscation, hotlink protection | PATCH /zones/{id}/settings/{setting} |

**IMPORTANT:** WAF Managed Rules (OWASP + Cloudflare Managed) require **Pro plan** ($20/month) or higher. The Free tier only has the "Cloudflare Free Managed Ruleset" (limited subset). If the account is on Free, WAF is the blocker for SEC-CF-02.

### Tools for Execution

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Cloudflare API | v4 | All zone configuration | Base URL: `https://api.cloudflare.com/client/v4` |
| Wrangler CLI | 4.36.0+ | Workers deployment | Required for Workers Rate Limiting binding |
| curl | system | API calls | All config steps are curl commands |
| Cloudflare Terraform provider | 4.x | Optional IaC | Not used here — curl is simpler for one-time setup |

### Authentication Required

| Item | How to Get | Used For |
|------|-----------|---------|
| API Token | Dashboard → My Profile → API Tokens → Create Token | All API calls |
| Zone ID | `GET /zones?name=artha.build` | Path param in all zone API calls |
| Account ID | Dashboard → Right sidebar, or `GET /zones` response | Workers deployment |

**Token permissions needed:**
- Zone → DNS → Edit (for SEC-CF-01)
- Zone → Firewall Services → Edit (for WAF rules, rate limiting)
- Zone → Cache Purge → Edit (for cache rules)
- Zone → Workers Routes → Edit (for Workers)
- Zone → Zone Settings → Edit (for SSL, email obfuscation, hotlink protection)
- Account → Workers Scripts → Edit (for Worker script deployment)

---

## Architecture Patterns

### How Cloudflare Sits in Front of artha.build

```
Browser
  │
  ▼
Cloudflare Edge (artha.build)
  │  • DDoS protection (automatic)
  │  • WAF (OWASP + Managed)
  │  • Rate limiting (Workers)
  │  • Security headers (Transform Rules)
  │  • Cache (static assets)
  │  • HTTPS redirect (Redirect Rules)
  │
  ▼ (Full Strict TLS to origin)
EC2 44.194.34.223 — nginx (port 443)
  │  • TLS terminated (Let's Encrypt)
  │  • nginx.prod.conf security headers (X-Frame-Options etc.)
  │  • Proxy /api/ → backend:8000
  │
  ▼
FastAPI backend (port 8000, internal)
  │  • SlowAPI rate limiting (app-level)
  │
  ▼
SQLite + Ollama
```

### Recommended Configuration Order

Execute in this order — each step depends on the previous:

1. Verify artha.build zone exists in Cloudflare (or add it)
2. Get Zone ID (required for all subsequent calls)
3. Enable proxy on DNS A record (SEC-CF-01)
4. Set SSL/TLS mode to Full Strict (SEC-CF-09)
5. Enable email obfuscation + hotlink protection (SEC-CF-08)
6. Deploy WAF managed rules (SEC-CF-02) — requires Pro plan
7. Enable HTTPS redirect rule (SEC-CF-07 HTTPS part)
8. Configure cache rules for static assets + API bypass (SEC-CF-07 cache part)
9. Add security headers via Transform Rules (SEC-CF-06)
10. Deploy Workers rate limiter (SEC-CF-05)
11. Verify analytics in dashboard (SEC-CF-04)

### Pattern 1: Get Zone ID (Required First)

```bash
# Source: https://developers.cloudflare.com/api/resources/zones/methods/list/
ZONE_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=artha.build" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  | jq -r '.result[0].id')
echo "Zone ID: $ZONE_ID"
```

### Pattern 2: Enable Proxy on DNS A Record (SEC-CF-01)

```bash
# Source: https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/create/
# If record exists, use PUT to update. If new, POST to create.
# First, get existing record ID:
RECORD_ID=$(curl -s "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=A&name=artha.build" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  | jq -r '.result[0].id')

# Update to proxied=true:
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"proxied": true}'
```

### Pattern 3: SSL Full Strict (SEC-CF-09)

```bash
# Source: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/ssl" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "strict"}'
```

### Pattern 4: Enable WAF Managed Rules (SEC-CF-02)

**Requires Pro plan.** Ruleset IDs are global constants:

```bash
# Cloudflare Managed Ruleset ID (global constant):
CF_MANAGED_RULESET="efb7b8c949ac4650a09736fc376e9aee"
# OWASP Core Ruleset ID (global constant):
CF_OWASP_RULESET="4814384a9e5d4991b9815dcfc25d2f1f"

# Step 1: Get the entry point ruleset ID for http_request_firewall_managed phase
ENTRY_RULESET_ID=$(curl -s "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/phases/http_request_firewall_managed/entrypoint" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  | jq -r '.result.id')

# Step 2: Add Cloudflare Managed Ruleset
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/$ENTRY_RULESET_ID/rules" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"execute\",
    \"action_parameters\": {\"id\": \"$CF_MANAGED_RULESET\"},
    \"expression\": \"true\",
    \"description\": \"Cloudflare Managed Ruleset\",
    \"enabled\": true
  }"

# Step 3: Add OWASP Core Ruleset
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/$ENTRY_RULESET_ID/rules" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"execute\",
    \"action_parameters\": {\"id\": \"$CF_OWASP_RULESET\", \"version\": \"latest\"},
    \"expression\": \"true\",
    \"description\": \"OWASP Core Ruleset\",
    \"enabled\": true
  }"
```

### Pattern 5: Security Headers via Transform Rules (SEC-CF-06)

**Important:** nginx.prod.conf already sets HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. Cloudflare Transform Rules would add a second copy unless nginx headers are removed. Recommended approach: **add only headers not in nginx**, specifically `Permissions-Policy` and tighten CSP from `Report-Only` to enforcing.

```bash
# Source: https://developers.cloudflare.com/rules/transform/response-header-modification/create-api/
# Get or create the response header transform ruleset
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "artha.build security headers",
    "kind": "zone",
    "phase": "http_response_headers_transform",
    "rules": [
      {
        "description": "Add security response headers",
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
              "value": "default-src '\''self'\''; script-src '\''self'\''; style-src '\''self'\'' '\''unsafe-inline'\''; img-src '\''self'\'' data:; connect-src '\''self'\''; frame-ancestors '\''none'\''"
            }
          }
        }
      }
    ]
  }'
```

### Pattern 6: HTTPS Redirect Rule (SEC-CF-07 — replaces Page Rules)

```bash
# Source: https://developers.cloudflare.com/rules/reference/page-rules-migration/
# Page Rules deprecated — use Redirect Rules instead
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HTTPS redirect",
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
        }
      }
    ]
  }'
```

### Pattern 7: Cache Rules (SEC-CF-07 — replaces Page Rules)

```bash
# Cache static assets, bypass /api/*
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "artha.build cache rules",
    "kind": "zone",
    "phase": "http_request_cache_settings",
    "rules": [
      {
        "description": "Bypass cache for API",
        "expression": "(http.request.uri.path matches \"^/api/\")",
        "action": "set_cache_settings",
        "action_parameters": {
          "cache": false
        }
      },
      {
        "description": "Cache static assets 1 year",
        "expression": "(http.request.uri.path matches \"\\.(js|css|woff2?|png|jpg|svg|ico|webp)$\")",
        "action": "set_cache_settings",
        "action_parameters": {
          "cache": true,
          "edge_ttl": {
            "mode": "override_origin",
            "default": 31536000
          },
          "browser_ttl": {
            "mode": "override_origin",
            "default": 31536000
          }
        }
      }
    ]
  }'
```

### Pattern 8: Zone Settings (SEC-CF-08)

```bash
# Source: https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/
# Email obfuscation
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/email_obfuscation" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "on"}'

# Hotlink protection
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/hotlink_protection" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "on"}'
```

### Pattern 9: Workers Rate Limiter (SEC-CF-05)

Two approaches — use whichever matches the plan:

**Option A: WAF Rate Limiting Rules (simpler, Free tier: 1 rule)**
```bash
# Get the http_ratelimit phase ruleset ID first
RATELIMIT_RULESET_ID=$(curl -s "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/phases/http_ratelimit/entrypoint" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  | jq -r '.result.id // empty')

# Create if needed, then add rule:
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "artha.build rate limit",
    "kind": "zone",
    "phase": "http_ratelimit",
    "rules": [
      {
        "description": "Rate limit /api/ — 60 req/min per IP",
        "expression": "(http.request.uri.path matches \"^/api/\")",
        "action": "block",
        "ratelimit": {
          "characteristics": ["ip.src"],
          "period": 60,
          "requests_per_period": 60,
          "mitigation_timeout": 600
        }
      }
    ]
  }'
```

**Option B: Cloudflare Workers with Rate Limiting binding (wrangler.toml)**

`wrangler.toml`:
```toml
# Source: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
name = "artha-rate-limiter"
main = "src/index.js"
compatibility_date = "2024-09-23"

[[routes]]
pattern = "artha.build/api/*"
zone_name = "artha.build"

[[ratelimits]]
name = "RATE_LIMITER"
namespace_id = "1001"

[ratelimits.simple]
limit = 60
period = 60
```

`src/index.js`:
```javascript
export default {
  async fetch(request, env) {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown"
    const { success } = await env.RATE_LIMITER.limit({ key: ip })
    if (!success) {
      return new Response("Rate limit exceeded", {
        status: 429,
        headers: { "Retry-After": "60" }
      })
    }
    return fetch(request)
  }
}
```

Deploy: `npx wrangler deploy`

### Pattern 10: Analytics Verification (SEC-CF-04)

```bash
# Source: https://developers.cloudflare.com/analytics/graphql-api/
# Query pageviews, requests, unique visitors, country breakdown for last 7 days
curl -s -X POST "https://api.cloudflare.com/client/v4/graphql" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"query { viewer { zones(filter: {zoneTag: \\\"$ZONE_ID\\\"}) { httpRequestsAdaptiveGroups(filter: {date_gt: \\\"$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d)\\\"}, limit: 10, orderBy: [count_DESC]) { count dimensions { clientCountryName requestPath } sum { visits edgeResponseBytes } } } } }\"
  }"
```

**Note:** `httpRequestsAdaptiveGroups` is the current dataset (replaced deprecated `httpRequests1dGroups` by Colo). The `visits` field is the current metric for unique-visitor-like counting. Per Cloudflare docs, "unique visitors per colocation is not available in httpRequestsAdaptiveGroups" — `visits` is the alternative (a visit = page view from different website or direct link).

### Anti-Patterns to Avoid

- **Enabling proxy before SSL Full Strict:** If SSL is set to Flexible (default) and you enable proxy, Cloudflare will connect to the origin over HTTP, bypassing the Let's Encrypt cert. Set SSL to Full Strict FIRST.
- **Page Rules for new deployments:** Page Rules are deprecated. Use Redirect Rules + Cache Rules. Dashboard shows a warning. Page Rules will be auto-migrated late 2025 or later.
- **Duplicate security headers:** nginx.prod.conf already sets HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. If Cloudflare Transform Rules also set these, the browser sees duplicate headers. The plan must address which layer owns each header.
- **Forgetting www subdomain:** DNS A record must be proxied for both `artha.build` and `www.artha.build`. nginx.conf already includes `server_name artha.build www.artha.build` — the DNS must match.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTPS redirect | nginx rewrite or custom middleware | Cloudflare Redirect Rule | Happens at edge before origin; nginx already has this as backup |
| DDoS protection | fail2ban, custom IP blocking | Cloudflare automatic DDoS | Cloudflare absorbs volumetric attacks before they reach EC2 |
| Bot detection | Application-level bot fingerprinting | Cloudflare Bot Score (automatic) | Bot score is in `cf.bot_management.score` header, automatic |
| Rate limiting logic | Application-layer rate limiter | Cloudflare WAF Rate Limiting Rules | Edge rate limiting stops abusive traffic before it reaches FastAPI |
| WAF rules | Custom mod_security | Cloudflare OWASP CRS | Cloudflare's CRS implementation is maintained, tested, updated |
| Analytics dashboard | Grafana + ELK stack | Cloudflare Analytics GraphQL API | Zero infra cost, automatic from proxy traffic |

**Key insight:** Cloudflare is a managed security and CDN layer. Everything it provides is better done there than in application code — the entire value proposition is absorbing complexity that would otherwise require dedicated security infrastructure.

---

## Common Pitfalls

### Pitfall 1: SSL Mode Mismatch Causes 525/526 Errors

**What goes wrong:** After enabling the Cloudflare proxy, requests return 525 (SSL Handshake Failed) or 526 (Invalid SSL Certificate).
**Why it happens:** Cloudflare's default SSL mode is "Flexible" (connects to origin over HTTP). artha.build's nginx only listens on port 443 with TLS. Flexible mode tries HTTP → origin rejects → 525.
**How to avoid:** Set SSL to Full Strict BEFORE enabling the proxy (or immediately after, before verifying). Let's Encrypt cert on artha.build satisfies Full Strict requirements (valid, trusted CA, hostname match).
**Warning signs:** HTTPS connection works fine in staging but breaks after proxy enabled.

### Pitfall 2: Duplicate Security Headers Break Browser Behavior

**What goes wrong:** HSTS or CSP header appears twice in response. Some browsers (Chrome) handle this gracefully, others may reject. CSP being doubled means both policies are applied, which can block expected content.
**Why it happens:** nginx.prod.conf already sets `add_header Strict-Transport-Security`, `add_header X-Frame-Options`, etc. If Cloudflare Transform Rules add the same headers, there are two of each.
**How to avoid:** The plan must choose one of: (a) remove headers from nginx.prod.conf and own them entirely in Cloudflare, or (b) only add headers in Cloudflare that nginx does NOT set (e.g., `Permissions-Policy`, enforcing CSP). Option (b) is lower risk — requires nginx change if header ownership transfers.
**Warning signs:** `curl -I https://artha.build` shows two `Strict-Transport-Security` lines.

### Pitfall 3: WAF Rules Break Legitimate API Traffic

**What goes wrong:** After enabling OWASP CRS, some legitimate POST requests to `/api/chatbot/process` get blocked (403). OWASP CRS is sensitive to request bodies.
**Why it happens:** OWASP CRS scoring — JSON bodies with certain patterns (SQL-like strings in chat messages, script content in SuiteScript generation) can trigger rules and exceed the score threshold.
**How to avoid:** Deploy OWASP in "log" mode first (action: "log" instead of "block"). Review logs for false positives. Then switch to "block". Or add an exception rule for `/api/*` if false positive rate is high.
**Warning signs:** `/api/chatbot/process` returns 403 for messages containing SuiteScript code or SQL-like queries.

### Pitfall 4: Workers Rate Limiter Blocks AI Endpoints

**What goes wrong:** The Workers rate limiter (60 req/min) blocks long-running AI requests from the same user/IP. An active ArthaBuild user making rapid chat queries hits the limit.
**Why it happens:** The AI chat workflow can generate multiple rapid requests (streaming, polling for results). 60 req/min may be too low for `/api/chatbot/process`.
**How to avoid:** Either raise the limit for `/api/chatbot/process` specifically (90-120/min) or only rate-limit auth endpoints and leave `/api/chatbot/` more permissive. The in-app SlowAPI rate limiter already handles `/api/auth/*` tightly.
**Warning signs:** Authenticated users get 429 responses during normal chat usage.

### Pitfall 5: Cache Rules Cache API Responses

**What goes wrong:** Cloudflare caches `/api/health` or other non-static API responses, serving stale data to users.
**Why it happens:** Cache rules evaluate in order. If a "cache everything" or broad cache rule matches before the API bypass rule, API responses get cached.
**How to avoid:** The API bypass rule (expression matching `^/api/`) must come FIRST in the ruleset, before the static asset caching rule. Cloudflare evaluates Cache Rules in order, first match wins.
**Warning signs:** `/api/health` returns stale `status: ok` even when backend is down.

### Pitfall 6: Workers Rate Limiter Requires wrangler 4.36.0+

**What goes wrong:** `wrangler deploy` fails with unknown binding type for `[[ratelimits]]`.
**Why it happens:** The Workers Rate Limiting binding was introduced in wrangler 4.36.0. Older versions do not recognize the `[[ratelimits]]` TOML key.
**How to avoid:** Run `npx wrangler --version` before deployment. If < 4.36.0, use `npx wrangler@latest deploy` or `npm install -g wrangler@latest`.
**Warning signs:** `Error: Unknown binding type` during wrangler deploy.

---

## Code Examples

### Complete Setup Script Structure

The plan should produce a `scripts/cloudflare-setup.sh` in the arthaBuild repo that documents all setup steps as executable curl commands with a `$CF_API_TOKEN` env var. This makes the configuration reproducible and auditable.

```bash
#!/bin/bash
# artha.build Cloudflare Setup Script
# Run once with: CF_API_TOKEN=<token> bash scripts/cloudflare-setup.sh
set -euo pipefail

: "${CF_API_TOKEN:?Need to set CF_API_TOKEN}"

BASE="https://api.cloudflare.com/client/v4"
AUTH="-H \"Authorization: Bearer $CF_API_TOKEN\" -H \"Content-Type: application/json\""

# Step 1: Get Zone ID
ZONE_ID=$(curl -s -X GET "$BASE/zones?name=artha.build" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  | jq -r '.result[0].id')
echo "Zone ID: $ZONE_ID"

# ... (subsequent steps use $ZONE_ID)
```

### Verify All Headers Are Set Correctly

```bash
# Run after setup to verify headers
curl -sI https://artha.build | grep -i "strict-transport\|x-frame\|x-content\|referrer\|permissions"

# Verify only ONE instance of each header (no duplicates)
curl -sI https://artha.build | sort | uniq -d  # Should return empty
```

### Analytics Query — Top 10 Paths Last 7 Days

```bash
# Source: https://developers.cloudflare.com/analytics/graphql-api/
curl -s -X POST "https://api.cloudflare.com/client/v4/graphql" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ viewer { zones(filter: {zoneTag: \"ZONE_ID\"}) { httpRequestsAdaptiveGroups(filter: {date_gt: \"2026-04-06\"}, orderBy: [count_DESC], limit: 10) { count dimensions { requestPath clientCountryName } } } } }"
  }' | jq '.data.viewer.zones[0].httpRequestsAdaptiveGroups'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact for artha.build |
|--------------|------------------|--------------|------------------------|
| Page Rules | Redirect Rules + Cache Rules + Configuration Rules | 2024, deprecated late 2025 | Use new ruleset-based rules instead. SEC-CF-07 must use these. |
| `httpRequests1dByColoGroups` | `httpRequestsAdaptiveGroups` | 2023-2024 | Use new dataset for analytics queries |
| Workers rate limiting (KV-based custom) | Workers Rate Limiting binding (`[[ratelimits]]`) | Wrangler 4.36+ | Simpler, built-in, no KV store needed |
| Cloudflare WAF "legacy mode" | Rulesets engine (`/rulesets` API) | 2022-2023 | All WAF config uses `/rulesets` endpoints |

**Deprecated/outdated:**
- `httpRequests1mByColoGroups`: replaced by `httpRequestsAdaptiveGroups`
- Page Rules for HTTPS redirect: use Redirect Rules
- Page Rules for cache: use Cache Rules
- `/zones/{id}/firewall/waf/packages`: old WAF API, replaced by `/rulesets`

---

## Open Questions

1. **Does artha.build have Cloudflare Pro plan?**
   - What we know: WAF Managed Rules (OWASP + CF Managed) require Pro plan ($20/mo). Free tier only gets the limited "Free Managed Ruleset."
   - What's unclear: Whether the account is currently Free or Pro.
   - Recommendation: The plan should include a plan-check step. If Free, SEC-CF-02 (full WAF) cannot be enabled without upgrading. The plan should document this and have a fallback (use Free Managed Ruleset where possible, note Pro required for full OWASP CRS).

2. **Is artha.build DNS already in Cloudflare?**
   - What we know: artha.build is live and HTTPS-verified. SSL cert is Let's Encrypt.
   - What's unclear: Whether the domain NS is already pointing to Cloudflare or is still at the registrar. The phase assumes Cloudflare zone exists — if not, adding the zone is a prerequisite.
   - Recommendation: First step in the plan is to verify zone exists: `GET /zones?name=artha.build`. If no zone found, user must add artha.build to their Cloudflare account first (change NS records at registrar).

3. **Header ownership decision: nginx vs. Cloudflare**
   - What we know: nginx.prod.conf sets HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. Cloudflare Transform Rules would add more.
   - What's unclear: Should Phase 18 migrate all security header management to Cloudflare (remove from nginx) or keep nginx headers and only add new ones in Cloudflare?
   - Recommendation: Keep nginx headers as-is (simpler, lower risk). Use Cloudflare Transform Rules only to add `Permissions-Policy` and upgrade CSP from Report-Only to enforcing mode. Avoids changes to nginx.prod.conf which is a separate file not in scope for this infrastructure phase.

4. **Workers rate limiting vs. WAF rate limiting rules**
   - What we know: WAF Rate Limiting Rules are simpler (no code, pure API config) but Free tier only allows 1 rule. Workers rate limiting is more flexible but requires wrangler deployment.
   - What's unclear: Which approach best fits the project's maintenance posture.
   - Recommendation: Use WAF Rate Limiting Rules for simplicity (1 rule covers `/api/*` at 60 req/min). If more granular rules are needed later, add a Worker. Free tier's 1-rule limit is sufficient for artha.build's current needs (one rule for `/api/`).

---

## Sources

### Primary (HIGH confidence)
- `https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/create/` — DNS record API (proxied field)
- `https://developers.cloudflare.com/waf/managed-rules/deploy-api/` — WAF managed ruleset deploy API, Cloudflare Managed Ruleset ID
- `https://developers.cloudflare.com/waf/managed-rules/reference/owasp-core-ruleset/configure-api/` — OWASP CRS ID `4814384a9e5d4991b9815dcfc25d2f1f`
- `https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/` — Full Strict requirements
- `https://developers.cloudflare.com/rules/transform/response-header-modification/create-api/` — Transform Rules API for security headers
- `https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/` — Workers Rate Limiting binding, wrangler.toml config, wrangler 4.36.0 requirement
- `https://developers.cloudflare.com/waf/rate-limiting-rules/create-api/` — WAF Rate Limiting Rules API
- `https://developers.cloudflare.com/analytics/graphql-api/` — GraphQL analytics endpoint
- `https://developers.cloudflare.com/analytics/graphql-api/migration-guides/graphql-api-analytics/` — `httpRequestsAdaptiveGroups` as current dataset
- `https://developers.cloudflare.com/rules/reference/page-rules-migration/` — Page Rules deprecated, Redirect Rules + Cache Rules as replacements

### Secondary (MEDIUM confidence)
- `https://developers.cloudflare.com/api/operations/zone-settings-change-hotlink-protection-setting` — hotlink_protection setting name
- `https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/` — email_obfuscation setting
- WebSearch cross-check: SSL PATCH endpoint `/zones/{id}/settings/ssl` with `value: "strict"` confirmed across multiple community sources

### Tertiary (LOW confidence)
- GraphQL query field names (`visits`, `clientCountryName`, `requestPath`) in `httpRequestsAdaptiveGroups` — verified via migration guide that `visits` is the replacement for unique metrics, but exact schema field names should be introspected at query time

---

## Metadata

**Confidence breakdown:**
- Cloudflare API endpoints and methods: HIGH — fetched from official docs
- WAF ruleset IDs (CF Managed + OWASP): HIGH — both IDs confirmed from official docs
- Page Rules deprecation: HIGH — confirmed in official migration guide + blog announcement
- Workers Rate Limiting binding: HIGH — official docs, wrangler version requirement confirmed
- Analytics GraphQL schema field names: MEDIUM — dataset name confirmed, specific field names partially inferred; should introspect live schema
- DDoS protection automatic behavior: HIGH — Cloudflare official docs confirm automatic for proxied zones

**Research date:** 2026-04-13
**Valid until:** 2026-07-13 (90 days — Cloudflare API is stable; worker runtime APIs change faster, recheck if > 90 days old)
