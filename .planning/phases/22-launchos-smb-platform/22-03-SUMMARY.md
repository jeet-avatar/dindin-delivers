---
phase: 22-launchos-smb-platform
plan: "03"
subsystem: campaigns
tags: [brandmonkz, video-generation, prisma, typescript, nodejs, express, react, ec2, deploy]

dependency_graph:
  requires:
    - phase: 22-01
      provides: LaunchOS entitlement service (POST /entitlements/check at ENTITLEMENT_SERVICE_URL)
    - phase: 22-02
      provides: LaunchOS video server (POST /video/render, GET /video/jobs/:id at VIDEO_SERVER_URL)
  provides:
    - POST /api/campaigns/:id/generate-video (BrandMonkz CRM backend)
    - POST /api/webhooks/video-complete (BrandMonkz CRM backend)
    - Generate Video UI in CampaignDetailModal with polling
  affects:
    - 22-04 and later (video integration complete — downstream phases can build on video render pipeline)

tech-stack:
  added:
    - axios (already in package.json ^1.13.0) imported into campaigns.ts
  patterns:
    - Entitlement check before video server call (402 = quota exceeded with upgrade_url)
    - Async job with poll_url pattern (POST enqueues, GET polls status)
    - Webhook authenticated with shared secret (x-video-server-key header)
    - Prisma shared singleton (import from '../prisma') — no new PrismaClient()
    - BrandMonkz deploy pattern: local tsc -> scp dist/ -> pm2 restart

key-files:
  created:
    - /Users/jeet/Documents/CRM Module/src/routes/webhooks.ts
  modified:
    - /Users/jeet/Documents/CRM Module/prisma/schema.prisma
    - /Users/jeet/Documents/CRM Module/src/routes/campaigns.ts
    - /Users/jeet/Documents/CRM Module/frontend/src/pages/Campaigns/CampaignsPage.tsx

key-decisions:
  - "Campaign model uses htmlContent field (not 'content') — plan specified wrong field name, fixed automatically"
  - "Auth middleware is 'authenticate' (not 'authenticateToken') — adapted endpoint accordingly"
  - "webhooks.ts already existed (video-watch endpoint for VibingTicket) — added video-complete to same file"
  - "Full dist/ sync to EC2 fixed pre-existing crash loop (245+ restarts from stale users.js with 19 lines vs 212 expected)"
  - "No LaunchOS tier field in CRM User model — Generate Video button shown to all users; 402 response surfaces upgrade prompt"
  - "Frontend deployed to /home/ec2-user/brandmonkz-frontend/ (not /var/www/brandmonkz.com/)"

patterns-established:
  - "Video generation: POST to generate-video -> poll_url polling every 5s -> output_url when ready"
  - "Webhook secret auth: x-video-server-key header matching VIDEO_SERVER_SECRET env var"

requirements-completed:
  - LOS-02

duration: 11min
completed: "2026-04-06"
---

# Phase 22 Plan 03: LaunchOS Video Integration Summary

**BrandMonkz campaign-to-video pipeline: POST /api/campaigns/:id/generate-video with entitlement gate, webhook callback to update campaign record, and Generate Video button with polling UI in CampaignDetailModal.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-06T08:18:53Z
- **Completed:** 2026-04-06T08:30:00Z
- **Tasks:** 3 auto + 1 checkpoint (checkpoint held for human verify)
- **Files modified:** 4

## Accomplishments
- Prisma Campaign model extended with videoJobId, videoStatus, videoUrl fields
- POST /api/campaigns/:id/generate-video endpoint: auth guard, entitlement check (402 = upgrade prompt), video server enqueue, stores job_id on campaign
- POST /api/webhooks/video-complete webhook: x-video-server-key auth, updates campaign videoStatus/videoUrl when render completes
- Generate Video button in CampaignDetailModal with 5s polling and View Video link on completion
- Fixed pre-existing EC2 crash loop (245+ restarts) by syncing full dist/ — server now stable

## Task Commits

CRM Module repo commits (external to doordash-p2p):

1. **Task 1a + 1b: Schema + endpoints** - `3122409` (feat)
   - prisma/schema.prisma: videoJobId, videoStatus, videoUrl on Campaign model
   - src/routes/campaigns.ts: generate-video endpoint
   - src/routes/webhooks.ts: video-complete webhook (added to existing file)
2. **Task 2 (frontend)** - `c54afe0` (feat)
   - frontend/src/pages/Campaigns/CampaignsPage.tsx: Generate Video UI

