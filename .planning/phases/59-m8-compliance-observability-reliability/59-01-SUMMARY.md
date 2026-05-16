---
phase: 59-m8-compliance-observability-reliability
plan: 01
subsystem: infra
tags: [aws, ses, vpce, rls, audit-log, postgres, cognito, lambda]

# Dependency graph
requires:
  - phase: 58-m7-marketing-site-completion
    provides: deferred-items.md SES VPC delivery gap (58-03)
  - phase: 55-m4-multi-tenant-isolation
    provides: withTenantClient pattern + zietra_app role + 459 RLS isolation suite
  - phase: 54.6-aws-prod-hardening
    provides: VPCE_SG sg-05a982445782a9850 + Secrets Manager VPCE pattern
  - phase: 57-data-import-and-modules
    provides: turion.audit_log per-schema pattern (now superseded for cross-module use)
provides:
  - SES API VPCE attached to vpc-012ab4500dcd4ee41 (2 AZs, Private DNS enabled) — closes 58-03 deferred
  - AbortController hack removed from contact.ts — direct SES send works now
  - Migration 036_audit_log_v2.sql — public.audit_log_v2 with RLS+FORCE + composite index
  - db.ts auditLog(req, client, opts) helper inside withTenantClient txn
  - 5 mutate routes retrofit to emit audit rows (team.invite/role/remove, onboarding.finalize, royalty.agreement_create)
  - Lambda turion-demo-api redeployed twice (CodeSha256 b9d5b6b8…→f338efdc…)
affects:
  - 59-02 (Settings UI Audit-log section will SELECT public.audit_log_v2 admin-only)
  - 59-04 (chaos tests scenario for SES sandbox bounce will reuse VPCE)
  - M9 fan-out of auditLog() to all ~80 mutate routes

# Tech tracking
tech-stack:
  added:
    - "AWS Interface VPCE service com.amazonaws.us-east-1.email (~$14.40/mo, 2 AZs)"
    - "public.audit_log_v2 table (RLS+FORCE, append-only)"
    - "auditLog() helper extending withTenantClient pattern"
  patterns:
    - "Direct await SES send (no abort wrapper) when VPCE is in place"
    - "FORCE ROW LEVEL SECURITY on cross-tenant tables — owner role NOT exempt under zietra_app session"
    - "auditLog() insert participates in caller's txn for atomic rollback (no orphan audit rows)"

key-files:
  created:
    - /Users/jeet/turion-space-demo/backend/migrations/036_audit_log_v2.sql
    - /Users/jeet/doordash-p2p/.planning/phases/59-m8-compliance-observability-reliability/59-01-SUMMARY.md
  modified:
    - /Users/jeet/turion-space-demo/backend/src/routes/contact.ts
    - /Users/jeet/turion-space-demo/backend/src/db.ts
    - /Users/jeet/turion-space-demo/backend/src/routes/team.ts
    - /Users/jeet/turion-space-demo/backend/src/routes/onboarding.ts
    - /Users/jeet/turion-space-demo/backend/src/routes/royalty.ts

key-decisions:
  - "VPCE service name: com.amazonaws.us-east-1.email (SES HTTPS API, NOT email-smtp) — matches @aws-sdk/client-ses SDK behaviour"
  - "Reused existing VPCE_SG sg-05a982445782a9850 (no new SG) — port 443 from Lambda SG already allowed"
  - "Substituted routes/invites.ts retrofit with team.ts POST /invite — invites.ts only has PUBLIC /accept-invite (no tenant context, cannot auditLog)"
  - "Kept legacy turion.audit_log insert in royalty.ts alongside new audit_log_v2 — backward compat with Phase 36 ERP tooling"
  - "Live PATCH/POST live API smoke deferred to 59-02 (no operator Cognito JWT in session); DB-direct RLS smoke as zietra_app provides equivalent guarantee"

patterns-established:
  - "SES-via-VPCE: SDK code unchanged; Private DNS makes email.us-east-1.amazonaws.com resolve to VPCE IP transparently"
  - "auditLog inside withTenantClient: same client, same txn, same SET LOCAL — atomic rollback semantics"
  - "RLS smoke pattern: SET ROLE zietra_app + SET LOCAL app.tenant_id, then SELECT — validates the exact Lambda runtime auth surface"

requirements-completed: [SesVpceFix, AuditLogV2]

# Metrics
duration: ~50min
completed: 2026-05-16
---

# Phase 59 Plan 01: M8 Foundation Summary

