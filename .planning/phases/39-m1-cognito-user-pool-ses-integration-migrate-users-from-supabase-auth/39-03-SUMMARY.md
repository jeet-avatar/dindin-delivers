---
phase: 39-m1-cognito-user-pool-ses-integration-migrate-users-from-supabase-auth
plan: 03
subsystem: user-migration
tags:
  - cognito
  - supabase
  - migration
  - idempotent
  - aws-sdk
  - typescript
  - admin-create-user
  - temporary-script

dependency-graph:
  requires:
    - "Plan 39-01 (Cognito user pool us-east-1_KQuNS85nP + 4 Groups + custom:role/custom:supabase_sub schema attrs + zietra/cognito-config secret)"
    - "Plan 39-02 (Custom Email Sender + Define/Create/Verify AuthChallenge Lambdas wired into pool's LambdaConfig — not strictly required because MessageAction:SUPPRESS bypasses email path, but pool's full trigger config must remain intact)"
    - "DATABASE_URL on turion-demo-api Lambda env (Supabase Postgres pooler)"
  provides:
    - "4 Cognito users (demo@zietra.com, gteshnair@gmail.com, jm@techcloudpro.com, jeetnair.in@gmail.com) — all CONFIRMED, Enabled, email_verified=true, custom:role=admin, custom:supabase_sub populated with original Supabase UUID, member of admin Group"
    - "Forward-link audit map (Cognito sub UUID ↔ Supabase sub UUID via custom:supabase_sub attribute) — used by Phase 41 cleanup to confirm full coverage before Supabase auth.users deletion"
    - "Idempotent reusable migration script in backend/scripts/ (TEMPORARY — Phase 41 drops it)"
  affects:
    - ".planning/STATE.md (Current Plan → 39-04)"
    - ".planning/ROADMAP.md (Phase 39 progress 3/4)"
    - ".planning/REQUIREMENTS.md (UserMigrationFromSupabase ✓)"
    - "Phase 39 Plan 04 smoke test now has a real CONFIRMED user (jm@techcloudpro.com) to admin-initiate-auth CUSTOM_AUTH against"
    - "Phase 40 dual-issuer middleware will see real role data (custom:role=admin) in Cognito JWTs"

tech-stack:
  added:
    - "@aws-sdk/client-cognito-identity-provider ^3.658.0 (resolved to ^3.1046.0) — backend dependencies"
  patterns:
    - "AdminCreateUser + MessageAction:SUPPRESS + email_verified:true (string) + AdminSetUserPassword Permanent:true + AdminAddUserToGroup — one-shot bulk migration without invitation emails"
    - "AdminGetUser pre-check for idempotency ([skip-exists] log) + AdminGetUser post-check for Rule-3 attribute round-trip verification (all 4 attrs asserted: email, email_verified, custom:role, custom:supabase_sub)"
    - "Pool ID loaded from Secrets Manager zietra/cognito-config (Rule 1 — no hardcoded IDs); single SecretsManager.GetSecretValue at startup"
    - "Read-only on Supabase — single SELECT WHERE email_confirmed_at IS NOT NULL, no UPDATE/DELETE/INSERT ever"
    - "DRY_RUN=1 env var short-circuits before AdminGetUser call → safe pre-flight"
    - "DEPRECATED_ALIAS_DROPS Set<string> + ROLE_MAP Record<string, RoleLiteral> — explicit allowlist+denylist; unmapped emails get [drop-unmapped] not silent migrate"

key-files:
  created:
    - "/Users/jeet/turion-space-demo/backend/scripts/migrate-supabase-users-to-cognito.ts (186 LOC — TEMPORARY: deleted in Phase 41)"
    - "/Users/jeet/turion-space-demo/backend/scripts/README-cognito-migration.md (86 LOC — operator runbook)"
  modified:
    - "/Users/jeet/turion-space-demo/backend/package.json (+1 dep: @aws-sdk/client-cognito-identity-provider)"
    - "/Users/jeet/turion-space-demo/backend/package-lock.json"

