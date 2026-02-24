---
phase: quick-42
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/delivery/eatffairdelivery/Info.plist
  - apps/ios/delivery/eatffairdelivery/DriverLoginView.swift
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
  - apps/web/p2p-platform/backend/models.py
  - apps/web/p2p-platform/backend/main_new.py
autonomous: true
requirements: [BUG-1, BUG-2, BUG-3, BUG-4]

must_haves:
  truths:
    - "Driver Google Sign-In opens Google OAuth prompt (URL scheme matches GoogleService-Info.plist)"
    - "Driver Google Sign-In calls /api/auth/driver/google endpoint (not driverRegister)"
    - "Driver Apple Sign-In works on subsequent logins (email not required)"
    - "Vendor Apple Sign-In works on subsequent logins (apple_id lookup fallback)"
    - "Backend unit tests pass with no regressions"
  artifacts:
    - path: "apps/ios/delivery/eatffairdelivery/Info.plist"
      provides: "Corrected Google URL scheme for driver app"
      contains: "com.googleusercontent.apps.65740760476-q3k21qkra9rm84de8eehsjsc42uo2lun"
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift"
      provides: "driverGoogleAuth() method calling /auth/driver/google"
      exports: ["driverGoogleAuth"]
    - path: "apps/ios/delivery/eatffairdelivery/DriverLoginView.swift"
      provides: "handleGoogleLogin using driverGoogleAuth, driverAppleAuth sends identity_token"
    - path: "apps/web/p2p-platform/backend/models.py"
      provides: "apple_id column on Driver and Vendor models"
      contains: "apple_id = Column"
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Driver/Vendor Apple auth with apple_id lookup fallback + identity_token decoding"
  key_links:
    - from: "DriverLoginView.swift:handleGoogleLogin"
      to: "P2PAPIService.swift:driverGoogleAuth"
      via: "method call"
      pattern: "driverGoogleAuth.*email.*name.*googleId"
    - from: "P2PAPIService.swift:driverGoogleAuth"
      to: "/api/auth/driver/google"
      via: "HTTP POST"
      pattern: "auth/driver/google"
    - from: "main_new.py:driver_apple_auth"
      to: "Driver.apple_id"
      via: "SQLAlchemy query"
      pattern: "Driver.*apple_id"
    - from: "main_new.py:vendor_apple_auth"
      to: "Vendor (via User email or identity_token)"
      via: "identity_token decode + email lookup"
      pattern: "identity_token.*decode"
---

<objective>
Fix 4 iOS authentication bugs across driver and vendor Google/Apple Sign-In flows.

Purpose: Driver Google Sign-In is completely broken (wrong URL scheme + calls registration instead of OAuth). Driver and Vendor Apple Sign-In fail on subsequent logins because Apple only provides email on first sign-in and the backend requires it.

Output: Working Google and Apple Sign-In for driver and vendor apps, backend apple_id lookup for returning Apple users.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/ios/delivery/eatffairdelivery/Info.plist
@apps/ios/delivery/eatffairdelivery/GoogleService-Info.plist
@apps/ios/delivery/eatffairdelivery/DriverLoginView.swift
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
@apps/web/p2p-platform/backend/main_new.py
@apps/web/p2p-platform/backend/models.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Driver Google Sign-In (Bug 1 + Bug 2 — iOS side)</name>
  <files>
    apps/ios/delivery/eatffairdelivery/Info.plist
    apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    apps/ios/delivery/eatffairdelivery/DriverLoginView.swift
  </files>
  <action>
**Bug 1 — Fix URL scheme mismatch in Info.plist:**
- Line 18 of Info.plist currently has `com.googleusercontent.apps.65740760476-i73jas8b45cksic8n45f3bb6bnr5b0ij`
- Replace with `com.googleusercontent.apps.65740760476-q3k21qkra9rm84de8eehsjsc42uo2lun` to match GoogleService-Info.plist REVERSED_CLIENT_ID at line 8

**Bug 2a — Add driverGoogleAuth() to P2PAPIService.swift:**
- Add new method `driverGoogleAuth(email:name:googleId:completion:)` near line ~3641 (after existing `driverAppleAuth` method, around line 3708)
- Copy the pattern from `customerGoogleAuth()` at line 1594-1656 exactly, but:
  - Change URL to `"\(baseURL)/auth/driver/google"` (backend endpoint at main_new.py:2780)
  - Change response type to `P2PDriverLoginResponse` (not `P2PCustomerLoginResponse`)
  - Store token as `SecureStorage.shared.driverAccessToken = loginResponse.accessToken`
  - Store driver info in UserDefaults using `UserDefaultsKey.driverId`, `.driverCode`, `.driverName`, `.driverEmail`, `.driverStatus`, `.driverIsApproved`, `.driverRequiresDocuments` — same pattern as `driverAppleAuth()` at lines 3692-3700
  - Error message: "Google auth failed" (not "Failed to decode login response")

