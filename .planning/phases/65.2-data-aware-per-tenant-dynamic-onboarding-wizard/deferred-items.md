# Phase 65.2 — Deferred items (out of scope, logged per GSD scope rule)

## Plan 02 — pre-existing test failures (not caused by Plan 02 changes)

Verified via `git stash` + `npm test` against pre-Plan-02 HEAD `e4b8095` — these 3
tests were already failing BEFORE Plan 02's changes. They are NOT regressions
from data-signals.ts / rule-engine / recommend-rules / routes/onboarding edits.

**File:** `/Users/jeet/turion-space-demo/backend/tests/unit/invite-flow.test.ts`

Failing tests:
1. `POST /api/team/invite > 1. happy path: new email + valid role → 200, INSERT, sendEmail called`
2. `POST /api/team/invite > 2. resend: existing pending row → 200, UPDATE not INSERT`
3. `POST /api/team/invite > 8. SES failure does NOT fail the invite (best-effort) → still 200`

These belong to Phase 54.1 / 54.4 team-invite work and are unrelated to Phase 65.2.
Defer to whichever phase next touches the team-invite flow (likely Phase 54.x or a
dedicated test-stabilisation pass).

Status: NOT FIXED. Out of Plan 02 scope.
