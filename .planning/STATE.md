# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** Drivers keep 100% of delivery fees and tips
**Current focus:** v1.5 Production Readiness -- Phase 07 in progress

## Current Position

Phase: 07 of 09 (Play Store Publishing)
Plan: 1 of 3 in current phase
Status: Phase 07 Plan 01 complete
Last activity: 2026-03-02 - Completed quick task 56: Audit and fix route collisions, duplicate routes, dead endpoint constants

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
- [Phase quick-55]: Use www.dollor.ai canonical domain for all user-facing URLs (avoids 301 redirect from bare domain)
- [Phase quick-55]: Convert vanity phone +1-800-DOLLOR to numeric +1-800-365-5671 for iOS tel: scheme compatibility
- [Phase quick-56]: Path aliases use multi-decorator on original handler, not separate alias functions
- [Phase quick-56]: Removed vendorAuth AppConfig constant (pointed to non-existent /api/vendors/google-auth; actual route is /api/auth/vendor/google-auth)

### Blockers

- ACM certificate expiry date unknown -- need to check AWS Console to determine SSL fix urgency
- Google Play Developer account status unknown -- org account creation may require D-U-N-S number (up to 30 days)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 55 | Fix broken links in Restaurant iOS app — Help Center, Contact Support, Go to Admin Portal | 2026-03-02 | 1682b609 | [55-fix-broken-links-in-restaurant-ios-app-h](./quick/55-fix-broken-links-in-restaurant-ios-app-h/) |
| 56 | Audit and fix route collisions, duplicate routes, dead endpoint constants | 2026-03-02 | 020fcae5 | [56-audit-fix-route-collisions-duplicate-rou](./quick/56-audit-fix-route-collisions-duplicate-rou/) |

## Session Continuity

Last session: 2026-03-02
Stopped at: Completed quick task 56 (route collision audit and fix)
Resume file: None
