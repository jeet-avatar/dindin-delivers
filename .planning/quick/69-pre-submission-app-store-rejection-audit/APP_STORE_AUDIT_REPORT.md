# App Store Pre-Submission Audit Report

## Customer App - Build 1108 (com.dollorai.customer)
## Date: 2026-03-04

---

### Summary

- **Total checks:** 42
- **PASS:** 32
- **FAIL:** 4
- **WARNING:** 6
- **Recommendation:** NO-GO -- 4 blockers must be resolved before submission

---

### 1. Demo Account Verification (Production API)

| # | Check | Status | Details |
|---|-------|--------|---------|
| 1.1 | Demo setup endpoint exists | PASS | `POST /api/demo/setup` exists at `main_new.py:18068`. Requires `ADMIN_SECRET_KEY` query param (security-gated). |
| 1.2 | Demo setup callable | WARNING | Returns 403 without admin secret key. This is expected behavior -- Apple reviewers do NOT call this endpoint. However, demo account must exist in production DB before submission. |
| 1.3 | Demo customer login endpoint | PASS | `POST /api/auth/customer/login` accepts OAuth2PasswordRequestForm (username/password). Endpoint is functional. |
| 1.4 | Demo credentials work | **FAIL** | Login with `demo.customer@dollor.ai` / `DemoCustomer2025!` returns **401 Incorrect email or password**. Demo account either does not exist in production or password hash is stale. Apple reviewers WILL test these. |
| 1.5 | Demo credentials match ASC review info | PASS | ASC review detail shows `demoAccountName: demo.customer@dollor.ai`, `demoAccountPassword: DemoCustomer2025!`. Matches CLAUDE.md credentials. |
| 1.6 | Demo account required flag | PASS | `demoAccountRequired: true` is set in ASC. |

**Action Required:** Run `POST /api/demo/setup?secret_key=<ADMIN_SECRET_KEY>` against production to create/reset demo accounts before submission.

---

### 2. Info.plist Usage Descriptions

| # | Check | Status | Details |
|---|-------|--------|---------|
| 2.1 | NSLocationWhenInUseUsageDescription | PASS | "Dollor AI Service needs your location to show nearby restaurants, request rides, and deliver food to you." -- Clear, user-facing language. |
| 2.2 | NSLocationAlwaysAndWhenInUseUsageDescription | PASS | "Dollor AI Service needs your location to show nearby restaurants, request rides, and track your delivery in real-time." -- Justified by real-time tracking. |
| 2.3 | NSCameraUsageDescription | PASS | "Camera access allows you to scan payment cards and take profile photos." -- Clear purpose. |
| 2.4 | NSPhotoLibraryUsageDescription | PASS | "Photo library access allows you to upload profile photos." -- Clear purpose. |
| 2.5 | NSMicrophoneUsageDescription | PASS | "Microphone access enables voice search and voice commands for hands-free ordering." -- Clear purpose. |
| 2.6 | NSContactsUsageDescription | PASS | "Contacts access allows you to quickly share your delivery address from your contacts." -- Clear purpose. |
| 2.7 | NSSpeechRecognitionUsageDescription | PASS | "Voice commands allow hands-free food ordering and ride requests." -- Clear purpose. |
| 2.8 | UIBackgroundModes | PASS | Only `remote-notification` present. No background location (would require justification). |
| 2.9 | ITSAppUsesNonExemptEncryption | PASS | Set to `false`. No export compliance doc needed. Confirmed in build 1108 API response: `usesNonExemptEncryption: false`. |
| 2.10 | LSRequiresIPhoneOS | PASS | Set to `true`. |

---

### 3. Entitlements Audit

| # | Check | Status | Details |
|---|-------|--------|---------|
| 3.1 | aps-environment (Release) | PASS | Set to `production` in `eatfaircustomer.entitlements`. |
| 3.2 | aps-environment (Debug) | PASS | Set to `development` in `eatfaircustomerDebug.entitlements`. Correct separation. |
| 3.3 | Apple Sign In | PASS | `com.apple.developer.applesignin` with `Default` scope. Required for Sign in with Apple. |
| 3.4 | Apple Pay | PASS | `com.apple.developer.in-app-payments` with merchant ID `merchant.com.dolloraiai`. |
| 3.5 | No unnecessary entitlements | PASS | Only 3 entitlements (push, Sign In with Apple, Apple Pay). All justified by app functionality. |

