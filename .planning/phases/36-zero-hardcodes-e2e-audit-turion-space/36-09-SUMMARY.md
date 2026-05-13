---
phase: 36-zero-hardcodes-e2e-audit-turion-space
plan: 09
subsystem: deploy
tags: [deploy, e2e-verify, turion-space, turion-satellite, blocker]
status: complete
requires:
  - "36-01..36-08 — all code committed"
provides:
  - "Both repos pushed to remote; both Lambdas redeployed (CodeSha256 changed on each); frontend deployed (S3 + CloudFront, invalidation Completed)"
  - "Static curl smoke + dual button audit (0/0) + Phase 27-35 frontend regression smoke — all PASS"
  - "DB blocker RESOLVED out-of-band (Supabase password rotated + updated in the turion-satellite/production/database-url secret + turion-demo-api's DATABASE_URL env var, both Lambdas bounced) → DB-direct E2E walk per module PASSED (satellite PLM spot-check intact; SF/NS/Arena/MES create→read→update round-trips via the real backend routes, cleaned to baseline)"
  - "All 9 Phase-36 requirements satisfied; headless-substitute checkpoint approved"
affects: [".planning/STATE.md", ".planning/ROADMAP.md"]
key-files:
  created:
    - .planning/phases/36-zero-hardcodes-e2e-audit-turion-space/36-09-SUMMARY.md
  modified:
    - .planning/STATE.md
    - .planning/ROADMAP.md
decisions:
  - "Did NOT set RESEND_API_KEY on turion-demo-api — the exposed key (re_JRdox6wH_...) must be rotated by the user first (no Resend dashboard access from the executor). notify.ts (post-36-07) reads process.env.RESEND_API_KEY lazily and no-ops gracefully when absent, so the redeploy is strictly SAFER than the previously-deployed pre-36-07 image (which still had the plaintext key embedded). The new code has the key scrubbed."
  - "Redeployed turion-demo-api anyway (despite the user-action not being done) because the new image REMOVES the exposed key + lazy-loads ANTHROPIC — leaving the old image up would be worse. Documented the user follow-ups (rotate key + set the env var; create the Phase-34 Anthropic secret for the satellite chat; future turion.* config tables)."
  - "The pre-existing Supabase-DB-password blocker (the prior pass surfaced it at the checkpoint) was resolved out-of-band — the password was rotated to a working one and updated in BOTH turion-satellite/production/database-url AND turion-demo-api's DATABASE_URL env var; both Lambdas bounced; /api/health on both → {db:ok}. Task 4 (the previously-deferred DB-direct E2E walk) was then run and passed."
  - "Ran the ERP per-module E2E round-trips via the REAL backend write routes (per the ENDPOINT-VERIFICATION GATE — grep'd turion-space-demo/backend/src/routes/*.ts first) rather than raw psql INSERTs: Salesforce POST/PATCH /api/salesforce/customers, NetSuite POST/PATCH /api/netsuite/items + PATCH /api/netsuite/journal-entries/:id, Arena POST/PATCH /api/arena/ncrs, MES PATCH /api/mes/stages/:num — psql used only for baseline counts + cleanup. NetSuite /api/netsuite/sales-orders is a complex SF→NS fan-out (skipPost) so /api/netsuite/items (generic keyedEntity POST/PATCH) was used as the NS create/read/update proof instead."
metrics:
  duration: ~75min (across two executor passes)
  completed: 2026-05-12
---

# Phase 36 Plan 09: Deploy + E2E-Verify Summary (COMPLETE)

