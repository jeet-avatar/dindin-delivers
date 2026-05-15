# Phase 55 — Deferred items

Items discovered during 55-04 execution that are OUT OF SCOPE (caused by
earlier waves, not by 55-04 changes). Logged here per scope-boundary rule;
deferred to a follow-up plan.

## From 55-04 execution (2026-05-15)

### Satellite backend: 266 unit tests broken by 55-03 tenantContext middleware

- **Symptom:** `npm run test` in `/Users/jeet/turion-satellite/backend` reports
  `34 failed | 11 passed | 2 skipped (47 files)` and
  `266 failed | 139 passed | 205 skipped (610 tests)`.
- **Root cause:** Phase 55-03 added `tenantContext` middleware to every
  satellite route. The unit tests (`tests/*.test.ts`) call routes via supertest
  WITHOUT setting the `X-Tenant-Slug` header → every route returns
  `400 Missing X-Tenant-Slug header` instead of the expected response.
- **Verification this is pre-55-04:** Stashed 55-04 changes, re-ran `npm test`
  on satellite — same 266/610 failure count. NOT caused by 55-04.
- **Fix scope estimate:** Add `.set('X-Tenant-Slug', 'turion')` to every
  `request(...).get/post(...)` in 34 test files. Mechanical sweep, ~30 min.
- **Deferred to:** Follow-up plan or 55-06 — should be a one-task plan with a
  single sed-like script applied across all `tests/*.test.ts`.
- **Note:** The space-demo backend's tests (29 in `tests/unit/`) WERE auto-fixed
  during 55-04 execution because the impact was small (1 mock file) and the
  fix was unambiguous (add withTenantClient to the db mock). The satellite
  scale (34 files) makes a sweep too invasive for a Rule-1 auto-fix.

### `/Users/jeet/doordash-p2p` branch state

- During 55-04 execution, doordash-p2p was on branch
  `gsd/phase-54.1-m6-multi-user-per-tenant-team-invites-role-middleware`
  (not on `main` or a dedicated 55-04 branch). This is the planner's responsibility
  to reconcile during phase closure.
