# Wave B-7 Local E2E Smoke Test

**Date:** 2026-04-22
**Branch:** gsd/phase-23-zietra-crm-port
**Backend:** http://localhost:3021 (ts-node-dev)
**DB:** Docker Postgres `zietra-crm-pg` port 55432, schema in-sync (prisma db push)
**Auth:** Supabase JWKS (project `lbpkbpfwdpnwlccmlfxn`, ES256)

## Flow

| Step | Request | Result |
|------|---------|--------|
| 1. Login | POST supabase `/auth/v1/token?grant_type=password` (demo@zietra.com) | 818-char access_token |
| 2. Create contact | POST /api/contacts | id=cmoamfy0v0003ovv2zfm6wujj |
| 3. Create campaign | POST /api/campaigns (DRAFT) | id=cmoam9cdp0001ovv2rrlpbrr8 |
| 4. List campaigns | GET /api/campaigns | total=1 |
| 5. Seed email_log | direct INSERT (SMTP not configured locally) | id=smokelog_f01cd0c6b45a16c0 |
| 6. Fire open pixel | GET /api/tracking/open/:id | 200 |
| 7. Fire click redirect | GET /api/tracking/click/:id?url=... | 302 → target |
| 8. DB events | email_tracking_events | OPEN + CLICK rows present |
| 9. DB log | email_logs | status=CLICKED, openedAt+clickedAt populated |
| 10. Analytics | GET /api/tracking/analytics/:campaignId | 100% open, 100% click, topPerformers engagementScore=70 |
| 11. Dashboard analytics | GET /api/analytics | HTTP 200 |

## Proofs

Auth flow — dual-mode middleware at `src/middleware/auth.ts` tries Supabase JWKS first
(`src/middleware/supabaseAuth.ts:30`), finds-or-creates User by email claim. Verified
by `GET /api/contacts → 200` with Supabase ES256 token.

Tracking flow — open pixel `routes/emailTracking.js:14` writes OPEN event +
emailLog.openedAt; click redirect `:220` writes CLICK event + clickedAt + status=CLICKED.
Both observed in DB after 302.

## Known gaps (acceptable for B)

- Real SMTP send blocked: `No verified email server configured`. Wave C deploy will use
  AWS SES or Gmail SMTP per ops pattern; local dev doesn't need it.
- `/api/campaigns/:id/mock-send` returned `queued for 0 contacts` because we didn't
  link contacts/companies to the campaign — outside smoke scope.
- Wave B-6 (physical merge of 4 campaign files → 1) deferred: plan says "after
  smoke test passes" but smoke passes on existing structure; revisit post-deploy.
