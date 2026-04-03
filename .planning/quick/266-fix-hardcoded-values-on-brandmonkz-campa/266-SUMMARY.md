---
phase: quick
plan: 266
subsystem: ui
tags: [brandmonkz, crm, campaigns, prisma, react, typescript]

requires: []
provides:
  - "GET /api/campaigns returns user.firstName + user.lastName per campaign"
  - "CampaignsPage.tsx shows real creator names instead of 'Current User'"
  - "Companies Reached stat sums real _count.companies instead of fake 1.5x formula"
affects: [brandmonkz-campaigns]

tech-stack:
  added: []
  patterns: ["Prisma include with user relation for attribution", "Frontend accumulates real _count fields instead of fake formulas"]

key-files:
  created: []
  modified:
    - "/var/www/crm-backend/src/routes/campaigns.ts"
    - "/var/www/crm-backend/dist/routes/campaigns.js"
    - "/Users/jeet/Documents/CRM Frontend/crm-app/src/pages/Campaigns/CampaignsPage.tsx"

key-decisions:
  - "Used user include with select to expose only firstName/lastName — avoids leaking other user fields"
  - "createdBy falls back to 'Team Member' when user is null — avoids blank attribution"

requirements-completed: [Q-266]

duration: 15min
completed: 2026-04-03
---

# Quick Task 266: Fix Hardcoded Values on BrandMonkz Campaigns Page

**Backend now includes campaign creator name via Prisma user relation, and frontend maps real _count.companies to replace a fake `Math.ceil(campaigns.length * 1.5)` formula**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-03T21:45:00Z
- **Completed:** 2026-04-03T21:58:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `user: { select: { firstName, lastName } }` include to Prisma `findMany` in GET /api/campaigns — backend now returns real creator info
- Frontend `companiesCount` field added to Campaign interface and populated from `c._count?.companies`
- `createdBy` mapping replaced from hardcoded `'Current User'` to `c.user.firstName + lastName` with `'Team Member'` fallback
- `totalCompanies` formula replaced: `Math.ceil(campaigns.length * 1.5)` → `campaigns.reduce((acc, c) => acc + c.companiesCount, 0)`
- Frontend built and deployed to `/var/www/crm-frontend/` on EC2

## Task Commits

Backend changes deployed directly to EC2 (no git commit for EC2 files per deploy pattern).

1. **Task 1: Backend user include** - deployed to `/var/www/crm-backend/dist/routes/campaigns.js`, PM2 restarted, no crash
2. **Task 2: Frontend mapping + build + deploy** - built and deployed to `/var/www/crm-frontend/`

## Files Created/Modified

- `/var/www/crm-backend/src/routes/campaigns.ts` (EC2) — Added `user: { select: { firstName, lastName } }` to findMany include
- `/var/www/crm-backend/dist/routes/campaigns.js` (EC2) — Compiled and deployed
- `/Users/jeet/Documents/CRM Frontend/crm-app/src/pages/Campaigns/CampaignsPage.tsx` — 3 changes: interface field, mapping fix, formula fix

## Verification

```
Backend:
  - grep /var/www/crm-backend/dist/routes/campaigns.js line 41:
    select: { firstName: true, lastName: true }  ✓
  - PM2 status: online, no crash in logs  ✓

Frontend:
  - grep result: 0 occurrences of 'Current User' in dist/  ✓
  - grep result: no 'campaigns.length * 1.5' in source  ✓
  - Build: vite build succeeded, 638KB JS bundle  ✓
  - Deploy: scp to /var/www/crm-frontend/ exited 0  ✓
```

## Deviations from Plan

**1. [Rule 3 - Blocking] Ownership issue on /var/www/crm-frontend/**
- **Found during:** Task 2 (deploy step)
- **Issue:** Directory owned by `nginx:nginx` — scp from ec2-user failed with "Permission denied"
- **Fix:** `sudo chown -R ec2-user:ec2-user /var/www/crm-frontend/` before scp, then `sudo chown -R nginx:nginx` after
- **Impact:** None — files deployed correctly, nginx serves them normally

---

**Total deviations:** 1 auto-fixed (blocking deploy permission)
**Impact on plan:** No scope change, fully resolved inline.

## Issues Encountered

- Login credentials for Peter's account not available for direct API curl verification; verified via deployed JS inspection and pm2 logs instead.

## Next Phase Readiness

- Campaigns page live at https://brandmonkz.com/campaigns
- Peter and Rajesh's real names will now appear in the "by [name]" attribution on each campaign row
- Companies Reached stat shows 0 for campaigns with no companies linked (accurate), or real sum when companies exist

---
*Phase: quick*
*Completed: 2026-04-03*
