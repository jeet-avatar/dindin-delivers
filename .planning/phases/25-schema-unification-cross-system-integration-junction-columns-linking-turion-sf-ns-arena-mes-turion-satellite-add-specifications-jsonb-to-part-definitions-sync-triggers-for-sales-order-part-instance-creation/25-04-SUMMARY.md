---
phase: 25-schema-unification
plan: 04
subsystem: deploy
tags: [aws-lambda, ecr, docker, deploy, smoke-test, turion-satellite, integration-endpoints, cross-schema]

# Dependency graph
requires:
  - phase: 25-schema-unification
    plan: 03
    provides: 42 new vitest cases locking the contract on all 4 sync endpoints + GET /api/parts/:id specifications
  - phase: 25-schema-unification
    plan: 02
    provides: 4 POST /api/integration/* sync endpoints + GET /api/parts/:id surfacing specifications JSONB
  - phase: 25-schema-unification
    plan: 01
    provides: 3 SQL migrations (cross-schema FKs, specifications JSONB, audit_log expansion)
provides:
  - "Lambda turion-satellite-api running new image (CodeSha256 = c6f3dd1de5769e9700afbb90384cc385ff3d0d547d91d222ab6d3e55a2fb8f36)"
  - "Live /api/integration/* endpoints (all 4 sync routes mounted and gated by requireAuth on production API Gateway)"
  - "Live /api/parts/:id endpoint surfacing specifications JSONB field"
  - "Smoke proof: 4/4 sync endpoints + parts endpoint return 401 with hardened error body {\"error\":\"Missing authorization token\"} (no detail leak)"
  - "Smoke proof: 3 production migrations intact post-deploy (6 FK constraints, specifications jsonb, audit_log entity_id text)"
affects: [26-data-densification, 28-ui-overhaul]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre/post Lambda CodeSha256 capture to prove image swap (defense against :latest tag race)"
    - "401-gate smoke test as deploy verification: 4 endpoints x curl-no-bearer = 4 x HTTP 401 + identical hardened error body"
    - "Migration sanity-recheck post-deploy: re-introspect pg_constraint + information_schema to confirm Phase 25-01 migrations are still in place (proves rollback didn't regress)"
    - "Pre-call audit_log baseline (count=0 for action LIKE 'sync_%') before any sync calls — Phase 26 densification will measure delta from this"

key-files:
  created:
    - "/Users/jeet/doordash-p2p/.planning/phases/25-schema-unification-cross-system-integration-junction-columns-linking-turion-sf-ns-arena-mes-turion-satellite-add-specifications-jsonb-to-part-definitions-sync-triggers-for-sales-order-part-instance-creation/25-04-SUMMARY.md"
  modified: []

key-decisions:
  - "Followed the standard build-and-push.sh path (npm run build → docker build arm64 → ECR push :latest → aws lambda update-function-code). CodeSha256 changed first try; no need for the documented digest workaround from quick-333."
  - "Skipped Path A (authenticated curl with Bearer) in autonomous flow — token capture requires browser session. The human-verify checkpoint covers the authenticated path."
  - "Recorded pre-deploy audit_log sync_* count (0) as the zero baseline for Phase 26 densification monitoring."

patterns-established:
  - "Phase deploy verification flow: pre-SHA capture → build-and-push → post-SHA confirm changed → /api/health 200 → 401 gate smoke on every new endpoint → DB migration sanity recheck → pre-call audit baseline"

requirements-completed: [Linkage, Sync, Specifications, Mutation]

# Metrics
duration: 2 min
completed: 2026-05-10
---

# Phase 25 Plan 04: Deploy + Smoke Verification Summary

**Lambda turion-satellite-api redeployed with Phase 25 code; CodeSha256 changed (571068be → c6f3dd1d); all 4 new sync endpoints + GET /api/parts/:id return 401 with hardened error body on live production API. Migrations 008/009/010 confirmed intact post-deploy. Pre-call audit_log sync baseline is 0. Human-verify checkpoint pending.**

## Performance

- **Duration:** ~2 min (autonomous tasks 1+2; Task 3 commit included; Task 4 awaiting human approval)
- **Started:** 2026-05-10T21:32:02Z
- **Tasks 1+2+3 completed:** 2026-05-10T21:33:47Z
- **Task 4:** Awaiting human verification

## Accomplishments

- Lambda turion-satellite-api code swapped (new CodeSha256, State=Active, LastUpdateStatus=Successful)
- /api/health returns 200 post-deploy with schema=turion_satellite
- All 4 new sync endpoints (sync-sales-order, sync-ns-invoice, sync-arena-doc, sync-mes-work-order) return `HTTP 401 {"error":"Missing authorization token"}` without Bearer — auth gate proven live, no detail leak
- GET /api/parts/:id also returns 401 without Bearer (same hardened error contract)
- Production DB migrations 008/009/010 confirmed intact post-deploy:
  - 6 cross-schema FK constraints (fk_pi_sales_order, fk_pi_ns_invoice, fk_pi_arena_doc, fk_pi_mes_work_order, fk_vo_ns_invoice, fk_pr_sales_order)
  - part_definitions.specifications: jsonb
  - audit_log.entity_id: text
- Sample part_definitions all carry specifications = `{}` default (migration 009 NOT NULL DEFAULT '{}'::jsonb in effect)
- 3 source rows confirmed present in each of turion.{sales_orders, invoices, arena_docs, work_orders} for downstream Phase 26
- Pre-call audit_log sync_* count = 0 (clean baseline for Phase 26 densification deltas)

## Lambda Deploy Evidence

| Field | Value |
|---|---|
| Pre-deploy CodeSha256 | `571068be58a6d33965d86d47cad1f11e33ac033a012780a785e0df5d2c40bbe8` |
| Post-deploy CodeSha256 | `c6f3dd1de5769e9700afbb90384cc385ff3d0d547d91d222ab6d3e55a2fb8f36` |
| State | Active |
| LastUpdateStatus | Successful |
| LastModified | 2026-05-10T21:32:29Z |
| Image digest (ECR) | `sha256:c6f3dd1de5769e9700afbb90384cc385ff3d0d547d91d222ab6d3e55a2fb8f36` |
| Architecture | arm64 |

## Smoke Test Results

### 401 gate (all 4 new sync endpoints + parts)

| Method + Path | HTTP | Body |
|---|---|---|
| POST /api/integration/sync-sales-order/SO-2026-0501 | 401 | `{"error":"Missing authorization token"}` |
| POST /api/integration/sync-ns-invoice/INV-2025-04-002 | 401 | `{"error":"Missing authorization token"}` |
| POST /api/integration/sync-arena-doc | 401 | `{"error":"Missing authorization token"}` |
| POST /api/integration/sync-mes-work-order | 401 | `{"error":"Missing authorization token"}` |
| GET /api/parts/9e3dae95-6b95-4866-a15c-a88e69f381c8 | 401 | `{"error":"Missing authorization token"}` |
| GET /api/health | 200 | `{"db":"ok","schema":"turion_satellite","latency_ms":192,"timestamp":"..."}` |

### DB migration sanity recheck (post-deploy)

```
fk_count: 6
part_definitions.specifications data_type: jsonb
audit_log.entity_id data_type: text
turion.sales_orders sample: SO-2022-0998, SO-2024-0214, SO-2026-0341
turion.invoices sample: INV-2025-04-002, INV-2025-09-006, INV-2025-12-008
turion.arena_docs sample: 5318-A · Bus integ GA, 5318-T · Thermal layout, EVMS milestone tracker
turion.work_orders sample: WO-2027-001, WO-2027-001-001, WO-2027-001-002
turion_satellite.audit_log sync_* count (pre-call): 0
```

### Sample specifications field state

```
                  id                  | part_number | specifications
--------------------------------------+-------------+----------------
 9e3dae95-6b95-4866-a15c-a88e69f381c8 | EPS-ASSY    | {}
 58ddf542-1500-475e-ad6f-efdbdd76a771 | ADCS-ASSY   | {}
 339b249c-bd9f-45c8-a1f3-ec95ae448b7f | CDH-ASSY    | {}
```

All part_definitions have `{}` default (migration 009 NOT NULL DEFAULT in effect). Phase 26 populates these.

## Task Commits

| Task | Commit | Notes |
|---|---|---|
| 1: Pre-SHA capture + build-and-push + post-SHA confirm + /api/health 200 | n/a (deployment orchestration; no source code changes) | Lambda CodeSha256 changed; Docker image pushed to ECR with digest c6f3dd1d |
| 2: 401 gate smoke + DB migration recheck + pre-call audit baseline | n/a (verification-only; no source code changes) | All checks pass |
| 3: GSD planning artifacts commit | (this dindin commit) | Includes 25-04-SUMMARY.md + STATE.md + ROADMAP.md updates |
| 4: Human-verify checkpoint | n/a — awaiting human approval | See `<how-to-verify>` section in 25-04-PLAN.md |

## Files Created

- `/Users/jeet/doordash-p2p/.planning/phases/.../25-04-SUMMARY.md` — this file

## Files Modified

- `/Users/jeet/doordash-p2p/.planning/STATE.md` — current position advanced to Plan 4/4
- `/Users/jeet/doordash-p2p/.planning/ROADMAP.md` — Phase 25 progress updated

## Decisions Made

- **Used standard build-and-push.sh path** — pre-SHA `571068be...` → post-SHA `c6f3dd1d...` first try, no need for the documented digest fallback workaround from quick-333. The :latest tag race did not manifest this run.
- **Skipped Path A authenticated curl** — autonomous flow has no Bearer; full authenticated end-to-end (200 with `{matches:0, reason:'no_line_items'}` shape + audit_log row landing) is exercised in the human-verify checkpoint by the user running the in-browser `fetch()` snippet against their Supabase session.
- **Recorded pre-call audit_log sync_* baseline = 0** — establishes the zero baseline for Phase 26 densification monitoring. Phase 26 densification scripts will write `INSERT INTO turion_satellite.audit_log` rows with action LIKE 'sync_%' and the delta from this baseline becomes a monitoring signal.

## Deviations from Plan

None — plan executed exactly as written for Tasks 1+2+3. Every `<verify>` block passed first try:

- Task 1: `/tmp/p25-deploy.log` contains pre+post CodeSha256 (`571068be` ≠ `c6f3dd1d`), Lambda State=Active LastUpdateStatus=Successful, /api/health returns 200 with `{"db":"ok","schema":"turion_satellite"}`.
- Task 2: `/tmp/p25-smoke-401.log` grep count `HTTP 401` = 4 (one per endpoint), all bodies are identical hardened-error `{"error":"Missing authorization token"}` with no `detail:` leak; `/tmp/p25-smoke-db.log` confirms fk_count=6, specifications jsonb, entity_id text, and pre-call audit baseline = 0.
- Task 3: this SUMMARY + STATE.md + ROADMAP.md committed to dindin.
- Task 4: HUMAN-VERIFY CHECKPOINT PENDING.

**Total deviations:** 0
**Impact on plan:** None — plan was already complete and accurate.

## Authentication Gates

None — all AWS credentials worked first try (Lambda update, ECR push, Secrets Manager read).

## Issues Encountered

None — deploy was clean, no :latest tag race, no DB connection issues.

## Verification Proof

Per CLAUDE.md Verification Protocol (mandatory):

- **Grep proof:** Both pre (`571068be58a6d33965d86d47cad1f11e33ac033a012780a785e0df5d2c40bbe8`) and post (`c6f3dd1de5769e9700afbb90384cc385ff3d0d547d91d222ab6d3e55a2fb8f36`) SHA values present in `/tmp/p25-deploy.log` and differ. `grep -c "HTTP 401" /tmp/p25-smoke-401.log` returns 4.
- **Run proof (Lambda):** `aws lambda get-function-configuration --function-name turion-satellite-api --region us-east-1` shows State=Active, LastUpdateStatus=Successful, CodeSha256=c6f3dd1d... (post-deploy), LastModified=2026-05-10T21:32:29Z.
- **Run proof (live API):** 5 curl invocations against `https://rjydekliee.execute-api.us-east-1.amazonaws.com` (4 sync endpoints + 1 parts) all return HTTP 401 with identical hardened error body `{"error":"Missing authorization token"}`. /api/health returns HTTP 200 with `{"db":"ok","schema":"turion_satellite","latency_ms":192,"timestamp":"2026-05-10T21:32:55.414Z"}`.
- **Run proof (DB):** psql against production Supabase returns 6 cross-schema FK constraints, specifications jsonb, audit_log entity_id text, 3+ sample rows per legacy table, 0 sync_* audit_log rows.
- **E2E proof:** Authenticated end-to-end (Bearer token → 200 response with shape + audit_log row landing) is deferred to the human-verify checkpoint (browser fetch from Supabase session) — autonomous flow does not have Bearer.

## User Setup Required

None — all changes are server-side. The human checkpoint requires the user to be logged into https://turionspace.zietra.com/satellite/ in their browser, which is the established demo session.

## Next Phase Readiness

**Phase 26 (data densification) is unblocked once human checkpoint passes:**
- 4 sync endpoints live on the deployed Lambda — Phase 26 densification scripts can call them.
- Pre-call audit_log sync_* baseline is 0 — densification monitoring has a clean zero point.
- All 6 cross-schema FK columns + specifications JSONB column are populated/ready to be written by sync calls.

**Phase 28 (UI overhaul) is unblocked once Phase 26 ships:**
- GET /api/parts/:id now surfaces `specifications` JSONB — Phase 28 frontend can import `backend/src/lib/spec-keys.ts` for friendly label rendering.

**No blockers.** Lambda is live with new code, schema is correct, 401 contract is enforced, and the only remaining step is the human-verify of authenticated end-to-end behavior.

---

*Phase: 25-schema-unification-cross-system-integration*
*Completed: 2026-05-10 (autonomous portion); human-verify checkpoint pending*

## Self-Check: PASSED (autonomous portion)

- SUMMARY.md exists at expected path
- Lambda turion-satellite-api CodeSha256 changed (`571068be58a6d33965d86d47cad1f11e33ac033a012780a785e0df5d2c40bbe8` -> `c6f3dd1de5769e9700afbb90384cc385ff3d0d547d91d222ab6d3e55a2fb8f36`)
- Lambda State=Active, LastUpdateStatus=Successful
- /api/health returns 200 with schema=turion_satellite
- 4/4 new sync endpoints return HTTP 401 with hardened error body (no detail leak)
- GET /api/parts/:id returns HTTP 401 with same hardened error body
- 6 cross-schema FK constraints intact in pg_constraint
- part_definitions.specifications is jsonb
- audit_log.entity_id is text
- Pre-call audit_log sync_* count = 0 (clean baseline)
- origin/main..HEAD empty on turion-satellite (all Phase 25 commits pushed)
- HUMAN-VERIFY CHECKPOINT (Task 4) PENDING — user must run 5-step verification in browser/psql per 25-04-PLAN.md `<how-to-verify>` block
