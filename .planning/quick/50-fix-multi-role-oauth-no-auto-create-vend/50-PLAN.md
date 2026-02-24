---
phase: quick-50
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/tests/unit/test_auth_endpoints.py
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
  - apps/ios/delivery/eatffairdelivery/DriverLoginView.swift
  - apps/ios/restaurant/eatffairrestaurant/Views/LoginView.swift
  - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/auth/AuthViewModel.kt
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/auth/LoginScreen.kt
  - /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/auth/LoginViewModel.kt
  - /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/auth/LoginScreen.kt
autonomous: true
requirements: [QUICK-50]

must_haves:
  truths:
    - "Vendor OAuth (Apple+Google) returns 403 with registration_url when user has no vendor account"
    - "Driver OAuth (Apple+Google) returns 403 with registration_url when user has no driver account"
    - "Vendor OAuth still works (200 + token) for users who already have vendor_id"
    - "Driver OAuth still works (200 + token) for users who already have driver_id"
    - "Customer OAuth continues to auto-create accounts (unchanged)"
    - "Brand new users (no User row) on vendor/driver OAuth get 403 with registration_url"
    - "iOS driver/restaurant apps show registration URL and offer to open Safari on 403"
    - "Android driver/partner apps show registration URL and offer to open browser on 403"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "403 + registration_url responses for vendor/driver OAuth"
      contains: "registration_url"
    - path: "apps/web/p2p-platform/backend/tests/unit/test_auth_endpoints.py"
      provides: "Updated tests for 403 no-auto-create behavior"
      contains: "registration_url"
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift"
      provides: "P2PRegistrationRequiredResponse model for parsing registration_url"
      contains: "registration_url"
    - path: "apps/ios/delivery/eatffairdelivery/DriverLoginView.swift"
      provides: "Registration URL alert with Safari open action"
      contains: "dollor.ai/driver/apply"
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/LoginView.swift"
      provides: "Registration URL alert with Safari open action"
      contains: "dollor.ai/restaurant/apply"
  key_links:
    - from: "main_new.py vendor_apple_auth/vendor_google_auth"
      to: "iOS/Android vendor OAuth callers"
      via: "HTTP 403 + JSON {detail, registration_url, requires_registration}"
      pattern: "registration_url.*dollor.ai/restaurant/apply"
    - from: "main_new.py driver_apple_auth/driver_google_auth"
      to: "iOS/Android driver OAuth callers"
      via: "HTTP 403 + JSON {detail, registration_url, requires_registration}"
      pattern: "registration_url.*dollor.ai/driver/apply"
---

<objective>
Remove auto-create vendor/driver account logic from OAuth endpoints. When a user signs in via Apple/Google on the Restaurant or Driver app without an existing vendor/driver account, return HTTP 403 with a registration URL instead of silently creating an account. Customer app auto-create stays unchanged.

Purpose: Vendor and driver accounts require proper onboarding (address, documents, approval). Auto-creating empty shells via OAuth bypasses this, creating incomplete accounts that cause downstream issues.
Output: Backend returns 403 + registration_url for unregistered vendor/driver OAuth, iOS/Android apps handle the error gracefully with a link to the registration page.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/main_new.py (lines 2209-2513 vendor OAuth, lines 2832-3128 driver OAuth)
@apps/web/p2p-platform/backend/tests/unit/test_auth_endpoints.py (lines 330-401 TestMultiRoleAppleAuth)
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift (lines 1350-1528 vendor OAuth, lines 3666-3800 driver OAuth, line 7573 P2PErrorResponse)
@apps/ios/delivery/eatffairdelivery/DriverLoginView.swift (lines 535-545 Apple error handling, lines 640-650 Google error handling)
@apps/ios/restaurant/eatffairrestaurant/Views/LoginView.swift (lines 465-477 Apple error handling, lines 715-725 Google error handling)
@/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt (lines 43-87 safeApiCall, lines 359-433 driver/vendor auth)
@/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/auth/AuthViewModel.kt (lines 135-165 googleSignIn)
@/Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/auth/LoginViewModel.kt (lines 87-105 googleSignIn)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend — Replace auto-create with 403 + registration_url in vendor/driver OAuth</name>
  <files>
    apps/web/p2p-platform/backend/main_new.py
    apps/web/p2p-platform/backend/tests/unit/test_auth_endpoints.py
  </files>
  <action>
Modify 4 OAuth endpoints in `main_new.py` to return 403 with registration URL instead of auto-creating accounts:

