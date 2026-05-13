---
phase: 38-erp-auth-and-login
plan: 04
subsystem: erp-deploy-audit-checkpoint
tags: [deploy, audit, lambda, cloudfront, secrets-manager, iam, supabase-jwt, checkpoint]
requires:
  - phase: 38-01
    provides: requireAuth middleware + loadSecrets + per-route gating in src/
  - phase: 38-02
    provides: erp-auth.js + erp-api.js + erp-login.html + erp-auth-callback.html + generate-turion-config.sh extension
  - phase: 38-03
    provides: 61-site fetch migration + 81-page requireSession() injection
provides:
  - "audit-erp-buttons.mjs scans erpApi.* calls in addition to raw fetch — 0 violations"
  - "turion-demo-api Lambda env now has SUPABASE_JWT_SECRET_ARN; execution role (shared with satellite Lambda) already grants secretsmanager:GetSecretValue"
  - "Lambda redeployed (CodeSha256 2a63ac5d... → 46c31406...) with requireAuth active on 96 routes"
  - "Frontend redeployed (S3 sync + CloudFront IBAM9G78B9FCNX0VKI7O87V0RJ invalidation completed) with turion-config.js carrying SUPABASE_URL + SUPABASE_ANON_KEY"
  - "build-and-push.sh now runs npm run build BEFORE docker build (Rule 3 fix)"
affects:
  - "Phase 38 end-to-end auth is LIVE except for the Supabase Dashboard redirect-URL allowlist update (checkpoint)"
  - "After user adds erp-auth-callback.html to allowlist, end-to-end magic-link flow works"
tech-stack:
  added: []
  patterns:
    - "Shared zietra-api-lambda-role between turion-satellite-api and turion-demo-api — both Lambdas inherit secrets access transitively"
    - "build-and-push.sh now compiles TypeScript before Docker build (was assuming stale committed dist/)"
key-files:
  created:
    - "/Users/jeet/doordash-p2p/.planning/phases/38-erp-auth-and-login/38-04-SUMMARY.md (this file)"
  modified:
    - "/Users/jeet/turion-space-demo/scripts/audit-erp-buttons.mjs (+75/-1: iterErpApiCalls + 2 scan loops + self-test + CLI summary)"
    - "/Users/jeet/turion-space-demo/build-and-push.sh (+2/-0: npm run build step)"
    - "/Users/jeet/turion-space-demo/backend/dist/ (rebuilt — 16 files, includes middleware/auth.js + secrets.js)"
    - "AWS Lambda turion-demo-api env: +SUPABASE_JWT_SECRET_ARN"
key-decisions:
  - "Shared zietra-api-lambda-role meant no new IAM policy attachment needed — satellite Lambda already grants the role access to turion-satellite/production/supabase-jwt-secret"
  - "Compile TypeScript inside build-and-push.sh (not as separate dev step) — the script is the canonical deploy path; assuming dist/ is current is fragile"
  - "Stop at checkpoint:human-verify Task 4 — Supabase Dashboard URL allowlist has no CLI/API"
requirements-completed: [ErpAuthMiddleware, ErpLoginPage, ErpAuthHelpers, ErpFetchMigration, AuditExtendedForErpApi]
duration: in-progress (7 min through Task 3)
completed: 2026-05-13
status: blocked-at-checkpoint
---

# Phase 38 Plan 04: ERP Deploy + Audit Extension + Supabase Allowlist Checkpoint Summary

**Status: BLOCKED at Task 4 checkpoint.** Backend Lambda + frontend deployed atomically; audit script extended to recognize erpApi.* calls (0 violations); all 9 unauth-gate smoke checks pass. Final step (manual Supabase Dashboard URL allowlist update) requires user action — no CLI exists.

## Performance (through Task 3)