decisions:
  - "Strip query string from DATABASE_URL before passing to psql — Supabase pooler URL carries Postgres connection options that psql treats as URI query params and rejects (Rule-3 auto-fix; node-pg's PgClient accepts the full URL)"
  - "Strong random password is set even though magic-link is the only sign-in path — Cognito requires a password attribute (the user is CONFIRMED, not FORCE_CHANGE_PASSWORD); 32-byte base64 + suffix exceeds the pool's password policy of mixed-case/digits/special"
  - "Filter dropped at SQL level (WHERE email_confirmed_at IS NOT NULL) — 6 spam users never surface in the script's iteration; only 5 rows ever pass through, 1 of which is the deprecated alias"
  - "All 4 real users → admin role (per RESEARCH §Migration Script Skeleton — they're platform builders/demo accounts, no real customer/driver/vendor exists yet)"
  - "AdminCreateUser MessageAction:SUPPRESS — bypasses Custom Email Sender / SES path entirely for migration; users never see an invitation email"

metrics:
  duration_min: 4
  completed: 2026-05-14T05:21:00Z
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
  commits: 1
  cognito_users_created: 4
  cognito_groups_assigned: 4
  supabase_rows_read: 5
  supabase_rows_modified: 0
---

# Phase 39 Plan 03: Supabase auth.users → Cognito Migration Summary

**One-liner:** One-shot TypeScript migration script that read the 5 confirmed Supabase `auth.users` rows, filtered out the 1 deprecated gmail-alias test address, and AdminCreateUser'd the remaining 4 real users into Cognito pool `us-east-1_KQuNS85nP` with `email_verified=true`, `custom:role=admin`, `custom:supabase_sub=<original_uuid>`, and `admin` Group membership — all idempotent, all Rule-3-verified post-create.

## What was built

### One file: `backend/scripts/migrate-supabase-users-to-cognito.ts` (186 LOC, TEMPORARY)

Reads `zietra/cognito-config` from Secrets Manager → connects to Supabase via `DATABASE_URL` → iterates `SELECT id, email, raw_user_meta_data, created_at FROM auth.users WHERE email_confirmed_at IS NOT NULL ORDER BY created_at` → per row:
1. Lowercase the email
2. Drop if in `DEPRECATED_ALIAS_DROPS` Set (currently `jeetnair.in+zietra-c8@gmail.com`)
3. Drop if not in `ROLE_MAP` (currently all 4 real users → `admin`)
4. If `DRY_RUN=1` → log `[dry-run]` and continue
5. `AdminGetUser` → if exists, log `[skip-exists]` and continue (idempotency)
6. `AdminCreateUser` with `MessageAction:'SUPPRESS'`, attrs: `email`, `email_verified='true'` (string!), `custom:role`, `custom:supabase_sub`, `name`
7. `AdminSetUserPassword` with 32-byte random base64 + suffix, `Permanent:true`
8. `AdminAddUserToGroup` (group = role)
9. **Rule 3 verification:** `AdminGetUser` again, assert all 4 attrs match — throw if mismatch

### One file: `backend/scripts/README-cognito-migration.md` (86 LOC)

Operator runbook covering prereqs, IAM permissions, dry-run command, real-run command, idempotency guarantee, per-user rollback recipe, and the Phase-41 deletion plan.

### Dependency added: `@aws-sdk/client-cognito-identity-provider` ^3.658.0

Resolved to ^3.1046.0. Bundled into `backend/dependencies` (used at script runtime; Phase 40 reads JWKS directly via HTTPS, not via this SDK — so Phase 41 will drop it).

## Why

Phase 39's RESEARCH inventoried 10 rows in Supabase `auth.users`: 4 real users + 6 spam signups + 1 deprecated test alias. The 6 spam users have `email_confirmed_at IS NULL` and were filtered at the SQL level. The 1 deprecated alias (`jeetnair.in+zietra-c8@gmail.com`, a gmail `+` alias of `jeetnair.in@gmail.com`) was user-confirmed for drop and added to `DEPRECATED_ALIAS_DROPS` Set.

Phase 40 (dual-issuer JWT verify) needs real Cognito users with role data to test against. Plan 39-04's smoke test (`admin-initiate-auth CUSTOM_AUTH`) needs at least one CONFIRMED user. All 4 real users were migrated to satisfy both downstream consumers. The migration is read-only on Supabase — `auth.users` stays as the source of truth until Phase 41 (full cutover + Supabase Auth removal).

This script is the **first place real role data exists in the system** — current Supabase JWTs carry no `role` claim (verified in Phase 38 RESEARCH and re-confirmed here). All 4 real users are platform builders/demo accounts, so they all map to `admin`.

## Verification (proof, not "should work")

### DRY_RUN log excerpt (5 rows surfaced, 4 would migrate, 1 dropped)