---

### 4. Release Configuration Audit

| # | Check | Status | Details |
|---|-------|--------|---------|
| 4.1 | API_BASE_URL | PASS | `https://api.dollor.ai` in Production.xcconfig. NOT staging. |
| 4.2 | ENABLE_DEBUG_LOGGING | PASS | `NO` in Production.xcconfig. |
| 4.3 | ENABLE_MOCK_DATA | PASS | `NO` in Production.xcconfig. |
| 4.4 | IS_DUMMY_PAYMENT_MODE | PASS | `NO` in Production.xcconfig. |
| 4.5 | ENABLE_TESTABILITY | PASS | `NO` in Production.xcconfig. |
| 4.6 | No staging URLs in Production.xcconfig | PASS | No occurrences of `d34u5ixl0bulv4.cloudfront.net` or other staging URLs. |
| 4.7 | WEBSOCKET_URL | PASS | `wss://ws.dollor.ai` -- uses secure WebSocket. |
| 4.8 | CDN_URL | PASS | `https://cdn.dollor.ai` -- HTTPS only. |

---

### 5. Code-Level Checks

| # | Check | Status | Details |
|---|-------|--------|---------|
| 5.1 | No UIWebView usage | PASS | Zero occurrences of `UIWebView` in customer app. Apple deprecated UIWebView in iOS 12; apps using it are rejected. |
| 5.2 | No hardcoded staging/test URLs | PASS | Zero occurrences of `d34u5ixl0bulv4`, `d3kuu45w6kl8hr`, `localhost`, or `127.0.0.1` in customer app Swift source. |
| 5.3 | No private API usage | PASS | Zero occurrences of `_UIKit`, `_NS`, or `@objc.*private` patterns. |
| 5.4 | Print statements wrapped | PASS | All 14 `print()` statements in customer app source are inside `#if DEBUG` blocks. No production log leaks. |
| 5.5 | Google Maps API key | WARNING | API key `AIzaSyCELfWMuckt-Bbx5tyuiOSS3sYNywxVTXc` in Info.plist. This is standard for iOS (required by Google Maps SDK), but ensure the key is restricted to bundle ID `com.dollorai.customer` in Google Cloud Console to prevent abuse. |
| 5.6 | App icon | PASS | 1024x1024 AppIcon.png present with universal, dark, and tinted variants. Modern asset catalog format. |
| 5.7 | Launch screen | PASS | Uses `INFOPLIST_KEY_UILaunchScreen_Generation = YES` for auto-generated launch screen. Valid approach. |
| 5.8 | Deployment target | PASS | iOS 17.0. Matches build 1108 `minOsVersion: 17.0`. |

---

### 6. App Transport Security

| # | Check | Status | Details |
|---|-------|--------|---------|
| 6.1 | NSAllowsArbitraryLoads | PASS | `false` -- all connections require HTTPS by default. |
| 6.2 | NSAllowsLocalNetworking | WARNING | `true` -- allows HTTP to localhost/Bonjour. Harmless in production, common in apps with local device communication. Apple generally accepts this. |
| 6.3 | amazonaws.com exception | WARNING | Allows insecure HTTP to `*.amazonaws.com` subdomains with TLS 1.2 minimum. This is for S3 image loading. Apple may flag this but typically accepts it for legitimate S3 usage. The `NSExceptionMinimumTLSVersion: TLSv1.2` shows security awareness. |

---

### 7. App Store Connect Metadata

