---
phase: quick-259
plan: 01
subsystem: brandmonkz-crm
tags: [multi-tenant, email, campaign, security]
dependency-graph:
  requires: [EmailServerConfig table, getUserEmailServer function]
  provides: [multi-tenant campaign email isolation]
  affects: [/:id/send route, /quick-send route, sendEmail function]
tech-stack:
  patterns: [per-tenant SMTP config, no env fallback for campaigns]
key-files:
  modified:
    - /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts
decisions:
  - Keep sendEmailViaEnvSMTP and sendEmailViaSES as standalone functions for potential system email use
  - Transpile TS to JS locally and deploy compiled JS (production runs dist/)
metrics:
  duration: 2m 24s
  completed: 2026-04-01T05:59:42Z
---

# Quick Task 259: Multi-Tenant Campaign Email -- Remove Env SMTP/SES Fallbacks

Campaign email sending now requires each user's own verified EmailServerConfig from DB. No silent fallback to env var SMTP or SES for campaign paths.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Modify sendEmail() to require per-user EmailServerConfig | `2e3272b` | `campaigns.ts` |
| 2 | Deploy to EC2 and verify via PM2 logs | (deploy action) | `/var/www/crm-backend/dist/routes/campaigns.js` |

## Changes Made

### sendEmail() function (line 552)
- Removed fallback to `sendEmailViaEnvSMTP()`
- Now throws `Error('userId is required for campaign sends')` if no userId
- Now throws `Error('No verified email server configured...')` if no EmailServerConfig found
- Only calls `sendEmailViaSMTP()` with the user's verified DB server

### /:id/send route (line 614)
- Added early check: `getUserEmailServer(userId!)` before contact send loop
- Returns 400 with clear error message if no verified server found
- `fromEmail` now uses only `userServer.fromEmail` (removed `|| process.env.SMTP_USER || 'noreply@brandmonkz.com'` fallback)

### /quick-send route (line 892)
- Added early check: `getUserEmailServer(userId!)` before contact send loop
- Returns 400 with clear error message if no verified server found
- `bulkFromEmail` now uses only `bulkUserServer.fromEmail` (removed `|| SES_FROM_EMAIL` fallback)

### Preserved (not modified)
- `sendEmailViaEnvSMTP()` -- standalone function kept for potential system email use
- `sendEmailViaSES()` -- standalone function kept
- `getUserEmailServer()` -- unchanged
- `sendEmailViaSMTP()` -- unchanged
- AI generation routes, mock-send route, campaign CRUD routes -- unchanged

## Deployment

- **EC2**: 100.24.213.224 (ec2-user, brandmonkz-crm.pem)
- **Backup**: `/var/www/crm-backend/dist/routes/campaigns.js.bak.20260401_055906`
- **Transpile**: TypeScript transpiled locally via `ts.transpileModule()` (ES2020/CommonJS)
- **Deploy target**: `/var/www/crm-backend/dist/routes/campaigns.js`
- **Source copy**: `/var/www/crm-backend/src/routes/campaigns.ts`
- **PM2**: `crm-backend` restarted, status `online`, no startup errors

## Deviations from Plan

### [Rule 3 - Blocking] Transpile step added for JS deployment
- **Found during:** Task 2
- **Issue:** EC2 runs compiled JS from `/var/www/crm-backend/dist/`, not TypeScript source
- **Fix:** Transpiled campaigns.ts to JS via `ts.transpileModule()` before deploying
- **Files modified:** `/tmp/campaigns.js` (temp), deployed to EC2

## Verification

- [x] Transpile check: campaigns.ts transpiles without errors (output: 36,735 bytes)
- [x] `sendEmailViaEnvSMTP` only exists as standalone function definition, not called from sendEmail()
- [x] "No verified email server" appears in 3 locations (sendEmail, /:id/send, /quick-send)
- [x] PM2 status: online, pid 909427, no startup errors
- [x] Backup created with timestamp

## Self-Check: PASSED