```text
[migrate] region=us-east-1 dry_run=true
[migrate] pool_id=us-east-1_KQuNS85nP
[migrate] connected to Supabase
[migrate] 5 confirmed user(s) found in Supabase
[dry-run] demo@zietra.com → role=admin · supabase_sub=2919d215-e3c2-4dcf-b14f-00f020b20665
[dry-run] gteshnair@gmail.com → role=admin · supabase_sub=b1ddd626-2d1e-4bba-8f75-8e74c742ca7c
[drop-deprecated] jeetnair.in+zietra-c8@gmail.com
[dry-run] jm@techcloudpro.com → role=admin · supabase_sub=21235658-909d-48c0-97c3-24edc5a822cd
[dry-run] jeetnair.in@gmail.com → role=admin · supabase_sub=76d9f93b-b1fb-467a-870a-5b8fa3a66c2d

=== SUMMARY ===
source rows (confirmed):  5
created:                  0
skipped (already exists): 0
dropped (deprecated/unmapped): 1
errors:                   0
```

### Real-run log excerpt (4 created, 0 errors)

```text
[migrate] region=us-east-1 dry_run=false
[migrate] pool_id=us-east-1_KQuNS85nP
[migrate] connected to Supabase
[migrate] 5 confirmed user(s) found in Supabase
[migrated] demo@zietra.com → role=admin · CONFIRMED
[migrated] gteshnair@gmail.com → role=admin · CONFIRMED
[drop-deprecated] jeetnair.in+zietra-c8@gmail.com
[migrated] jm@techcloudpro.com → role=admin · CONFIRMED
[migrated] jeetnair.in@gmail.com → role=admin · CONFIRMED

=== SUMMARY ===
source rows (confirmed):  5
created:                  4
skipped (already exists): 0
dropped (deprecated/unmapped): 1
errors:                   0
```

Every `[migrated]` line emits AFTER the Rule-3 verify — the `CONFIRMED` text is `got.UserStatus` from the post-create `AdminGetUser` round-trip.

### Idempotent re-run log excerpt (4 skipped, 0 created)

```text
[migrate] region=us-east-1 dry_run=false
[migrate] pool_id=us-east-1_KQuNS85nP
[migrate] connected to Supabase
[migrate] 5 confirmed user(s) found in Supabase
[skip-exists] demo@zietra.com
[skip-exists] gteshnair@gmail.com
[drop-deprecated] jeetnair.in+zietra-c8@gmail.com
[skip-exists] jm@techcloudpro.com
[skip-exists] jeetnair.in@gmail.com

=== SUMMARY ===
source rows (confirmed):  5
created:                  0
skipped (already exists): 4
dropped (deprecated/unmapped): 1
errors:                   0
```

### Independent Cognito verification (Rule 3 — don't trust the script's stdout)

```text
$ aws cognito-idp list-users --user-pool-id us-east-1_KQuNS85nP --region us-east-1 --query 'length(Users)' --output text
4

$ aws cognito-idp list-users --user-pool-id us-east-1_KQuNS85nP --region us-east-1 \
    --query 'Users[].{Email:Attributes[?Name==`email`].Value|[0], Status:UserStatus, Role:Attributes[?Name==`custom:role`].Value|[0], Sub:Attributes[?Name==`custom:supabase_sub`].Value|[0]}' \
    --output table

-----------------------------------------------------------------------------------------
|                                       ListUsers                                       |
+------------------------+--------+------------+----------------------------------------+
|          Email         | Role   |  Status    |                  Sub                   |
+------------------------+--------+------------+----------------------------------------+
|  gteshnair@gmail.com   |  admin |  CONFIRMED |  b1ddd626-2d1e-4bba-8f75-8e74c742ca7c  |
|  jeetnair.in@gmail.com |  admin |  CONFIRMED |  76d9f93b-b1fb-467a-870a-5b8fa3a66c2d  |
|  demo@zietra.com       |  admin |  CONFIRMED |  2919d215-e3c2-4dcf-b14f-00f020b20665  |
|  jm@techcloudpro.com   |  admin |  CONFIRMED |  21235658-909d-48c0-97c3-24edc5a822cd  |
+------------------------+--------+------------+----------------------------------------+

$ for email in demo@zietra.com gteshnair@gmail.com jm@techcloudpro.com jeetnair.in@gmail.com; do
    aws cognito-idp admin-list-groups-for-user --user-pool-id us-east-1_KQuNS85nP --username "$email" --region us-east-1 --query 'Groups[].GroupName' --output text
  done
admin
admin
admin
admin
```

