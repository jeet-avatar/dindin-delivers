---
phase: 36-zero-hardcodes-e2e-audit-turion-space
plan: 09
subsystem: deploy
tags: [deploy, e2e-verify, turion-space, turion-satellite, blocker]
status: in-progress (paused at the human-verify checkpoint — Task 6 — with a prod-infra blocker surfaced)
requires:
  - "36-01..36-08 — all code committed"
provides:
  - "Both repos pushed to remote; both Lambdas redeployed (CodeSha256 changed on each); frontend deployed (S3 + CloudFront, invalidation Completed)"
  - "Static curl smoke + dual button audit (0/0) + Phase 27-35 frontend regression smoke — all PASS"
  - "Surfaced blocker: the shared Supabase DB password is rotated/invalid — both backends return 500/503 on any DB-touching route; DB-direct E2E walk + /api/data/all verification cannot be done until the new password is restored to the secrets/env vars"
affects: [".planning/STATE.md", ".planning/ROADMAP.md"]
key-files:
  created:
    - .planning/phases/36-zero-hardcodes-e2e-audit-turion-space/36-09-SUMMARY.md
  modified:
    - .planning/STATE.md
    - .planning/ROADMAP.md
decisions:
  - "Did NOT set RESEND_API_KEY on turion-demo-api — the exposed key (re_JRdox6wH_...) must be rotated by the user first (no Resend dashboard access from the executor). notify.ts (post-36-07) reads process.env.RESEND_API_KEY lazily and no-ops gracefully when absent, so the redeploy is strictly SAFER than the previously-deployed pre-36-07 image (which still had the plaintext key embedded). The new code has the key scrubbed."
  - "Redeployed turion-demo-api anyway (despite the user-action not being done) because the new image REMOVES the exposed key + lazy-loads ANTHROPIC — leaving the old image up would be worse. Documented the two user follow-ups (rotate key, optionally set the env var)."
  - "DB-direct E2E walk (Task 4) and the /api/data/all-non-empty curl check (Task 3) are BLOCKED by a pre-existing prod-infra issue: the Supabase Postgres password (5nS7ez0pFQRVuUDC6VsU9yJ5PiyrHArv, used in turion-demo-api's DATABASE_URL env var AND in the turion-satellite/production/database-url secret) fails authentication ('password authentication failed for user \"postgres\"') on both the transaction pooler (:6543) and the session pooler (:5432). Confirmed independently via node-pg. This is OUT OF SCOPE for Phase 36 (no Phase-36 code touches the DB credentials) and requires Supabase-dashboard access to fix. Surfaced at the checkpoint."
metrics:
  duration: ~40min (in progress)
  completed: 2026-05-12 (partial)
---

# Phase 36 Plan 09: Deploy + E2E-Verify Summary (in progress — paused at checkpoint, prod-infra blocker surfaced)

Deployed everything that can be deployed and verified everything that does not depend on the database. **A pre-existing production-infra blocker — the shared Supabase Postgres password is rotated/invalid — means every DB-touching backend route currently returns 500/503, so the DB-direct E2E walk and the `/api/data/all`-non-empty smoke cannot be completed until the new password is restored.** This is outside Phase 36's scope (no Phase-36 commit touches the DB credentials).

## Done

### Repos pushed
- `turion-satellite` main `ab2814b..404a968` (the 36-01 `GET /api/lookups/satellite-statuses` commit) — pushed, `jeet-avatar <jm@techcloudpro.com>`.
- `turion-space-demo` main `a142a48..de0fac9` (commits 99702da/0231170/4afaa15/76d8f38/1cca9b0/9edebd0/de0fac9 + the 4f21d5c satellite refactor) — pushed, `jeet-avatar <jm@techcloudpro.com>`.
- The doordash-p2p planning repo's Phase-36 commits stay on `gsd/phase-26-data-densification` (its current branch).