**1. `vendor_google_auth` (line ~2244):** Replace the `else` branch at line 2244 ("User exists but has no vendor account -- create one and link it") with:
```python
else:
    # User exists but has no vendor account — direct them to register
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No restaurant account found. Please register as a restaurant partner first.",
        headers={"X-Registration-URL": "https://dollor.ai/restaurant/apply"}
    )
```
Also add `registration_url` and `requires_registration` to the response body. Since FastAPI HTTPException only returns `detail`, use a `JSONResponse` instead:
```python
else:
    # User exists but has no vendor account — direct them to register
    return JSONResponse(
        status_code=403,
        content={
            "detail": "No restaurant account found. Please register as a restaurant partner first.",
            "registration_url": "https://dollor.ai/restaurant/apply",
            "requires_registration": True
        }
    )
```
Similarly replace the `else` branch at line 2265 ("Brand new user -- create vendor + user") with the same JSONResponse (brand new users also need to register, not auto-create).

**2. `vendor_apple_auth` (line ~2403):** Replace the `else` branch at line 2403 ("User exists but has no vendor account -- create one and link it") with identical JSONResponse returning 403 + registration_url for `https://dollor.ai/restaurant/apply`. Also replace the `else` branch at line 2437 ("Create new vendor and user") with the same 403 response.

**3. `driver_google_auth` (line ~2872):** Replace the `else` branch at line 2872 ("User exists but has no driver account -- create one and link it") with:
```python
else:
    return JSONResponse(
        status_code=403,
        content={
            "detail": "No driver account found. Please register as a driver first.",
            "registration_url": "https://dollor.ai/driver/apply",
            "requires_registration": True
        }
    )
```
Also replace the `else` at line 2905 ("Brand new user -- create driver + user") with the same 403 response.

**4. `driver_apple_auth` (line ~3033):** Replace the `else` branch at line 3033 ("User exists but has no driver account -- create one and link it") with identical 403 response for `https://dollor.ai/driver/apply`. Also replace the `else` at line 3067 ("Brand new user -- create driver + user") with the same 403.

**Important:** Ensure `from starlette.responses import JSONResponse` is imported at the top of main_new.py (check if already imported — it likely is since FastAPI uses Starlette).

**KEEP unchanged:** The role-agnostic User query (no role filter) from quick-48 is correct. The `if user.vendor_id:` / `if user.driver_id:` login branches are correct. Only the `else` branches that auto-create need replacing.

**Update tests in `test_auth_endpoints.py`:**

In `TestMultiRoleAppleAuth`:

- `test_vendor_apple_auth_existing_driver_user` (line 333): Change assertion from expecting 200 with access_token to expecting 403 with `registration_url`. The test creates a driver user and tries vendor Apple auth — this should now return 403.
```python
assert response.status_code == 403
data = response.json()
assert "registration_url" in data
assert data["registration_url"] == "https://dollor.ai/restaurant/apply"
assert data["requires_registration"] is True
```

- `test_driver_apple_auth_existing_customer_user` (line 360): Change assertion from expecting 200 with access_token to expecting 403 with `registration_url` for driver.
```python
assert response.status_code == 403
data = response.json()
assert "registration_url" in data
assert data["registration_url"] == "https://dollor.ai/driver/apply"
assert data["requires_registration"] is True
```

- `test_vendor_apple_auth_still_works_for_existing_vendor` (line 375): This test should REMAIN passing as-is (200 + access_token) because the user already has vendor_id.

Add 2 new tests:
- `test_vendor_google_auth_no_vendor_returns_403`: POST to `/api/auth/vendor/google-auth` with a known customer-only email, expect 403 + registration_url.
- `test_driver_google_auth_no_driver_returns_403`: POST to `/api/auth/driver/google` with a known customer-only email, expect 403 + registration_url.

Also add:
- `test_vendor_apple_auth_brand_new_user_returns_403`: POST with completely new email/apple_id, expect 403.
- `test_driver_apple_auth_brand_new_user_returns_403`: POST with completely new email/apple_id, expect 403.
  </action>
  <verify>
