# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Drivers keep 100% of delivery fees and tips
**Current focus:** v1.4 Phase 02 complete -- ready for Phase 03

## Current Position

Phase: 2 of 5 (iOS API Verification) -- COMPLETE
Plan: 3 of 3 in current phase
Status: Complete
Last activity: 2026-02-23 -- Quick task 32: Add iOS notification enums + build/distribute Android APKs to Firebase

Progress: [####░░░░░░] 40%

## Completed Milestones

- **v1.0** Production Release -- shipped pre-2026-02-20
- **v1.1** Security Hardening + Stability -- shipped 2026-02-20
- **v1.2** App Store Ready -- shipped 2026-02-21
- **v1.3** Platform Hardening -- shipped 2026-02-22

## Performance Metrics

**Velocity (v1.3 baseline):**
- Total plans completed: 9
- Average duration: 14 min
- Total execution time: 127 min

**v1.4:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 01 | 1 | 15min | 15min |
| Phase 02 | 2 | 34min | 17min |

## Accumulated Context

### Decisions

- Skip Phase 04 INFRA in v1.3, carry to v1.4 as Phase 01 (from PROJECT.md)
- Used CloudFront response headers policy (not Lambda@Edge) for server header override -- simpler, no code, no cost
- Deferred git history cleanup for .env and .p8 files -- force-push too destructive
- Deferred DB password rotation -- already in AWS Secrets Manager, rotation requires coordinated downtime
- 163 Customer app API calls verified: 119 OK, 44 mismatches (40 dead code, 4 fixable path issues)
- 5 service files classified as dead code: TripBoardService, DollorV3Service, ACHPaymentService, NegotiationService, most of LegalService
- Double URL prefix bug in AppConfig.swift affects ChatService, NegotiationService, CallService
- [Phase 02]: Driver app API audit: 53 calls verified, 4 mismatches (broken doc upload alias, wrong chat auth token, PUT vs POST FCM)
- iOS TestFlight upload: use xcodebuild -exportArchive with -authenticationKey* flags (not separate altool step) -- ExportOptions.plist destination:upload handles export+upload in one step
- Post-security regression: requestRide() was the only ride method missing auth header in P2PAPIService.swift -- after global auth middleware, must audit ALL client API calls for auth headers
- [Quick-22] SSL pinning: CloudFront staging domain NOT pinned (cert rotation), production dollor.ai/api.dollor.ai pinned with leaf+intermediate+root CA
- [Quick-22] VAPT: 16 findings (0 CRITICAL, 2 HIGH fixed, 5 MEDIUM). URLSession.shared migration deferred (158 API methods)
- [Phase quick-25]: Backend pentest: 18 findings (1 CRITICAL, 4 HIGH, 5 MEDIUM, 3 LOW, 4 INFO), all CRITICAL/HIGH fixed
- [Quick-26] Network security audit: 27 findings (3 CRITICAL, 7 HIGH, 8 MEDIUM, 5 LOW, 4 INFO), all CRITICAL/HIGH fixed. WebSocket JWT auth, Swagger lockdown, X-Forwarded-For fix, in-memory rate limiter, bid abuse controls, password policy
- [Quick-27] Deployed quick-25 + quick-26 security fixes to staging then production via CI/CD. Staging run 22293682154, production run 22293827652. All smoke tests pass: health 200, auth 401, Swagger 401
- [Quick-29] E2E rideshare verification: 31 endpoints verified, 22 matches, 4 mismatches (2 MEDIUM: Android notification case mismatch, 2 LOW: missing iOS notification types), 5 missing client calls (INFO). Payment flow correct. Push covers 11/12 steps.
- [Quick-30] Live E2E test: Ride 253 (NYC 5th Ave→WTC), 2-round negotiation ($30→$22→$26), all 12 lifecycle steps PASS, payment $26 fare + $1 fee + $5 tip = $32. 10 push notifications fired correctly. 5 notification handler issues confirmed (2 MEDIUM, 3 LOW).

### Pending Todos

None.

### Blockers/Concerns

None.

### Quick Tasks (v1.4)

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 12 | Bump build numbers and build all 3 iOS apps for Production | 2026-02-23 | 44962019 | [12-bump-build-numbers-and-build-all-3-ios-a](./quick/12-bump-build-numbers-and-build-all-3-ios-a/) |
| 13 | Archive and upload all 3 iOS apps to TestFlight | 2026-02-23 | (no commit) | [13-archive-and-upload-all-3-ios-apps-to-tes](./quick/13-archive-and-upload-all-3-ios-apps-to-tes/) |
| 14 | Bump build numbers and build all 3 Android apps | 2026-02-23 | 2bbc424a | [14-bump-build-numbers-and-build-all-3-andro](./quick/14-bump-build-numbers-and-build-all-3-andro/) |
| 15 | Update CLAUDE.md + MEMORY.md with session learnings | 2026-02-23 | 8a126254 | [15-update-claude-md-and-memory-md-with-sess](./quick/15-update-claude-md-and-memory-md-with-sess/) |
| 16 | Upload all 3 Android APKs to Firebase App Distribution | 2026-02-23 | 89366675 | [16-set-up-firebase-app-distribution-and-upl](./quick/16-set-up-firebase-app-distribution-and-upl/) |
| 17 | Audit and fix Android customer rideshare APIs | 2026-02-23 | a9d2f42d | [17-audit-and-fix-android-customer-rideshare](./quick/17-audit-and-fix-android-customer-rideshare/) |
| 18 | Add auth headers to 18 iOS P2PAPIService methods | 2026-02-23 | b27315f7 | [18-audit-all-ios-p2papiservice-swift-method](./quick/18-audit-all-ios-p2papiservice-swift-method/) |
| 19 | Recheck Android customer rideshare API fixes (14/14 PASS) | 2026-02-23 | 521f5ea4 | [19-recheck-android-customer-rideshare-api-f](./quick/19-recheck-android-customer-rideshare-api-f/) |
| 20 | Bump build numbers + upload all 3 iOS apps to TestFlight | 2026-02-23 | 3a857fa5 | [20-bump-build-numbers-archive-and-upload-al](./quick/20-bump-build-numbers-archive-and-upload-al/) |
| 21 | Build + upload all 3 Android APKs to Firebase App Distribution | 2026-02-23 | fb8a2f38 | [21-build-upload-to-firebase-and-distribute-](./quick/21-build-upload-to-firebase-and-distribute-/) |
| 23 | VAPT security audit on all 3 Android apps | 2026-02-23 | 90eae697 | [23-vapt-security-audit-on-all-3-android-app](./quick/23-vapt-security-audit-on-all-3-android-app/) |
| 22 | VAPT security audit on all 3 iOS apps (OWASP M1-M10) + gap fixes | 2026-02-23 | 420d9f7f | [22-vapt-security-audit-on-all-3-ios-apps-ow](./quick/22-vapt-security-audit-on-all-3-ios-apps-ow/) |
| 23 | VAPT security audit on all 3 Android apps | 2026-02-23 | 90eae697 | [23-vapt-security-audit-on-all-3-android-app](./quick/23-vapt-security-audit-on-all-3-android-app/) |
| 24 | Build and distribute security-fixed Android APKs | 2026-02-23 | 70dfda61 | [24-build-and-distribute-security-fixed-andr](./quick/24-build-and-distribute-security-fixed-andr/) |
| 25 | Backend pentest — 18 findings, 8 fixed (incl. verifier gaps) | 2026-02-23 | 48fc43f5 | [25-penetration-test-break-dollor-ai-backend](./quick/25-penetration-test-break-dollor-ai-backend/) |
| 26 | Network security audit — 27 findings, 10 CRITICAL/HIGH fixed | 2026-02-23 | 432ab49f | [26-network-security-and-bot-attack-audit-fi](./quick/26-network-security-and-bot-attack-audit-fi/) |
| 27 | Deploy pentest security fixes to staging + production | 2026-02-23 | (deploy only) | [27-deploy-pentest-security-fixes-to-staging](./quick/27-deploy-pentest-security-fixes-to-staging/) |
| 28 | Rebuild and redistribute all 6 apps (iOS+Android) | 2026-02-23 | bd2c1bea | [28-rebuild-and-redistribute-all-6-apps-ios-](./quick/28-rebuild-and-redistribute-all-6-apps-ios-/) |
| 29 | E2E rideshare verification (31 endpoints, push matrix, payment audit) | 2026-02-23 | ee7b279c | [29-verify-e2e-rideshare-flow-and-push-notif](./quick/29-verify-e2e-rideshare-flow-and-push-notif/) |
| 30 | Live E2E rideshare test — Android customer ↔ iOS driver, 12 steps all PASS | 2026-02-23 | (test only) | [30-live-e2e-rideshare-test-android-customer](./quick/30-live-e2e-rideshare-test-android-customer/) |
| 31 | Fix Android notification type case mismatch + add 5 missing handlers | 2026-02-23 | 378987c8 | [31-fix-android-notification-type-case-misma](./quick/31-fix-android-notification-type-case-misma/) |
| 32 | Add iOS notification enums + build/distribute Android APKs | 2026-02-23 | d46a4c0a | [32-add-missing-ios-notification-enums-and-b](./quick/32-add-missing-ios-notification-enums-and-b/) |

## Session Continuity

Last session: 2026-02-23
Stopped at: Quick task 32 complete -- All notification gaps closed (iOS + Android). Android APKs vC=25/22/18 on Firebase.
Resume: All E2E rideshare notification issues RESOLVED. 17 MEDIUM/LOW security findings still deferred.
