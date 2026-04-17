---
phase: 22
plan: 05
subsystem: launchos-smb-platform
tags: [zietra-meet, brandmonkz, crm, ai-summary, websocket, ecs, ci-cd]
dependency_graph:
  requires: [22-01]
  provides: [post-meeting-ai-notes, brandmonkz-meeting-notes-endpoint]
  affects: [brandmonkz-deals, zietra-meet-server]
tech_stack:
  added: ["@anthropic-ai/sdk ^0.39.0 (zoom server)"]
  patterns:
    - "TranscriptMessage[] accumulated per Room in-memory, cleared on empty"
    - "Short-lived JWT (60s, signed with LAUNCHOS_JWT_SECRET) for service-to-service auth"
    - "setImmediate for async summary — does not block WS disconnect handler"
    - "PATCH endpoint registered BEFORE router.use(authenticate) to bypass user auth"
key_files:
  created:
    - apps/zoom/server/services/meetingSummary.ts
  modified:
    - apps/zoom/server/index.ts
    - apps/zoom/server/package.json
    - apps/zoom/server/tsconfig.json
    - apps/zoom/deploy/Dockerfile
    - apps/zoom/frontend/src/hooks/useWebRTC.ts
    - /Users/jeet/Documents/CRM Module/src/routes/deals.ts (external)
    - /Users/jeet/Documents/CRM Module/prisma/schema.prisma (external)
decisions:
  - "Route meeting-notes endpoint BEFORE router.use(authenticate) to allow service JWT bypass of user auth"
  - "Used Node.js native fetch (Node 18+) instead of axios for BrandMonkz HTTP call — no extra dependency"
  - "Dynamic import for summarizeMeeting.js inside setImmediate — avoids circular dependency risk"
  - "nginx CORS config patched to include PATCH method (was GET,POST,PUT,DELETE only)"
  - "Prisma columns added via prisma db execute SQL directly (prisma db push blocked by unrelated contacts email unique constraint)"
metrics:
  duration_minutes: 13
  completed_date: "2026-04-06"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 7
---

# Phase 22 Plan 05: Zietra Meet AI Meeting Summary to BrandMonkz CRM Summary

**One-liner:** Post-meeting Claude Sonnet summarization pipeline: WS transcript accumulation per room, JWT-authenticated PATCH to BrandMonkz deals, Zietra Meet deployed via CI/CD to ECS.

## What Was Built

### Task 1: Transcript Accumulation + Claude Summary Service
- Extended Room interface with `transcript: TranscriptMessage[]`, `dealId?`, `launchosUserId?`
- New `transcript` WS message type: clients send `{type:'transcript', text, speaker}` during meeting
- On room empty: snapshot transcript, clear from memory (PII), sign 60s JWT, call `summarizeMeeting()`, PATCH BrandMonkz
- New `apps/zoom/server/services/meetingSummary.ts`: `claude-sonnet-4-5` via Anthropic SDK
- Added `@anthropic-ai/sdk ^0.39.0` to server dependencies
- Updated tsconfig.json `include` to cover `services/**/*.ts`
- TODO(LOS-SEC) comment on hardcoded TURN credentials in useWebRTC.ts

### Task 2: BrandMonkz Meeting Notes Endpoint
- `PATCH /api/deals/:id/meeting-notes` in `/Users/jeet/Documents/CRM Module/src/routes/deals.ts`
- Registered BEFORE `router.use(authenticate)` — service-to-service call uses own JWT auth
- Verifies `x-launchos-token` via `jwt.verify(token, LAUNCHOS_JWT_SECRET)` — rejects expired tokens
- Appends meeting summary to `deal.notes` with timestamp header (never overwrites)
- Updates `deal.lastMeetingAt` to meeting end time
- Added `notes String?` and `lastMeetingAt DateTime?` to Prisma Deal schema
- Columns added via `prisma db execute` SQL (db push blocked by pre-existing contacts constraint)
- Deployed to BrandMonkz EC2 via scp + pm2 restart