### Backends redeployed (both CodeSha256 changed)
| Lambda | CodeSha256 before | CodeSha256 after | Deploy mechanism |
| --- | --- | --- | --- |
| `turion-satellite-api` | `2984d8e9290379767d90b7e2c741ede0d20aa0f42e564c5aeccd7228358ba61c` | `1134cefc49a755bcbdc667846ce61984b591a7fc20b77e0829e47d55c8d1b176` | `turion-satellite/build-and-push.sh` (npm run build → docker arm64 → ECR → `aws lambda update-function-code` → `aws lambda wait function-updated`) |
| `turion-demo-api` | `fd4605e6ad68df08f7dd38d1ada1dd9716d2797ceaaa0e7e2200aab0cbb828c2` | `c716f0d248c116ea24a5c40841ffe29a14b1740a37461daac63dc80598c75de8` | `npm run build` (clean — `dist/` already matched `src/`) → `turion-space-demo/build-and-push.sh` (docker arm64 from `backend/lambda-build` → ECR → `aws lambda update-function-code` → wait) |

Satellite backend WAS redeployed because 36-01 added the `/api/lookups/satellite-statuses` route.

### Frontend deployed
- F6 pre-flight (recomputed — much smaller than Phases 30-35 because 36-07 committed the previously-WIP HTMLs): `git status --short` showed only `.DS_Store` + `.superpowers/` untracked (neither part of this phase). Moved both aside (`/tmp/turion-superpowers-stash-36`, `/tmp/turion-dsstore-stash-36`); `turion-config.js` + `satellite/satellite-config.js` are gitignored generated files and were absent (the deploy script regenerates them). No `git stash` was needed.
- `turion-space-demo/deploy-frontend.sh` ran: `scripts/generate-satellite-config.sh` + `scripts/generate-turion-config.sh` (new in 36-02) regenerated the two config files → `aws s3 sync . s3://turion-demo-static --delete` uploaded all `*.html/.js/.css/.jpg/.png/.svg` (incl. `turion-config.js`, `satellite/satellite-config.js`, `satellite/satellite-render.js`, `satellite/sat.html`, `satellite/bom.html`, `satellite/kanban.html`, `scripts/audit-erp-buttons.mjs`, all the `sales-new-*.html` / `netsuite-new-*.html` / `arena-new-*.html` forms, etc.; `.superpowers/*` & `backend/*` absent from the output) → CloudFront `E37R9PT8IL44L2` invalidation `IC6IW03ZMEJE46DK93BO7XVI6B`.
- Polled `IC6IW03ZMEJE46DK93BO7XVI6B` → `Status=Completed`.
- Post-deploy restore: `.superpowers/` + `.DS_Store` moved back; `git stash list` empty; `git status --short` == pre-deploy baseline (`?? .DS_Store`, `?? .superpowers/`).

