---
phase: 34-in-site-chat-assistant
plan: 01
subsystem: assistant-backend
tags: [anthropic, express, lambda, turion-satellite, chat-assistant]
status: complete
requires:
  - "Phase 33 complete (the SITE_KNOWLEDGE prompt describes the sales-order→delivery flow)"
provides:
  - "POST /api/assistant/chat on the turion-satellite Lambda (requireAuth, graceful-no-key)"
  - "backend/src/assistant-knowledge.ts — SITE_KNOWLEDGE system prompt (~8.2KB)"
  - "@anthropic-ai/sdk as a backend production dependency"
affects:
  - "Plan 34-02 (the satellite-chat.js widget calls this route)"
  - "Plan 34-03 (deploys the Lambda + adds the anthropic-key secret to light it up)"
tech-stack:
  added:
    - "@anthropic-ai/sdk@^0.95.2 (backend dependencies)"
  patterns:
    - "Lazy, memoized, try/catch'd Secrets-Manager fetch INSIDE the route handler (tri-state: undefined=not-tried, null=absent, string=key) — does NOT touch loadSecrets()/lambda.ts (a throw on the cold-start path crashes the Lambda)"
    - "Graceful-no-key: 200 {configured:false, reply} (not 4xx/5xx) so the widget renders it as a normal turn and the phase ships before the secret exists"
    - "@anthropic-ai/sdk MUST be a prod dependency — the Docker build is `npm ci --omit=dev` then COPY dist/"
    - "Repo test convention is `backend/tests/*.test.ts`, not `src/routes/__tests__/` — followed that"
key-files:
  created:
    - /Users/jeet/turion-satellite/backend/src/assistant-knowledge.ts
    - /Users/jeet/turion-satellite/backend/src/routes/assistant.ts
    - /Users/jeet/turion-satellite/backend/tests/assistant.test.ts
  modified:
    - /Users/jeet/turion-satellite/backend/package.json
    - /Users/jeet/turion-satellite/backend/package-lock.json
    - /Users/jeet/turion-satellite/backend/src/app.ts
decisions:
  - "Test file lives at backend/tests/assistant.test.ts (repo convention) — the plan's must_haves listed src/routes/__tests__/assistant.test.ts, but every other route test in this repo is under tests/. Followed the repo. Deviation Rule 3."
  - "SITE_KNOWLEDGE is ~8.2KB — slightly above the plan's ~3-6KB hint, but it thoroughly covers all 6 section groups (pages / navigation / Phase-33 workflow / make-buy / data location / common tasks) and the model returns short answers regardless."
  - "Model id `claude-haiku-4-5`, max_tokens 1024, MAX_HISTORY 12 — the plan's defaults, kept as top-of-file consts."
metrics:
  duration: ~30m
  completed: 2026-05-12
---

# Phase 34 Plan 01: Assistant backend Summary

Added the backend half of the in-site chat assistant on the `turion-satellite` Lambda: `@anthropic-ai/sdk` as a production dependency, a curated `SITE_KNOWLEDGE` system prompt, and a new `POST /api/assistant/chat` route (`requireAuth`, lazy memoized Secrets-Manager key fetch that never touches the cold-start path, 200 `{configured:false}` when no key is configured, an Anthropic Messages-API call when a key is present, 400 on a bad `messages` body, 502 on an Anthropic failure, hardened catch with no `err.message` leak) mounted in `app.ts`, plus vitest coverage. `tsc --noEmit` clean, full backend suite 354 pass / 1 skip, button audit 0 violations (67 routes — the new route is the +1). Not pushed/deployed — Plan 34-03 owns the redeploy + the user-created `anthropic-key` secret.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Add @anthropic-ai/sdk dependency + write SITE_KNOWLEDGE | `86a540c` | package.json, package-lock.json, src/assistant-knowledge.ts |
| 2 | Create POST /api/assistant/chat route + mount in app.ts | `a3a4407` | src/routes/assistant.ts, src/app.ts |
| 3 | Vitest + supertest coverage for the route | `96e3f77` | tests/assistant.test.ts |

(All commits on `turion-satellite` `main` under `jeet-avatar <jm@techcloudpro.com>` — NOT pushed.)

## Verification Records

