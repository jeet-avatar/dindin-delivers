# Phase 03: Android Fixes - Research

**Researched:** 2026-02-20
**Domain:** Android Kotlin (Retrofit/Gson API client path fixes, test fixes)
**Confidence:** HIGH

## Summary

The phase description says "Commit Gson response wrapper fixes, rideshare field mismatches" but investigation reveals that all 6 Gson/wrapper fixes documented in MEMORY.md are **already committed** (commit `a48c05ae` on 2026-02-17). The actual uncommitted work is narrower: 2 files with 5 API path corrections from Phase 02's endpoint standardization work that were made but never committed.

Additionally, research uncovered secondary issues: (1) a failing integration test using the wrong staging URL, (2) hardcoded old CloudFront URLs in 5 UI files used for resolving relative photo URLs, and (3) a hardcoded production URL in TokenRefreshInterceptor. The test and URL issues are lower priority but should be documented for the planner.

**Primary recommendation:** Commit the 2 modified files (5 API path fixes), fix the failing test's staging URL, and optionally clean up hardcoded CloudFront URLs. This is a small commit-and-verify phase, not a development phase.

## Actual State of Android Repo

### Already Committed (DO NOT RE-DO)

All 6 items from MEMORY.md "Android Gson Fixes (Feb 17, 2026)" are in commit `a48c05ae`:

| Fix | Status | Commit |
|-----|--------|--------|
| BidsResponseWrapper, RideRequestsWrapper, ChatMessagesWrapper | COMMITTED | `a48c05ae` |
| RideTipResponse @SerializedName("tip_amount") | COMMITTED | `a48c05ae` |
| NegotiationStatusResponse @SerializedName fields | COMMITTED | `a48c05ae` |
| FareNegotiationResponse @SerializedName fields | COMMITTED | `a48c05ae` |
| Hardcoded "Customer" name -> secureStorage.customerName | COMMITTED | `a48c05ae` |
| RideBottomSheet wrong 96% earnings -> calculateDriverEarnings() | COMMITTED | `a48c05ae` |

### Actually Uncommitted (2 files, 5 path fixes)

**File 1: `CustomerRideshareApiService.kt`** (1 fix)
- `DELETE /api/rides/recurring/{id}` -> `DELETE /api/rides/recurring-rides/{id}`
- Backend route: `bid_routes.py:2993` -> `@router.delete("/recurring-rides/{ride_id}")`

**File 2: `DollorApiService.kt`** (4 fixes)
- `POST orders/create` -> `POST erp/orders/create` (backend: `main_new.py:14941`)
- `GET customer/rides` -> `GET customer/rides/history` (backend: `main_new.py:6825`)
- `POST rides/{rideId}/cancel` -> `POST rides/request/{rideId}/cancel` (backend: `bid_routes.py:896`)
- `POST erp/rides/{rideId}/rate` -> `POST rides/{rideId}/rate` (backend: `main_new.py:16012`)

All 5 path fixes verified against API_REGISTRY.md and backend source. Confidence: HIGH.

### Build Status

| Module | Compile | Unit Tests |
|--------|---------|------------|
| `:app` (customer) | PASS | 72/73 pass (1 integration test fails -- see below) |
| `:driver` | PASS | No tests (NO-SOURCE) |
| `:partner` (restaurant) | PASS | PASS |
| `:shared` | PASS | N/A (library) |

### Failing Test