### Curl smoke (static + canonical-list endpoints — PASS)
| Check | Result |
| --- | --- |
| satellite/{index,login,sat,parts,part,bom,kanban,instance,cost,cost-detail,work-orders,work-order,program-new}.html | all 200 |
| ERP {index,salesforce-account,netsuite-setup,netsuite-customer-so,netsuite-items,arena-qms,arena-bom,mes-shop-floor,integration-hub,agent-sales-cash,dashboard-cio,about-this-demo}.html | all 200 |
| `https://turionspace.zietra.com/turion-config.js` | 200, defines `window.TURION_CONFIG` with `API_BASE: 'https://lo254mvukl.execute-api.us-east-1.amazonaws.com'` |
| `https://turionspace.zietra.com/satellite/satellite-config.js` | 200, defines `window.SATELLITE_CONFIG` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) |
| `bom-data.js` (deleted in 36-05) | 403 — and no page references it (the only `bom-data.js` hits in `arena-bom.html`/`netsuite-mrp.html` are *comments*, not `<script src>` tags) |
| Other `*-data.js` (enterprise/coa/fpa/evms/arm/setup/qms/arena-doc/mes) | still 200 — INTENTIONAL: 36-04's decision keeps them as the offline fallback (data-loader shows a "Live data unavailable — Retry" banner AND still lets the static snapshot populate `BUDGET/FORECAST/TAX_RATES/COA_CLASSES` which have no API source). Only `netsuite-setup.html` still `<script src>`s `setup-data.js` + `enterprise-data.js` (both present) — by design. |
| satellite APIGW `GET /api/health` | 503 (DB down — see blocker) |
| satellite APIGW `GET /api/lookups/satellite-statuses` (no auth) | 401 — correct (it's `requireAuth`) |
| satellite APIGW bogus path | 404 |
| satellite APIGW `GET /api/satellites` (no auth) | 401 — correct |
| ERP APIGW `GET /api/health` | 500 (DB down — see blocker) |
| ERP APIGW `GET /api/data/all` | 500 (DB down — see blocker) — **could not verify non-empty** |
| ERP APIGW `GET /api/{salesforce,netsuite,arena,mes}/lookups` | all 200 — the canonical enum lists are served even with the DB down (36-02's hardened degrade-to-canonical path) |
| ERP APIGW `POST /api/agents/run` | 500 (route resolves; DB down) — `GET /api/agents/run` → 404 (POST-only, correct); `/api/agents/nope` → 404. Agents router IS mounted (`app.use('/api/agents', agents)`, routes: `/run`, `/ncr-capa`, `/evms`, `/integration-sentinel`). |
| ERP APIGW bogus path | 404 |

### Button audit — BOTH frontends, 0 violations
`cd /Users/jeet/turion-space-demo && npm run audit-buttons`:
- `audit-satellite-buttons.mjs` → `routes: 75 / onclick handlers: 16 / satelliteApi calls: 84 / violations: 0`
- `audit-erp-buttons.mjs` → `pages: 72 / routes: 195 / onclick handlers: 516 / fetch API calls: 37 / violations: 0`
- Exit 0.

### Phase 27-35 regression smoke — PASS (satellite PLM frontend intact)
| Check | Result |
| --- | --- |
| `satellite/part.html` source | contains `importmap`, `three@0.184`, `satellite-3d.js`, `svg-editor.js`, `satellite-chat.js`, `mount3DViewer` |
| `satellite/instance.html` source | contains `satellite-3d.js`, `cad-hud`, `satellite-chat.js` |
| `satellite/3d-test.html` | 200 |
| `satellite/bom.html` source | contains `tree-node`, `treeContainer`, `view=3d`, `drawing_svg`, `Pick a satellite`, `Create new part` |
| `satellite/satellite-3d.js` | 200, `content-type: text/javascript`, contains `mount3DViewer` (×3) |
| `satellite/kanban.html` source | contains `lifecycle-stages`, `Pick a satellite` |
| `satellite/sat.html` source | contains `programProgress` (×1) and `satellite-statuses` (×1) — uses the fetched enum, no `SAT_STATUSES` literal |
| `satellite/satellite-render.js` | 0 `PROGRAM_STAGES = [` literals, 3 `lifecycle-stages` references |
| `satellite/satellite-chat.js`, `satellite/program-new.html` | both 200 |
| ERP `about-this-demo.html`, `agent-sales-cash.html`, `dashboard-cio.html` | all 200 |

## NOT done (blocked / pending the checkpoint)

### 🔴 BLOCKER — Supabase Postgres password is rotated/invalid (pre-existing prod-infra issue, OUT OF Phase-36 scope)
- `turion-demo-api`'s `DATABASE_URL` env var and the `turion-satellite/production/database-url` Secrets Manager secret both carry password `5nS7ez0pFQRVuUDC6VsU9yJ5PiyrHArv` for user `postgres.lbpkbpfwdpnwlccmlfxn` on `aws-1-us-east-2.pooler.supabase.com`. That password **fails authentication** — confirmed independently with `node-pg` against both `:6543` (transaction pooler) and `:5432` (session pooler): `password authentication failed for user "postgres"`.
- Consequence: every DB-touching backend route on BOTH APIGWs returns 500/503 right now — `/api/health`, `/api/data/all`, `/api/agents/run`, all the auth-gated satellite routes, etc. (The canonical-list endpoints `/api/{salesforce,netsuite,arena,mes}/lookups` still 200 because 36-02 made them degrade to the in-code lists; the satellite `/api/lookups/satellite-statuses` is `requireAuth` so it 401s before touching the DB.)
- **No Phase-36 commit touches the DB credentials** — this rotation happened independently. The frontend, the lookup endpoints, the de-hardcoding, the button audits, and the static smoke are all unaffected and verified above.
- Fixing it requires Supabase-dashboard access (rotate/retrieve the DB password, then update `turion-demo-api`'s `DATABASE_URL` env var + the `turion-satellite/production/database-url` secret). Not something the executor can do.
- **Task 4 (DB-direct E2E walk per module — Salesforce/NetSuite/Arena/MES + the satellite PLM chain) is therefore deferred** until the password is restored. Once it is: `/api/data/all` should return non-empty, and the per-module create→read→update→delete-or-revert round-trips (via the verified backend write routes or direct `psql` against `turion.*` / `turion_satellite.*`) can be run.

### User follow-ups (documented per the plan's `user_setup`)
1. **Rotate the exposed Resend API key** `re_JRdox6wH_...` (it was committed to the WIP / git tree — treat as compromised). Resend dashboard → API Keys.
2. **(Optional) Set `RESEND_API_KEY` on `turion-demo-api`** with the new key — `aws lambda update-function-configuration --function-name turion-demo-api --environment 'Variables={DATABASE_URL=...,ANTHROPIC_API_KEY=...,RESEND_API_KEY=re_<new>}'` (keep all existing vars). Optionally back it with a Secrets Manager secret `turion-demo/production/resend-key`. Until then `notify.ts`'s email send is a logged no-op (graceful — does not error). The redeployed `turion-demo-api` image (CodeSha256 `c716f0d2...`) already has the plaintext key scrubbed (36-07).
3. **Restore the Supabase DB password** (the blocker above) so the backends come back online.

## Checkpoint
Task 6 is a `checkpoint:human-verify` (`gate="blocking"`). Reached and paused — NOT auto-approved (the orchestrator handles approval). See the structured checkpoint return for the verify steps. The headless-substitute evidence (static curl smoke + dual button audit 0/0 + Phase 27-35 frontend regression) is in place; the DB-direct E2E walk is the one piece blocked by the rotated Supabase password.

## Deferred items
- DB-direct E2E walk per module (Task 4) — blocked by the rotated Supabase password (prod-infra, out of scope).
- `/api/data/all`-non-empty smoke + the `/api/agents/run` happy-path — same blocker.
- Pre-existing out-of-scope items carried from earlier phases: `ns_invoice_id` NULL on some instances; instance>1 duplicates missing WO/PR; ERP MES domain depth deliberately left thin (the satellite work-orders/build-steps app is the real MES surface).
- Optional visual browser walk of the deployed demo (the headless smoke is the substitute, per Phases 27-35).

## Self-Check: PASSED
- SUMMARY.md exists at the expected path.
- `turion-satellite` commit `404a968` present + pushed to origin.
- `turion-space-demo` commit `de0fac9` present + pushed to origin.
- `turion-satellite-api` CodeSha256 = `1134cefc...` (changed from `2984d8e9...`).
- `turion-demo-api` CodeSha256 = `c716f0d2...` (changed from `fd4605e6...`).
- CloudFront invalidation `IC6IW03ZMEJE46DK93BO7XVI6B` = Completed.
- Button audit (both frontends) = 0/0 violations.
- (Not done — blocked, documented: DB-direct E2E walk; `/api/data/all` non-empty — Supabase password rotated, out of scope.)