### Forward-link audit map (Cognito ↔ Supabase)

Phase 41 cleanup uses this map to confirm full migration coverage before deleting Supabase `auth.users` rows.

| Email | Supabase `auth.users.id` | Cognito `custom:supabase_sub` | Cognito Group | Status |
|---|---|---|---|---|
| `demo@zietra.com` | `2919d215-e3c2-4dcf-b14f-00f020b20665` | `2919d215-e3c2-4dcf-b14f-00f020b20665` | `admin` | CONFIRMED |
| `gteshnair@gmail.com` | `b1ddd626-2d1e-4bba-8f75-8e74c742ca7c` | `b1ddd626-2d1e-4bba-8f75-8e74c742ca7c` | `admin` | CONFIRMED |
| `jm@techcloudpro.com` | `21235658-909d-48c0-97c3-24edc5a822cd` | `21235658-909d-48c0-97c3-24edc5a822cd` | `admin` | CONFIRMED |
| `jeetnair.in@gmail.com` | `76d9f93b-b1fb-467a-870a-5b8fa3a66c2d` | `76d9f93b-b1fb-467a-870a-5b8fa3a66c2d` | `admin` | CONFIRMED |

All 4 supabase_sub UUIDs round-trip exactly — script's Rule-3 verify (`if (attrs['custom:supabase_sub'] !== r.id) throw`) caught zero mismatches.

### Supabase `auth.users` untouched (read-only proof)

```text
BEFORE row count:        10
AFTER  row count:        10
BEFORE max(updated_at):  2026-05-14 01:52:06.747561+00
AFTER  max(updated_at):  2026-05-14 01:52:06.747561+00
PASS: row count unchanged
PASS: max(updated_at) unchanged
```

Neither the row count nor the latest `updated_at` timestamp moved across all 3 script runs (dry-run + real-run + re-run). The script's only Supabase interaction is a single `SELECT` query.

### Spam users filtered (verified via Cognito user list)

The 6 spam users from RESEARCH §"Supabase Inventory" (unconfirmed gmail aliases like `be.rohi.y.ed.o.6.20@gmail.com`) do NOT appear in `aws cognito-idp list-users` output. They were filtered at SQL level (`WHERE email_confirmed_at IS NOT NULL`) and never surfaced in any of the 3 runs.

### Deprecated alias dropped (verified)

`jeetnair.in+zietra-c8@gmail.com` does NOT appear in `aws cognito-idp list-users` output. It was caught by `DEPRECATED_ALIAS_DROPS` Set check and logged as `[drop-deprecated]` in all 3 runs.

### Lambda backends UNTOUCHED

```text
$ cd /Users/jeet/turion-space-demo && git status backend/src/
nothing to commit, working tree clean

$ cd /Users/jeet/turion-satellite && git status backend/src/
nothing to commit, working tree clean

$ cd /Users/jeet/turion-space-demo && git log -1 --name-only | grep -E "^backend/src/.*\.(ts|js)$"
(empty)
```

Zero `backend/src/` files touched in the commit. The only modified file outside `scripts/` is `backend/package.json` (+1 dep entry) and `backend/package-lock.json` (lockfile churn).

### Phase 38 regression intact

```text
$ curl -s -o /dev/null -w "%{http_code}\n" https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/health
200
$ curl -s -o /dev/null -w "%{http_code}\n" https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/data/all
401
```

ERP API health OK, auth gate still rejecting unauthenticated requests as expected.

### TypeScript clean

```text
$ cd /Users/jeet/turion-space-demo/backend
$ npx tsc --noEmit --target ES2022 --module commonjs --moduleResolution node --strict --esModuleInterop --skipLibCheck --resolveJsonModule scripts/migrate-supabase-users-to-cognito.ts
(no output, exit 0)
```

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] DATABASE_URL has query params that psql rejects**

- **Found during:** Task 2 baseline capture
- **Issue:** The Lambda env var `DATABASE_URL` from `turion-demo-api` includes a `?schema=turion` (or similar) query parameter for the Supabase pooler. `psql` rejects it with `psql: error: invalid URI query parameter: "schema"`. The Node `pg` client accepts it fine (the migration script itself runs without error), but the verification commands use `psql` to count rows + read `max(updated_at)`.
- **Fix:** Stripped the query string for psql via `PSQL_URL=$(echo "$DATABASE_URL" | sed 's|?.*$||')`. Used the cleaned URL for verification queries only — the migration script continues to use the original `DATABASE_URL` (which pg accepts as-is).
- **Files modified:** None (shell-only workaround in the verify block — no source code change)
- **Commit:** N/A (verification artifact only)

