# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** Drivers keep 100% of delivery fees and tips
**Current focus:** v1.5 Production Readiness -- Phase 10 in progress

## Current Position

Phase: 10 of 10 (Automated Support System)
Plan: 3 of 3 in current phase
Status: Phase 10 complete (iOS + Android) — All 6 apps distributed
Last activity: 2026-03-04 - Completed quick task 76: Deploy auth-restored fare estimate fix, iOS Customer 1110 to TestFlight + ASC

Progress: [#####░░░░░] 50% (5/10 plans)

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
- Quick tasks: 67

**v1.5 Execution:**
- Total plans: 10 (across 5 phases)
- Completed: 5

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
- [Phase quick-57]: Vendor alias uses require_vendor + ownership check pattern; monthly_breakdown queries all-time orders independent of period filter
- [Phase 10-01]: OrderChatMessage.sendOrderChatMessage returns Result<Bool> (backend returns success flag, not full message object); view refetches after send
- [Phase 10-01]: #if ENABLE_AI_EMPLOYEES compile-time flag pattern for hiding aspirational features without code deletion
- [Phase 10-02]: Text chat uses gpt-4o-mini via Chat Completions (cheaper than Realtime for text); voice uses sage voice with PCMU audio passthrough
- [Phase 10-02]: /api/support/chat and /api/voice/incoming-call added to auth middleware allowlist (public endpoints)
- [Phase 10-02]: Escalation email uses skip_validation=True since support@dollor.ai is not in user tables
- [Phase quick-58]: SHOW_AI_FEATURES=false constant pattern for Android (mirrors iOS #if ENABLE_AI_EMPLOYEES)
- [Phase quick-58]: Route-based tab mapping in Partner MainScreen instead of index-based (resilient to tab filtering)
- [Phase quick-59]: vendor_auth_headers fixture for vendor-authenticated endpoints; admin_auth_headers only for admin-only endpoints (status approval)
- [Phase quick-59]: Never define local client fixtures in test files -- always use conftest.client which sets up test DB properly
- [Phase quick-61]: Text chat now deterministic (keyword intent -> DB lookup -> template response). Zero LLM cost. Voice path unchanged.
- [Phase quick-61]: /api/support/chat stays in auth allowlist; optional JWT extraction via try_extract_customer for account-specific responses
- [Phase quick-62]: vendorDocumentsURL constant added to AppConstants; iOS/Android vendor document links use www.dollor.ai/vendor/documents (not admin portal)
- [Phase quick-63]: In-memory set for 90-min delivery warning deduplication; delivery_failed is a new terminal OrderStatus; 120-min check before 90-min in loop to avoid double notification
- [Phase quick-64]: send_push_notification sync call pattern (user_type, user_id) replaces old asyncio.run(token) pattern in bid_routes.py
- [Phase quick-64]: bidding_expires_at filter uses or_(field > now, field.is_(None)) for backward compat with NULL values
- [Phase quick-64]: Individual bid expiry job runs on same 60s interval as other ride cleanup jobs
- [Phase quick-65]: test_get_realtime_analytics call count boundaries updated for 15 OrderStatus values (was 13; PENDING_DELIVERY_PROOF + DELIVERY_FAILED added in quick-63)
- [Phase quick-66]: CI Security workflow lacks workflow_dispatch trigger -- cannot be manually triggered; only fires on PR to main or push to develop
- [Phase quick-67]: CI/CD Pipeline workflow has path filters (apps/web/p2p-platform/**) -- does not auto-trigger on iOS-only pushes; needs manual trigger
- [Phase quick-67]: Android gradlew clean assembleRelease required after version bump to avoid stale APK cache with old version numbers
- [Phase quick-69]: Privacy policy URL must use www.dollor.ai (bare domain has Let's Encrypt SSL issues causing connection failures)
- [Phase quick-69]: App Store version has build 1037 attached (REJECTED Jan 23) -- must attach build 1108 and resubmit
- [Phase quick-70]: AWS admin secret is dollor/production/admin (not admin-yCDIFY as in CLAUDE.md); www.dollor.ai required for privacy/support URLs (bare domain SSL fails)
- [Phase quick-71]: GO recommendation: all 30 checks pass (27 PASS, 0 FAIL, 3 non-blocking WARNINGs) for App Store submission of build 1108
- [Phase quick-72]: NO-GO for App Store submission: demo customer OAuth2 login returns 401 on production; standard /api/auth/customer/login tested (not bypass); fix password hash before submitting
- [Phase quick-73]: ASC supportUrl lives on appStoreVersionLocalizations (not appInfoLocalizations); quick-72 checked wrong resource; DEMO_EMAILS frozenset exempts demo accounts from rate limiting on all 4 login endpoints
- [Phase quick-75]: 422 from staging smoke test accepted (plan curl used abbreviated field names); correct field names return 200
- [Phase quick-76]: Production deploy already succeeded despite CI/CD timeout -- verified via smoke test; demo customer login requires /api/customer/demo-login with secret_key, not standard auth endpoint

### Blockers

- ACM certificate expiry date unknown -- need to check AWS Console to determine SSL fix urgency
- Google Play Developer account status unknown -- org account creation may require D-U-N-S number (up to 30 days)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 55 | Fix broken links in Restaurant iOS app — Help Center, Contact Support, Go to Admin Portal | 2026-03-02 | 1682b609 | [55-fix-broken-links-in-restaurant-ios-app-h](./quick/55-fix-broken-links-in-restaurant-ios-app-h/) |
| 56 | Audit and fix route collisions, duplicate routes, dead endpoint constants | 2026-03-02 | 020fcae5 | [56-audit-fix-route-collisions-duplicate-rou](./quick/56-audit-fix-route-collisions-duplicate-rou/) |
| 57 | Fix restaurant orders 404, extend history to 90 days, add earnings breakdown | 2026-03-02 | e132ec30 | [57-fix-restaurant-orders-404-extend-history](./quick/57-fix-restaurant-orders-404-extend-history/) |
| 58 | Add Phase 10 features to Android apps and build/distribute all 6 apps | 2026-03-03 | 030c8aac | [58-add-phase-10-features-to-android-apps-an](./quick/58-add-phase-10-features-to-android-apps-an/) |
| 59 | Fix 17 failing backend tests + build/distribute all 6 apps | 2026-03-03 | b536924f | [59-fix-18-failing-backend-tests-and-build-a](./quick/59-fix-18-failing-backend-tests-and-build-a/) |
| 60 | Fix delivery button error handling in iOS and Android restaurant apps | 2026-03-04 | 7786c5b7 | [60-fix-delivery-button-error-handling-in-io](./quick/60-fix-delivery-button-error-handling-in-io/) |
| 61 | Replace OpenAI chat with deterministic rule-based support agent | 2026-03-04 | 55c0d994 | [61-replace-openai-chat-with-deterministic-s](./quick/61-replace-openai-chat-with-deterministic-s/) |
| 62 | Fix vendor document upload flow E2E -- URL + camera capture | 2026-03-04 | 3a4d4992 | [62-fix-vendor-document-upload-flow-e2e-url-](./quick/62-fix-vendor-document-upload-flow-e2e-url-/) |
| 63 | Add delivery timeout safety net -- 90-min warning, 120-min auto-refund, 24h stale cleanup | 2026-03-04 | 781ab4bc | [63-add-delivery-timeout-safety-net-90min-wa](./quick/63-add-delivery-timeout-safety-net-90min-wa/) |
| 64 | Fix all 5 rideshare ride availability gaps + standardize 5s polling + build 6 apps | 2026-03-04 | 01bb0919 | [64-fix-all-5-rideshare-ride-availability-ga](./quick/64-fix-all-5-rideshare-ride-availability-ga/) |
| 65 | Deploy backend, distribute Android APKs, rebuild iOS apps to TestFlight | 2026-03-04 | 2076afff | [65-deploy-backend-distribute-android-apks-r](./quick/65-deploy-backend-distribute-android-apks-r/) |
| 66 | Rebuild all 6 apps fresh -- iOS 1107/212/182 to TestFlight, Android vC=32/29/25 to Firebase | 2026-03-04 | a6ea527c | [66-rebuild-all-6-apps-fresh-trigger-ci-secu](./quick/66-rebuild-all-6-apps-fresh-trigger-ci-secu/) |
| 67 | Rebuild all 6 apps with full CI/CD gate -- iOS 1108/213/183, Android vC=33/30/26 | 2026-03-04 | 73152d96 | [67-rebuild-all-6-apps-with-full-ci-cd-passi](./quick/67-rebuild-all-6-apps-with-full-ci-cd-passi/) |
| 69 | Pre-submission App Store rejection audit -- 42 checks, 4 blockers found | 2026-03-04 | bf106f8d | [69-pre-submission-app-store-rejection-audit](./quick/69-pre-submission-app-store-rejection-audit/) |
| 70 | Fix 4 App Store blockers -- demo 401, privacy URL, build 1108, REJECTED state | 2026-03-04 | (API-only) | [70-fix-4-app-store-blockers-for-customer-ap](./quick/70-fix-4-app-store-blockers-for-customer-ap/) |
| 71 | E2E pre-submission verification -- 30 checks, 27 PASS, 0 FAIL, 3 WARNING, GO recommendation | 2026-03-04 | 05af5b30 | [71-e2e-pre-submission-verification-for-cust](./quick/71-e2e-pre-submission-verification-for-cust/) |
| 72 | Final stress test -- 39 checks, 34 PASS, 1 FAIL (demo login 401), 4 WARNING, NO-GO | 2026-03-04 | 04c19800 | [72-final-stress-test-for-customer-app-build](./quick/72-final-stress-test-for-customer-app-build/) |
| 73 | Fix 4 non-blocking warnings -- coord validation, vendor search, demo rate limit, ASC supportUrl | 2026-03-04 | a24566f8 | [73-fix-all-4-non-blocking-warnings-from-str](./quick/73-fix-all-4-non-blocking-warnings-from-str/) |
| 75 | Deploy fare estimate fix + rebuild iOS Customer build 1109 to TestFlight | 2026-03-04 | 3530de4f | [75-deploy-fare-estimate-fix-rebuild-ios-cus](./quick/75-deploy-fare-estimate-fix-rebuild-ios-cus/) |
| 76 | Deploy auth-restored fare estimate fix, rebuild iOS Customer 1110, attach to ASC | 2026-03-04 | b13db834 | [76-deploy-auth-restored-fare-estimate-fix-r](./quick/76-deploy-auth-restored-fare-estimate-fix-r/) |

## Session Continuity

Last session: 2026-03-04
Stopped at: Completed quick-76 (Production auth verified 401/200 on fare estimate; iOS Customer build 1110 on TestFlight; build 1110 attached to ASC version PREPARE_FOR_SUBMISSION).
Resume file: .planning/NEXT_SESSION_PROMPT.md
