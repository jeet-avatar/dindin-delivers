---
phase: quick-301
status: completed
date: 2026-04-26
user_approval: implicit (user moved forward through quick-302 + 303 with q301 deployed and working)
---

# quick-301 — BrandMonkz Reports → Follow-Ups tab

## Outcome

The BrandMonkz CRM `/reports` page now has two tabs: **Campaign Reports** (existing master-detail, default) and **Follow-Ups** (new). The Follow-Ups tab fetches the top contacts to follow up with based on engagement signals — paginated, auto-refreshing, and reusing the existing `[Send Follow-up]` sessionStorage handoff into CampaignWizard.

## What was built

### Backend
- **NEW route** `GET /api/follow-ups/top` at `/var/www/crm-backend/dist/routes/followUps.js` (94 lines)
- Mounted at `/var/www/crm-backend/dist/app.js:332` via `app.use('/api/follow-ups', followUps_1.default)`
- Auth: `auth_1.authenticate` middleware (same pattern as `dist/routes/contacts.js:14`)
- Query params: `?limit` (1–200, default 50) + `?offset` (default 0)
- Response: `{rows[], total, limit, offset, generatedAt}`
- Cache-Control: `no-store` (always recomputes from `email_logs`)
- Ranking SQL: `score = suspectedForwards*100 + uniqueOpens*10 + uniqueClicks*20`
- Excludes: unsubscribes (via `email_unsubscribes.email` join), hard bounces (`status='FAILED'`), scanner-pattern (`totalClicks≥3 AND uniqueOpens=1 AND uniqueIPs≤2`)

### Frontend (~/Documents/Max 8/CRM Frontend/crm-app)
- **NEW** `src/pages/Reports/FollowUpsTab.tsx` (276 → 296 lines after pagination)
- **MODIFIED** `src/pages/Reports/ReportingPage.tsx` — wrapped in 2-tab switcher, existing master-detail moved into "Campaign Reports" branch byte-equivalent
- Pagination: Prev/Next + "Showing X-Y of Z · Page N of M"
- Refresh: button + auto-refresh on tab focus when data is older than 5 min
- "Updated X ago" label, ticks every 15s
- `[Follow Up]` button per row → packages SINGLE contact into `sessionStorage['followUpCampaign']` → `/campaigns?followup=true`
- Local commits: `016f84c` (initial), `1a7fcd2` (pagination)

### Smoke test
- Total eligible (verified via psql direct): **7,427 contacts** in the universe
- Top contact: Rajesh Manoharan @ TechCloudPro, score 2170 (15 fwd / 55 opens / 6 clicks)
- HTTP 200 on `/reports`, HTTP 401 unauth on `/api/follow-ups/top` ✓
- Live bundle hash: `index-D7u0dkhW.js` deployed via rsync to `/var/www/brandmonkz/`

## Files

| Path | Action | md5 |
|---|---|---|
| `/var/www/crm-backend/dist/routes/followUps.js` | NEW (94 → ~115 lines after pagination) | `79153b7f7cf10eaaa228d59bc9c3be81` (initial) |
| `/var/www/crm-backend/dist/app.js` | MODIFIED (added 2 lines: import + mount) | — |
| `~/Documents/Max 8/CRM Frontend/crm-app/src/pages/Reports/FollowUpsTab.tsx` | NEW | git tracked |
| `~/Documents/Max 8/CRM Frontend/crm-app/src/pages/Reports/ReportingPage.tsx` | MODIFIED | git tracked |

## Defensive scope held

- Sidebar: untouched (still single Reports nav entry)
- CampaignWizard: untouched (sessionStorage handoff reused byte-identical)
- CampaignDetail / CampaignList / CampaignReportWidget: untouched
- CampaignsPage: untouched (`?followup=true` trigger reused)
- Auth middleware: untouched
- Email send pipeline: untouched
- WIP files (`CampaignAnalytics.tsx`, `DashboardPage.tsx`): preserved as user's dirty state

## Deployment

- Backend: scp + pm2 restart (count 68→69)
- Frontend: `rsync` from local dist/ to `/var/www/brandmonkz/` on EC2
- SG `sg-03f88e30ec99c3b26` opened/revoked twice during this work — final state clean
- CR ticket: SKIPPED (`ADMIN_SECRET_KEY` not in env, sandbox blocked Secrets Manager — per ticketed-task skill rule, logged + continued)

## Daily refresh mechanism

No cron, no nightly job. The data is computed fresh on every API call. The frontend auto-refreshes when the tab regains focus and >5 min have passed since the last fetch. Manual `[Refresh]` button for on-demand pulls.

## Live verification

`https://brandmonkz.com/reports` — confirmed in browser, both tabs visible, table renders, [Follow Up] button passes single contact through to CampaignWizard which auto-opens with that one contact pre-loaded.
