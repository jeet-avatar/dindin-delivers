---
phase: 36-zero-hardcodes-e2e-audit-turion-space
plan: 07
subsystem: infra
tags: [turion-space-demo, secrets, resend, ai-agents, lambda, gitignore]

requires:
  - phase: 36-02
    provides: ERP lookup endpoints + single-source-of-truth API base (src/app.ts already wires /api/agents + /api lookups routers)
  - phase: 36-05
    provides: de-hardcoded Arena/MES/integration ERP pages (src/app.ts changes)
provides:
  - "In-tree WIP in turion-space-demo resolved (finished + secured + committed, not reverted)"
  - "3 new AI agents committed: NCR→CAPA closure, EVMS Watchdog, Integration Sentinel (real DB writes + audit_log) — wired into agent-sales-cash.html"
  - "Plaintext Resend API key scrubbed from notify.ts (src + dist); now read lazily from process.env.RESEND_API_KEY, no-ops gracefully if absent"
  - "agents.ts no longer crashes Lambda cold-start on missing ANTHROPIC_API_KEY (lazy getAnthropic())"
  - "backend/node_modules untracked (was committed despite .gitignore)"
affects: [36-09]

tech-stack:
  added: []
  patterns:
    - "Lazy + memoized secret read at call time (not module load) — getResendKey() / getAnthropic() — never touches the Lambda cold-start path; mirrors turion-satellite assistant.ts getApiKey()"

key-files:
  created: []
  modified:
    - /Users/jeet/turion-space-demo/backend/src/routes/notify.ts
    - /Users/jeet/turion-space-demo/backend/src/routes/agents.ts
    - /Users/jeet/turion-space-demo/backend/dist/routes/notify.js
    - /Users/jeet/turion-space-demo/backend/dist/routes/agents.js
    - /Users/jeet/turion-space-demo/backend/dist/app.js
    - /Users/jeet/turion-space-demo/backend/lambda-build
    - /Users/jeet/turion-space-demo/agent-sales-cash.html
    - /Users/jeet/turion-space-demo/dashboard-cio.html
    - /Users/jeet/turion-space-demo/about-this-demo.html

key-decisions:
  - "Used plain process.env.RESEND_API_KEY (not a Secrets Manager fetch) — this repo passes every secret (e.g. DATABASE_URL) as a plain Lambda env var; adding @aws-sdk/client-secrets-manager would have meant a new dependency + node_modules churn, contradicting the node_modules-untrack goal"
  - "Committed the agents WIP as one logical commit (security fix + feature land + node_modules removal) per the plan's Task 3, rather than splitting — the changes are interdependent (dist/ rebuild reflects all of them)"

patterns-established:
  - "Lazy-memoized secret accessor: undefined = not tried, null = absent, string = the key; read inside the request/send handler, never at module top-level"

requirements-completed: [WipResolved]

duration: 18min
completed: 2026-05-12
---

# Phase 36 Plan 07: Resolve turion-space-demo in-tree WIP + scrub plaintext Resend key Summary

**Landed the long-stashed 3-AI-agent WIP (NCR→CAPA / EVMS Watchdog / Integration Sentinel — real DB writes + audit_log) after scrubbing a hardcoded plaintext Resend API key out of `notify.ts`/`dist/`, untracking `backend/node_modules`, and making both `notify.ts` and `agents.ts` cold-start-safe.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-05-12
- **Completed:** 2026-05-12
- **Tasks:** 3
- **Files modified:** 9 (+ `backend/node_modules` untracked: ~1185 files removed from index)

