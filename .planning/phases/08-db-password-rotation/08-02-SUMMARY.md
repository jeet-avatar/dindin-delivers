---
phase: 08-db-password-rotation
plan: "02"
subsystem: infrastructure
tags: [rotation, lambda, secrets-manager, ecs, rds, cloudwatch, eventbridge, pg8000]

requires:
  - phase: 08-01
    provides: "Rotation Lambda code, ECS redeployment Lambda, staging validation"
provides:
  - "Production DB rotation on 30-day auto-schedule"
  - "CloudWatch alarm for rotation failures"
  - "ECS redeployment Lambda targeting both staging and production"
  - "Rotation runbook with monitoring, rollback, and shared-user warning"
affects:
  - "All ECS deployments (production and staging) — password changes affect both environments"

tech-stack:
  added: []
  patterns:
    - "EventBridge EndRotation -> Lambda -> ECS forceNewDeployment (production)"
    - "Shared RDS user cross-environment sync protocol"

key-files:
  created:
    - .planning/runbooks/db-rotation.md
  modified:
    - infrastructure/lambda/ecs-redeployment/redeployment_function.py

key-decisions:
  - "pg8000 (pure Python) instead of psycopg2 — no Lambda layer needed"
  - "Manual ECS force-redeploy is the proven recovery path; EventBridge auto-redeployment may not fire reliably"
  - "Shared dolloradmin user requires cross-environment secret sync after any rotation — documented as critical runbook warning"
  - "Recommended future fix: separate RDS users per environment for independent rotation"

patterns-established:
  - "After any DB rotation, immediately sync the other environment's Secrets Manager secret"

requirements-completed: [DBROT-04, DBROT-05]

duration: 20min
completed: 2026-03-27
---

# Phase 08 Plan 02: Production DB Rotation + Runbook Summary

**Production 30-day auto-rotation enabled, CloudWatch alarm active, runbook with critical shared-user warning and cross-environment sync protocol**

## Performance

- **Duration:** 20 min (continuation from checkpoint)
- **Started:** 2026-03-27 (continued from Task 1 + checkpoint)
- **Completed:** 2026-03-27
- **Tasks:** 3 (1 auto + 1 checkpoint + 1 auto)
- **Files modified:** 2

## Accomplishments

- Production secret `dollor/production/database-v2-gd1oKf` on 30-day auto-rotation schedule with Lambda `dollor-db-rotation`
- Full production rotation cycle verified: Lambda 4-step complete, ECS redeployed, health 200
- CloudWatch alarm `dollor-db-rotation-failure` active for rotation error monitoring
- ECS redeployment Lambda updated to route staging vs production rotations to correct services
- Comprehensive runbook documenting the critical discovery that staging and production share the same RDS user

## Task Commits

Each task was committed atomically:

1. **Task 1: Deploy production rotation Lambda, update redeployment Lambda, wire EventBridge** - `ffe77637` (feat)
2. **Checkpoint: Production rotation verification** - manual validation, no commit
3. **Task 2: Write rotation runbook** - `3babc12d` (docs)

## Files Created/Modified

- `.planning/runbooks/db-rotation.md` - Rotation runbook with 6 sections: overview, monitoring, alarm response, rollback, manual rotation, Lambda reference
- `infrastructure/lambda/ecs-redeployment/redeployment_function.py` - Updated to route staging/production rotations to correct ECS services

## Decisions Made

- **pg8000 over psycopg2:** Pure Python driver eliminates need for Lambda layers with compiled C extensions. Works identically for ALTER USER and SELECT 1 operations.
- **Manual redeploy as primary recovery:** EventBridge auto-redeployment rule exists but was not observed to fire reliably during production rotation. Manual `aws ecs update-service --force-new-deployment` is the proven path and is documented as the primary recovery step in the runbook.
- **Shared user documentation priority:** The discovery that staging and production share `dolloradmin` on the same RDS instance was the most critical finding. Rotating one environment's secret changes the RDS password for both. The runbook prominently warns about this and provides the exact cross-environment sync commands.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Discovered shared RDS user breaks cross-environment rotation**
- **Found during:** Checkpoint (production rotation verification)
- **Issue:** Staging rotation changed the RDS password for `dolloradmin`, which is shared with production. Production secret still held the old password, causing connection failures.
- **Fix:** Updated production secret with new password from staging rotation, force-redeployed ECS. Documented cross-environment sync protocol in runbook.
- **Files modified:** `.planning/runbooks/db-rotation.md` (Section 1 critical warning)
- **Verification:** Both `api.dollor.ai/health` and staging returned 200 after sync.
- **Committed in:** 3babc12d (part of runbook)

---

**Total deviations:** 1 auto-fixed (1 bug — shared user discovery)
**Impact on plan:** Discovery was critical and directly informed the runbook content. The plan's Section 2 (setSecret troubleshooting) was enhanced with shared-user context. No scope creep.

## Issues Encountered

- **Staging rotation broke production:** The initial staging rotation (08-01) changed the RDS password at the database level. When production rotation was later triggered, production was already using a stale password. This was resolved by syncing secrets and is now permanently documented in the runbook.
- **EventBridge unreliability:** The EventBridge rule for auto-redeploying ECS after rotation did not fire during the observed production rotation. Manual ECS force-redeploy was required. The runbook documents this as the expected recovery path.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 08 (DB Password Rotation) is fully complete: staging (08-01) and production (08-02) both rotating on 30-day schedules
- **Action item for future sprint:** Create separate RDS users (`dolloradmin_staging`, `dolloradmin_prod`) to eliminate the cross-environment sync requirement
- Runbook is operational at `.planning/runbooks/db-rotation.md`

---
*Phase: 08-db-password-rotation*
*Completed: 2026-03-27*