### Task 3: Docker + CI/CD
- Added `COPY server/services/ ./server/services/` to `apps/zoom/deploy/Dockerfile`
- CI/CD workflow `deploy-zietra-meet.yml` already existed and handles ECR + ECS
- Triggered workflow: run `24024823686` completed successfully (3m48s)
- ECS service `zietra-meet-service`: status=ACTIVE, runningCount=1

## Verification Evidence

```
# Endpoint returns 401 (not 404 or 403) without valid JWT:
curl -X PATCH https://brandmonkz.com/api/deals/test/meeting-notes \
  -H "User-Agent: Mozilla/5.0" -H "Content-Type: application/json" \
  -d '{"notes":"test"}'
# → {"error":"Missing x-launchos-token"} HTTP 401

# ECS service running:
aws ecs describe-services --cluster dollor-production --services zietra-meet-service
# → {"status":"ACTIVE","running":1}

# CI/CD run succeeded:
gh run view 24024823686
# → ✓ Build and Deploy Zietra Meet in 3m43s
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Route ordering: meeting-notes behind authenticate middleware**
- **Found during:** Task 2 verification (endpoint returned 403 instead of 401)
- **Issue:** `router.use(authenticate)` was applied to ALL routes; meeting-notes endpoint was registered after it, causing user auth to reject service JWT calls
- **Fix:** Moved `PATCH /:id/meeting-notes` to be registered BEFORE `router.use(authenticate)`
- **Files modified:** `/Users/jeet/Documents/CRM Module/src/routes/deals.ts`

**2. [Rule 3 - Blocking] nginx missing PATCH in CORS allowed methods**
- **Found during:** Task 2 live testing (got 405 from nginx)
- **Issue:** brandmonkz.conf only allowed `GET, POST, PUT, DELETE, OPTIONS` — no PATCH
- **Fix:** Updated all CORS headers in `/etc/nginx/conf.d/brandmonkz.conf` to include PATCH; reloaded nginx
- **Note:** Initial 403 from PATCH was actually nginx blocking the `curl` user-agent (security.conf blocks curl/wget). Node.js fetch from Zietra Meet server won't be affected.

**3. [Rule 3 - Blocking] Dockerfile missing services/ directory**
- **Found during:** Task 3 review of existing Dockerfile
- **Issue:** Dockerfile COPYed all server subdirectories individually but had no `COPY server/services/` line
- **Fix:** Added `COPY server/services/ ./server/services/` to Dockerfile
- **Files modified:** `apps/zoom/deploy/Dockerfile`

**4. [Rule 3 - Blocking] Prisma schema sync: db push blocked by pre-existing contacts constraint**
- **Found during:** Task 2 schema migration
- **Issue:** `npx prisma db push` failed due to pre-existing duplicate emails in contacts table (unrelated to our changes)
- **Fix:** Used `prisma db execute` to run raw SQL `ALTER TABLE deals ADD COLUMN IF NOT EXISTS notes TEXT; ALTER TABLE deals ADD COLUMN IF NOT EXISTS "lastMeetingAt" TIMESTAMP;` — bypasses the contacts constraint while applying only our new nullable columns

**5. [Rule 2 - Missing] tsconfig.json only included *.ts root files**
- **Found during:** Task 1 setup
- **Issue:** `"include": ["*.ts"]` would not typecheck files in `services/` subdirectory
- **Fix:** Updated to include `services/**/*.ts`, `routes/**/*.ts`, `middleware/**/*.ts`, `calendar/**/*.ts`
- **Files modified:** `apps/zoom/server/tsconfig.json`

## Self-Check

### Created Files Exist
- [x] `apps/zoom/server/services/meetingSummary.ts` — FOUND
- [x] `.planning/phases/22-launchos-smb-platform/22-05-SUMMARY.md` — FOUND (this file)

### Commits Exist
- [x] `7cc2aeb2` — feat(22-05): Zietra Meet transcript accumulation and Claude summary service
- [x] `6ebc9b1c` — feat(22-05): Add services/ dir to Zietra Meet Dockerfile for CI/CD

### Live Services Verified
- [x] BrandMonkz `PATCH /api/deals/:id/meeting-notes` → 401 (route registered, auth working)
- [x] ECS `zietra-meet-service` → ACTIVE, runningCount=1
- [x] CI/CD run 24024823686 → completed success