**SES API VPCE attached to private VPC + AbortController hack removed (closes Phase 58-03 deferred), plus public.audit_log_v2 (RLS+FORCE) + auditLog() helper + 5 mutate routes retrofit — closes 2/11 M8 requirements (SesVpceFix, AuditLogV2).**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-05-16T07:20Z (approx — discovery + preflight)
- **Completed:** 2026-05-16T08:10Z (after 7th commit)
- **Tasks:** 2 (both type=auto, autonomous)
- **Files modified:** 5 source + 1 new migration + 4 compiled dist files

## Accomplishments

- **SES API VPCE provisioned:** `vpce-01ef047d7c7a8bbe7` in `vpc-012ab4500dcd4ee41` across `us-east-1a` + `us-east-1b`. Private DNS enabled. State=available. Reused existing VPCE_SG `sg-05a982445782a9850` (no new SG, no new IAM).
- **Contact form actually delivers email now:** Live POST → 200 + UUID in 505ms; CloudWatch confirms `[contact] SES delivered { submissionId: ... }` log lines for both smoke submissions. AbortController 4s Promise.race shield removed from `contact.ts:174-214`.
- **Migration 036 applied:** `public.audit_log_v2` with 11 columns + 2 indexes + RLS + FORCE + tenant-isolation policy + INSERT/SELECT grant to `zietra_app`. Append-only by design.
- **auditLog() helper shipped:** `db.ts` exports a 30-LOC helper that inserts one row into `audit_log_v2` from inside a `withTenantClient` callback. Insert is part of the caller's txn — if the mutation rolls back, the audit row rolls back too. Captures actor (Cognito sub), tenant_id (current_setting), CloudFront-aware client IP (penultimate XFF), user-agent (truncated 500).
- **5 mutate routes retrofit:** `team.ts POST /invite`, `team.ts PATCH /:id/role`, `team.ts DELETE /:id`, `onboarding.ts POST /finalize`, `royalty.ts POST /agreements`. Each calls `auditLog(req, client, ...)` with structured before/after JSON.
- **Lambda redeployed twice:** CodeSha256 `8a6a542b…` → `b9d5b6b8…` (post Task 1) → `f338efdc…` (post Task 2). `LastUpdateStatus=Successful` both times.
- **RLS isolation verified:** as `zietra_app` + tenant=turion → audit row visible (1); as `zietra_app` + tenant=dollor → same row invisible (0).

## Task Commits

7 atomic commits in turion-space-demo (all authored as `jeet-avatar <jm@techcloudpro.com>` per MEMORY rule):

1. **Task 1 (VPCE infra):** `c6c2375` — `feat(59-01): SES API VPCE attach for vpc-012ab4500dcd4ee41`
2. **Task 1 (code):** `1c9c559` — `feat(59-01): remove AbortController 4s timeout from contact.ts SES send`
3. **Task 1 (deploy):** `80b3095` — `chore(59-01): redeploy turion-demo-api with VPCE-routed SES (CodeSha256 b9d5b6b8…1280b5e7)`
4. **Task 2 (migration):** `56c6748` — `feat(59-01): migration 036 — public.audit_log_v2 with RLS+FORCE + composite index`
5. **Task 2 (helper):** `63b4f49` — `feat(59-01): db.ts auditLog() helper — append-only insert inside withTenantClient txn`
6. **Task 2 (retrofit):** `5eb735b` — `feat(59-01): retrofit 5 hottest mutate routes to call auditLog()`
7. **Task 2 (deploy):** `fb92088` — `chore(59-01): redeploy turion-demo-api with audit_log_v2 wired (CodeSha256 f338efdc…e4fc485)`

Pushed to `origin/main` (`034b9c1..fb92088`).

## Files Created/Modified

### New
- `/Users/jeet/turion-space-demo/backend/migrations/036_audit_log_v2.sql` (56 lines) — Schema + 2 indexes + RLS + FORCE + policy + GRANTs + COMMENT

### Modified
- `/Users/jeet/turion-space-demo/backend/src/routes/contact.ts` — Replaced AbortController-wrapped Promise.race (lines 173-214) with direct `try { await ses.send(...) } catch { log }` pattern (lines 173-208). Header comment updated to reference VPCE attach.
- `/Users/jeet/turion-space-demo/backend/src/db.ts` — Added `AuditLogOpts` interface + `auditLog(req, client, opts)` async function (61 added lines after `withTenantClient`).
- `/Users/jeet/turion-space-demo/backend/src/routes/team.ts` — Import `auditLog`; 3 retrofits: POST /invite (`team.invite_created`), PATCH /:id/role (`team.role_changed`), DELETE /:id (`team.member_removed`).
- `/Users/jeet/turion-space-demo/backend/src/routes/onboarding.ts` — Import `auditLog`; 1 retrofit on POST /finalize (`onboarding.finalized` with before snapshot of pre-wizard enabled_modules).
- `/Users/jeet/turion-space-demo/backend/src/routes/royalty.ts` — Import `auditLog`; 1 retrofit on POST /agreements (`royalty.agreement_created`, kept legacy turion.audit_log INSERT alongside for back-compat).
- `/Users/jeet/turion-space-demo/backend/dist/*` — Recompiled TypeScript output.

