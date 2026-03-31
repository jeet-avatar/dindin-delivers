---
phase: quick-258
plan: 01
subsystem: brandmonkz-crm
tags: [campaigns, email, ses, netsuite, one-click]
dependency-graph:
  requires: []
  provides: [quick-send-endpoint, netsuite-campaign-button]
  affects: [campaigns.ts, CampaignsPage.tsx]
tech-stack:
  added: []
  patterns: [one-click-send, hardcoded-template, ses-real-send]
key-files:
  created: []
  modified:
    - /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts
    - /Users/jeet/Documents/production-crm-backup/frontend/src/pages/Campaigns/CampaignsPage.tsx
decisions:
  - Hardcoded email template with Peter Samuel signature instead of AI-generated content for consistency
  - Orange gradient button to visually distinguish from purple Create Campaign button
  - Used existing SES sendEmail function and email log pattern from :id/send endpoint
metrics:
  duration: ~14 minutes
  completed: 2026-03-31
---

# Quick Task 258: Build One-Click Campaign Send for BrandMonkz

One-click "Send NetSuite Campaign" button: POST /api/campaigns/quick-send creates campaign with $2/hr staff augmentation email, auto-links all csv_import companies, sends real emails via AWS SES signed by Peter Samuel.

## Tasks Completed

### Task 1: Backend POST /api/campaigns/quick-send endpoint
- Added `NETSUITE_CAMPAIGN_HTML` const with perfected NetSuite-specific email template
- New `POST /api/campaigns/quick-send` endpoint that:
  - Finds all companies with `dataSource: 'csv_import'` and their active contacts
  - Creates campaign with name "NetSuite Staff Augmentation -- $2/hr"
  - Links all NetSuite companies via `campaignCompany.createMany`
  - Sends real emails via existing `sendEmail()` SES function with template variable replacement
  - Creates email logs with tracking pixels (same pattern as existing `:id/send`)
  - Updates campaign status to SENT with counts
  - Returns `{ success, campaignId, sent, total, failed, companyCount }`
- **File**: `backend/src/routes/campaigns.ts` (lines 706-832)

### Task 2: Frontend "Send NetSuite Campaign" one-click button
- Added `sendingNetSuite` and `netSuiteResult` state variables
- Added `handleNetSuiteCampaign` handler with confirmation dialog
- Added orange gradient button in header (before Help button) with loading spinner
- Added dismissible green success banner showing sent/total/failed/company counts
- All icons already imported (PaperAirplaneIcon, ArrowPathIcon, XMarkIcon)
- **File**: `frontend/src/pages/Campaigns/CampaignsPage.tsx`

## Verification

- Backend: `quick-send` endpoint at line 736
- Backend: `csv_import` filter at line 744
- Backend: `Peter Samuel` signature in email HTML at line 726
- Frontend: `Send NetSuite Campaign` button at line 276
- Frontend: `quick-send` API call at line 158
- Frontend TypeScript: compiles with zero errors
- Backend TypeScript: no new errors (pre-existing User type errors in other files unchanged)

## Deviations from Plan

None - plan executed exactly as written.