Run: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -m pytest tests/unit/test_auth_endpoints.py -v --tb=short`

All tests should pass, including:
- TestMultiRoleAppleAuth::test_vendor_apple_auth_existing_driver_user (now expects 403)
- TestMultiRoleAppleAuth::test_driver_apple_auth_existing_customer_user (now expects 403)
- TestMultiRoleAppleAuth::test_vendor_apple_auth_still_works_for_existing_vendor (still expects 200)
- New 403 tests for Google auth and brand-new users
  </verify>
  <done>
4 vendor/driver OAuth endpoints return 403 + registration_url (instead of auto-creating accounts) for users without vendor_id/driver_id. Existing vendor/driver logins still return 200 + token. Customer OAuth unchanged. All tests pass.
  </done>
</task>

<task type="auto">
  <name>Task 2: iOS — Parse registration_url from 403 and show Safari-open alert in driver/restaurant apps</name>
  <files>
    apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    apps/ios/delivery/eatffairdelivery/DriverLoginView.swift
    apps/ios/restaurant/eatffairrestaurant/Views/LoginView.swift
  </files>
  <action>
**1. P2PAPIService.swift — Add registration-required response model and enhanced error parsing:**

Near `P2PErrorResponse` (line 7573), add a new model:
```swift
public struct P2PRegistrationRequiredResponse: Codable {
    public let detail: String
    public let registrationUrl: String?
    public let requiresRegistration: Bool?