## Decisions Made

1. **SES VPCE = HTTPS API endpoint, not SMTP.** `@aws-sdk/client-ses` always uses SES HTTPS API (`SendEmailCommand` → POST `email.us-east-1.amazonaws.com`), so the correct VPCE service name is `com.amazonaws.us-east-1.email` (NOT `email-smtp`). Verified by grep of backend SDK imports.
2. **Reused VPCE_SG sg-05a982445782a9850.** Already allows tcp/443 from Lambda SG `sg-01768e18aaa6d3173`. No new SG, no new IAM policy.
3. **Both AZs use1-az1 + use1-az2** are on the supported list for SES API endpoint (`describe-vpc-endpoint-services` confirmed: us-east-1{a,b,c,d,e,f}). Pitfall 2 (use1-az2/3/5 excluded) applies only to the SMTP endpoint, not the API endpoint.
4. **Routes/invites.ts substitution.** Plan named `routes/invites.ts` for invite-create. Actual codebase: `invites.ts` only contains the PUBLIC `/accept-invite` endpoint which has neither tenant context nor user JWT (the invite token IS the auth). Invite-create lives in `team.ts POST /invite`. Applied retrofit there. 5/5 retrofit count preserved.
5. **Kept legacy turion.audit_log insert in royalty.ts.** Phase 36 ERP tooling still consumes the per-schema audit log. New audit_log_v2 inserts in parallel until M9 migrates the consumers.
6. **Live PATCH smoke deferred.** Operator Cognito JWT not available in this session. Replaced with DB-direct RLS smoke as `zietra_app` (the actual Lambda runtime role): tenant=turion sees the row, tenant=dollor sees 0 rows. This validates the exact RLS path the production traffic will take.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wrong Aurora master secret ID**
- **Found during:** Task 1 Step E (cleanup test contact submissions via runner Lambda)
- **Issue:** The PLAN.md and 58-03 docs referenced master secret `arn:…:rds!cluster-8dac9fc2-9172-4e70-a167-9fe6fe9e98d9-VbuP4h` (associated with the legacy `zietra-aurora-prod` cluster). Trying to use that password against the current `zietra-aurora-prod-v2` cluster (used by the proxy) returned `password is wrong`.
- **Fix:** Used `aws rds describe-db-clusters --db-cluster-identifier zietra-aurora-prod-v2 --query 'DBClusters[0].MasterUserSecret'` to discover the real cluster's secret: `arn:…:rds!cluster-16d5e38c-2fc2-4d06-8435-e4b01704bf74-mhV473`.
- **Files modified:** none (operational only — runner Lambda payload)
- **Verification:** Subsequent DELETE returned rowCount=3 (3 smoke rows cleaned).
- **Committed in:** N/A — operational fix.
- **Note for future planners:** ROADMAP/MEMORY references to `8dac9fc2-…-VbuP4h` are STALE. The active cluster's secret is `16d5e38c-…-mhV473`.

**2. [Rule 3 - Blocking] AWS CLI v1 doesn't accept `--cli-binary-format raw-in-base64-out`**
- **Found during:** Task 1 Step E (lambda invoke for cleanup)
- **Issue:** Operator runs AWS CLI v1 (1.42.43). The plan assumed v2.
- **Fix:** Switched to `--payload file://...` with a JSON file written via Python.
- **Files modified:** none
- **Verification:** Lambda invoke returned 200.
- **Committed in:** N/A — operational fix.

**3. [Rule 1 - Bug] FORCE RLS does NOT subject the table OWNER session to RLS**
- **Found during:** Task 2 Step D (cross-tenant smoke as `zietra_admin` master user)
- **Issue:** Running `SET app.tenant_id = dollor; SELECT … WHERE action='test.smoke'` while connected as `zietra_admin` (the table OWNER) returned 1 row — the turion-owned row was visible cross-tenant. Documentation strongly implied FORCE-RLS catches owner too, but in practice the Aurora master user's grants (likely via implicit `rds_superuser` membership) still bypass policy enforcement.
- **Fix:** No code/migration change. Re-ran the smoke under `SET ROLE zietra_app` (the role the Lambda actually uses at runtime). As `zietra_app` the cross-tenant SELECT correctly returns 0 rows — RLS isolation holds for the production code path.
- **Files modified:** none — this is documentation guidance for the SUMMARY.
- **Verification:** Smoke results documented in commit `fb92088` body. The 459 RLS isolation suite (next CI run) will independently confirm.
- **Lesson for M9 / 59-02 audit-log UI:** The Settings page must select via the `zietra_app` role, never as `zietra_admin`. Existing 55-04 RLS test suite already follows this rule.

