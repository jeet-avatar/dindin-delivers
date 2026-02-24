---
phase: quick-50
verified: 2026-02-24T23:15:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Quick Task 50: Multi-Role OAuth No Auto-Create Verification Report

**Task Goal:** Fix multi-role OAuth to NOT auto-create vendor/driver accounts. When a user signs in via Apple/Google on Restaurant app without a vendor account, return error with registration URL https://dollor.ai/restaurant/apply. Same for Driver app -> https://dollor.ai/driver/apply. Customer app stays open (auto-create). iOS and Android apps should handle the registration_url response and show a "Register first" alert with link.

**Verified:** 2026-02-24T23:15:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Vendor OAuth (Apple+Google) returns 403 with registration_url when user has no vendor account | VERIFIED | `main_new.py:2244-2253` (Google), `main_new.py:2360-2378` (Apple) — both `else` branches return `JSONResponse(status_code=403, content={..., "registration_url": "https://dollor.ai/restaurant/apply", ...})` |
| 2 | Driver OAuth (Apple+Google) returns 403 with registration_url when user has no driver account | VERIFIED | `main_new.py:2770-2788` (Google), `main_new.py:2876-2894` (Apple) — both `else` branches return 403 + registration_url for driver/apply |
| 3 | Vendor OAuth still works (200 + token) for users who already have vendor_id | VERIFIED | `main_new.py:2241-2243` — `if user.vendor_id:` branch falls through to `create_access_token` and returns 200 with token; `test_vendor_apple_auth_still_works_for_existing_vendor` PASSES |
| 4 | Driver OAuth still works (200 + token) for users who already have driver_id | VERIFIED | `main_new.py:2761-2769` — `if user.driver_id:` branch falls through to `create_access_token` and returns 200; no regression in driver auth tests |
| 5 | Customer OAuth continues to auto-create accounts (unchanged) | VERIFIED | Customer Google/Apple auth endpoints not modified; SUMMARY confirms "Customer OAuth auto-create unchanged"; commit `7b6358f3` diff only touches vendor/driver branches |
| 6 | Brand new users (no User row) on vendor/driver OAuth get 403 with registration_url | VERIFIED | `main_new.py:2254-2263` (vendor Google), `2370-2378` (vendor Apple), `2780-2788` (driver Google), `2886-2894` (driver Apple) — all `else` (no existing_user) branches return 403; `test_vendor_apple_auth_brand_new_user_returns_403` and `test_driver_apple_auth_brand_new_user_returns_403` both PASS |
| 7 | iOS driver/restaurant apps show registration URL and offer to open Safari on 403 | VERIFIED | `DriverLoginView.swift:550-552,660-662` — both Apple and Google completion handlers catch `P2PAPIError.registrationRequired`; `DriverLoginView.swift:445-453` — `.alert("Registration Required")` with "Register Now" button opens `UIApplication.shared.open(url)`. Same pattern in `LoginView.swift:482-484,550-552,714-716` with alert at line 337-345 |
| 8 | Android driver/partner apps show registration URL and offer to open browser on 403 | VERIFIED | `DollorRepository.kt:22-70` — `RegistrationRequiredException` detected in `safeApiCall` on 403 + registration_url; `AuthViewModel.kt:129-137` — partner maps to `AuthState.RegistrationRequired`; `LoginScreen.kt (partner):436-451` — `AlertDialog` with `Intent.ACTION_VIEW`; `LoginViewModel.kt:53-57,109-113` — driver maps registrationUrl to `LoginUiState`; `LoginScreen.kt (driver):629-642` — `AlertDialog` with browser link |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/p2p-platform/backend/main_new.py` | 403 + registration_url for vendor/driver OAuth | VERIFIED | Lines 2246-2263, 2362-2378, 2772-2788, 2878-2894 — 8 JSONResponse(403) blocks with registration_url fields present |
| `apps/web/p2p-platform/backend/tests/unit/test_auth_endpoints.py` | Updated tests for 403 no-auto-create behavior | VERIFIED | Lines 334-452 contain 7 test cases asserting 403 + registration_url; all 39 auth tests pass (run confirmed) |
| `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` | P2PRegistrationRequiredResponse model for parsing registration_url | VERIFIED | `P2PRegistrationRequiredResponse` struct at line 7607-7616; `registrationRequired(String, String)` case at line 7648; 403-parsing blocks in 4 OAuth methods at lines 1405-1410, 1507-1512, 3722-3726, 3805-3809 |
| `apps/ios/delivery/eatffairdelivery/DriverLoginView.swift` | Registration URL alert with Safari open action | VERIFIED | State vars at lines 120-121; Apple handler at 550-552; Google handler at 660-662; `.alert("Registration Required")` at lines 445-454 with `UIApplication.shared.open(url)` |
| `apps/ios/restaurant/eatffairrestaurant/Views/LoginView.swift` | Registration URL alert with Safari open action | VERIFIED | State vars at lines 109-110; three handling sites (email/pass line 550, Apple line 482, Google line 714); `.alert` at lines 337-346 with `UIApplication.shared.open(url)` |
| `/Users/jeet/StudioProjects/eatfair-android/shared/.../ApiModels.kt` | RegistrationRequiredResponse data class | VERIFIED | Lines 1421-1425 — `data class RegistrationRequiredResponse` with `@SerializedName` annotations for `registration_url` and `requires_registration` |
| `/Users/jeet/StudioProjects/eatfair-android/shared/.../DollorRepository.kt` | RegistrationRequiredException + safeApiCall detection | VERIFIED | Lines 22-27 define exception; lines 64-71 detect 403 + registration_url in `safeApiCall` before generic error extraction |
| `/Users/jeet/StudioProjects/eatfair-android/partner/.../AuthViewModel.kt` | AuthState.RegistrationRequired + clearRegistrationState() | VERIFIED | Line 26 — `data class RegistrationRequired`; lines 129-137 handle in googleSignIn + login; line 185 — `clearRegistrationState()` |
| `/Users/jeet/StudioProjects/eatfair-android/partner/.../LoginScreen.kt` | AlertDialog for registration state | VERIFIED | Lines 436-451 — `if (authState is AuthState.RegistrationRequired)` block with `AlertDialog`, `Intent.ACTION_VIEW` |
| `/Users/jeet/StudioProjects/eatfair-android/driver/.../LoginViewModel.kt` | registrationUrl in LoginUiState + clearRegistrationPrompt() | VERIFIED | Line 19 — `val registrationUrl: String? = null` in state; lines 53-57, 109-113 set it on failure; line 133 — `clearRegistrationPrompt()` |
| `/Users/jeet/StudioProjects/eatfair-android/driver/.../LoginScreen.kt` | AlertDialog for registrationUrl | VERIFIED | Lines 628-642 — `uiState.registrationUrl?.let { url -> AlertDialog(...)` with `Intent.ACTION_VIEW` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `main_new.py vendor_google_auth / vendor_apple_auth` | iOS/Android vendor OAuth callers | HTTP 403 + JSON `{detail, registration_url, requires_registration}` | WIRED | Pattern `registration_url.*dollor.ai/restaurant/apply` found at lines 2250, 2260, 2366, 2376 in main_new.py; iOS parses at P2PAPIService lines 1405-1410, 1507-1512; Android safeApiCall detects at DollorRepository lines 64-71 |
| `main_new.py driver_google_auth / driver_apple_auth` | iOS/Android driver OAuth callers | HTTP 403 + JSON `{detail, registration_url, requires_registration}` | WIRED | Pattern `registration_url.*dollor.ai/driver/apply` found at lines 2776, 2786, 2882, 2892 in main_new.py; iOS parses at P2PAPIService lines 3722-3726, 3805-3809; Android safeApiCall detects at DollorRepository lines 64-71 |
| `P2PAPIError.registrationRequired` | `DriverLoginView` + restaurant `LoginView` | Swift pattern match `if case .registrationRequired(_, let url) = error` | WIRED | DriverLoginView lines 550-552 (Apple), 660-662 (Google); LoginView lines 482-484 (Apple), 550-552 (email/pass), 714-716 (Google); all set `registrationURL` and trigger `showRegistrationAlert = true` |
| `RegistrationRequiredException` | Partner `AuthViewModel` + Driver `LoginViewModel` | Kotlin `if (e is RegistrationRequiredException)` in `.onFailure` | WIRED | AuthViewModel.kt lines 129-137, 169-177 handle all 4 paths; LoginViewModel.kt lines 53-57, 109-113 handle 2 paths |
| `AuthState.RegistrationRequired` | Partner `LoginScreen` AlertDialog | `if (authState is AuthState.RegistrationRequired)` | WIRED | LoginScreen.kt (partner) lines 436-451 — dialog shown, dismisses via `clearRegistrationState()` |
| `LoginUiState.registrationUrl` | Driver `LoginScreen` AlertDialog | `uiState.registrationUrl?.let { url ->` | WIRED | LoginScreen.kt (driver) lines 629-642 — dialog shown, dismisses via `clearRegistrationPrompt()` |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| QUICK-50 | Fix multi-role OAuth no auto-create for vendor/driver; return 403 + registration_url; iOS/Android show alert | SATISFIED | All 8 truths verified; 39 backend tests pass; commits 7b6358f3, debb2b39, f1319a8a present and substantive |

### Anti-Patterns Found

None found. No TODOs, placeholders, empty return statements, or stub implementations detected in the modified files. The deviation noted in SUMMARY (exhaustive switch fix for restaurant LoginView) was handled correctly and does not constitute an anti-pattern.

### Human Verification Required

The following items cannot be verified programmatically:

#### 1. End-to-End Apple Sign-In Flow (Vendor/Driver)

**Test:** On a physical iOS device, open the Restaurant or Driver app. Tap "Sign in with Apple" using an Apple ID that has no vendor/driver account. Observe alert.
**Expected:** A "Registration Required" alert appears with a "Register Now" button that opens https://dollor.ai/restaurant/apply or https://dollor.ai/driver/apply in Safari.
**Why human:** Apple Sign-In requires physical device with enrolled Apple ID; simulator does not support production Apple auth flow.

#### 2. Android Google Sign-In Flow (Partner/Driver)

**Test:** On a physical Android device, open the Partner or Driver app. Tap "Sign in with Google" using a Google account that has no vendor/driver account on the platform.
**Expected:** An AlertDialog appears titled "Registration Required" with a "Register Now" button that opens the browser at the registration URL.
**Why human:** Google Sign-In requires device-level Google account configuration and production app signatures; unit tests cannot exercise the full OAuth token exchange.

#### 3. Existing Vendor/Driver Login Regression Check

**Test:** Log in with a Google or Apple account that IS already linked to a vendor or driver account on staging.
**Expected:** Login succeeds with 200 + access_token, user reaches their dashboard normally.
**Why human:** Requires a pre-existing vendor/driver account with OAuth credentials on the staging environment.

#### 4. Registration URL Web Pages Existence

**Test:** Open https://dollor.ai/restaurant/apply and https://dollor.ai/driver/apply in a browser.
**Expected:** Actual registration pages load (not 404).
**Why human:** The SUMMARY notes "Registration URLs need to be live web pages for the links to work" — these are external web pages outside the codebase.

### Gaps Summary

No gaps. All 8 observable truths are verified against the actual codebase. Backend OAuth endpoints correctly gate vendor/driver flows with 403 + registration_url JSON responses. Existing vendor/driver logins remain intact (200 + token path unchanged). iOS P2PAPIService decodes the 403 response into `P2PRegistrationRequiredResponse`, propagates it as `P2PAPIError.registrationRequired`, and both driver and restaurant login views catch and display the "Registration Required" alert. Android `safeApiCall` detects the 403 + registration_url before falling through to generic error handling, surfaces it as `RegistrationRequiredException`, and both partner and driver ViewModels map it to UI state that triggers AlertDialog display. All 39 backend auth tests pass including 7 tests specifically asserting the new 403 behavior. All 3 commits are present and substantive.

---

_Verified: 2026-02-24T23:15:00Z_
_Verifier: Claude (gsd-verifier)_