This is a Rule-3 auto-fix because it unblocked the baseline + after-state count comparisons that prove Supabase is untouched. The migration script itself never had this problem.

## Pending follow-ups (NOT blockers — for Phase 39-04 or Phase 41)

1. **Phase 39-04 smoke test** can now `admin-initiate-auth CUSTOM_AUTH` against `jm@techcloudpro.com` (the SES-verified user) to prove the magic-link flow end-to-end.
2. **Phase 41 cleanup** will:
   - Delete `backend/scripts/migrate-supabase-users-to-cognito.ts`
   - Delete `backend/scripts/README-cognito-migration.md`
   - Drop `@aws-sdk/client-cognito-identity-provider` from `backend/dependencies` (Phase 40 reads JWKS via HTTPS, not via this SDK)
   - Use the audit forward-link map (`custom:supabase_sub` → Supabase UUID) to confirm full coverage before deleting Supabase `auth.users` rows

## Downstream consumption guide

| Consumer | Reads | Action |
|---|---|---|
| Plan 39-04 smoke test | jm@techcloudpro.com (CONFIRMED in Cognito + SES-verified) | `aws cognito-idp admin-initiate-auth --auth-flow CUSTOM_AUTH --auth-parameters USERNAME=jm@techcloudpro.com` → expect Session returned → email lands → respond-to-auth-challenge with nonce → expect 3 tokens |
| Phase 40 dual-issuer middleware | `custom:role` JWT claim | When verifying Cognito JWT, read `custom:role` (admin/customer/driver/vendor) to gate role-protected routes — currently only admin users exist |
| Phase 41 cutover | `custom:supabase_sub` forward-link | Per-user, query Cognito for `custom:supabase_sub` → look up Supabase row by UUID → confirm match before deleting Supabase row |

## Commits

| Commit | Task | Summary |
|---|---|---|
| `85275a1` | Tasks 1+2 bundled | Author migration script + README + add Cognito SDK dep. Migration script ran across DRY_RUN + real + re-run — all 4 users created+verified, idempotent re-run produced 4 [skip-exists], Supabase untouched, Lambda backends untouched. |

Pushed to `github.com/jeet-avatar/turion-space-demo` `origin/main`: `ab28814..85275a1`.

Task 1 (author script) and Task 2 (run script + verify) are bundled into a single commit because Task 2 only ran the script and read AWS state — no new source files needed committing. The plan's Task 2 "commit" step references the same files Task 1 already committed; bundling avoids an empty commit.

## Self-Check: PASSED

- `[FOUND]` /Users/jeet/turion-space-demo/backend/scripts/migrate-supabase-users-to-cognito.ts
- `[FOUND]` /Users/jeet/turion-space-demo/backend/scripts/README-cognito-migration.md
- `[FOUND]` /Users/jeet/turion-space-demo/backend/package.json — contains @aws-sdk/client-cognito-identity-provider
- `[FOUND]` commit 85275a1 in github.com/jeet-avatar/turion-space-demo
- `[FOUND]` Cognito pool us-east-1_KQuNS85nP user count = 4 (verified via list-users)
- `[FOUND]` demo@zietra.com — CONFIRMED, admin role, supabase_sub=2919d215-..., admin group
- `[FOUND]` gteshnair@gmail.com — CONFIRMED, admin role, supabase_sub=b1ddd626-..., admin group
- `[FOUND]` jm@techcloudpro.com — CONFIRMED, admin role, supabase_sub=21235658-..., admin group
- `[FOUND]` jeetnair.in@gmail.com — CONFIRMED, admin role, supabase_sub=76d9f93b-..., admin group
- `[FOUND]` Supabase auth.users row count unchanged: 10 == 10
- `[FOUND]` Supabase auth.users max(updated_at) unchanged: 2026-05-14 01:52:06.747561+00
- `[FOUND]` Phase 38 regression intact: /api/health=200, /api/data/all=401
- `[FOUND]` turion-satellite-api Lambda code untouched (git status backend/src/ clean)
- `[FOUND]` turion-demo-api Lambda code untouched (HEAD commit has no backend/src/ files)