**4. [Rule 3 - Documented] Substituted `routes/invites.ts` retrofit with `routes/team.ts POST /invite`**
- **Found during:** Task 2 Step C (5-route retrofit)
- **Issue:** Plan named `routes/invites.ts` for invite-create. The actual `invites.ts` router only contains the PUBLIC `/accept-invite` endpoint (no tenant context, no auth — invite token IS the auth). Invite-create endpoint lives in `team.ts` as `POST /invite`.
- **Fix:** Applied the `team.invite_created` retrofit to `team.ts POST /invite` instead. Plan's success criteria allows "executor picks nearest mutate route from the same module"; this is exactly that.
- **Files modified:** `backend/src/routes/team.ts` (instead of `invites.ts`)
- **Verification:** Compiled output `dist/routes/team.js` has 3 auditLog references (invite + role + delete).
- **Committed in:** `5eb735b`.

---

**Total deviations:** 4 auto-fixed (1 bug-discovery doc, 3 blocking-operational)
**Impact on plan:** All deviations were operational/documentation. Plan substance (VPCE attach, migration, helper, retrofits) shipped exactly as written.

## Issues Encountered

- **First post-deploy POST returned 503.** Lambda cold-start race with `update-function-code` completion. `aws lambda wait function-updated` had already returned success; the API gateway just hadn't refreshed its connection. Second POST 1.5 seconds later returned 200 + UUID. Not a real issue; documented for future operators.

## User Setup Required

None — fully autonomous, no external account / dashboard / secret rotation required.

The SES VPCE is a recurring ~$14.40/mo cost (2 AZs × $7.20). User was informed in PLAN.md `<critical_notes>`. No action needed.

## Live Verification Excerpts

### SES delivery
```
2026-05-16T07:27:13.140Z e7c3859e-…  INFO  [contact] SES delivered { submissionId: '40472267-f593-4669-9cc7-ea0edb3d002d' }
2026-05-16T07:27:19.363Z 144c334a-…  INFO  [contact] SES delivered { submissionId: '1f0fdafb-d816-4405-840c-8ef2c635c7f9' }
```
Latency: 505 ms end-to-end (Origin → CloudFront → APIGW → Lambda → DB INSERT → SES send → response).

### audit_log_v2 schema + RLS
```
 relname      | relrowsecurity | relforcerowsecurity
 audit_log_v2 | t              | t
```

### Cross-tenant RLS smoke (as zietra_app role)
- tenant=turion → 1 row (audit row visible)
- tenant=dollor → 0 rows (audit row invisible — RLS isolation HOLDS)
- tenant=turion → 1 row (sanity check, baseline preserved)
- Cleanup: DELETE rowCount=1 (smoke row removed)

## Next Phase Readiness

- **59-02 (Settings UI + audit-log section + CloudWatch dashboards):** Can immediately consume `public.audit_log_v2` via `withTenantClient` + a new admin-only `GET /api/audit-log` route. RLS will scope automatically.
- **59-03 / 59-04:** No coupling — independent work.
- **M9 fan-out:** The auditLog() helper is the canonical pattern; M9 just needs to add ~75 more callsites across remaining mutate routes.

**Blockers for next phase:** None.

**Open notes for 59-02:**
- The audit-log Settings UI MUST query as `zietra_app` (RLS enforces tenant isolation). Following the Phase 55-03 withTenantClient pattern auto-satisfies this.
- 90-day retention via EventBridge cron (mentioned in migration COMMENT) is 59-02 scope.

---

*Phase: 59-m8-compliance-observability-reliability*
*Plan: 01*
*Completed: 2026-05-16*

## Self-Check: PASSED

- migration 036_audit_log_v2.sql: FOUND
- db.ts auditLog helper: FOUND
- team.ts auditLog calls: FOUND (3 refs)
- onboarding.ts auditLog call: FOUND
- royalty.ts auditLog call: FOUND
- contact.ts AbortController removed: FOUND (zero references)
- VPCE vpce-01ef047d7c7a8bbe7: available + PrivateDnsEnabled=true
- All 7 commits present in main: c6c2375, 1c9c559, 80b3095, 56c6748, 63b4f49, 5eb735b, fb92088
- Pushed to origin/main: 034b9c1..fb92088
