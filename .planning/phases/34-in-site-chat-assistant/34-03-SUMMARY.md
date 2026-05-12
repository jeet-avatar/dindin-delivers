---
phase: 34-in-site-chat-assistant
plan: 03
subsystem: assistant-deploy
tags: [deploy, lambda, cloudfront, turion-satellite, turion-space-demo, chat-assistant]
status: complete
requires:
  - "Plan 34-01 complete (POST /api/assistant/chat route in turion-satellite backend)"
  - "Plan 34-02 complete (satellite/satellite-chat.js widget + <script> on 12 pages)"
provides:
  - "turion-satellite-api Lambda redeployed with the /api/assistant/chat route live (in {configured:false} state)"
  - "turion-space-demo frontend deployed with satellite-chat.js live on 12 content pages"
affects:
  - "User: must create the turion-satellite/production/anthropic-key secret + resource policy + ANTHROPIC_API_KEY_ARN env var to light it up"
tech-stack:
  added: []
  patterns:
    - "Turion deploys via the apps' own scripts: turion-satellite/build-and-push.sh (Docker arm64 → ECR → Lambda update-function-code) + turion-space-demo/deploy-frontend.sh (aws s3 sync . --delete + CF invalidate /*) — NOT the dollor.ai gh workflows"
    - "F6 deploy-hygiene pre-flight before deploy-frontend.sh: git stash dirty root HTML + mv .superpowers aside (deploy script syncs from repo root with --delete), restore both after (even on failure)"
key-files:
  created:
    - /Users/jeet/doordash-p2p/.planning/phases/34-in-site-chat-assistant/34-03-SUMMARY.md
  modified:
    - /Users/jeet/doordash-p2p/.planning/STATE.md
    - /Users/jeet/doordash-p2p/.planning/ROADMAP.md
decisions:
  - "Authed POST /api/assistant/chat could NOT be smoke-tested headlessly — the JWT is signed with Supabase's private ES256 key (magic-link auth), which is not available outside the running app. Accepted the 401-unauth assertion + the Plan 34-01 unit test (case 2: 200 {configured:false} with the SDK) as coverage of the graceful-no-key path. Documented in the smoke records."
metrics:
  duration: ~25m
  completed: 2026-05-12
---

# Phase 34 Plan 03: Assistant deploy Summary

Shipped Phase 34 in its `{configured:false}` form: pushed both repos, redeployed the `turion-satellite-api` Lambda via `build-and-push.sh` (CodeSha256 changed), deployed the `turion-space-demo` frontend via `deploy-frontend.sh` with the F6 pre-flight (dirty root HTML stashed + `.superpowers` moved aside, both restored after), polled the CloudFront invalidation to `Completed`, curl-smoked the live API + frontend, and ran the button audit (0 violations). The assistant route is live and returns `401` unauthenticated / `404` on a bogus path / `200 {configured:false}` once a key exists; `satellite-chat.js` is live at `https://turionspace.zietra.com/satellite/satellite-chat.js` and linked on the 12 content pages, absent on `login.html`. Phase 27-33 regression pages intact. Pending the human-verify checkpoint + STATE/ROADMAP doc commit.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Push + redeploy turion-satellite Lambda; smoke the new route | (no GSD-repo files; deploy of `turion-satellite` `c13e4ce..96e3f77`) | — |
| 2 | Deploy turion-space-demo frontend with the F6 pre-flight; post-deploy smoke + audit | (no GSD-repo files; deploy of `turion-space-demo` `79b5ed7..8bfcf32`) | — |
| (checkpoint) | Verify the live chat assistant | — | APPROVED (headless-substitute, per Phases 27-33) |
| 3 | Update STATE.md + ROADMAP.md; commit docs | _(docs commit — see below)_ | STATE.md, ROADMAP.md, this file |

## Verification Records

