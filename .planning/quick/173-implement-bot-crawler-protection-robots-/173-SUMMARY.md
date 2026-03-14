---
phase: quick-173
plan: "01"
subsystem: backend-security
tags: [bot-protection, rate-limiting, middleware, security]
dependency_graph:
  requires: []
  provides: [robots.txt, bot_blocklist_middleware, public_endpoint_rate_limits]
  affects: [main_new.py, bid_routes.py, frontend/public/robots.txt]
tech_stack:
  patterns: [Starlette middleware, FastAPI route, in-memory RateLimiter]
key_files:
  created:
    - apps/web/p2p-platform/frontend/public/robots.txt
  modified:
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/backend/bid_routes.py
decisions:
  - "Exempt 127.0.0.1 from bot blocklist — ECS health check uses curl from localhost"
  - "Keep curl/ in blocklist (external abuse) but not for localhost requests"
  - "AWS WAF Bot Control left as manual step — no CloudFront Terraform module in repo"
metrics:
  duration: "~45 min (including debug + deploy)"
  completed: "2026-03-14"
  tasks_completed: 2
  files_changed: 3
---

# Phase quick-173 Plan 01: Bot/Crawler Protection Summary

**One-liner:** JWT-auth-compatible bot protection with robots.txt, UA blocklist middleware, and per-IP rate limits on 3 public endpoints — ECS localhost health check exemption required.

## What Was Implemented

### Layer 1: robots.txt
- Static file: `apps/web/p2p-platform/frontend/public/robots.txt`
- Backend route: `GET /robots.txt` served by FastAPI with 24h cache header
- Disallows `/api/`, `/admin/`, `/uploads/` for all crawlers
- `/robots.txt` added to `_PUBLIC_EXACT_PATHS` to bypass auth middleware

### Layer 2: User-Agent Blocklist Middleware (`bot_blocklist_middleware`)
- 8 blocked prefixes: `curl/`, `python-requests/`, `Scrapy/`, `Go-http-client/`, `libwww-perl/`, `Java/`, `node-fetch/`, `axios/`
- 7 blocked substrings: `HeadlessChrome`, `PhantomJS`, `Selenium`, `scrapy`, `bot/`, `crawler`, `spider`
- Returns `403 {"detail": "Automated access not permitted. See /robots.txt"}`
- Runs BEFORE admin/auth middleware in Starlette stack
- **Localhost exemption**: requests from `127.0.0.1` bypass the check entirely (required for ECS health checks)

### Layer 3: Public Endpoint Rate Limits
- `GET /api/vendors/published`: 30 req/min per IP (`public_listings_rate_limiter`)
- `GET /api/vendors/{id}/menu`: 30 req/min per IP (same limiter key `public_vendor_menu`)
- `POST /api/rides/estimate`: 20 req/min per IP (`_public_estimate_rate_limiter` in `bid_routes.py`)
- Returns 429 with Retry-After header on exceed

### Layer 4: AWS WAF Bot Control (Manual Step)
Not implemented via code — no CloudFront Terraform module exists in this repo. Manual steps:
1. AWS Console → WAF & Shield → Web ACLs → Create Web ACL (scope: CloudFront, region: us-east-1)
2. Associate with CloudFront distributions: staging `E3LB9SMG1YD9ZL` and production distribution
3. Add managed rule: `AWS-AWSManagedRulesBotControlRuleSet`
4. Set action to "Count" first — monitor 24h for false positives on mobile clients
5. After 24h review, switch bot rule groups to "Block"
6. Cost: ~$10/month per web ACL + $1/million requests — confirm budget before enabling

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ECS health check blocked by bot blocklist middleware**
- **Found during:** Staging deploy (run #23078801229)
- **Issue:** ECS task definition health check uses `curl -f http://localhost:8080/` — the `curl/` prefix was blocked, returning 403. Container failed health checks 31 times, staging deploy timed out after 900s.
- **Fix:** Added localhost (127.0.0.1) exemption in `bot_blocklist_middleware` before the UA prefix/substring checks. External bots cannot spoof source IP to 127.0.0.1.
- **Files modified:** `apps/web/p2p-platform/backend/main_new.py`
- **Commit:** `fbd27f8d`

## Commits

| Hash | Message |
|------|---------|
| `d978e248` | feat(quick-173): robots.txt + bot blocklist middleware |
| `c1d8c579` | feat(quick-173): rate limit public API endpoints (vendor listings, menus, fare estimates) |
| `fbd27f8d` | fix(quick-173): exempt 127.0.0.1 from bot blocklist (ECS health check fix) |

## Deployments

- **Staging:** Run #23081584720 — all jobs green, ECS COMPLETED (0 failed tasks)
- **Production:** Run #23081582917 (push-triggered) — all 4 jobs green, ECS COMPLETED (running 2/2)

## Rate Limit Thresholds Rationale

| Endpoint | Threshold | Rationale |
|----------|-----------|-----------|
| `/api/vendors/published` | 30/min | Normal app usage: user scrolls listings once per visit, max ~5 req/session. 30/min is >5x headroom for pagination. Stops bulk scraping. |
| `/api/vendors/{id}/menu` | 30/min | Same limiter as listings. Menu loads once per restaurant tap. 30/min is safe for normal browsing. |
| `/api/rides/estimate` | 20/min | Estimate fires per address change. Normal user: 3-5 estimates per ride request. 20/min allows active users while blocking automated probing. |

## Self-Check: PASSED

- `apps/web/p2p-platform/frontend/public/robots.txt` — FOUND
- `d978e248` — FOUND in git log
- `c1d8c579` — FOUND in git log
- `fbd27f8d` — FOUND in git log
- Staging ECS: running=1, desired=1, failedTasks=0, rolloutState=COMPLETED
- Production ECS: running=2, desired=2, failedTasks=0, rolloutState=COMPLETED
