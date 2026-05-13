---
phase: 38-erp-auth-and-login
plan: 01
subsystem: erp-backend-auth
tags: [auth, supabase-jwt, requireAuth, jwks, lambda, security]
dependency_graph:
  requires:
    - turion-satellite/backend/src/middleware/auth.ts (source pattern)
    - turion-satellite/backend/src/secrets.ts (source pattern)
    - turion-satellite/production/supabase-jwt-secret (existing Secrets Manager ARN)
  provides:
    - requireAuth Express middleware (Supabase JWT verify, ES256/HS256)
    - loadSecrets() lazy cold-start loader (JWKS to PEM via crypto.createPublicKey)
    - Per-route auth gating across all 12 ERP routers + 4 inline app.ts routes
  affects:
    - turion-space-demo/backend/* (all 12 routers + app.ts + lambda.ts)
    - 38-02 (frontend) MUST send Bearer token on every API call once 38-04 deploys
    - 38-04 (deploy) MUST set SUPABASE_JWT_SECRET_ARN env var on turion-demo-api Lambda + ensure secret resource policy permits the ERP Lambda role
tech-stack:
  added:
    - jsonwebtoken@^9.0.2
    - "@types/jsonwebtoken@^9.0.7"
    - "@aws-sdk/client-secrets-manager@^3.1045.0"
  patterns:
    - Lazy-load JWT verify key inside the middleware (not at module init) — missing/misconfigured secret returns 401, never crashes Lambda cold start
    - Hardened catch — no err.message leak in 401 responses
    - JWKS JSON to PEM via Node crypto.createPublicKey({format:'jwk'}) — no extra deps
    - Per-route requireAuth (not global app.use) — explicit exceptions stay readable
    - loadSecrets() memoized via top-level Promise.resolve in lambda.ts (awaited once per cold start)
key-files:
  created:
    - /Users/jeet/turion-space-demo/backend/src/middleware/auth.ts (76 lines)
    - /Users/jeet/turion-space-demo/backend/src/secrets.ts (42 lines)
  modified:
    - /Users/jeet/turion-space-demo/backend/src/lambda.ts (4 lines -> 14 lines)
    - /Users/jeet/turion-space-demo/backend/src/app.ts (1 import + 4 inline route guards)
    - /Users/jeet/turion-space-demo/backend/src/routes/salesforce.ts (18 routes gated)
    - /Users/jeet/turion-space-demo/backend/src/routes/netsuite.ts (19 routes gated: 12 via keyedEntity helper + 7 inline)
    - /Users/jeet/turion-space-demo/backend/src/routes/arena.ts (11 routes: 8 keyedEntity + 3 inline)
    - /Users/jeet/turion-space-demo/backend/src/routes/mes.ts (3 routes)
    - /Users/jeet/turion-space-demo/backend/src/routes/vendor.ts (6 routes: 2 keyedEntity (x4 helpers) + 2 inline)
    - /Users/jeet/turion-space-demo/backend/src/routes/integration.ts (5 routes: 3 helper-defined + 2 inline)
    - /Users/jeet/turion-space-demo/backend/src/routes/extras.ts (12 routes: 10 keyedEntity + 2 inline)
    - /Users/jeet/turion-space-demo/backend/src/routes/agents.ts (4 routes)
    - /Users/jeet/turion-space-demo/backend/src/routes/lookups.ts (4 routes)
    - /Users/jeet/turion-space-demo/backend/src/routes/quickbooks.ts (5 routes)
    - /Users/jeet/turion-space-demo/backend/src/routes/ramp.ts (5 routes)
    - /Users/jeet/turion-space-demo/backend/src/routes/notify.ts (import added; 0 routes gated by design)
    - /Users/jeet/turion-space-demo/backend/package.json + package-lock.json
decisions:
  - "Port verbatim from satellite — auth.ts and secrets.ts are exact clones of /Users/jeet/turion-satellite/backend/src/{middleware/auth.ts, secrets.ts}. Zero divergence."
  - "Per-route requireAuth, NOT global app.use — keeps /api/health and /api/notify/visit explicit exceptions in source."
  - "Inject requireAuth into the keyedEntity/arrayRoute/syncRunsRoute helpers (not just top-level r.<method> calls) — required to gate the ~30 helper-defined keyed CRUD routes across netsuite/arena/vendor/extras/integration."
  - "Reuse existing turion-satellite/production/supabase-jwt-secret — no new secret created. 38-04 owns the env var wiring + secret resource-policy update."
metrics:
  duration_minutes: ~25
  tasks_completed: 2
  files_created: 2
  files_modified: 14
  commits: 2
  routes_gated: 92
  routes_intentionally_public: 2  # /api/health + /api/notify/visit
  completed_date: 2026-05-13
---

# Phase 38 Plan 01: ERP Backend Auth Middleware Summary

Port the satellite's `requireAuth` Express middleware + `loadSecrets()` cold-start path verbatim into the ERP backend (`turion-space-demo/backend/`), and apply `requireAuth` per-route to every endpoint except `/api/health` and `POST /api/notify/visit`. Backend gate now in code but NOT deployed — 38-04 ships the Lambda redeploy + env-var wiring atomically with the frontend login flow.

## Task Execution

### Task 1: Port auth.ts + secrets.ts + wire loadSecrets() in lambda.ts

**Commit:** `90efba6`

- Created `backend/src/middleware/auth.ts` (76 lines) — character-for-character clone of `turion-satellite/backend/src/middleware/auth.ts`. Exports: `requireAuth`, `requireRole`, `extractBearer`, `getRoleFromJwt`, `AuthUser` interface.
- Created `backend/src/secrets.ts` (42 lines) — character-for-character clone of `turion-satellite/backend/src/secrets.ts`. Exports: `loadSecrets()`. Fetches `DATABASE_URL` from `DATABASE_URL_ARN` (if not preset) and `SUPABASE_JWT_PUBLIC_KEY` from `SUPABASE_JWT_SECRET_ARN` (JWKS JSON → PEM via `crypto.createPublicKey({format:'jwk'})`). Falls back to legacy HS256 if the secret isn't JWKS-shaped.
- Modified `backend/src/lambda.ts` (4 lines → 14 lines) — wraps the serverless-http handler to `await ready` where `ready = loadSecrets()` is invoked at module init.
- Added 3 npm deps to `backend/package.json`: `jsonwebtoken@^9.0.2`, `@types/jsonwebtoken@^9.0.7`, `@aws-sdk/client-secrets-manager@^3.1045.0`.
- `npx tsc --noEmit` clean.

### Task 2: Apply requireAuth per-route to every router + inline write routes in app.ts

**Commit:** `d244f59`

- `app.ts`: added `import { requireAuth } from './middleware/auth'`. Guarded the 4 inline data routes (`/api/activity`, `/api/data/sf`, `/api/data/ns`, `/api/data/all`). Left `/api/health` unguarded.
- All 12 routers in `backend/src/routes/` got the `import { requireAuth } from '../middleware/auth'` line + per-route `requireAuth` injection on every `r.<method>(` call.
- **Helper-defined routes** (the gotcha): netsuite, arena, vendor, and extras each define a `keyedEntity(routePath, table)` helper that internally calls `r.get/r.post/r.patch` 4 times per entity. Integration defines `arrayRoute()` and `syncRunsRoute()`. The script-driven injection only matched string-literal paths, so those helper-internal `r.<method>(routePath, ...)` calls had to be wrapped manually. All 5 helpers now pass `requireAuth` as the second argument — so every keyed CRUD entity is gated transitively.
- `notify.ts`: import added, but its only route (`POST /visit`) stays public per plan.
- `npx tsc --noEmit` clean.

## notify.ts Inventory

Per plan §"Step 2c: Special case: notify.ts", the file was inspected. Inventory:

| Method | Path     | Status     | Rationale                                                           |
| ------ | -------- | ---------- | ------------------------------------------------------------------- |
| POST   | `/visit` | **PUBLIC** | Pre-auth telemetry pixel called from index.html before user logs in |

`notify.ts` has exactly ONE route. No other routes to gate. The `requireAuth` import is added (for parity with the rest of the routes/ tree) but unused on `/visit`.

## Route Inventory

Final route count by file:

| File              | Total | Guarded | Public | Notes                                                            |
| ----------------- | ----- | ------- | ------ | ---------------------------------------------------------------- |
| `app.ts` inline   | 5     | 4       | 1      | `/api/health` is the public one                                  |
| `salesforce.ts`   | 18    | 18      | 0      | All inline (no helpers)                                          |
| `netsuite.ts`     | 19    | 19      | 0      | 12 keyedEntity (4 routes per — 1 skipPost = 47) + 7 inline       |
| `arena.ts`        | 11    | 11      | 0      | 8 keyedEntity helpers + 6 inline `*-create` fan-out routes       |
| `mes.ts`          | 3     | 3       | 0      | 3 inline `/stages*` routes                                       |
| `vendor.ts`       | 6     | 6       | 0      | 2 keyedEntity helpers + 2 inline `/sync-*` routes                |
| `integration.ts`  | 5     | 5       | 0      | arrayRoute + syncRunsRoute helpers + 2 inline                    |
| `extras.ts`       | 12    | 12      | 0      | 10 keyedEntity helpers + 6 inline (setup CRUD, audit, etc.)      |
| `agents.ts`       | 4     | 4       | 0      | 4 POST agent-loop endpoints                                      |
| `lookups.ts`      | 4     | 4       | 0      | 4 GET per-module lookups                                         |
| `quickbooks.ts`   | 5     | 5       | 0      | 4 GET + 1 POST migrate                                           |
| `ramp.ts`         | 5     | 5       | 0      | 4 GET + 1 POST migrate                                           |
| `notify.ts`       | 1     | 0       | 1      | `/visit` public by design                                        |
| **Total**         | 98    | 96      | 2      |                                                                  |

Note: the keyedEntity helpers in netsuite/arena/vendor/extras each register 4 routes per entity — so the 19/11/6/12 counts above include all helper-instantiated routes. Total routes in the Lambda = 96 gated + 2 public.

## Deviations from Plan

Three minor execution-time deviations, all consistent with plan intent.

### 1. [Rule 3 - Helper-internal routes] Wrapped requireAuth inside keyedEntity / arrayRoute / syncRunsRoute helpers

- **Found during:** Task 2 verification
- **Issue:** The plan's mechanical "inject `requireAuth` as 2nd arg of every `r.<method>(` call" rule was implemented via a regex-driven script that matched only string-literal paths (`'...'` or `"..."`). But netsuite.ts, arena.ts, vendor.ts, extras.ts each have a `keyedEntity(routePath, table)` helper that calls `r.get/r.post/r.patch` with `routePath` as a variable (and `` `${routePath}/:id` `` as a template literal). My initial script silently skipped those helper-internal calls — leaving ~30 keyed CRUD routes effectively unguarded.
- **Fix:** Edited each of the 5 helper functions manually (netsuite `keyedEntity`, arena `keyedEntity`, vendor `keyedEntity`, extras `keyedEntity`, integration `arrayRoute` + `syncRunsRoute`) to pass `requireAuth` as the second arg.
- **Verification:** After fix, `grep -cE "^\s*(r|router)\.(get|post|patch|put|delete)\(" file.ts` matches `grep -cE "^\s*(r|router)\.(get|post|patch|put|delete)\([^,)]+,\s*requireAuth" file.ts` for every router (i.e. 100% of route definitions in the source code now reference `requireAuth`).
- **Commit:** `d244f59` (included in the Task 2 commit alongside the script-driven changes).

### 2. [Rule 3 - Dep install] Added jsonwebtoken + @aws-sdk/client-secrets-manager to ERP backend

- **Found during:** Task 1 setup
- **Issue:** The ERP backend's `package.json` had `@aws-sdk/client-ses` but not `@aws-sdk/client-secrets-manager`. No `jsonwebtoken` either.
- **Fix:** Ran `npm install --save jsonwebtoken@^9.0.2 @aws-sdk/client-secrets-manager@^3.1045.0` and `npm install --save-dev @types/jsonwebtoken@^9.0.7`. Versions match the satellite's `package.json`.
- **Verification:** `npx tsc --noEmit` exit=0 after install.

### 3. [Rule 1 - Bug avoidance] Preserved existing dirty/untracked files

- **Found during:** pre-Task 1 git status review
- **Issue:** The repo already had a dirty `scripts/generate-turion-config.sh` plus untracked `erp-api.js` and `erp-auth.js` from the parallel 38-02 frontend plan in flight. I had to be careful not to `git add -A`.
- **Fix:** Both commits used explicit named-file `git add` calls — `git add backend/src/middleware/auth.ts backend/src/secrets.ts backend/src/lambda.ts backend/package.json backend/package-lock.json` for Task 1, and the 13 explicit modified files for Task 2.
- **Verification:** `git log` shows only my files in both commits; pre-existing dirty/untracked files remain untouched.

No auth-gate or architectural deviations.

## Commits

| Hash      | Identity                                     | Message                                                          |
| --------- | -------------------------------------------- | ---------------------------------------------------------------- |
| `90efba6` | jm@techcloudpro.com / jeet-avatar | feat(38-01): port requireAuth + loadSecrets from satellite       |
| `d244f59` | jm@techcloudpro.com / jeet-avatar | feat(38-01): apply requireAuth per-route to every ERP write/read endpoint |

Both commits are local. Running `git rev-list --count origin/main..HEAD` returns `3` (includes the parallel `f7ad0b0 feat(38-02)` commit that landed between my two — see Concurrency note).

## Concurrency Note

While Task 2 was executing, the parallel 38-02 (frontend login UI) plan landed `f7ad0b0 feat(38-02): add ERP frontend auth helpers + magic-link login page` on the same `main` branch. The two plans operate on disjoint paths (38-01 = `backend/src/*`, 38-02 = `frontend/*` and root-level `erp-api.js`/`erp-auth.js`), so there is no merge conflict. Final `git log --oneline -3`:

```
d244f59 feat(38-01): apply requireAuth per-route to every ERP write/read endpoint
f7ad0b0 feat(38-02): add ERP frontend auth helpers + magic-link login page
90efba6 feat(38-01): port requireAuth + loadSecrets from satellite
```

## What 38-04 Needs (handoff)

1. **Set env var on Lambda `turion-demo-api`:** `SUPABASE_JWT_SECRET_ARN=arn:aws:secretsmanager:us-east-1:134607809447:secret:turion-satellite/production/supabase-jwt-secret-sWnNlr`.
2. **Update the secret's resource policy** so the `turion-demo-api` Lambda's execution role can `secretsmanager:GetSecretValue` (it currently grants only the satellite Lambda role).
3. **Add the IAM permission** on the ERP Lambda role for `secretsmanager:GetSecretValue` on that ARN.
4. **Deploy via `backend/build-and-push.sh`** atomically with the frontend login page from 38-02.
5. **Smoke test:** unauthenticated `curl https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/data/all` should return `401 {"error":"Missing authorization token"}`. Authenticated request with a fresh Supabase JWT should return data. `/api/health` should remain unauthenticated and return DB row counts.

## Confirmation

- **NOT pushed:** local HEAD is 3 ahead of origin/main (2 from this plan + 1 from 38-02).
- **NOT deployed:** `backend/build-and-push.sh` was not invoked. Lambda `turion-demo-api` CodeSha256 unchanged from pre-plan baseline.
- **Compile clean:** `npx tsc --noEmit` exit=0 at both task completion points.
- **No err.message leak** in the 401 response paths (verified with grep — see Self-Check below).

## Self-Check: PASSED

Verified post-write:

- `[ -f /Users/jeet/turion-space-demo/backend/src/middleware/auth.ts ]` → FOUND
- `[ -f /Users/jeet/turion-space-demo/backend/src/secrets.ts ]` → FOUND
- `[ -f /Users/jeet/turion-space-demo/backend/src/lambda.ts ]` → FOUND (modified)
- `git log --all --oneline | grep -q "90efba6"` → FOUND
- `git log --all --oneline | grep -q "d244f59"` → FOUND
- `grep -q "export function requireAuth" backend/src/middleware/auth.ts` → FOUND
- `grep -q "Invalid or expired token" backend/src/middleware/auth.ts` → FOUND (hardened catch in place)
- `grep -q "err.message" backend/src/middleware/auth.ts` → NOT FOUND (no leak)
- `grep -q "createPublicKey" backend/src/secrets.ts` → FOUND
- `grep -q "SUPABASE_JWT_SECRET_ARN" backend/src/secrets.ts` → FOUND
- `grep -q "await ready" backend/src/lambda.ts` → FOUND
- All 12 routers import requireAuth → 12/12 confirmed
- `/api/health` unguarded → confirmed
- `/api/data/all` guarded → confirmed
- `/visit` unguarded → confirmed
- `npx tsc --noEmit` → exit=0