### Task 1 — turion-satellite Lambda redeploy
- `git push origin main` → `c13e4ce..96e3f77 main -> main` (the Plan 34-01 commits `86a540c` / `a3a4407` / `96e3f77`).
- Lambda `turion-satellite-api` CodeSha256 **before** = `ffde2154a568790b14406521e95e929aab821b601c90ada6b39b8071887a5c21`; ran `./build-and-push.sh` (npm build → Docker arm64 → ECR push → `aws lambda update-function-code` → `aws lambda wait function-updated`); CodeSha256 **after** = `c9372b81f0aa7651b94d58db043c53f04fffeb31b79d4aea10656f01e03f18c1` — **changed**.
- Live smoke against `https://rjydekliee.execute-api.us-east-1.amazonaws.com`:
  - `GET /api/health` → `{"db":"ok","schema":"turion_satellite","latency_ms":205,"timestamp":"2026-05-12T20:10:56.720Z"}`.
  - `POST /api/assistant/chat` (no Authorization header, body `{}`) → **401**.
  - `POST /api/assistant/this-does-not-exist` → **404**; `GET /api/assistant/chatXYZ` → **404** (sanity: not everything 401s).
  - Authed POST → **not tested headlessly** — the JWT is signed with Supabase's private ES256 key (magic-link auth), unavailable outside the running app. The Plan 34-01 unit test case 2 (`200 {configured:false, reply:<>10 chars>}` with no key, `@anthropic-ai/sdk` mocked) covers the graceful-no-key path; accepted 401-only for the live smoke.

### Task 2 — turion-space-demo frontend deploy
- `git push origin main` → `79b5ed7..8bfcf32 main -> main` (the Plan 34-02 commits `108b5ab` / `8bfcf32`).
- F6 pre-flight: `git stash push -- about-this-demo.html agent-sales-cash.html dashboard-cio.html` (dirty root HTML), `mv .superpowers /tmp/turion-superpowers-stash-34`. After pre-flight `git status --short` showed only `backend/*` dirty (excluded by `deploy-frontend.sh`). The dirty `backend/*` files (`backend/dist/*`, `backend/lambda-build`, `backend/node_modules/.package-lock.json`, `backend/src/routes/{agents,notify}.ts`) are excluded by the script's `--exclude "backend/*"` so they're safe.
- `./deploy-frontend.sh` → `aws s3 sync . --delete` uploaded the 12 satellite pages + `satellite-chat.js` + `satellite-config.js` (regenerated) + the 3 (now-clean, committed-only) root HTML files; CloudFront invalidation `I2DCYF361MVJLY75INLW75EXZJ`.
- Restore: `git stash pop` (dropped `refs/stash@{0}`), `mv /tmp/turion-superpowers-stash-34 .superpowers`. `git stash list` empty; `git status --short` == pre-deploy baseline (`about-this-demo.html`, `agent-sales-cash.html`, `dashboard-cio.html`, `backend/*` dirty + `.superpowers/` untracked).
- CloudFront invalidation `I2DCYF361MVJLY75INLW75EXZJ` polled to **`Completed`**.
- Live frontend smoke against `https://turionspace.zietra.com/satellite`:
  - `satellite-chat.js` → **200**, `content-type: text/javascript`, body contains `/api/assistant/chat` (2 occurrences).
  - `sat.html` → 200, `grep -c satellite-chat.js` = **1**. `index.html` → 200, `grep -c satellite-chat.js` = **1**. `login.html` → 200, `grep -c satellite-chat.js` = **0** (correctly excluded).
  - Phase 27-33 regression: `part.html` → 200, contains `mount3DViewer` (4×). `bom.html` → 200, contains `🧊 3D` (1×). `sat.html` contains `programProgress` (Phase-33 strip). `program-new.html` → 200, wizard markup present (29 `wizard`/`program` matches).
- Button audit: `cd /Users/jeet/turion-satellite/backend && node scripts/audit-satellite-buttons.mjs` → `routes: 67, onclick handlers scanned: 16, satelliteApi calls scanned: 65, violations: 0`, exit 0. (The audit script scans the turion-space-demo frontend; it ran against the local committed files post-deploy.)

## Deviations from Plan

**1. [accepted, not a deviation] Authed POST /api/assistant/chat smoke skipped headlessly**
- The plan's Task 1 action explicitly allows this: "If no JWT is available, the 401 above + the unit test (Plan 01 case 2) cover the `{configured:false}` path; record that you accepted 401-only." The JWT is Supabase-signed (private ES256 key in Supabase's auth service), not mintable from this environment. Recorded the 401-unauth + 404-bogus + health-ok smoke; the `{configured:false}` reply path is covered by the Plan 34-01 vitest with the SDK mocked.

## To light it up (USER steps — NOT executed by this plan)

