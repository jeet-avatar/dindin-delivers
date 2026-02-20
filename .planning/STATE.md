# GSD Project State

**Project**: Dollor.ai Platform
**Status**: Active — Phase 04 COMPLETE, Documentation Overhaul finished
**Last activity**: 2026-02-20 — Phase 04 Plan 02 COMPLETE (GROUND_TRUTH line refs + API docs + QA KB + TIER2)

## Current Phase: 04 — Documentation Overhaul

### Status: COMPLETE (Plan 2/2)
- Plan 01 COMPLETE: Fixed 6 wrong facts in CLAUDE.md, added security/iOS docs, updated xcconfig
- Plan 02 COMPLETE: Re-verified 50+ GROUND_TRUTH line refs, fixed staging URLs in 3 files, updated API auth, fixed TIER2 module names
- Summaries: `.planning/phases/04-docs-overhaul/04-01-SUMMARY.md`, `.planning/phases/04-docs-overhaul/04-02-SUMMARY.md`

### Decisions
- Used em-dashes in CLAUDE.md tables instead of unicode for compatibility
- Preserved Phase 03.1's API Endpoint Verification section unchanged
- Did not modify Android build commands (verified correct as-is)
- Used grep to verify every GROUND_TRUTH line reference individually (non-uniform shifts)
- Corrected Stripe endpoint paths (create-account -> connect) found during verification
- Removed /api/rides/estimate from deprecated list (still active)

## Previous Phases
- **Phase 03.1: Endpoint Validation Guardrails** — COMPLETE (2026-02-20)
  - Fixed phantom `/api/vendors/featured`, created API registry, added CLAUDE.md guardrails
  - Summary: `.planning/phases/03.1-endpoint-validation-guardrails/03.1-01-SUMMARY.md`
- **Phase 03: Deploy Security Auth** — COMPLETE (2026-02-20)
  - Staging: `dollor-api-staging:31` (1/1 HEALTHY), 19/19 smoke tests
  - Production: `dollor-api:372` (2/2 HEALTHY), 9/9 smoke tests
  - CI/CD: run `22217682847` — all 4 jobs passed
  - Added CLAUDE.md rule #5: CI/CD mandatory for deployments
  - Summary: `.planning/phases/03-deploy-security-auth/03-02-SUMMARY.md`
- **Phase 02: Security Auth Fix** — CODE COMPLETE (2026-02-20)
  - 170+ endpoints secured with defense-in-depth auth
  - Summary: `.planning/phases/02-security-auth-fix/02-SUMMARY.md`
- **Phase 01: Unit Test Fixes** — COMPLETE (2026-02-20)
  - 1,002/1,002 tests pass
- **Phase 00: API Standardization** — paused at task 2/4

## Roadmap Evolution
- Phase 03 COMPLETE — staging + production deployed
- Phase 03.1 COMPLETE — endpoint guardrails, API registry, CLAUDE.md rules
- Phase 04 COMPLETE — All docs updated (CLAUDE.md, GROUND_TRUTH, API_ENDPOINTS, QA KB, TIER2, xcconfig)

## Quick Reference
- Production API: `https://api.dollor.ai`
- Staging API: `https://d34u5ixl0bulv4.cloudfront.net`
- Staging task-def: `dollor-api-staging:31`
- ECR: `134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api`
- ECS cluster: `dollor-production`