## Accomplishments
- Removed the plaintext Resend API key (`re_JRdox6wH_...`) from `backend/src/routes/notify.ts`; replaced with a lazy, memoized `getResendKey()` that reads `process.env.RESEND_API_KEY` at send time. Missing key → logs `[notify] Resend not configured` and returns (no throw, no crash).
- Rebuilt `dist/` from cleaned `src/` (`npm run build`) — the leaked key is in neither `src/` nor `dist/`. `grep -rn "re_JRdox6wH" backend/` → zero matches.
- `backend/src/routes/agents.ts`: removed the module-top `throw new Error('ANTHROPIC_API_KEY env var missing')` (it ran at module load = on the Lambda cold-start path). Replaced with a lazy `getAnthropic()` getter (same memoization pattern); the two `anthropic.messages.create` call sites now call `getAnthropic().messages.create`.
- Committed the agents feature (NOT reverted): `agents.ts` + rebuilt `dist/routes/agents.js` + `dist/app.js`, `agent-sales-cash.html` (4 "▶ Run Agent" buttons → `POST /api/agents/{run,ncr-capa,evms,integration-sentinel}` — routes confirmed against the router), `dashboard-cio.html` (+~252 lines), `about-this-demo.html` (presentation redesign).
- `git rm --cached -r backend/node_modules` — it was tracked despite `.gitignore` already containing `node_modules/`. `git ls-files backend/node_modules` → 0.
- `backend/lambda-build` diff confirmed benign: a single `ARG CACHEBUST=1` line added before `COPY dist ./dist` (forces a fresh layer on each build). `RUN npm ci --omit=dev` unchanged.
- `npm run build` + `npx tsc --noEmit` green; `node --check dist/routes/notify.js` and `dist/routes/agents.js` clean.

## Task Commits

The plan groups all changes into a single logical commit (its Task 3 owns the commit):

1. **Tasks 1–3 (secure notify.ts, untrack node_modules, land + commit the agents feature)** — `9edebd0` (feat) — `feat(36-07): land in-tree agents WIP + scrub plaintext Resend key`

**Plan metadata:** (see final docs commit in doordash-p2p)