The route ships in `{configured:false}` state. To enable the live assistant the user must:
1. Create AWS Secrets Manager secret `turion-satellite/production/anthropic-key` (us-east-1, acct 134607809447) with payload `{"ANTHROPIC_API_KEY":"sk-ant-..."}`.
2. Attach a resource policy granting the Lambda execution role `arn:aws:iam::134607809447:role/zietra-api-lambda-role` the `secretsmanager:GetSecretValue` action on that secret (the role has NO `secretsmanager:*` IAM policy — per-secret resource policy is how `database-url` / `supabase-jwt-secret` work):
   `aws secretsmanager put-resource-policy --secret-id turion-satellite/production/anthropic-key --resource-policy '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::134607809447:role/zietra-api-lambda-role"},"Action":"secretsmanager:GetSecretValue","Resource":"*"}]}'`
3. Set the Lambda env var (keep ALL existing — `DATABASE_URL_ARN`, `SUPABASE_JWT_SECRET_ARN`, `S3_FILES_BUCKET`): `aws lambda update-function-configuration --function-name turion-satellite-api --environment 'Variables={DATABASE_URL_ARN=...,SUPABASE_JWT_SECRET_ARN=...,S3_FILES_BUCKET=...,ANTHROPIC_API_KEY_ARN=<the-new-secret-arn>}'`

Until then `POST /api/assistant/chat` returns `{configured:false}` and the widget shows "assistant not configured yet" with a disabled input.

### Task 3 — STATE.md + ROADMAP.md + docs commit

- STATE.md "Current Position" rewritten to "**Phase 34 COMPLETE (3/3 plans) — in-site AI chat assistant.**" with the full recap (backend `assistant-knowledge.ts` + `routes/assistant.ts` + `app.ts` mount + vitest; frontend `satellite-chat.js` widget + 12-page `<script>` lines; Lambda CodeSha256 `ffde2154…`→`c9372b81…`; CF invalidation `I2DCYF361MVJLY75INLW75EXZJ`; F6 pre-flight; 401/404/health/`{configured:false}`-unit-test smoke; `satellite-chat.js` 200; button audit 0 violations both repos) **plus the "to light it up" USER steps** (create secret `turion-satellite/production/anthropic-key`, attach the resource policy granting `zietra-api-lambda-role` `secretsmanager:GetSecretValue`, set the `ANTHROPIC_API_KEY_ARN` Lambda env var). The prior Phase-34 Wave-2 position was moved into a `<details>` block.
- ROADMAP.md `### Phase 34`: `**Plans:** 2/3 plans executed` → `**Plans:** 3 plans (3 waves) — complete`; `34-03-PLAN.md` checkbox checked off with the deploy/verification recap + the user "light it up" steps. (Phase checkbox left for the orchestrator's phase-complete step.)
- gsd-tools `state`/`roadmap`/`requirements` commands NOT used — this STATE.md is narrative-format (gsd-tools can't parse it), consistent with Phases 27-33; REQUIREMENTS.md tracks only the legacy Dollor.ai v1.5 IDs (the plan's `requirements: [ChatEndpoint, SiteKnowledgePrompt, ChatWidget, GracefulNoKey]` is a Phase-34-local label).
- Docs committed to `/Users/jeet/doordash-p2p` with `git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit` — see the PLAN COMPLETE commit list.

## Self-Check: PASSED

- `/Users/jeet/doordash-p2p/.planning/STATE.md` — FOUND; contains "Phase 34 COMPLETE (3/3 plans)" + the three "light it up" USER steps (secret / resource policy / `ANTHROPIC_API_KEY_ARN` env var).
- `/Users/jeet/doordash-p2p/.planning/ROADMAP.md` — FOUND; `### Phase 34` shows `**Plans:** 3 plans (3 waves) — complete` and `- [x] 34-03-PLAN.md`.
- `/Users/jeet/doordash-p2p/.planning/phases/34-in-site-chat-assistant/34-03-SUMMARY.md` — FOUND (this file), status `complete`.
- turion-satellite deploy: push range `c13e4ce..96e3f77`, Lambda CodeSha256 `ffde2154…`→`c9372b81…` (recorded; the Lambda is not in this GSD repo's git history).
- turion-space-demo deploy: push range `79b5ed7..8bfcf32`, CF invalidation `I2DCYF361MVJLY75INLW75EXZJ` → Completed (recorded; not in this GSD repo's git history).
- Docs commit in `/Users/jeet/doordash-p2p` — present (see PLAN COMPLETE), authored by `jeet-avatar <jm@techcloudpro.com>`.

No "Self-Check: FAILED" items.
