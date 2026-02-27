# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** Drivers keep 100% of delivery fees and tips
**Current focus:** v1.5 Production Readiness -- Phase 07 in progress

## Current Position

Phase: 07 of 09 (Play Store Publishing)
Plan: 1 of 3 in current phase
Status: Phase 07 Plan 01 complete
Last activity: 2026-02-27 -- Phase 07 Plan 01 complete (AABs built, store assets prepared)

Progress: [###░░░░░░░] 37% (3/8 plans)

## Completed Milestones

- **v1.0** Production Release -- shipped pre-2026-02-20
- **v1.1** Security Hardening + Stability -- shipped 2026-02-20
- **v1.2** App Store Ready -- shipped 2026-02-21
- **v1.3** Platform Hardening -- shipped 2026-02-22
- **v1.4** App Store Distribution -- shipped 2026-02-26

## Performance Metrics

**Velocity (v1.4):**
- Total phases: 5
- Total plans: 12
- Quick tasks: 53

**v1.5 Execution:**
- Total plans: 8 (across 4 phases)
- Completed: 3

## Accumulated Context

### Decisions

- Use existing SNS topic for ACM cert expiry alarms (same channel as EKS/RDS alerts)
- Conditional CloudWatch alarm creation via count so module does not break environments without ACM ARN
- ok_actions on critical alarm only to confirm renewal recovery
- Runbook stored in .planning/runbooks/ for operational procedures
- SSL leaf pin is a ticking time bomb -- ACM now renews every 198 days, next renewal breaks all 182 iOS API calls
- Play Store and DB rotation are independent domains -- can parallel if needed
- E2E testing comes last to validate infrastructure changes from earlier phases
- Real-device testing deferred to future milestone -- backend API E2E covers business logic
- Client-side secret caching rejected -- ECS force-redeployment sufficient for 30-day rotation
- Pin all 5 Amazon Trust Services root CAs (not just the one in chain) for resilience against AWS chain changes
- Root CA keys are permanent -- leaf/intermediate pins removed entirely to prevent ACM renewal breakage
- ImageMagick for alpha stripping (sips fails with error 13 on hasAlpha property)
- Proceed with AAB build despite pk_test_ Stripe key -- user must update to pk_live_ before Play Store submission
- No ACCESS_BACKGROUND_LOCATION in any Android app -- foreground-only location simplifies Data Safety
- Firebase Analytics/Crashlytics not included despite being in version catalog -- accurately reported as absent

### Blockers

- ACM certificate expiry date unknown -- need to check AWS Console to determine SSL fix urgency
- Google Play Developer account status unknown -- org account creation may require D-U-N-S number (up to 30 days)

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 07-01-PLAN.md (AABs built, store listings + Data Safety created)
Resume file: None