    enum CodingKeys: String, CodingKey {
        case detail
        case registrationUrl = "registration_url"
        case requiresRegistration = "requires_registration"
    }
}
```

Add a new error case to `P2PAPIError` enum (find it near top of file):
```swift
case registrationRequired(String, String) // (message, registrationURL)
```

Update the 4 vendor/driver OAuth methods' error handling blocks to check for registration_url before falling back to generic error:

In `vendorGoogleAuth` (around line 1404-1412), `vendorAppleAuth` (around line 1498-1506), `driverGoogleAuth` (around line 3705-3711), and `driverAppleAuth` (around line 3781-3785):

Replace the error parsing block:
```swift
if httpResponse.statusCode >= 400 {
    // Check for registration-required response (403 with registration_url)
    if httpResponse.statusCode == 403,
       let regResponse = try? JSONDecoder().decode(P2PRegistrationRequiredResponse.self, from: data),
       let regURL = regResponse.registrationUrl {
        completion(.failure(P2PAPIError.registrationRequired(regResponse.detail, regURL)))
        return
    }
    if let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
        // ... existing error handling
```

**2. DriverLoginView.swift — Handle registrationRequired error with alert + Safari link:**

Add state variables near line 110 (`@State private var errorMessage = ""`):
```swift
@State private var showRegistrationAlert = false
@State private var registrationURL: String = ""
```

In the Apple Sign-In completion handler (line ~537 `.failure(let error):`), add a check BEFORE the existing errMsg matching:
```swift
case .failure(let error):
    if case P2PAPIError.registrationRequired(let message, let url) = error {
        self.registrationURL = url
        self.showRegistrationAlert = true
    } else {
        let errMsg = error.localizedDescription.lowercased()
        // ... existing error handling
    }
```

Do the same in the Google Sign-In completion handler (line ~642 `.failure(let error):`).

Add a `.alert` modifier to the main view body (near other alert modifiers or at end of body):
```swift
.alert("Registration Required", isPresented: $showRegistrationAlert) {
    Button("Register Now") {
        if let url = URL(string: registrationURL) {
            UIApplication.shared.open(url)
        }
    }
    Button("Cancel", role: .cancel) {}
} message: {
    Text("You need to register as a driver first. Tap 'Register Now' to apply on our website.")
}
```

Add `import UIKit` if not already present (needed for `UIApplication.shared.open`). Actually, SwiftUI has `@Environment(\.openURL)` — prefer that pattern if already used in the file. Otherwise `UIApplication.shared.open(url)` works fine in iOS.

**3. Restaurant LoginView.swift — Same pattern as driver:**

Add state variables near existing `@State` declarations:
```swift
@State private var showRegistrationAlert = false
@State private var registrationURL: String = ""
```

In Apple Sign-In completion (line ~471 `errMsg.contains("not found")`), add check BEFORE:
```swift
if case P2PAPIError.registrationRequired(let message, let url) = error {
    self.registrationURL = url
    self.showRegistrationAlert = true
} else {
    let errMsg = error.localizedDescription.lowercased()
    // ... existing
}
```

Same for Google Sign-In completion (line ~720).

Add alert modifier:
```swift
.alert("Registration Required", isPresented: $showRegistrationAlert) {
    Button("Register Now") {
        if let url = URL(string: registrationURL) {
            UIApplication.shared.open(url)
        }
    }
    Button("Cancel", role: .cancel) {}
} message: {
    Text("You need to register as a restaurant partner first. Tap 'Register Now' to apply on our website.")
}
```

**Customer app (eatfaircustomer): NO CHANGES.** Customer OAuth auto-create stays as-is.
  </action>
  <verify>
Build all 3 iOS apps:
```bash
cd /Users/jeet/doordash-p2p
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatfaircustomer -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairdelivery -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
```
All 3 must compile successfully (BUILD SUCCEEDED).
  </verify>
  <done>
iOS P2PAPIService parses 403 registration_url from vendor/driver OAuth errors. Driver and Restaurant login views show a "Registration Required" alert with a "Register Now" button that opens the registration URL in Safari. Customer app unchanged.
  </done>
</task>

<task type="auto">
  <name>Task 3: Android — Handle registration_url error in driver and partner app auth flows</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/ApiModels.kt
    /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/auth/AuthViewModel.kt
    /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/auth/LoginScreen.kt
    /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/auth/LoginViewModel.kt
    /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/auth/LoginScreen.kt
  </files>
  <action>
**1. ApiModels.kt — Add RegistrationRequiredException:**

Near `ErrorResponse` (line 1417), add:
```kotlin
data class RegistrationRequiredResponse(
    val detail: String,
    @SerializedName("registration_url") val registrationUrl: String?,
    @SerializedName("requires_registration") val requiresRegistration: Boolean?
)
```

**2. DollorRepository.kt — Detect 403 + registration_url in safeApiCall:**

Create a custom exception class (at top of file or in a shared exceptions file):
```kotlin
class RegistrationRequiredException(
    val registrationUrl: String,
    message: String
) : Exception(message)
```

In `safeApiCall` (line 51), inside the `HttpException` catch block, BEFORE the existing `backendDetail` extraction, add:
```kotlin
} catch (e: HttpException) {
    // Check for registration-required (403 with registration_url)
    if (e.code() == 403) {
        try {
            val errorBody = e.response()?.errorBody()?.string()
            if (errorBody != null) {
                val regResponse = com.google.gson.Gson().fromJson(errorBody, RegistrationRequiredResponse::class.java)
                if (regResponse?.registrationUrl != null) {
                    return Result.failure(RegistrationRequiredException(
                        registrationUrl = regResponse.registrationUrl,
                        message = regResponse.detail
                    ))
                }
            }
        } catch (_: Exception) { /* fall through to existing handling */ }
    }
    // ... existing HttpException handling (backendDetail extraction etc.)
```

NOTE: The `errorBody()?.string()` can only be read once. Since we read it in the 403 check, we need to handle the case where it's not a registration error but still 403. Use a local variable to store the body string, then reuse it in the existing `backendDetail` logic below. Restructure:
```kotlin
} catch (e: HttpException) {
    val errorBody = try { e.response()?.errorBody()?.string() } catch (_: Exception) { null }

    // Check for registration-required (403 with registration_url)
    if (e.code() == 403 && errorBody != null) {
        try {
            val regResponse = com.google.gson.Gson().fromJson(errorBody, RegistrationRequiredResponse::class.java)
            if (regResponse?.registrationUrl != null) {
                return Result.failure(RegistrationRequiredException(
                    registrationUrl = regResponse.registrationUrl,
                    message = regResponse.detail
                ))
            }
        } catch (_: Exception) { /* not a registration response */ }
    }

    val backendDetail = try {
        if (errorBody != null) {
            val json = com.google.gson.JsonParser.parseString(errorBody).asJsonObject
            json.get("detail")?.asString
        } else null
    } catch (_: Exception) { null }
    // ... rest stays the same
```

**3. Partner AuthViewModel.kt — Handle RegistrationRequiredException in googleSignIn:**

Add a new AuthState variant:
```kotlin
data class RegistrationRequired(val registrationUrl: String, val message: String) : AuthState()
```

In `googleSignIn` (line 158), change the `.onFailure` block:
```kotlin
.onFailure { e ->
    if (e is RegistrationRequiredException) {
        _authState.value = AuthState.RegistrationRequired(e.registrationUrl, e.message)
    } else {
        _authState.value = AuthState.Error(e.message ?: "Google sign-in failed")
    }
}
```
Also update the outer catch block (line 161) similarly.

**4. Partner LoginScreen.kt — Show registration dialog:**

Add state and imports for opening URLs:
```kotlin
import android.content.Intent
import android.net.Uri
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.TextButton
```

In the Composable, handle the `AuthState.RegistrationRequired` state. After the existing error display block (line ~289), add:
```kotlin
if (authState is AuthState.RegistrationRequired) {
    val regState = authState as AuthState.RegistrationRequired
    AlertDialog(
        onDismissRequest = { viewModel.setError("") },
        title = { Text("Registration Required") },
        text = { Text("You need to register as a restaurant partner first. Tap 'Register Now' to apply on our website.") },
        confirmButton = {
            TextButton(onClick = {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(regState.registrationUrl))
                context.startActivity(intent)
            }) {
                Text("Register Now")
            }
        },
        dismissButton = {
            TextButton(onClick = { viewModel.setError("") }) {
                Text("Cancel")
            }
        }
    )
}
```

Make sure `context` is available: `val context = LocalContext.current` (add near top of composable if not already present).

**5. Driver LoginViewModel.kt — Handle RegistrationRequiredException:**

Add a new field to `LoginUiState`:
```kotlin
data class LoginUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val isLoggedIn: Boolean = false,
    val registrationUrl: String? = null  // NEW
)
```

In `googleSignIn` (line 98), change `.onFailure`:
```kotlin
.onFailure { e ->
    if (e is RegistrationRequiredException) {
        _uiState.value = _uiState.value.copy(
            isLoading = false,
            registrationUrl = e.registrationUrl,
            error = e.message
        )
    } else {
        _uiState.value = _uiState.value.copy(
            isLoading = false,
            error = e.message ?: "Google sign-in failed"
        )
    }
}
```

Also handle in the `login` function's `.onFailure` (find it) since email/password login to driver endpoint could also return 403 if user has no driver account.

Add a function to clear the registration URL state:
```kotlin
fun clearRegistrationPrompt() {
    _uiState.value = _uiState.value.copy(registrationUrl = null, error = null)
}
```

**6. Driver LoginScreen.kt — Show registration dialog:**

Add imports for AlertDialog, Intent, Uri, LocalContext (if not present).

After the error display block (line ~488), add:
```kotlin
uiState.registrationUrl?.let { url ->
    AlertDialog(
        onDismissRequest = { viewModel.clearRegistrationPrompt() },
        title = { Text("Registration Required") },
        text = { Text("You need to register as a driver first. Tap 'Register Now' to apply on our website.") },
        confirmButton = {
            TextButton(onClick = {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                context.startActivity(intent)
            }) {
                Text("Register Now")
            }
        },
        dismissButton = {
            TextButton(onClick = { viewModel.clearRegistrationPrompt() }) {
                Text("Cancel")
            }
        }
    )
}
```

**Customer app (`:app`): NO CHANGES.** Customer Google auth auto-create stays as-is.

**Apple auth on Android:** The Retrofit endpoints `driverAppleAuth` and `vendorAppleAuth` exist but are not called from ViewModels on Android (Apple Sign-In is not native on Android). The `safeApiCall` change covers them anyway if they are ever used.
  </action>
  <verify>
Build all 3 Android apps:
```bash
cd /Users/jeet/StudioProjects/eatfair-android
./gradlew :app:compileDebugKotlin :driver:compileDebugKotlin :partner:compileDebugKotlin 2>&1 | tail -10
```
All 3 must compile without errors.

Run unit tests:
```bash
./gradlew :app:testDebugUnitTest :driver:testDebugUnitTest :partner:testDebugUnitTest 2>&1 | tail -10
```
  </verify>
  <done>
Android DollorRepository detects 403 + registration_url via RegistrationRequiredException. Driver and Partner apps show AlertDialog with "Register Now" button that opens the registration URL in the browser. Customer app unchanged.
  </done>
</task>

</tasks>

<verification>
1. Backend: `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -m pytest tests/unit/test_auth_endpoints.py -v --tb=short` -- all pass
2. iOS: All 3 apps build successfully with `xcodebuild`
3. Android: All 3 apps compile and unit tests pass with `./gradlew`
4. Grep verification:
   - `grep -n "registration_url" apps/web/p2p-platform/backend/main_new.py` shows 403 responses in all 4 endpoints
   - `grep -n "registrationRequired\|registration_url\|RegistrationRequired" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` shows error case and response model
   - `grep -rn "RegistrationRequiredException\|registrationUrl" /Users/jeet/StudioProjects/eatfair-android/shared/` shows exception class and response model
</verification>

<success_criteria>
- Vendor OAuth endpoints (Apple + Google) return 403 with `registration_url: "https://dollor.ai/restaurant/apply"` when user has no vendor_id
- Driver OAuth endpoints (Apple + Google) return 403 with `registration_url: "https://dollor.ai/driver/apply"` when user has no driver_id
- Existing vendor/driver users can still log in normally (200 + token)
- Customer OAuth auto-create is unchanged
- iOS driver/restaurant apps show "Registration Required" alert with "Register Now" Safari link
- Android driver/partner apps show AlertDialog with "Register Now" browser link
- All apps compile, all backend tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/50-fix-multi-role-oauth-no-auto-create-vend/50-SUMMARY.md`
</output>