## Files Created/Modified
- `backend/src/routes/notify.ts` — Resend send via lazy `process.env.RESEND_API_KEY`; no literal key; no-op when unconfigured
- `backend/src/routes/agents.ts` — lazy `getAnthropic()`; no module-top throw; 3 agents (NCR→CAPA, EVMS, Integration Sentinel) + `runAgentLoop()` helper, all writing real rows to `turion.*` tables + `turion.audit_log`
- `backend/dist/routes/notify.js`, `backend/dist/routes/agents.js`, `backend/dist/app.js` — rebuilt from current `src/` (`dist/app.js` now also reflects 36-02's `lookups` router + 36-05's src changes, which is correct — it's the canonical build of the committed `src/app.ts`)
- `backend/lambda-build` — `ARG CACHEBUST=1` bump (benign)
- `agent-sales-cash.html` — agent run buttons wired to `/api/agents/*`
- `dashboard-cio.html` — CIO dashboard expansion
- `about-this-demo.html` — presentation redesign
- `.gitignore` — already covered `node_modules/`; no change needed (entry confirmed present)

## Before / After — notify.ts

**Before (insecure):**
```ts
const RESEND_KEY = 're_JRdox6wH_Nwgk9aVGzWy6czpgUTPoUBsU';   // plaintext!
...
headers: { 'Authorization': `Bearer ${RESEND_KEY}`, ... }
```

**After (secure, lazy, cold-start-safe):**
```ts
let _resendKey: string | null | undefined;
function getResendKey(): string | null {
  if (_resendKey === undefined) _resendKey = process.env.RESEND_API_KEY || null;
  return _resendKey;
}
...
async function sendResend(subject: string, text: string): Promise<void> {
  const resendKey = getResendKey();
  if (!resendKey) {
    console.log('[notify] Resend not configured (no RESEND_API_KEY env var) — skipping email send');
    return;                                  // no throw, no crash
  }
  ... headers: { 'Authorization': `Bearer ${resendKey}`, ... }
}
```

## Decisions Made
- **Plain `process.env.RESEND_API_KEY`, not AWS Secrets Manager** — `turion-space-demo`'s backend already takes every secret (`DATABASE_URL`, etc.) as a plain Lambda env var; pulling in `@aws-sdk/client-secrets-manager` would have added a dependency + `package-lock`/`node_modules` churn, which directly conflicts with this plan's "untrack node_modules" goal. If the user prefers Secrets Manager, they can wire `RESEND_API_KEY` from a secret in the Lambda task config the same way `DATABASE_URL` is wired today.
- **Single commit for the whole feature** — the plan's Task 3 explicitly owns the commit (the `dist/` rebuild has to happen after the `src/` fixes), so all three tasks land in one atomic commit rather than three.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Security bug] `agents.ts` crashed the Lambda cold-start on missing `ANTHROPIC_API_KEY`**
- **Found during:** Task 3 (reviewing the agents diff)
- **Issue:** `backend/src/routes/agents.ts` had `if (!process.env.ANTHROPIC_API_KEY) throw new Error(...)` and `const anthropic = new Anthropic({...})` at module top-level — both run at module load, i.e. on the Lambda cold-start path. The plan (Task 3) anticipated checking for this and fixing it "the same way as notify.ts".
- **Fix:** Replaced with a lazy, memoized `getAnthropic()` getter; the two `anthropic.messages.create(...)` call sites now use `getAnthropic().messages.create(...)`.
- **Files modified:** `backend/src/routes/agents.ts` (and the rebuilt `dist/routes/agents.js`)
- **Verification:** `npx tsc --noEmit` green; `node --check dist/routes/agents.js` clean; `grep "re_\|sk-ant" backend/src/routes/agents.ts` → 0.
- **Committed in:** `9edebd0`

**2. [Plan adaptation] Dropped the Secrets-Manager fallback the plan's must-haves mentioned**
- **Found during:** Task 1
- **Issue:** The plan's must-haves mention an optional `RESEND_API_KEY_ARN` → Secrets Manager fetch. `@aws-sdk/client-secrets-manager` is not a dependency of this repo, and adding it would re-bloat `node_modules` (the very thing Task 2 removes).
- **Fix:** Used `process.env.RESEND_API_KEY` only — matching the repo's existing `DATABASE_URL` convention. The must-haves' core requirement ("reads the key lazily from `process.env.RESEND_API_KEY`, read at call time, does not touch cold-start") is fully satisfied.
- **Impact:** None — the user just sets `RESEND_API_KEY` (a plain Lambda env var) instead of `RESEND_API_KEY_ARN`. Documented in User Setup below.

---

**Total deviations:** 2 (1 security bug auto-fixed, 1 plan adaptation to keep node_modules slim).
**Impact on plan:** Both necessary — the cold-start throw was a real Lambda-crash risk; the SM-fallback drop avoids re-introducing the `node_modules` bloat the plan removes. No scope creep.

## Issues Encountered
None — `npm run build` and `npx tsc --noEmit` both green; the pre-commit hook (which blocks Resend/AWS keys) accepted the commit, confirming the scrub is clean.

## User Setup Required — ⚠️ REQUIRED BEFORE PLAN 36-09 DEPLOYS `turion-demo-api`

The exposed Resend key was committed into the working tree / `dist/` of this WIP — **treat it as compromised.** Plan 36-09 must NOT deploy `turion-demo-api` until:

1. **Rotate the exposed Resend key** — Resend dashboard → API Keys → revoke `re_JRdox6wH_...`, issue a new one.
2. **(Optional but recommended) Create a Secrets Manager secret** — e.g. `turion-demo/production/resend-key` (us-east-1), payload `{"RESEND_API_KEY":"re_<new-key>"}`. *(Or skip SM entirely and just use a plain env var per step 3 — that's the repo's existing convention for `DATABASE_URL`.)*
3. **Set `RESEND_API_KEY` as a Lambda env var on `turion-demo-api`** — value = the new key (or wired from the secret created in step 2, the same mechanism `DATABASE_URL` uses).

Until step 3 is done, `notify.ts`'s email send is a logged no-op (`[notify] Resend not configured …`) — the `/api/notify/visit` endpoint still returns `{ok:true}` immediately, it just doesn't send the alert email. Nothing crashes.

`agents.ts` similarly needs `ANTHROPIC_API_KEY` (or it was already set — check `aws lambda get-function-configuration --function-name turion-demo-api`) for the `/api/agents/*` routes to actually call Claude; without it those endpoints return `{error:"ANTHROPIC_API_KEY not configured"}` instead of crashing the Lambda.

## Next Phase Readiness
- The `turion-space-demo` working tree is clean of the long-standing WIP (only untracked `.DS_Store` / `.superpowers/` remain, both irrelevant). `node_modules` no longer tracked.
- Not pushed, not deployed — **plan 36-09 owns** the `git push` + `backend/build-and-push.sh` Lambda redeploy + setting the `RESEND_API_KEY` env var (see User Setup above).
- Commit `9edebd0` on `turion-space-demo` `main`, authored `jeet-avatar <jm@techcloudpro.com>`.

---
*Phase: 36-zero-hardcodes-e2e-audit-turion-space*
*Completed: 2026-05-12*

## Self-Check: PASSED
- backend/src/routes/notify.ts, backend/src/routes/agents.ts, backend/dist/routes/notify.js, backend/dist/routes/agents.js — all present
- Commit 9edebd0 present on turion-space-demo main
- 36-07-SUMMARY.md present
