---
phase: 18-security-hardening-cloudflare-analytics
plan: "01"
status: complete
completed_at: 2026-04-14
---

# 18-01 Summary: Cloudflare DNS Proxy, SSL Full Strict, Zone Settings, Redirect/Cache Rules

## One-liner
Cloudflare edge layer activated for artha.build — orange-cloud proxy, SSL Full Strict, HTTPS redirect, static cache, API bypass, zone settings.

## What was built

### scripts/cloudflare-setup.sh (215 lines)
Executable bash script encoding all Plan 01 Cloudflare API calls as a reproducible infrastructure artifact.

- **Step 0**: Zone preflight — verifies artha.build zone ID exists, prints plan tier
- **Step 1**: DNS A record proxy — PATCH/POST artha.build + www.artha.build with `proxied: true` (SEC-CF-01)
- **Step 2**: SSL/TLS Full Strict mode — `"value": "strict"` (SEC-CF-09)
- **Step 3**: Zone settings — email obfuscation on, hotlink protection on (SEC-CF-08)
- **Step 4**: HTTPS Redirect Rule via `http_request_dynamic_redirect` phase — 301 HTTP→HTTPS (SEC-CF-07)
- **Step 5**: Cache Rules via `http_request_cache_settings` — /api/* and /health bypass first, static assets 1 year (SEC-CF-07)
- **Step 6**: Verification summary with curl/jq checks

## Requirements satisfied
- SEC-CF-01: artha.build + www.artha.build DNS A records proxied (orange-cloud)
- SEC-CF-03: DDoS L3/L4/L7 protection automatic (consequence of orange-cloud proxy)
- SEC-CF-07: HTTPS Redirect Rule (edge 301) + Cache Rules (API bypass + static assets 1yr)
- SEC-CF-08: Email obfuscation + hotlink protection enabled
- SEC-CF-09: SSL/TLS Full Strict mode active

## Verification (user confirmed)
- Script ran successfully — all steps printed `true`
- CF-Ray header present in `curl -sI https://artha.build`
- HTTP→HTTPS redirect active (301 from http://artha.build)
- Plan tier: **Pro** ($25/month) — WAF Managed Rules + OWASP CRS available for Plan 02

## Commit
`01d199a4` — chore(18-01): add cloudflare-setup.sh — DNS proxy, SSL Full Strict, cache rules, zone settings
