---
phase: quick-210
plan: "01"
subsystem: brandmonkz-crm
tags: [ai-chatbot, system-prompt, frontend, deployment]
dependency_graph:
  requires: []
  provides: [brandmonkz-ai-assistant]
  affects: [ai-orchestrator.service.ts, AIChat.tsx]
tech_stack:
  added: []
  patterns: [system-prompt-injection, react-component-branding]
key_files:
  created: []
  modified:
    - /Users/jeet/Documents/production-crm-backup/backend/src/services/ai-orchestrator.service.ts
    - /Users/jeet/Documents/production-crm-backup/frontend/src/components/AIChat.tsx
decisions:
  - "Injected BrandMonkz knowledge block at TOP of buildSystemPrompt() template string, preserving all existing CRM data analysis and anti-hallucination rules"
  - "Built frontend with VITE_API_URL=https://brandmonkz.com override (local .env had localhost)"
  - "Used tar-based frontend deploy to handle macOS xattr metadata safely"
metrics:
  duration: "~8 minutes"
  completed_date: "2026-03-20"
  tasks_completed: 3
  files_modified: 2
---

# Phase quick-210 Plan 01: BrandMonkz AI Assistant Upgrade Summary

**One-liner:** BrandMonkz AI Assistant rebranded with Rajesh-specific system knowledge — setup guide, credentials, CSV import steps, campaign walkthrough, and lead discovery — deployed to production EC2.

## Tasks Completed

| Task | Name | Status | Key Changes |
|------|------|--------|-------------|
| 1 | Inject BrandMonkz knowledge into AI system prompt | Done | Added 70-line BRANDMONKZ CRM SYSTEM KNOWLEDGE block to buildSystemPrompt() |
| 2 | Rebrand AIChat.tsx and add BrandMonkz quick actions | Done | Header, greeting, and quickActions array updated |
| 3 | Build and deploy backend + frontend to production | Done | Backend scp + PM2 restart; frontend tar + nginx |

## What Was Built

### Task 1 — System Prompt Injection

Modified `buildSystemPrompt()` in `ai-orchestrator.service.ts` to prepend a BrandMonkz-specific knowledge block before the existing CRM data analysis section. The block covers:

- **Setup guide**: BrandMonkz is web-based, go to brandmonkz.com, no install needed
- **Rajesh's account**: rajesh@techcloudpro.com / TechCloud@2025!, 18,373 contacts already imported
- **CSV import steps**: CRM Import in sidebar → Upload CSV → map fields → import
- **Campaign creation**: 7-step walkthrough
- **Lead discovery**: Contacts page → Lead Discovery button
- **Full feature list**: 15 features listed

All existing content (live CRM data, anti-hallucination rules, campaign intelligence, response format rules) remains intact after the new block.

### Task 2 — Frontend Rebrand

Three targeted changes to `AIChat.tsx`:

1. Header changed from "AI Assistant" / "Powered by ChatGPT" to "BrandMonkz AI Assistant" / "Ask me anything about BrandMonkz"
2. Quick actions replaced with BrandMonkz-specific prompts: New Computer Setup, Import Contacts, Create Campaign, Lead Discovery
3. Initial greeting changed to address Rajesh by name and mention BrandMonkz domain knowledge

### Task 3 — Deployment

- Backend: Built with `npm run build`, SCP'd `dist/services/ai-orchestrator.service.js` to server, restarted PM2 → status: **online** (uptime confirmed)
- Frontend: Built with `VITE_API_URL=https://brandmonkz.com`, tar'd, SCP'd to server, extracted to `/var/www/brandmonkz/`
- Smoke test: Backend health returns `{"status":"ok"}` from inside server; frontend bundle grep confirms "BrandMonkz AI Assistant", "New Computer Setup", "Import Contacts", "Hi Rajesh" all present in deployed JS

## Verification Results

```
Backend:
- grep "BRANDMONKZ CRM" ai-orchestrator.service.ts → line 134 ✓
- grep "rajesh@techcloudpro.com" ai-orchestrator.service.ts → lines 147, 197, 200 ✓
- grep "buildSystemPrompt" ai-orchestrator.service.ts → lines 55, 110 ✓
- npm run build → dist/services/ai-orchestrator.service.js exists ✓
- PM2 status crm-backend → online (pid 3651986) ✓
- curl localhost:3000/api/health → {"status":"ok"} ✓

Frontend:
- grep "BrandMonkz AI Assistant" AIChat.tsx → lines 23, 219 ✓
- grep "New Computer Setup" AIChat.tsx → line 183 ✓
- grep "Import Contacts" AIChat.tsx → line 184 ✓
- grep "Hi Rajesh" AIChat.tsx → line 23 ✓
- grep "BrandMonkz AI Assistant" /var/www/brandmonkz/assets/*.js → FOUND ✓
- grep "New Computer Setup" /var/www/brandmonkz/assets/*.js → FOUND ✓
- grep "Import Contacts" /var/www/brandmonkz/assets/*.js → FOUND ✓
- grep "Hi Rajesh" /var/www/brandmonkz/assets/*.js → FOUND ✓
```

## Deviations from Plan

### Auto-noted: Pre-existing TypeScript errors in other routes

Pre-existing TS errors in `src/routes/ui-config.ts`, `src/routes/users.ts`, and `src/routes/videoCampaigns.ts` were present before this task and are out of scope. They do not affect `ai-orchestrator.service.ts` compilation. The build still produces the dist files correctly (tsconfig uses skipLibCheck).

### Auto-noted: Frontend .env had localhost

The local `.env` had `VITE_API_URL=http://localhost:3000`. Built with `VITE_API_URL=https://brandmonkz.com` environment override as instructed in plan constraints. Did not modify the .env file (it's a dev convenience file).

None - plan executed as written for the ai-orchestrator and AIChat.tsx changes. The deployment steps matched the plan exactly.

## Self-Check: PASSED

- `/var/www/crm-backend/backend/dist/services/ai-orchestrator.service.js` deployed ✓
- `/var/www/brandmonkz/assets/index-CHEOklO7.js` contains "BrandMonkz AI Assistant" ✓
- PM2 crm-backend: online ✓
- Backend health: `{"status":"ok"}` ✓
