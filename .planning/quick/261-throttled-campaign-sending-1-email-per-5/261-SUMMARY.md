---
phase: quick-261
plan: 01
subsystem: brandmonkz-crm
tags: [campaigns, throttled-send, email-validation, progress-tracking]
metrics:
  duration: ~20 minutes
  completed: 2026-04-01
---

# Quick Task 261: Throttled Campaign Sending

Added throttled email sending to BrandMonkz CRM — 1 email per N minutes instead of blast-all.

## What Was Built

### 1. POST /api/campaigns/:id/send-throttled
- Takes `intervalMinutes` (default 5, range 1-30)
- Validates all email addresses before queuing
- Sends first email immediately, then 1 every N minutes via setInterval
- Tracks progress in DB (updates every 5 sends)
- Returns immediately with total, interval, estimated completion

### 2. GET /api/campaigns/:id/send-progress
- Live progress: sent, failed, total, remaining, nextSendInSeconds
- Checks in-memory job first, falls back to DB for completed campaigns
- Returns open/click counts for completed campaigns

### 3. Updated quick-send to throttled
- No longer blast-sends all emails in a loop
- Creates campaign → links companies → starts throttled background send
- Default 5 min interval, configurable via `intervalMinutes` body param

### 4. Email validation
- `isValidEmail()` checks format before queueing
- Invalid addresses skipped and counted in response (`invalidSkipped`)

### 5. Route ordering fixed
- send-throttled and send-progress placed BEFORE /:id route
- Prevents future route shadowing

## Verification
- 8/8 smoke tests pass
- Throttled send tested: campaign created, company linked, 1 email sent, progress shows complete
- All existing endpoints (login, campaigns, companies, contacts) unaffected
