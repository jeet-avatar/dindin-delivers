---
phase: 06-ssl-pinning-rotation-fix
plan: 02
subsystem: infra
tags: [terraform, cloudwatch, acm, ssl-pinning, runbook]

# Dependency graph
requires:
  - phase: 06-ssl-pinning-rotation-fix/01
    provides: Root-only SPKI pins in NetworkSecurity.swift and TestFlight builds
provides:
  - CloudWatch alarms for ACM certificate DaysToExpiry (30-day warning + 7-day critical)
  - SSL pinning rotation runbook with pin extraction commands and emergency procedures
  - CLAUDE.md quick reference for SSL rotation
affects: [infrastructure, monitoring, operations]

# Tech tracking
tech-stack:
  added: [aws_cloudwatch_metric_alarm for ACM DaysToExpiry]
  patterns: [conditional alarm creation via count, 86400 period for daily metrics, treat_missing_data notBreaching]

key-files:
  created:
    - .planning/runbooks/ssl-pinning-rotation.md
  modified:
    - infrastructure/terraform/modules/cloudwatch/main.tf
    - infrastructure/terraform/modules/cloudwatch/variables.tf
    - infrastructure/terraform/main.tf
    - CLAUDE.md

key-decisions:
  - "Use existing SNS topic for ACM alarms (same as EKS/RDS alerts, sends to production-alerts@dollor.ai)"
  - "Conditional alarm creation (count) so environments without ACM ARN skip alarm"
  - "ok_actions on critical alarm only (sends recovery notification when cert is renewed)"

patterns-established:
  - "ACM certificate monitoring: 86400 period + Minimum statistic + notBreaching for twice-daily metric"
  - "Runbook location: .planning/runbooks/ for operational procedures"

requirements-completed: [SSL-03, SSL-04]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 06 Plan 02: CloudWatch ACM Alarms + Rotation Runbook Summary

**Terraform CloudWatch alarms for 30-day and 7-day ACM certificate expiry monitoring, plus detailed SSL pinning rotation runbook with emergency procedures**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T03:37:40Z
- **Completed:** 2026-02-27T03:40:46Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Two CloudWatch metric alarms for ACM DaysToExpiry: 30-day warning threshold and 7-day critical threshold with recovery notification
- Comprehensive rotation runbook covering happy path (proactive update), emergency fix (pins broken), alarm response procedures, and pin extraction commands
- CLAUDE.md updated with SSL Pinning Rotation quick reference section

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CloudWatch ACM certificate expiry alarms to Terraform** - `d5d4cec9` (feat)
2. **Task 2: Write SSL pinning rotation runbook and add CLAUDE.md summary** - `0ab956dd` (docs)

## Files Created/Modified
- `infrastructure/terraform/modules/cloudwatch/main.tf` - Two new CloudWatch alarms: acm_expiry_warning (30-day) and acm_expiry_critical (7-day)
- `infrastructure/terraform/modules/cloudwatch/variables.tf` - New acm_certificate_arn variable with empty string default
- `infrastructure/terraform/main.tf` - ACM ARN passed to cloudwatch module
- `.planning/runbooks/ssl-pinning-rotation.md` - Detailed runbook with 5 root CA hashes, extraction commands, happy path, emergency fix, alarm response
- `CLAUDE.md` - SSL Pinning Rotation section added after Network Security audit section

## Decisions Made
- Used existing SNS topic (`dollor-${environment}-alarms`) for ACM alerts rather than creating a separate alerting path -- keeps all infrastructure alerts in one channel
- Added `ok_actions` only to the critical (7-day) alarm so operators get recovery confirmation when auto-renewal succeeds
- Hardcoded ACM ARN in root module since the certificate was created via AWS Console (not Terraform-managed) and the ARN is stable
- Conditional alarm creation via `count` so the module does not break environments that do not pass `acm_certificate_arn`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Xcode license agreement not accepted blocked `git` commands (macOS `git` is an Xcode shim). Resolved by setting `DEVELOPER_DIR=/Library/Developer/CommandLineTools` to bypass Xcode and use CommandLineTools git instead.

## User Setup Required

None - no external service configuration required. The Terraform changes are ready for `terraform apply` but should be applied via CI/CD or operator action.

## Next Phase Readiness
- Phase 06 (SSL Pinning Rotation Fix) is fully complete across both plans
- Plan 01 covers the iOS pin migration and TestFlight builds
- Plan 02 (this plan) covers monitoring and documentation
- CloudWatch alarms ready for `terraform apply` to activate monitoring
- Runbook ready for operational use

---
*Phase: 06-ssl-pinning-rotation-fix*
*Completed: 2026-02-27*