**`OrderCreationFieldMappingTest.test_01_createOrder_withCorrectFieldMapping`** -- this is an integration test (not a unit test) that makes real HTTP calls to the staging server. It fails because:
1. It uses the **wrong staging URL**: `https://d3kuu45w6kl8hr.cloudfront.net` (this is actually production CloudFront's raw domain, NOT staging)
2. The correct staging URL is `https://d34u5ixl0bulv4.cloudfront.net`
3. It also calls `/api/orders/create` without auth, which now returns 401 after Phase 02 security work

**Location:** `app/src/test/java/ai/dollor/customer/staging/OrderCreationFieldMappingTest.kt:40`
**Also affected:** `app/src/test/java/ai/dollor/customer/staging/CustomerAppStagingApiTest.kt:40`

## Secondary Issues Found

### Hardcoded Old CloudFront URLs (MEDIUM priority)

5 instances of `https://d3kuu45w6kl8hr.cloudfront.net` used for resolving relative photo/image URLs in UI code:

| File | Line | Usage |
|------|------|-------|
| `driver/.../ProfileScreen.kt` | 275 | Vehicle photo URL fallback |
| `app/.../RideRequestScreen.kt` | 1297 | Driver photo URL in bid cards |
| `app/.../RideRequestScreen.kt` | 1511 | Driver photo URL in matched section |
| `app/.../RideRequestScreen.kt` | 1514 | Vehicle photo URL in matched section |
| `app/.../RideRequestScreen.kt` | 2155 | Driver photo URL in active ride |

These use the pattern: `if (url.startsWith("http")) url else "https://d3kuu45w6kl8hr.cloudfront.net$url"`

Since `d3kuu45w6kl8hr.cloudfront.net` is actually the production API domain (`api.dollor.ai`'s CloudFront distribution), this works in production. However, it should use `AppConfig.API_BASE_URL` or `AppConfig.apiBaseUrl` for consistency and to work correctly in staging.

### Hardcoded URL in TokenRefreshInterceptor (LOW priority)

`shared/.../TokenRefreshInterceptor.kt:42` has:
```kotlin
private const val BASE_URL = "https://api.dollor.ai/api/"
```

This is used for token refresh during Google auth. It works for production but won't work if testing against staging. Should use `AppConfig.API_BASE_URL` but this requires the interceptor to be initialized after AppConfig (which it currently is via Hilt DI). LOW priority -- only affects staging testing.

## Architecture Patterns

### Android Repo Structure
```
eatfair-android/
├── app/          # :app module - Customer app (Kotlin/Compose)
├── driver/       # :driver module - Driver app
├── partner/      # :partner module - Restaurant app
├── shared/       # :shared module - Shared code (API service, models, config)
└── build.gradle.kts
```

### API Client Pattern
The Android repo uses TWO API client patterns:

1. **Retrofit interface** (`DollorApiService.kt` in `:shared`) -- declarative API with `@GET/@POST` annotations. Used by all three app modules via Hilt DI. Paths are relative to base URL.

2. **OkHttp manual client** (`CustomerRideshareApiService.kt` in `:app`) -- imperative API using `Request.Builder()`. Only used by customer app for rideshare features. Uses `AppConfig.apiBaseUrl` dynamically.

### Key Files
- `shared/.../DollorApiService.kt` -- Retrofit interface (1395 lines, ~130 endpoints)
- `app/.../CustomerRideshareApiService.kt` -- OkHttp rideshare client (~1234 lines)
- `shared/.../AppConfig.kt` -- Environment configuration (API URLs, fees, etc.)
- `shared/.../SecureStorage.kt` -- Token storage
- `shared/.../DollorRepository.kt` -- Repository layer (login flows)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API path verification | Manual path-by-path review | `API_REGISTRY.md` cross-check | 641 endpoints, easy to miss |
| Photo URL resolution | Inline hardcoded URLs | Centralized helper function | 5+ scattered instances already |

## Common Pitfalls

### Pitfall 1: Assuming MEMORY.md is current
**What goes wrong:** Planning work that's already been committed
**Why it happens:** MEMORY.md tracks when changes were made but doesn't track when they were committed
**How to avoid:** Always check `git status` and `git log` in the actual Android repo before planning
**Warning signs:** MEMORY.md says "UNCOMMITTED" but `git diff` shows different files

### Pitfall 2: Wrong staging URL
**What goes wrong:** Tests/code point to `d3kuu45w6kl8hr.cloudfront.net` which is actually production
**Why it happens:** Historical confusion -- this was believed to be staging but is production CloudFront's raw domain
**How to avoid:** Correct staging URL is `d34u5ixl0bulv4.cloudfront.net` (with `X-Staging-Route` header)
**Warning signs:** Any reference to `d3kuu45w6kl8hr` in code is wrong for staging

### Pitfall 3: Retrofit base URL trailing slash
**What goes wrong:** Retrofit paths must NOT start with `/` when using relative URLs, or they'll override the base URL
**Why it happens:** Mixing absolute and relative URL patterns
**How to avoid:** All paths in `DollorApiService.kt` use relative paths (no leading `/`), base URL ends with `/api/`

## Verification Strategy

Since all changes are path corrections (no logic changes), verification is straightforward:

1. **Compile check**: `./gradlew :app:compileDebugKotlin :driver:compileDebugKotlin :partner:compileDebugKotlin`
2. **Unit tests**: `./gradlew :app:testDebugUnitTest` (expect 72/73 or 73/73 after test fix)
3. **Path verification**: Each changed Retrofit path should match a backend route in `API_REGISTRY.md`
4. **No backend changes needed**: All path fixes point to existing backend routes

## Open Questions

1. **Should photo URL hardcoding be fixed in this phase?**
   - What we know: 5 files use `d3kuu45w6kl8hr.cloudfront.net` for photo fallback, which works in production
   - What's unclear: Whether backend returns relative or absolute photo URLs; fixing could break if done wrong
   - Recommendation: Fix by extracting to a shared helper using `AppConfig.apiBaseUrl`, but mark as optional/low-priority

2. **Should TokenRefreshInterceptor hardcoded URL be fixed?**
   - What we know: Works for production, only breaks staging token refresh
   - What's unclear: Whether Hilt initialization order guarantees AppConfig is ready when interceptor is created
   - Recommendation: Skip for this phase -- it's a staging-only issue and requires DI investigation

3. **Android app release build + Play Store?**
   - What we know: Code compiles, unit tests pass
   - What's unclear: Whether the path fixes need a new Play Store release, or if current live apps are affected
   - Recommendation: Just commit for now; Play Store release is a separate process

## Sources

### Primary (HIGH confidence)
- `git status` and `git diff` in `/Users/jeet/StudioProjects/eatfair-android` -- actual uncommitted changes
- `git show a48c05ae` -- verified all Gson fixes are already committed
- `API_REGISTRY.md` -- cross-referenced all 5 path fixes against backend routes
- Backend source: `bid_routes.py:2993`, `main_new.py:14941`, `main_new.py:6825`, `bid_routes.py:896`, `main_new.py:16012`
- Build verification: All 3 modules compile, 72/73 customer tests pass

### Secondary (MEDIUM confidence)
- MEMORY.md -- accurately describes fixes but misleadingly says "UNCOMMITTED" for Gson fixes
- Photo URL pattern -- observed in 5 files but didn't verify what backend actually returns for photo_url fields

## Metadata

**Confidence breakdown:**
- Uncommitted changes: HIGH -- verified with `git diff` directly
- Gson fixes already committed: HIGH -- verified with `git show a48c05ae`
- Path correctness: HIGH -- cross-referenced with API_REGISTRY.md and backend source
- Photo URL issue: MEDIUM -- observed but not deeply investigated
- Test fix: HIGH -- clear wrong URL, clear correct URL from MEMORY.md

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable -- Android repo changes infrequently)