- `npm install @anthropic-ai/sdk` → resolved `@anthropic-ai/sdk@0.95.2`, landed under `"dependencies"` (`package.json` shows `"@anthropic-ai/sdk": "^0.95.2"`); `npm ls @anthropic-ai/sdk` → `turion-satellite-api@1.0.0 → @anthropic-ai/sdk@0.95.2`; `node -e "require('@anthropic-ai/sdk')"` succeeds; `new Anthropic({apiKey:'x'}).messages.create` is a function (signature confirmed).
- `wc -c src/assistant-knowledge.ts` → 8211 bytes; `grep -c SITE_KNOWLEDGE` → 1 (the `export const`). Covers: every page (index/program-new/sat/bom/kanban/parts/part/instance/work-orders/work-order/cost/cost-detail/3d-test) with what each does + how to reach it; navigation & ?sat=/?subsystem=/?view= filters + "Next step ▸"/"◂ Back" chaining; the full sales-order→delivery workflow (wizard → spawn → BOM → Kanban → advance instances → make-path WO/build-steps/complete, buy-path PR→VO→PO→invoice → advance satellite status → cost rollup → deliver); make-vs-buy distinction (`GET /api/make-buy-decisions/:satId/:partDefId`; buy "quote" on `buy_costs`, `rfqs` empty); data location (Postgres schema `turion_satellite` + the table list); common tasks (advance a stage / see a 3D model / place a vendor order / create a new program / sign-off a build step / see cost).
- `npx tsc --noEmit` → exit 0.
- `grep -n "api/assistant" src/app.ts` → `app.use('/api/assistant', assistantRouter);` (line 50); `grep -n "requireAuth" src/routes/assistant.ts` → present on `router.post('/chat', requireAuth, …)`. No `err.message` echoed in any response (the only `err.message` string in the file is a comment).
- `npx vitest run tests/assistant.test.ts` → 4 tests pass: (1) 401 without auth; (2) 200 `{configured:false, reply:<>10 chars>}` with no `ANTHROPIC_API_KEY`/`ANTHROPIC_API_KEY_ARN`; (3) 200 `{configured:true, reply:"On sat.html, use the status dropdown."}` with `@anthropic-ai/sdk` mocked — also asserts the `system` prompt is a string containing `/satellite/sat.html` and the forwarded `messages` array; (4) 400 on `messages:[]` and on a non-user-final `messages` (and the Anthropic mock was not called).
- `npx vitest run` (full suite) → **354 passed | 1 skipped** (the 1 skip is pre-existing, unrelated). No regressions.
- `node scripts/audit-satellite-buttons.mjs` → `routes: 67, onclick handlers: 16, satelliteApi calls: 65, violations: 0, exit 0` (routes 66→67: the new `/api/assistant/chat`; no `onclick` added).

## Deviations from Plan

**1. [Rule 3 - Blocking] Test file path follows the repo convention, not the plan's literal path**
- **Found during:** Task 3.
- **Issue:** The plan's `must_haves.artifacts` and `files_modified` list the test at `backend/src/routes/__tests__/assistant.test.ts`. The repo has no `src/routes/__tests__/` directory — every existing route test (≈40 of them) is under `backend/tests/*.test.ts`.
- **Fix:** Created `backend/tests/assistant.test.ts`, mirroring the existing `tests/sales-orders.test.ts` (ES256 keypair → `SUPABASE_JWT_PUBLIC_KEY`, `jwt.sign` token helper, supertest against `app`). The plan's Task 3 action explicitly says "match the existing test layout — check where the repo's other route tests live" — so this is the intended behaviour.
- **Files modified:** test created at `backend/tests/assistant.test.ts` instead of `backend/src/routes/__tests__/assistant.test.ts`.
- **Commit:** `96e3f77`.

(Nothing else — the route, prompt, dependency, and mount were implemented as written.)

## Not Done (by design — later plans)

- The `satellite-chat.js` frontend widget + the `<script>` line on the 12 content pages → Plan 34-02.
- `git push`, `./build-and-push.sh` Lambda redeploy, the `turion-satellite/production/anthropic-key` secret + its resource policy (the Lambda role `zietra-api-lambda-role` has no `secretsmanager:*` IAM — access is per-secret via a resource policy), the `ANTHROPIC_API_KEY_ARN` Lambda env var, and the curl smoke → Plan 34-03. Until then the route returns `{configured:false}`.

## Self-Check: PASSED

- `/Users/jeet/turion-satellite/backend/src/assistant-knowledge.ts` — FOUND (8211 bytes, exports `SITE_KNOWLEDGE`)
- `/Users/jeet/turion-satellite/backend/src/routes/assistant.ts` — FOUND (`router.post('/chat', requireAuth, …)`, lazy memoized secret fetch, 502 catch)
- `/Users/jeet/turion-satellite/backend/tests/assistant.test.ts` — FOUND (4 tests, all pass)
- `/Users/jeet/turion-satellite/backend/src/app.ts` — `app.use('/api/assistant', assistantRouter)` present
- `/Users/jeet/turion-satellite/backend/package.json` — `@anthropic-ai/sdk` under `dependencies`
- commits `86a540c`, `a3a4407`, `96e3f77` — `git log --oneline -3` on turion-satellite confirms all three
- `/Users/jeet/doordash-p2p/.planning/phases/34-in-site-chat-assistant/34-01-SUMMARY.md` — this file
- No "Self-Check: FAILED" items.
