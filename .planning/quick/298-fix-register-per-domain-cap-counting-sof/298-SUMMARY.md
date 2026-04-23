---
task: 298
date: 2026-04-23
status: shipped-to-production
severity: HIGH (launch-blocker — real users couldn't register)
---

# Quick 298 — Register cap bug + silent SignUp UX + orphan cleanup

## What was broken

User reported: **"create account is not working."** My v4 launch-readiness claim was wrong.

Three compounding bugs:

1. **Cap query counted soft-deleted users.** `routers/user.py:60-63` did `WHERE email ILIKE ...` with no `is_active` / `erased_at` filter. Ghost rows from quick-297 (soft-delete semantics) consumed cap slots.
2. **Orphan from my testing.** `verifytest@techcloudpro.com` (id 10) was soft-deleted on Apr 20 but never hard-purged. Combined with bug #1, made techcloudpro.com hit the 3-account cap even though only **2 active users** existed (peter + jm).
3. **SignUp.tsx silently swallowed backend errors.** `setError(err.message)` on line 104 captured the 400 message, but `{error}` was never rendered in the JSX. User saw a failed form with no feedback. That's the "not working" symptom — form broken, no message.

I incorrectly stated in earlier analysis that "3 users were registered" — the correct count is **2 active + 1 ghost = 3 total rows counted by the buggy query**. Correcting the record.

## What shipped

| Commit | Change |
|--------|--------|
| `6c87e1e` backend | `routers/user.py:60-67` — cap query now filters `is_active == True AND erased_at IS NULL` |
| `07cbcec` frontend | `SignUp.tsx:456-475` — top-level error banner with red styling; mailto CTA appended when message contains "free account limit" |

Both pushed to `github.com/jeet-avatar/arthabuild` main.

## Deploy actions on EC2

1. `.env` updated: `EXEMPT_DOMAINS=artha.build,techcloudpro.com` (TCP team are staff — same rule as artha.build, shouldn't hit free-tier cap)
2. `DELETE FROM users WHERE email = 'verifytest@techcloudpro.com'` (hard purge of orphan)
3. `docker compose up -d --build backend` — container `arthaBuild-backend` rebuilt, healthy after 18s
4. Frontend `dist` swapped → new bundle `index-8LYSa1zx.js` (was `index-CIx_UWrG.js`)
5. `docker compose restart nginx` (mandatory per memory `feedback_arthaBuild_nginx_dist_inode.md`)
6. Old dist preserved at `/home/ubuntu/arthaBuild/src/frontend/dist.bak.quick298.1776922052` for rollback

## E2E verification (observed live)

| Test | Expected | Observed |
|------|----------|----------|
| Register `@techcloudpro.com` (previously blocked) | 201 (exempt) | **201 ✅** |
| Register 3 users on fresh `@e2e-cap-test.com` | all 201 | 201, 201, 201 ✅ |
| Register 4th user same domain | 400 "free account limit" | **400** with exact message ✅ (cap still works for non-exempt) |
| Live bundle contains "Couldn't create account" | present | **4 occurrences** ✅ |
| Live bundle contains "free account limit" trigger | present | **1** ✅ |
| Live bundle contains `sales@artha.build` mailto | present | **2** ✅ |

## Root-cause honest accounting

My v4 launch-readiness test (§E) registered with `artha.build+alias@artha.build`. **`artha.build` is in EXEMPT_DOMAINS**, so the cap code path **never fired in any of my tests**. I never tested a non-exempt domain near-cap. This is the gap in zero-assumption testing.

Future coverage addition (not this task): Registration gate tests must include a non-exempt domain with pre-populated rows approaching the cap, to exercise the cap-enforcement branch.

## Open follow-ups (not this task)

- **Naming collision:** Marketing plan doc uses `(quick-298)` in commits + script filenames. This quick task took 298. Marketing plan needs a find/replace to `(quick-299)` or later before its Chunk 1 ships. Flagged in memory `arthabuild-marketing-plan-paused-chunks-2-5.md`.
- **Registration E2E coverage gap** — add non-exempt cap test to CI.

## Real users after cleanup

```
(1,  'artha.build@artha.build',  admin, active)
(12, 'peter@techcloudpro.com',   user,  active)
(14, 'jm@techcloudpro.com',      user,  active)
(17, 'vishesh@zyre.ai',          user,  active)
```
Total: 4 real users. All test orphans (3) hard-purged.

## Verdict

**Register works.** Existing techcloudpro.com staff can now register. Non-staff domains still rate-limited. User sees clear feedback on any 400.