- **Duration:** ~7 min (through Task 3 of 5)
- **Started:** 2026-05-13T23:45:36Z
- **Checkpoint reached:** 2026-05-13T23:52:41Z
- **Tasks completed:** 3 / 5
- **Files modified:** 17 (audit script, build script, 15 dist/* files)
- **Commits on `turion-space-demo`:** 8 (7 pre-existing 38-01/02/03 + 1 new 38-04 audit + 1 fix commit) — ALL PUSHED

## Tasks Completed

### Task 1: Extend audit-erp-buttons.mjs (COMMIT `8a2be27`)

- Added `iterErpApiCalls(text)` generator with leading-char guard regex `/(?:^|[^A-Za-z_$])erpApi\.(get|post|patch|put|delete|del)\s*\(/g`
- Wired into both per-page (HTML) and shared-JS scanning loops
- Updated CLI summary: `fetch API calls scanned` → `API calls scanned (fetch + erpApi)`
- Added inline self-test that fatally exits if `myErpApi.get(` would false-match
- **Audit result:** ERP frontend `pages:83 routes:213 onclick:517 API calls (fetch+erpApi):69 violations:0`; satellite frontend `routes:75 onclick:16 satelliteApi:84 violations:0`
- The 69 calls = 5 raw fetch (visit-pixel + erp-api.js internals) + 64 newly-captured erpApi.* sites

### Task 2: Wire SUPABASE_JWT_SECRET_ARN + IAM (no commit — AWS-only)

- **Pre-existing Lambda env:** `DATABASE_URL`, `ANTHROPIC_API_KEY`
- **Added:** `SUPABASE_JWT_SECRET_ARN=arn:aws:secretsmanager:us-east-1:134607809447:secret:turion-satellite/production/supabase-jwt-secret-sWnNlr`
- Used `jq` to merge into existing env, then `aws lambda update-function-configuration` with full `{Variables:{...}}` body — all 3 vars preserved post-update
- **IAM role check:** `turion-demo-api` and `turion-satellite-api` both use `zietra-api-lambda-role` (shared). Satellite Lambda already reads this secret in production → ERP Lambda inherits access. **No new IAM policy needed.**
- **Pre-flight secret read:** `aws secretsmanager get-secret-value --secret-id turion-satellite/production/supabase-jwt-secret` returned JWKS with `keys[0].kty="EC"` — confirms ES256 shape Lambda will parse.

### Task 3: Push + deploy backend + deploy frontend + smoke (COMMIT `d55bce4`)

- **Pushed 7 commits** (38-01: 2 + 38-02: 1 + 38-03: 3 + 38-04 audit: 1) to `turion-space-demo` `origin/main`
- **F6 pre-flight:** `.superpowers/` moved aside before deploy, restored after
- **First backend deploy:** Docker build + push + Lambda update — `CodeSha256 2a63ac5d... → df018218...`. **But smoke FAILED — unauth writes returned 201/200, not 401.**
- **Root cause (Rule 3 Blocking):** `lambda-build` Dockerfile copies `backend/dist/` (compiled JS), but `build-and-push.sh` never invoked `npm run build`. The tracked `dist/` was from May 12 — BEFORE the 38-01 changes — so deployed Lambda had NO requireAuth.
- **Fix applied:** Prepended `(cd /Users/jeet/turion-space-demo/backend && npm run build)` step to `build-and-push.sh`. Re-ran deploy — `CodeSha256 df018218... → 46c31406...`. Committed the fix + rebuilt dist as `d55bce4`.
- **Frontend deploy:** `./deploy-frontend.sh` regenerated `turion-config.js` (with `SUPABASE_URL` + `SUPABASE_ANON_KEY`), `aws s3 sync` published 83 HTML + JS + CSS pages, CloudFront invalidation `IBAM9G78B9FCNX0VKI7O87V0RJ` completed.

## Curl Smoke Battery (post-rebuild)

| # | Check | Expected | Actual | Result |
|---|-------|----------|--------|--------|
| 1 | `GET /api/health` (unauth) | 200 with `db:ok` | 200 `db:ok` | PASS |
| 2 | `POST /api/notify/visit` (unauth) | 200/204 | 200 | PASS (still public — pre-auth telemetry) |
| 3 | `POST /api/netsuite/customers` (unauth) | 401 | 401 | PASS |
| 4 | `GET /api/data/all` (unauth) | 401 | 401 | PASS |
| 5 | `GET /api/salesforce/customers` (unauth) | 401 | 401 | PASS |
| 6 | `GET /api/activity` (unauth) | 401 | 401 | PASS |
| 7 | 401 body shape | `Missing authorization token` | `{"error":"Missing authorization token"}` | PASS (hardened catch — no err.message leak) |
| 8 | Bogus path `/api/this-does-not-exist` | 404 | 404 | PASS |
| 9 | `/erp-login.html` | 200 | HTTP/2 200 | PASS |
| 10 | `/erp-auth.js` contains `window.erpAuth` | yes | yes | PASS |
| 11 | `/erp-api.js` contains `window.erpApi` | yes | yes | PASS |
| 12 | `/turion-config.js` has `SUPABASE_URL` + `SUPABASE_ANON_KEY` | both present | both present | PASS |
| 13 | Regression: `/satellite/` still 200 | 200 | 200 | PASS |
| 14 | Regression: `/satellite/login.html` still 200 | 200 | 200 | PASS |

## Commits

| Hash | Identity | Message |
|------|----------|---------|
| `8a2be27` | jm@techcloudpro.com / jeet-avatar | `feat(38-04): extend audit-erp-buttons.mjs to scan erpApi.* calls` |
| `d55bce4` | jm@techcloudpro.com / jeet-avatar | `fix(38-04): compile TypeScript before Docker build (Rule 3 - Blocking)` |

Both pushed to `origin/main`. `git rev-list --count origin/main..HEAD` → 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `build-and-push.sh` did not compile TypeScript**

- **Found during:** Task 3 smoke test (after first Lambda redeploy)
- **Issue:** The Dockerfile `backend/lambda-build` copies `dist/` into the Lambda image, but `build-and-push.sh` did NOT run `npm run build` first. The tracked `dist/` was stale (May 12, pre-38-01) — so the deployed Lambda code had no `requireAuth` middleware. Smoke writes returned 201, reads returned 200 — the auth gate was nonexistent in the deployed code.
- **Fix:** Inserted `(cd /Users/jeet/turion-space-demo/backend && npm run build)` as Step 0 of `build-and-push.sh`. Ran `npm run build` manually first to rebuild dist (16 files including new `middleware/auth.js` + `secrets.js`). Re-ran `./build-and-push.sh` end-to-end — fresh CodeSha256, all 401s on second-round smoke.
- **Files modified:** `build-and-push.sh` (+2 lines), `backend/dist/*` (16 files rebuilt)
- **Verification:** Smoke battery 14/14 pass (see table above)
- **Commit:** `d55bce4` (single commit covers fix + rebuilt artifacts since dist/ is tracked)

---

**Total deviations:** 1 auto-fixed (Rule 3 Blocking)
**Impact on plan:** This deviation was discovered by the smoke test (the plan's own verification gate) — exactly as designed. Without it, Phase 38 would have shipped a no-op auth gate. Fix added permanent guard against this class of error (anyone running build-and-push.sh now gets fresh-compiled dist).

## Authentication Gates

None — `aws` CLI was already authenticated for all Lambda/CloudFront/S3/Secrets Manager operations. `git push` used the existing GitHub remote credentials.

## Checkpoint Status (Task 4 — BLOCKED, awaiting user)

**Type:** checkpoint:human-verify (blocking)
**What's needed:** Manual Supabase Dashboard URL allowlist update — add `https://turionspace.zietra.com/erp-auth-callback.html` to the project's Redirect URLs allowlist.
**Why manual:** No CLI/API exists for Supabase project URL configuration. This is the ONE genuinely-manual step in Phase 38.

### User Action Required

1. Open: https://supabase.com/dashboard/project/lbpkbpfwdpnwlccmlfxn/auth/url-configuration
2. Confirm `https://turionspace.zietra.com/satellite/auth/callback.html` is already present (existing satellite pattern)
3. Click "Add URL"
4. Enter: `https://turionspace.zietra.com/erp-auth-callback.html`
5. (Optional, local dev): also add `http://localhost:8765/erp-auth-callback.html`
6. Save / Apply, refresh, confirm entry persists

### Optional Browser-Walk Verification (after user updates allowlist)

In a private browser:
1. Visit https://turionspace.zietra.com/quickbooks.html
2. Should auto-redirect to `/erp-login.html?redirect=%2Fquickbooks.html`
3. Enter email, click "Send magic link"
4. Click magic link in email
5. Should bounce through `/erp-auth-callback.html` to `/quickbooks.html` with data loaded
6. If step 4 fails with "URL not allowed" → allowlist didn't save, re-do

## What's Still Pending (Task 5 — after user resumes)

- Headless JWT round-trip (authed `/api/data/all` → ≥50 keys; authed POST creates audit_log row; cleanup DELETE restores baseline)
- Update `/Users/jeet/doordash-p2p/.planning/STATE.md` to mark Phase 38 complete
- Update `/Users/jeet/doordash-p2p/.planning/ROADMAP.md` Phase 38 entry: `Plans: 4/4 plans complete`
- Final `docs(38)` commit to `doordash-p2p`

## Self-Check: PASSED (through Task 3)

- `[ -f /Users/jeet/turion-space-demo/scripts/audit-erp-buttons.mjs ]` → FOUND with `iterErpApiCalls` (6 references), self-test (1), summary line update (1)
- `git log --oneline | grep -q "8a2be27"` → FOUND
- `git log --oneline | grep -q "d55bce4"` → FOUND
- Both commits pushed: `git rev-list --count origin/main..HEAD` → 0
- Lambda env has `SUPABASE_JWT_SECRET_ARN` → confirmed via `get-function-configuration`
- Lambda env preserves `DATABASE_URL` + `ANTHROPIC_API_KEY` → confirmed
- Lambda CodeSha256 changed twice: baseline → stale-dist → rebuilt-dist (now: `46c31406556ab63dec49cfdd582ba1e1739dbeb21abc83bf172be17dbabf045f`)
- CloudFront invalidation `IBAM9G78B9FCNX0VKI7O87V0RJ` → Completed
- `turion-config.js` published with `SUPABASE_URL` + `SUPABASE_ANON_KEY` → confirmed
- Auth gate 14/14 smoke checks → PASS

---
*Phase: 38-erp-auth-and-login*
*Plan: 04 of 04*
*Status: BLOCKED at checkpoint Task 4 (Supabase Dashboard manual step)*