Deployed everything (both repos pushed, both Lambdas redeployed, frontend deployed + CF invalidated) and verified everything — static curl smoke + dual button audit 0/0 + Phase 27-35 frontend regression all PASS, AND the DB-direct E2E walk per module passed once the pre-existing Supabase-DB-password blocker was resolved out-of-band (the password was rotated to a working one and updated in both the `turion-satellite/production/database-url` secret and `turion-demo-api`'s `DATABASE_URL` env var; both Lambdas bounced; `/api/health` on both → `{db:ok}`). All 9 Phase-36 requirements satisfied; headless-substitute checkpoint approved.

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
| satellite APIGW `GET /api/health` | (at deploy time 503 — DB blocker; **re-verified after the blocker resolution → `{"db":"ok","schema":"turion_satellite"}`**) |
| satellite APIGW `GET /api/lookups/satellite-statuses` (no auth) | 401 — correct (it's `requireAuth`) |
| satellite APIGW bogus path | 404 |
| satellite APIGW `GET /api/satellites` (no auth) | 401 — correct |
| ERP APIGW `GET /api/health` | (at deploy time 500 — DB blocker; **re-verified after the blocker resolution → `{"db":"ok","schema":"turion","rows":{...},"last_write":"2026-05-08T21:03:56.556Z"}`**) |
| ERP APIGW `GET /api/data/all` | (at deploy time 500 — DB blocker; **re-verified after the blocker resolution → 200, 53 top-level keys incl. `CUSTOMER_DATA`/`SO_DATA`/`STAGE_DATA`, real data**) |
| ERP APIGW `GET /api/{salesforce,netsuite,arena,mes}/lookups` | all 200 (canonical enum lists; served even when the DB was down — 36-02's hardened degrade-to-canonical path) |
| ERP APIGW `POST /api/agents/run` | route resolves; reaches the Anthropic API (the `ANTHROPIC_API_KEY` Lambda env var works) — currently returns `400 {"error":{"type":"invalid_request_error","message":"Your credit balance is too low ..."}}` ⇒ a billing matter, NOT a code/deploy issue. `GET /api/agents/run` → 404 (POST-only, correct); `/api/agents/nope` → 404. Agents router IS mounted (`app.use('/api/agents', agents)`, routes: `/run`, `/ncr-capa`, `/evms`, `/integration-sentinel`). |
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

### Blocker resolution (out-of-band, between the two executor passes)
The pre-existing prod-infra blocker the first pass surfaced — the shared Supabase Postgres password was rotated/invalid (`password authentication failed for user "postgres"` on both `:6543` and `:5432`) — was **resolved**: the password was rotated to a working one and updated in **both** `turion-satellite/production/database-url` (Secrets Manager) **and** `turion-demo-api`'s `DATABASE_URL` env var; both Lambdas were bounced. Re-verified: satellite `/api/health` → `{"db":"ok","schema":"turion_satellite"}`; ERP `/api/health` → `{"db":"ok","schema":"turion","rows":{...}}`; `/api/data/all` → 200 with real data. No Phase-36 commit ever touched the DB credentials — the rotation/restore happened independently.

## Task 4 — DB-direct E2E walk per module (RUN, PASS)

DB conn (psql, password URL-encodes the `!` as `%21`): `postgresql://postgres.lbpkbpfwdpnwlccmlfxn:Thirumala977%21@aws-1-us-east-2.pooler.supabase.com:6543/postgres`. Per the ENDPOINT-VERIFICATION GATE, `grep -rn` on `turion-space-demo/backend/src/routes/*.ts` first — every module has real write routes (`salesforce.ts`/`netsuite.ts`/`arena.ts`/`mes.ts` keyed-CRUD helpers + custom POSTs), so the per-module round-trips went through the **actual backend write routes**; psql was used only for baseline counts + cleanup.

### Satellite PLM spot-check (schema `turion_satellite`) — intact
- `/api/health` → `{db:ok, schema:turion_satellite}`.
- `satellites` = **4**; `part_definitions` = **165** (the Cygnus dataset, Phase 33+ intact); `part_instances` = **261**; `work_orders` = **52**. Per-module no-spawn (didn't re-run a full sales-order→spawn chain — that was proven in Phase 35; this run just confirms the data didn't get clobbered by any Phase-36 deploy).

### ERP per-module create→read→update round-trips (schema `turion`, via the real API) — all PASS, all cleaned to baseline
| Module | Round-trip | Result |
| --- | --- | --- |
| **Salesforce** | `POST /api/salesforce/customers {id:"TEST-36-SF",name,tier:"Bronze"}` → `GET /api/salesforce/customers/TEST-36-SF` → `PATCH …{tier:"Platinum"}` → `GET` | 201 / read OK / merged `tier:"Platinum"` / GET confirms. `turion.audit_log` got `CREATE` + `PATCH` rows for `entity='customers', entity_id='TEST-36-SF'`. Cleanup: `delete from turion.audit_log where entity='customers' and entity_id='TEST-36-SF'` (2 rows) + `delete from turion.customers where id='TEST-36-SF'` (1 row) → `count(*)` back to **1** (baseline). |
| **NetSuite** | `POST /api/netsuite/items {id:"TEST-36-NS",name,uom:"EA",stdCost:42}` → `GET` → `PATCH …{stdCost:99}` → `GET`; plus `PATCH /api/netsuite/journal-entries/JE-2025-0412 {status:"Posted-TEST36"}` → `GET` (status changed) | 201 / read OK / merged `stdCost:99` / GET confirms / JE `status` flipped to `Posted-TEST36`. Cleanup: removed the test `status` key from the JE via `update turion.journal_entries set source_data = source_data - 'status' where id='JE-2025-0412'` (`? 'status'` → `f`); deleted the `items`/`journal_entries` audit_log rows; `delete from turion.items where id='TEST-36-NS'` → `count(*)` back to **59** (baseline). |
| **Arena** | `POST /api/arena/ncrs {id:"TEST-36-NCR",title,status:"Open",severity:"Minor"}` → `GET` → `PATCH …{status:"Closed"}` → `GET` | 201 / read OK / merged `status:"Closed"` / GET confirms. Cleanup: deleted the `ncrs` audit_log rows + `delete from turion.ncrs where id='TEST-36-NCR'` → `count(*)` back to **8** (baseline). |
| **MES** | `GET /api/mes/stages/3` (status `complete`) → `PATCH …{status:"TEST36-InProgress"}` → `GET` (changed) → `PATCH …{status:"complete"}` (revert) | read OK / `status` → `TEST36-InProgress` / GET confirms / reverted to `complete`. Cleanup: deleted the `mes_stages` (entity_id `'3'`) audit_log rows → `turion.audit_log count(*)` back to **78** (baseline). |

No `TEST-36-*` rows remain in any table; all baseline counts restored (`customers` 1, `items` 59, `ncrs` 8, `audit_log` 78, satellite `part_definitions` 165).

### Data-route + agents re-confirm
- `GET /api/data/all` → 200, **53 top-level keys** incl. `CUSTOMER_DATA`/`SO_DATA`/`STAGE_DATA` — real data (`last_write` 2026-05-08).
- `GET /api/{salesforce,netsuite,arena,mes}/lookups` → all **200**.
- `POST /api/agents/run` → the route resolves and reaches the Anthropic API (the `ANTHROPIC_API_KEY` Lambda env var works) — currently returns `400 credit balance too low` ⇒ a billing matter, the route is wired correctly. (The satellite-side chat assistant remains dark until the user creates the Phase-34 `turion-satellite/production/anthropic-key` secret + sets `ANTHROPIC_API_KEY_ARN` on `turion-satellite-api`.)

## Task 7 — STATE.md + ROADMAP.md updated (Phase 36 → COMPLETE)
- `.planning/STATE.md` Current Position rewritten to "Phase 36 COMPLETE — 9/9 plans — DB blocker resolved, full DB-direct E2E walk passed, headless-substitute checkpoint approved" with the phase-wide what-shipped summary, the deploy facts, the Task-4 results, and the remaining user follow-ups.
- `.planning/ROADMAP.md` — Phase 36 header `**Plans:** 9/9 plans complete (2026-05-12)`; `36-06-PLAN.md` and `36-09-PLAN.md` flipped `[ ]`/`[~]` → `[x]` (36-06 had a SUMMARY already; the ROADMAP just hadn't been ticked); the `*Last updated:*` footer updated.
- MEMORY.md index got a ≤200-char Phase-36 line + a topic file at `/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/turion-phase-36-zero-hardcodes-e2e.md` (memory dir is outside the repo — written, not committed).

## User follow-ups (NOT blockers — nice-to-haves)
1. **Rotate the exposed Resend API key** `re_JRdox6wH_...` (committed to the WIP/git tree — treat as compromised). Resend dashboard → API Keys. Then **set `RESEND_API_KEY` on `turion-demo-api`** — `aws lambda update-function-configuration --function-name turion-demo-api --environment 'Variables={DATABASE_URL=...,ANTHROPIC_API_KEY=...,RESEND_API_KEY=re_<new>}'` (keep all existing vars; optionally back it with a Secrets Manager secret `turion-demo/production/resend-key`). Until then `notify.ts`'s email send is a logged no-op (graceful — does not error). The deployed image (`c716f0d2...`) already has the plaintext key scrubbed.
2. **Create the Phase-34 `turion-satellite/production/anthropic-key` secret + set `ANTHROPIC_API_KEY_ARN` on `turion-satellite-api`** to light up the satellite chat assistant (`assistant.ts`'s lazy `getApiKey()`).
3. **Future backend plan** — add `turion.*` tables for the FP&A/COA/company/tax/users config so the last ~6 config-only `*-data.js` static files (the offline hydrators for `BUDGET/FORECAST/TAX_RATES/COA_CLASSES/EMP_TO_PERSON/...` that have no API source today) can be deleted.

## Checkpoint
Task 6 (`checkpoint:human-verify`, `gate="blocking"`) — APPROVED. The headless-substitute evidence (static curl smoke + dual button audit 0/0 + Phase 27-35 frontend regression) PLUS the now-completed DB-direct E2E walk per module are in place. The optional visual browser walk of the deployed demo remains the follow-up (per Phases 27-35 precedent).

## Deferred items
- Optional visual browser walk of the deployed demo (the headless smoke + DB walk are the substitute, per Phases 27-35).
- The 3 user follow-ups above (none block phase completion).
- Pre-existing out-of-scope items carried from earlier phases: `ns_invoice_id` NULL on some instances; instance>1 duplicates missing WO/PR; ERP MES domain depth deliberately left thin (the satellite work-orders/build-steps app is the real MES surface).

## Self-Check: PASSED
- SUMMARY.md exists at the expected path; status `complete`.
- `turion-satellite` commit `404a968` present + pushed to origin.
- `turion-space-demo` commit `de0fac9` present + pushed to origin.
- `turion-satellite-api` CodeSha256 = `1134cefc...` (changed from `2984d8e9...`).
- `turion-demo-api` CodeSha256 = `c716f0d2...` (changed from `fd4605e6...`).
- CloudFront invalidation `IC6IW03ZMEJE46DK93BO7XVI6B` = Completed.
- Button audit (both frontends) = 0/0 violations.
- DB-direct E2E walk per module run + passed; all test rows cleaned to baseline; satellite `/api/health` → `{db:ok}`, `/api/data/all` → 200 real data.
- STATE.md + ROADMAP.md updated to Phase 36 COMPLETE (9/9).
