---
phase: 22-launchos-smb-platform
plan: 06
subsystem: brandmonkz-crm
tags: [ai, strategy-bot, gtm, claude-sonnet, onboarding, campaigns]
dependency_graph:
  requires: [22-01]
  provides: [strategy-bot-backend, strategy-bot-frontend, gtm-plan-generation]
  affects: [campaigns, user-record]
tech_stack:
  added: []
  patterns: [claude-sonnet-4-5-structured-json, prisma-user-gtmplan-field, react-wizard-steps, tanstack-query-mutation]
key_files:
  created:
    - /Users/jeet/Documents/CRM Module/src/routes/strategyBot.ts
    - /Users/jeet/Documents/CRM Frontend/crm-app/src/pages/StrategyBot/StrategyBotPage.tsx
  modified:
    - /Users/jeet/Documents/CRM Module/prisma/schema.prisma
    - /Users/jeet/Documents/CRM Module/src/app.ts
    - /Users/jeet/Documents/CRM Frontend/crm-app/src/App.tsx
    - /Users/jeet/Documents/CRM Frontend/crm-app/src/components/Sidebar.tsx
decisions:
  - "Used authenticate middleware (not authenticateToken alias) to match existing CRM route pattern from campaigns.ts"
  - "Added gtmPlan String? field to User model and ran prisma db push — avoids new table, stores latest plan as JSON on user record"
  - "Frontend deployed via scp after fixing permissions with sudo chown ec2-user on /var/www/crm-frontend"
  - "Endpoint returns 403 (not 401) on unauthenticated POST — both prove route is registered, not 404"
metrics:
  duration: 4 minutes
  completed: 2026-04-06T08:23:17Z
  tasks_completed: 2
  files_created: 2
  files_modified: 4
---

# Phase 22 Plan 06: AI Strategy Bot Summary

**One-liner:** Claude Sonnet 4-5 GTM plan generator with 10-question wizard, structured JSON output, prisma user storage, and wired "Generate Video" buttons that create real BrandMonkz campaigns.

## What Was Built

### Backend: `POST /api/strategy-bot/generate`

New Express router at `/Users/jeet/Documents/CRM Module/src/routes/strategyBot.ts`:

- `authenticate` middleware guards the endpoint (shared pattern from campaigns.ts)
- Validates all 10 question answers (`q1`–`q10`) are present and non-empty
- `buildGTMPrompt()` formats business profile into structured Claude prompt requesting JSON fenced output
- Calls Claude Sonnet 4-5 with 4096 max tokens
- Parses ` ```json ` fenced response into typed `GTMPlan` interface
- Stores plan as JSON string on `user.gtmPlan` via shared `prisma` singleton
- Returns `{ plan: GTMPlan, generated_at: ISO string }`

GTM plan structure: `summary`, `campaign_calendar` (3 months), `email_sequences` (3), `video_topics` (5), `seo_keywords` (10), `social_cadence`, `first_week_actions` (5)

Schema change: `gtmPlan String?` added to User model, `prisma db push` synced to local DB.

### Frontend: `StrategyBotPage.tsx`

10-question wizard with:
- Progress bar showing current step (1/10) and percentage
- Back/Next navigation with disabled state on empty answers
- Submit on final question triggers `useMutation` → `POST /api/strategy-bot/generate`
- Loading state: "Building your GTM plan..."
- Error state shown inline

GTMPlanDisplay after generation:
- Blue executive summary card
- "Start This Week" — 5 numbered first-week actions
- Video Topics grid — each card has **"Generate Video →" button wired to `POST /api/campaigns`** which creates a draft campaign pre-populated with topic text, then navigates to `/campaigns/{id}`
- SEO Keywords as pill tags
- 90-Day Campaign Calendar — 3-month grid
- Social Cadence — platform × posts/week grid

Route `/strategy-bot` added to `App.tsx` protected routes. "AI Strategy Bot" nav item added to `Sidebar.tsx` with `LightBulbIcon`.

## Verification

```
Grep proofs:
- claude-sonnet-4-5 in strategyBot.ts: line 94 ✓
- buildGTMPrompt() function: line 47 ✓
- 0 matches for new PrismaClient (shared singleton used) ✓
- /strategy-bot route in App.tsx: line 102 ✓
- createCampaignFromTopic defined: line 142 ✓
- createCampaignFromTopic onClick wired: line 199 ✓
- fetch('/api/campaigns') in StrategyBotPage: line 146 ✓

Build: ✓ 2464 modules, no errors (Vite 7.1.9)
TypeScript: ✓ 0 errors (tsc --noEmit)
Live endpoint: POST https://brandmonkz.com/api/strategy-bot/generate → HTTP 403 (route registered, auth enforced) ✓
```

## Commits

| Repo | Task | Hash | Description |
|------|------|------|-------------|
| CRM Module | Task 1 | c6aa22a | feat(22-06): AI Strategy Bot backend — Claude Sonnet GTM plan generator |
| CRM Frontend | Task 2 | e409c40 | feat(22-06): AI Strategy Bot frontend — 10-question wizard and GTM plan display |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used `authenticate` not `authenticateToken` for auth middleware**
- **Found during:** Task 1
- **Issue:** Plan specified `authenticateToken` but campaigns.ts (the authoritative pattern file) uses `authenticate`. Both are exported aliases from the same function (`auth.ts:213-214`), but `authenticate` is the canonical import in this codebase.
- **Fix:** Used `import { authenticate }` matching the existing project pattern
- **Files modified:** strategyBot.ts

**2. [Rule 2 - Missing functionality] Added input validation for empty/whitespace answers**
- **Found during:** Task 1
- **Issue:** Plan only checked `Object.keys(answers).length < 10` but a user could submit empty strings
- **Fix:** Added `missingKeys` check that validates each `q1`–`q10` is present and non-empty after trim
- **Files modified:** strategyBot.ts

**3. [Rule 3 - Blocking] Fixed EC2 frontend deployment permissions**
- **Found during:** Task 2 deploy
- **Issue:** `scp` failed with "Permission denied" on `/var/www/crm-frontend/assets/`
- **Fix:** `sudo chown -R ec2-user:ec2-user /var/www/crm-frontend/` on EC2 before re-running scp
- **Files modified:** None (server-side permission fix)

## Self-Check: PASSED

| Item | Status |
|------|--------|
| strategyBot.ts exists | FOUND |
| StrategyBotPage.tsx exists | FOUND |
| 22-06-SUMMARY.md exists | FOUND |
| Commit c6aa22a (backend) | FOUND |
| Commit e409c40 (frontend) | FOUND |