| # | Check | Status | Details |
|---|-------|--------|---------|
| 7.1 | App name | PASS | "Dollor - Food & Rides" -- descriptive, within 30 char limit. |
| 7.2 | Primary category | PASS | `FOOD_AND_DRINK` -- appropriate for food delivery + rideshare. |
| 7.3 | Content rights | PASS | `DOES_NOT_USE_THIRD_PARTY_CONTENT` -- declared. |
| 7.4 | Copyright | PASS | "2026 Zietra Technologies inc" -- matches organization name after account conversion. |
| 7.5 | Privacy policy URL | **FAIL** | URL is `https://dollor.ai/privacy`. Bare domain `dollor.ai` has Let's Encrypt SSL cert that causes connection failures (curl exit code 60). `https://www.dollor.ai/privacy` returns 200. Apple tests the EXACT URL in metadata. Must update to `https://www.dollor.ai/privacy`. |
| 7.6 | Support URL | PASS (with redirect) | URL is `https://dollor.ai/support`. Bare domain fails but redirects to `https://www.dollor.ai/support` which returns 200. Should update to `https://www.dollor.ai/support` to avoid redirect dependency. |
| 7.7 | Description | WARNING | Description exists (1053 chars). However, contains multiple double/triple space sequences (6 occurrences) suggesting copy-paste formatting issues. Not a rejection cause but looks unprofessional. |
| 7.8 | Keywords | PASS | "Food delivery,rideshare,restaurant,takeout,rides,taxi,delivery app,multi restaurant,fair,driver" -- relevant, comma-separated, within 100 char limit. |
| 7.9 | Promotional text | PASS | "Order from multiple restaurants at once or book a ride. Drivers keep 100% of tips. Fair pricing for Everyone" -- clear value proposition. |
| 7.10 | What's New | PASS | `null` -- acceptable for version 1.0 (first release). Required only for updates. |
| 7.11 | Subtitle | PASS | "Order food & book rides" -- concise, descriptive. |
| 7.12 | Marketing URL | PASS | `https://dollor.ai` -- set. |
| 7.13 | Age rating | PASS | `FOUR_PLUS` with `messagingAndChat: true`. All violence/mature content flags set to NONE/false. Appropriate for food delivery app. |
| 7.14 | Screenshots (iPhone 6.5") | PASS | 10 screenshots for `APP_IPHONE_65` display type. Exceeds minimum requirement. |
| 7.15 | Screenshots (iPad Pro 12.9") | PASS | 5 screenshots for `APP_IPAD_PRO_3GEN_129`. Good coverage. |
| 7.16 | Screenshots (iPhone 6.7") | WARNING | No separate `APP_IPHONE_67` screenshot set. iPhone 6.7" (iPhone 15 Pro Max) may fall back to 6.5" screenshots. Apple currently accepts 6.5" for 6.7" devices, but separate 6.7" screenshots are recommended. |

---

### 8. Build Status

| # | Check | Status | Details |
|---|-------|--------|---------|
| 8.1 | Build 1108 processing state | PASS | `processingState: VALID`. Build is processed and eligible. |
| 8.2 | Build 1108 audience type | PASS | `buildAudienceType: APP_STORE_ELIGIBLE`. Can be submitted. |
| 8.3 | Build 1108 upload date | PASS | Uploaded `2026-03-04T02:01:18-08:00` (today). Fresh build. |
| 8.4 | Build attached to version | **FAIL** | App Store version `30ad500d` has build **1037** (from Feb 2, 2026) attached, NOT build 1108. The rejected version still references the old build. Must either: (a) update the existing version to use build 1108, or (b) create a new App Store version with build 1108. |

---

### 9. Previous Rejection & Organization

| # | Check | Status | Details |
|---|-------|--------|---------|
| 9.1 | Organization name | PASS | App registered under "Zietra Technologies inc" (confirmed via copyright field). Account converted from individual. |
| 9.2 | Version state | **FAIL** | Current App Store version state is `REJECTED` (from Jan 23 rejection). Must either edit this version and resubmit, or create a new version. Cannot submit a version in REJECTED state without modification. |
| 9.3 | Review notes | PASS | Comprehensive testing instructions provided including food delivery and rideshare flows. Mentions matchmaking platform nature. Developer contact info included. |
| 9.4 | Review contact | PASS | Contact: Jithesh Manoharan, support@dollor.ai, 4156966429. |

---

## Action Items (Must Fix Before Submission)

### Blockers (FAIL)

1. **[CRITICAL] Demo account not working on production (1.4)**
   - Demo login returns 401. Apple reviewers test with these credentials.
   - **Fix:** Run `POST https://api.dollor.ai/api/demo/setup?secret_key=<ADMIN_SECRET_KEY>` to create/reset demo accounts, then verify login works.

2. **[CRITICAL] Privacy policy URL fails SSL (7.5)**
   - `https://dollor.ai/privacy` fails to connect (Let's Encrypt cert issue on bare domain). Apple tests the exact URL.
   - **Fix:** Update privacy policy URL in App Store Connect to `https://www.dollor.ai/privacy` (returns 200).

3. **[CRITICAL] Wrong build attached to App Store version (8.4)**
   - Version has build 1037 (Feb 2) instead of build 1108 (Mar 4).
   - **Fix:** In App Store Connect, edit the version and select build 1108.

4. **[CRITICAL] Version in REJECTED state (9.2)**
   - Must edit the rejected version (update build, fix metadata) and resubmit, or create a new version.
   - **Fix:** After attaching build 1108, resubmit for review.

### Recommended (WARNING)

5. **[MEDIUM] Support URL should use www prefix (7.6)**
   - Current: `https://dollor.ai/support` (bare domain has SSL issues, relies on redirect)
   - **Fix:** Update to `https://www.dollor.ai/support` in App Store Connect.

6. **[LOW] Description has formatting issues (7.7)**
   - Multiple double/triple space sequences. Not a rejection cause but looks unprofessional.
   - **Fix:** Clean up extra spaces in App Store Connect description.

7. **[LOW] No iPhone 6.7" screenshot set (7.16)**
   - Apple currently accepts 6.5" screenshots for 6.7" devices, but separate 6.7" set is recommended.
   - **Fix:** Consider adding APP_IPHONE_67 screenshot set.

8. **[LOW] Google Maps API key restriction (5.5)**
   - API key in Info.plist should be restricted to bundle ID in Google Cloud Console.
   - **Fix:** Verify key restriction in Google Cloud Console.

9. **[INFO] amazonaws.com ATS exception (6.3)**
   - Allows insecure HTTP to S3 with TLS 1.2 minimum. Generally accepted but may draw scrutiny.
   - **Action:** Be prepared to justify in review notes if questioned.

10. **[INFO] NSAllowsLocalNetworking (6.2)**
    - Harmless but unnecessary in production. Not a rejection cause.

---

## Pre-Submission Checklist

- [ ] Run demo account setup on production
- [ ] Verify demo login works: `POST /api/auth/customer/login` with `username=demo.customer@dollor.ai&password=DemoCustomer2025!`
- [ ] Update privacy policy URL to `https://www.dollor.ai/privacy` in App Store Connect
- [ ] Update support URL to `https://www.dollor.ai/support` in App Store Connect
- [ ] Attach build 1108 to the App Store version
- [ ] Clean up description formatting (extra spaces)
- [ ] Resubmit for App Store review

---

## Appendix: Raw API Data

### App Store Connect App
- **App ID:** 6758230264
- **Bundle ID:** com.dollorai.customer
- **SKU:** dollorai-customer-2026
- **Primary Locale:** en-US

### Build 1108
- **Build ID:** cf874071-d373-485d-b0db-ee1cce792a13
- **Processing State:** VALID
- **Uploaded:** 2026-03-04T02:01:18-08:00
- **Min OS:** 17.0
- **Audience:** APP_STORE_ELIGIBLE

### App Store Version
- **Version ID:** 30ad500d-cdf6-47fb-98e2-314fe6fd68dc
- **Version String:** 1.0
- **State:** REJECTED (Jan 23, 2026 submission)
- **Currently Attached Build:** 1037 (Feb 2, 2026)

---

*Generated by automated pre-submission audit on 2026-03-04*
