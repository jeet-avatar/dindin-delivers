# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** Drivers keep 100% of delivery fees and tips
**Current focus:** v1.5 Production Readiness — defining requirements

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-26 — Milestone v1.5 started

## Completed Milestones

- **v1.0** Production Release — shipped pre-2026-02-20
- **v1.1** Security Hardening + Stability — shipped 2026-02-20
- **v1.2** App Store Ready — shipped 2026-02-21
- **v1.3** Platform Hardening — shipped 2026-02-22
- **v1.4** App Store Distribution — shipped 2026-02-26

## Performance Metrics

**Velocity (v1.4):**
- Total phases: 5
- Total plans: 12
- Quick tasks: 53

## Accumulated Context

### Decisions

- Deferred DB password rotation — already in AWS Secrets Manager, rotation requires coordinated downtime
- Deferred git history cleanup for .env and .p8 files — force-push too destructive
- [Quick-22] SSL pinning: CloudFront staging domain NOT pinned (cert rotation), production dollor.ai/api.dollor.ai pinned with leaf+intermediate+root CA
- iOS TestFlight upload: use xcodebuild -exportArchive with -authenticationKey* flags — ExportOptions.plist destination:upload handles export+upload in one step
- [Quick-29] E2E rideshare verification: 31 endpoints verified, 22 matches, 4 mismatches (2 MEDIUM: Android notification case mismatch, 2 LOW: missing iOS notification types), 5 missing client calls (INFO). Payment flow correct. Push covers 11/12 steps.

### Blockers

(none)