**Bug 2b — Fix DriverLoginView.swift handleGoogleLogin():**
- Replace the body of `handleGoogleLogin()` starting at line ~614 (after extracting `googleEmail`, `googleFirstName`, `googleLastName`)
- Remove the `driverRegister()` call (lines 623-648), the `generateSecureGooglePassword()` helper (lines 654-671), and the `attemptGoogleReLogin()` helper (lines 675+)
- Replace with a single call to `p2pService.driverGoogleAuth(email: googleEmail, name: "\(googleFirstName) \(googleLastName)".trimmingCharacters(in: .whitespaces), googleId: user.userID)` with completion handler that sets `self.isLoggedIn = true` on success, or sets appropriate `self.errorMessage` on failure
- Keep the same DispatchQueue.main.async pattern for UI updates
- Keep the existing guard-let for email validation at lines 606-612

**Bug 3 (iOS side) — Update driverAppleAuth call to send identity_token:**
- In DriverLoginView.swift `handleAppleSignIn()` at line ~522-526, the call to `driverAppleAuth` does NOT send `identityToken`
- Extract the identity token from the Apple credential: `let identityTokenData = appleIDCredential.identityToken` and `let identityTokenString = identityTokenData.flatMap { String(data: $0, encoding: .utf8) }`
- Add `identityToken` parameter to the call (add it after extracting appleUserId around line 502)

**Bug 3 (iOS side) — Update driverAppleAuth() signature in P2PAPIService.swift:**
- At line 3641, add `identityToken: String? = nil` parameter to `driverAppleAuth()`
- In the body dict (line 3656-3660), add identity_token conditionally: `if let token = identityToken { body["identity_token"] = token }`
- Change `let body` to `var body` to allow mutation
- Follow the exact same pattern as `vendorAppleAuth()` at lines 1439-1467 (which already sends identity_token)
  </action>
  <verify>
Build the driver app to confirm no compilation errors:
```
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairdelivery -configuration Debug -destination 'generic/platform=iOS' build 2>&1 | tail -5
```
Verify the URL scheme matches: `grep -A2 'CFBundleURLSchemes' apps/ios/delivery/eatffairdelivery/Info.plist`
Verify driverGoogleAuth exists: `grep 'driverGoogleAuth' apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift`
Verify identity_token in driverAppleAuth: `grep 'identityToken' apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift | grep -i driver`
  </verify>
  <done>
- Info.plist URL scheme matches GoogleService-Info.plist REVERSED_CLIENT_ID
- P2PAPIService.swift has driverGoogleAuth() method calling /auth/driver/google
- DriverLoginView handleGoogleLogin() calls driverGoogleAuth() (not driverRegister)
- driverAppleAuth() accepts and sends identity_token parameter
- DriverLoginView handleAppleSignIn() extracts and sends identity_token from Apple credential
- Driver app builds without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix Driver + Vendor Apple Auth backend (Bug 3 + Bug 4)</name>
  <files>
    apps/web/p2p-platform/backend/models.py
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
**Add apple_id columns to Driver and Vendor models (models.py):**
- In `class Driver` (line 711), add after line 724 (license_number): `apple_id = Column(String(255), unique=True, nullable=True, index=True)  # Apple Sign In user ID`
- In `class Vendor` (line 141), add after line 171 (contact_phone): `apple_id = Column(String(255), unique=True, nullable=True, index=True)  # Apple Sign In user ID`

**Add startup migration for apple_id columns (main_new.py):**
- In `_run_startup_migrations()` migrations list, before the closing `]` at line 1341, add:
  ```
  # Apple Sign-In user ID for returning user lookup
  ("drivers", "apple_id", "VARCHAR(255)"),
  ("vendors", "apple_id", "VARCHAR(255)"),
  ```

**Fix Bug 3 — Rewrite driver_apple_auth() (main_new.py ~line 2914-2996):**
- Change `DriverAppleAuthRequest` (line 2914-2918):
  ```python
  class DriverAppleAuthRequest(BaseModel):
      email: Optional[str] = ""  # Apple only provides on first sign-in
      name: Optional[str] = None
      apple_id: str
      identity_token: Optional[str] = None  # JWT from Apple containing email for returning users
  ```
- Rewrite `driver_apple_auth()` (line 2921) to follow the EXACT pattern of `customer_apple_auth()` at lines 6076-6165:
  1. First try to decode identity_token to extract email (same `decode_google_jwt` call)
  2. Look up by apple_id first: `driver = db.query(Driver).filter(Driver.apple_id == request.apple_id).first()` — if found, get email from driver, then find user
  3. Fall back to email lookup: `user = db.query(User).filter(User.email == email).first()` then check `user.driver_id`
  4. If no user and no email: raise 400 "Email is required for first-time Apple Sign-In..."
  5. If new user: create Driver + User (keep existing creation code at lines 2940-2968)
  6. Store apple_id on driver if not already set: `if driver and not driver.apple_id: driver.apple_id = request.apple_id; db.commit()`
  7. Also store apple_id on NEW drivers at creation: add `apple_id=request.apple_id` to `Driver()` constructor
  8. Keep the existing suspended driver check
  9. Keep the existing JWT creation and response format at lines 2984-2996

