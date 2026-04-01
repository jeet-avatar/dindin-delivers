# BrandMonkz CRM — Deep Audit Report

**Date:** 2026-04-01
**Scope:** Full backend routes, email sends, nginx, CORS, rate limiters, auth
**Codebase:** `/Users/jeet/Documents/production-crm-backup/`
**Production:** EC2 `100.24.213.224`

---

## CRITICAL ISSUES (Fix Immediately)

### 1. Route Ordering — `:id` Shadows Named Routes
**Severity:** CRITICAL — Causes silent 404s on working endpoints

Express matches routes in registration order. In 3 route files, `/:id` is defined BEFORE specific named routes — so requests to `/assigned-to-me`, `/bulk-assign`, `/quick-send`, etc. get caught by `/:id` and treated as an ID lookup.

| File | `/:id` Line | Shadowed Routes | Lines |
|------|-------------|-----------------|-------|
| `contacts.ts` | 160 | `/assigned-to-me`, `/bulk-assign`, `/csv-import` | 1037, 1099, 805 |
| `companies.ts` | 216 | `/assigned-to-me`, `/bulk-assign`, `/import` | 937, 1001, 462 |
| `campaigns.ts` | 82 | `/ai/generate-basics`, `/ai/generate-subject`, `/ai/generate-content`, `/quick-send` | 276, 315, 375, 814 |

**Why this hasn't fully broken:** The `/ai/*` paths have a `/` so Express treats them as sub-paths, not matched by `/:id`. But `/quick-send` IS at risk — it only works because Express router sees the slash differently for POST vs GET. Still fragile.

**Fix:** Move ALL specific routes BEFORE the `/:id` route in each file.

---

### 2. 26 Duplicate PrismaClient Instances
**Severity:** CRITICAL — Connection pool exhaustion

Every route file creates its own `new PrismaClient()`. With default pool of 10, that's potentially 260 connections to a single database.

`app.ts:65` already exports a shared instance: `exports.prisma = prisma`. But route files ignore it and create their own.

**Affected files:** activities.ts, admin.ts, analytics.ts, calendar-auth.ts, campaigns.ts, companies.ts, contacts.ts, contracts.ts, contractSigning.ts, deals.ts, email-templates.ts, emailServers.ts, emailTemplates.ts, internal.routes.ts, job-leads.routes.ts, leads.routes.ts, positions.ts, projects.routes.ts, quotes.ts, staffing.ts, subscriptions.ts, super-admin.ts, tags.ts, tasks.routes.ts, tickets.routes.ts, videoCampaigns.ts

**Fix:** Replace `const prisma = new PrismaClient()` with `import { prisma } from '../app'` in all files.

---

### 3. Four Different Email Send Functions
**Severity:** CRITICAL — Root cause of every email breakage this session

`campaigns.ts` has FOUR send functions with different behaviors:

| Function | Line | Sends Via | Used By |
|----------|------|-----------|---------|
| `sendEmailViaSES()` | 481 | AWS SES (sandbox, broken) | Fallback in `sendEmailViaEnvSMTP` |
| `sendEmailViaSMTP()` | 493 | User's DB-configured server | `sendEmail()` |
| `sendEmailViaEnvSMTP()` | 524 | .env SMTP (peter@techcloudpro.com) | `quick-send` |
| `sendEmail()` | 552 | Calls `getUserEmailServer()` → `sendEmailViaSMTP()` | `:id/send` |

**Problems:**
- `sendEmailViaEnvSMTP()` falls back to `sendEmailViaSES()` (line 534) which is sandbox-only
- `sendEmail()` requires a DB email server per user — blocks sends if user hasn't configured one
- `quick-send` bypasses `sendEmail()` entirely and uses `sendEmailViaEnvSMTP()` directly
- No single source of truth for "how do we send an email"

**Fix:** Consolidate to ONE send function with clear priority: User DB server → Env SMTP → Error. Remove SES entirely.

---

## HIGH ISSUES

### 4. Nginx CORS Not Inherited in Sub-Locations
**Severity:** HIGH — Caused the "failed to fetch" login bug

Nginx sub-locations (`/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password`) have their own `proxy_pass` blocks that DON'T inherit the parent `/api/` CORS headers.

**Current state after today's fix:**
- `/api/auth/login` — CORS headers added (fixed today)
- `/api/auth/forgot-password` — **STILL MISSING CORS** (burst=2 block, no CORS headers)
- `/api/auth/reset-password` — **STILL MISSING CORS** (burst=10 block, no CORS headers)

**Fix:** Add CORS headers to ALL sub-location blocks, or remove sub-locations and handle rate limiting in Express only.

### 5. Double Rate Limiting — Nginx + Express
**Severity:** HIGH — Caused login lockouts during testing

Login requests hit TWO rate limiters:
1. **Nginx:** `zone=login rate=20r/m burst=10` (security.conf)
2. **Express:** `authLimiter: max=5 per 15min` (app.ts:165-166)

The stricter one wins (Express at 5/15min). But nginx rate limiter state survives PM2 restarts while Express doesn't. Restarting PM2 clears Express but NOT nginx limits.

Also inconsistent burst values:
- `/api/auth/login`: burst=10
- `/api/auth/forgot-password`: burst=2
- `/api/auth/reset-password`: burst=10

**Fix:** Pick ONE rate limiting layer. Nginx for infrastructure-level, Express for application-level. Don't stack both on the same endpoint.

### 6. Two Frontend Directories
**Severity:** HIGH — Deployment confusion