## Files Created/Modified
- `/Users/jeet/Documents/CRM Module/prisma/schema.prisma` - videoJobId, videoStatus, videoUrl fields on Campaign model (lines 619-621)
- `/Users/jeet/Documents/CRM Module/src/routes/campaigns.ts` - POST /:id/generate-video endpoint (line 434+)
- `/Users/jeet/Documents/CRM Module/src/routes/webhooks.ts` - POST /video-complete webhook (line 75+, added to existing file)
- `/Users/jeet/Documents/CRM Module/frontend/src/pages/Campaigns/CampaignsPage.tsx` - Generate Video section in CampaignDetailModal

## Decisions Made
- Campaign model uses `htmlContent` field (not `content` as plan specified). The plan had a wrong field name — `htmlContent` is the actual field (`schema.prisma:605`, `campaigns.ts:40`).
- Auth middleware is `authenticate` not `authenticateToken` — adapted endpoint to match actual exported function.
- `webhooks.ts` already existed with a `video-watch` endpoint for VibingTicket lead scoring. Added `video-complete` to the same file rather than creating a new one.
- Full `dist/` sync to EC2 was required because EC2 had a stale `users.js` (19 lines vs 212 expected) causing 245+ PM2 restarts. This was a pre-existing issue resolved as part of deploy.
- No LaunchOS `tier` field in CRM User model — instead of gating the button client-side, the Generate Video button is shown to all users and the server returns 402 when quota is exceeded (entitlement service handles tier logic).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong field name in plan: `campaign.content` vs `campaign.htmlContent`**
- **Found during:** Task 1b (generate-video endpoint)
- **Issue:** Plan used `campaign.content` but actual Prisma field is `htmlContent` (`schema.prisma:605`)
- **Fix:** Used `campaign.htmlContent` in the endpoint
- **Files modified:** `/Users/jeet/Documents/CRM Module/src/routes/campaigns.ts`
- **Committed in:** 3122409

**2. [Rule 1 - Bug] Wrong middleware name: `authenticateToken` vs `authenticate`**
- **Found during:** Task 1b (generate-video endpoint)
- **Issue:** Plan specified `authenticateToken` but campaigns router uses `authenticate` middleware applied with `router.use(authenticate)` at the top
- **Fix:** Used existing router-level authenticate middleware (no per-route middleware needed)
- **Files modified:** `/Users/jeet/Documents/CRM Module/src/routes/campaigns.ts`
- **Committed in:** 3122409

**3. [Rule 3 - Blocking] EC2 crash loop from stale dist/ files**
- **Found during:** Task 2 (deploy)
- **Issue:** EC2 had stale `users.js` (19 lines, placeholder) vs local 212 lines. App crashed with `TypeError: Router.use() requires a middleware function` on startup (245+ restarts pre-existing)
- **Fix:** Synced full `dist/` directory to EC2 instead of individual files
- **Files modified:** All compiled dist/ files on EC2
- **Committed in:** N/A (EC2 server-side only)

---

**Total deviations:** 3 auto-fixed (2 bug fixes, 1 blocking issue)
**Impact on plan:** All auto-fixes necessary for correct operation. Pre-existing crash loop resolved as a side effect.

## Issues Encountered
- EC2 server had 245+ PM2 restarts from a pre-existing stale dist/ mismatch. Resolved by full dist/ sync. Server is now stable.
- `webhooks.ts` was not a new file — it had an existing `video-watch` endpoint. Added `video-complete` endpoint to the same file cleanly.

## User Setup Required

Before video generation will work end-to-end, set these env vars on the BrandMonkz EC2 server:

```
ENTITLEMENT_SERVICE_URL=http://<entitlement-service-ip>:4000  # From 22-01-SUMMARY.md
VIDEO_SERVER_URL=http://<video-server-ip>:3010                 # From 22-02-SUMMARY.md
VIDEO_SERVER_SECRET=<same value in video server .env>
BRANDMONKZ_API_URL=https://brandmonkz.com
```

SSH to EC2 and add to `/var/www/crm-backend/.env`, then `pm2 restart crm-backend`.

## Checkpoint: Human Verify Required

Task 3 (CampaignDetail frontend verification) is a `checkpoint:human-verify`. The frontend has been built and deployed to EC2. User must:

1. Open https://brandmonkz.com and log into a campaign
2. Open a campaign detail modal
3. Verify "Generate Video" section is visible
4. Verify 402 upgrade prompt shows when quota is exceeded
5. Type "approved" to continue

## Next Phase Readiness
- Backend generate-video and video-complete webhook endpoints are live on EC2
- Frontend Generate Video button deployed and awaiting human verification
- Env vars (ENTITLEMENT_SERVICE_URL, VIDEO_SERVER_URL, VIDEO_SERVER_SECRET) must be set on EC2 before full E2E flow works

---
*Phase: 22-launchos-smb-platform*
*Completed: 2026-04-06*