**Fix Bug 4 — Update vendor_apple_auth() (main_new.py ~line 2337-2429):**
- The `VendorAppleAuthRequest` at line 2337-2341 already has `email: str = ""` and `identity_token: Optional[str] = None` -- good
- The vendor_apple_auth() at line 2344 already decodes identity_token (lines 2354-2364) -- good
- BUT it only looks up by email (line 2376), NOT by apple_id
- Add apple_id lookup BEFORE email lookup (follow customer pattern at lines 6101-6118):
  1. After identity_token decoding and before the "If still no email" check at line 2372:
     ```python
     # For returning users, look up by apple_id first
     existing_user = None
     if request.apple_id:
         # Try to find vendor by apple_id
         vendor = db.query(Vendor).filter(Vendor.apple_id == request.apple_id).first()
         if vendor:
             email = vendor.contact_email
             existing_user = db.query(User).filter(User.email == email).first()
     ```
  2. Only do email lookup if apple_id lookup failed: `if not existing_user and email:` (modify existing line 2376)
  3. Store apple_id on vendor when creating new vendor: add `apple_id=request.apple_id` to `Vendor()` constructor at line 2392
  4. Store apple_id on existing vendor if not set: after finding existing vendor, `if vendor and not vendor.apple_id: vendor.apple_id = request.apple_id; db.commit()`
  5. NOTE: Vendor model uses `contact_email` not `email` — make sure apple_id lookup uses `vendor.contact_email`

**IMPORTANT:** Do NOT change the response format of any endpoint. Keep all existing response fields identical.
  </action>
  <verify>
Run backend tests to confirm no regressions:
```
cd apps/web/p2p-platform/backend && python -m pytest tests/ -v --timeout=60 2>&1 | tail -20
```
Verify apple_id in models: `grep 'apple_id' apps/web/p2p-platform/backend/models.py`
Verify driver apple auth has apple_id lookup: `grep -n 'apple_id' apps/web/p2p-platform/backend/main_new.py | head -20`
Verify DriverAppleAuthRequest has Optional email: `grep -A5 'class DriverAppleAuthRequest' apps/web/p2p-platform/backend/main_new.py`
Verify startup migration includes apple_id: `grep 'apple_id' apps/web/p2p-platform/backend/main_new.py | grep -i migration\|drivers\|vendors`
  </verify>
  <done>
- Driver model has apple_id column (models.py + startup migration)
- Vendor model has apple_id column (models.py + startup migration)
- DriverAppleAuthRequest.email is Optional (not required)
- driver_apple_auth() looks up by apple_id first, falls back to email (like customer_apple_auth)
- driver_apple_auth() stores apple_id on Driver record
- vendor_apple_auth() looks up by apple_id first, falls back to email
- vendor_apple_auth() stores apple_id on Vendor record
- All backend tests pass (no regressions)
  </done>
</task>

</tasks>

<verification>
1. `grep 'q3k21qkra9rm84de8eehsjsc42uo2lun' apps/ios/delivery/eatffairdelivery/Info.plist` — URL scheme matches GoogleService-Info.plist
2. `grep 'driverGoogleAuth' apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` — method exists
3. `grep 'driverGoogleAuth' apps/ios/delivery/eatffairdelivery/DriverLoginView.swift` — called from login view
4. `grep -c 'driverRegister' apps/ios/delivery/eatffairdelivery/DriverLoginView.swift` — should be 0 in Google login path (may still exist as method on P2PAPIService)
5. `grep 'apple_id' apps/web/p2p-platform/backend/models.py | wc -l` — at least 3 (Customer + Driver + Vendor)
6. `grep -A3 'class DriverAppleAuthRequest' apps/web/p2p-platform/backend/main_new.py` — email is Optional
7. `cd apps/web/p2p-platform/backend && python -m pytest tests/ -v --timeout=60` — all pass
8. Build driver app: `xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairdelivery -configuration Debug -destination 'generic/platform=iOS' build`
</verification>

<success_criteria>
- Driver Google Sign-In uses correct URL scheme from GoogleService-Info.plist
- Driver Google Sign-In calls proper OAuth endpoint /api/auth/driver/google (not driverRegister)
- Driver Apple Sign-In works for returning users (apple_id lookup, email optional)
- Vendor Apple Sign-In works for returning users (apple_id lookup)
- Backend tests pass, iOS driver app builds clean
</success_criteria>

<output>
After completion, create `.planning/quick/42-fix-ios-google-and-apple-sign-in-4-bugs-/42-SUMMARY.md`
</output>