| Directory | Served By | Last Updated |
|-----------|-----------|-------------|
| `/var/www/brandmonkz/` | nginx (brandmonkz.conf) | Apr 1 06:58 |
| `/var/www/crm-frontend/` | nginx (brandmonkz-frontend.conf on port 3001) | Apr 1 00:19 |

Both have frontend builds but only `/var/www/brandmonkz/` is served on the public site. The earlier deploy in this session went to `/var/www/crm-frontend/` which is served on port 3001 (not public).

**Fix:** Use ONE directory. Deploy to `/var/www/brandmonkz/` always. Remove or redirect the port 3001 server.

### 7. `$bad_bot` / `$block_ua` Nginx Logic Bug
**Severity:** HIGH — Causes 403s for legitimate requests

```nginx
if ($http_user_agent = "" ) {
    set $block_ua 1;
}
if ($request_method = OPTIONS) {
    set $block_ua 0;
}
if ($block_ua = 1) {
    return 403;
}
```

**Problem:** `$block_ua` is never initialized to 0 for normal requests. Nginx logs show: `using uninitialized "block_ua" variable` on every request. While this currently evaluates as "not 1" (so doesn't block), it's fragile and generates log noise.

**Fix:** Add `set $block_ua 0;` at the server block level before the conditionals.

---

## MEDIUM ISSUES

### 8. Mock-Send Marks Campaign as "SENT"
**Severity:** MEDIUM — Misleading status

`POST /:id/mock-send` (line 695) creates EmailLog entries with status `QUEUED` but sets the campaign status to `SENT` (line 759). Users see "SENT" in the UI but no emails were delivered.

**Fix:** Use status `QUEUED` or `DRAFT` for mock-sent campaigns.

### 9. No Rate Limit on Bulk Send Endpoints
**Severity:** MEDIUM — DoS risk

These endpoints can trigger thousands of emails but have no rate limiting:
- `POST /api/campaigns/:id/send`
- `POST /api/campaigns/quick-send`

**Fix:** Add rate limiting or require confirmation for large sends.

### 10. Base64 "Encryption" for Email Server Passwords
**Severity:** MEDIUM — False sense of security

`emailServers.ts:61`: `Buffer.from(password).toString('base64')` — this is encoding, not encryption. Anyone with DB access can decode passwords instantly.

**Fix:** Use AES-256-GCM with a key from environment, or use AWS Secrets Manager.

### 11. Express CORS Allows `file://` Protocol
**Severity:** MEDIUM — Allows local file access

`app.ts:110`: `'file://'` in allowed origins. This lets any local HTML file make authenticated API requests.

**Fix:** Remove `file://` from allowed origins.

### 12. Google OAuth State Parameter Not Validated
**Severity:** MEDIUM — Potential account takeover via calendar

`calendar-auth.ts:132`: `const userId = state as string || 'test-user'` — State parameter from Google OAuth is used directly as userId without validation. A crafted OAuth flow could connect attacker's Google Calendar to a victim's account.

---

## LOW ISSUES

### 13. N+1 Queries in Campaign Send Loops
Individual `emailLog.create()` inside loops instead of batch operations.

### 14. Multiple Nginx Server Blocks for Same Domain
`brandmonkz.conf` has two `server_name brandmonkz.com www.brandmonkz.com` blocks (HTTP and HTTPS). This is standard Certbot pattern but adds confusion.

### 15. 500MB Video Upload Limit
`videoCampaigns.ts:28` allows 500MB uploads — excessive for a CRM.

---

## FIX PRIORITY (Recommended Order)

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Route ordering (`:id` shadows) | 30 min | Prevents silent 404s |
| 2 | Consolidate to ONE send function | 1 hr | Prevents email breakage |
| 3 | Nginx CORS on all sub-locations | 15 min | Fixes forgot-password/reset |
| 4 | Pick ONE rate limiter (nginx OR express) | 30 min | Prevents lockouts |
| 5 | Single frontend deploy directory | 15 min | Prevents deployment confusion |
| 6 | Initialize `$block_ua` to 0 | 5 min | Fixes log noise |
| 7 | Single PrismaClient instance | 2 hr | Prevents connection exhaustion |
| 8 | Fix mock-send status | 10 min | Correct campaign status |
| 9 | Remove `file://` from CORS | 5 min | Security hardening |
| 10 | Encrypt email server passwords | 1 hr | Protect stored credentials |

---

## Architecture Diagram — Current Email Send Paths

```
User clicks "Send NetSuite Campaign"
  → POST /api/campaigns/quick-send
    → sendEmailViaEnvSMTP()
      → .env SMTP (peter@techcloudpro.com)
      → IF no SMTP env vars → sendEmailViaSES() [BROKEN - sandbox]

User clicks "Send" on campaign detail
  → POST /api/campaigns/:id/send
    → sendEmail(userId)
      → getUserEmailServer(userId) [DB lookup]
        → IF found → sendEmailViaSMTP(server)
        → IF not found → THROWS ERROR (400)

User clicks "Send" in wizard
  → POST /api/campaigns/:id/mock-send
    → Creates QUEUED logs only
    → Sets campaign status to "SENT" [MISLEADING]
    → NO EMAILS ACTUALLY SENT
```

**Target architecture (consolidated):**
```
ALL send paths → sendCampaignEmail()
  → 1. Try user's DB email server (if configured)
  → 2. Try env SMTP (peter@techcloudpro.com)
  → 3. Return error with clear message
  → NEVER fall back to SES
```
