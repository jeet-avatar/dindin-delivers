---
phase: quick-59
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/tests/integration/test_document_save_flow.py
  - apps/web/p2p-platform/backend/tests/integration/test_android_restaurant_e2e_workflow.py
  - apps/web/p2p-platform/backend/tests/test_cross_platform.py
autonomous: true
requirements: [FIX-TESTS, BUILD-DISTRIBUTE]

must_haves:
  truths:
    - "All 24 previously-failing tests pass (12 document_save, 4 android_e2e, 8 cross_platform)"
    - "Zero test regressions across the full suite"
    - "All 6 apps built and distributed (3 iOS TestFlight + 3 Android Firebase)"
  artifacts:
    - path: "apps/web/p2p-platform/backend/tests/integration/test_document_save_flow.py"
      provides: "Fixed vendor auth -- uses vendor_auth_headers instead of admin_auth_headers"
    - path: "apps/web/p2p-platform/backend/tests/integration/test_android_restaurant_e2e_workflow.py"
      provides: "Fixed vendor auth -- uses vendor_auth_headers for vendor endpoints, admin_auth_headers only for admin endpoints"
    - path: "apps/web/p2p-platform/backend/tests/test_cross_platform.py"
      provides: "Removed local client/auth fixtures, uses conftest fixtures with proper DB"
  key_links:
    - from: "tests/integration/test_document_save_flow.py"
      to: "conftest.py vendor_auth_headers fixture"
      via: "fixture injection"
      pattern: "vendor_auth_headers"
    - from: "tests/test_cross_platform.py"
      to: "conftest.py client fixture"
      via: "fixture inheritance (remove local overrides)"
      pattern: "client.*db_session"
---

<objective>
Fix 24 failing backend tests caused by auth fixture mismatches, then build and distribute all 6 apps.

Purpose: Tests are failing because vendor-authenticated endpoints (`/api/vendors/{id}/documents`, `/api/vendors/{id}/menu`, `PATCH /api/vendors/{id}`) use `Depends(require_vendor)` but tests pass `admin_auth_headers` which creates a JWT with admin email -- `require_vendor` looks up by `contact_email` in Vendor table and returns 401 "Vendor account not found". Additionally, `test_cross_platform.py` defines its own `client` fixture without DB setup, causing "no such table" errors. After fixes, build and distribute all 6 apps with incremented build numbers.

Output: All 24 tests green, 6 apps distributed
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/web/p2p-platform/backend/tests/conftest.py
@apps/web/p2p-platform/backend/auth_utils.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix all 24 failing backend tests (auth fixture issues)</name>
  <files>
    apps/web/p2p-platform/backend/tests/integration/test_document_save_flow.py
    apps/web/p2p-platform/backend/tests/integration/test_android_restaurant_e2e_workflow.py
    apps/web/p2p-platform/backend/tests/test_cross_platform.py
  </files>
  <action>
**Root cause analysis (verified by running tests):**

1. **test_document_save_flow.py (12 failures):** All tests in `TestDocumentUploadAndSave`, `TestDocumentRetrieval`, `TestDocumentSaveToDatabase`, and `TestCrossPlatformDocumentUpload` use `admin_auth_headers` for endpoints `POST /api/vendors/{id}/documents` and `GET /api/vendors/{id}/documents`. These endpoints use `Depends(require_vendor)` which looks up `contact_email` in the Vendor table. Admin email is not in the Vendor table, so they get 401. The `TestPublicDocumentUpload` tests (2 tests) already pass because they use the public endpoint.

   **Fix:** Change `admin_auth_headers` to `vendor_auth_headers` in ALL test methods that hit `/api/vendors/{vendor_id}/documents` (both POST and GET). The `vendor_auth_headers` fixture in conftest.py (line 276) already creates a JWT with `sub=test_vendor.contact_email` and `vendor_id=test_vendor.id`, which is exactly what `require_vendor` needs.

   Specifically, change these test methods to use `vendor_auth_headers` instead of `admin_auth_headers`:
   - `TestDocumentUploadAndSave`: all 5 tests (test_upload_w9_form, test_upload_health_permit, test_upload_food_handler, test_upload_liability_insurance, test_upload_business_license)
   - `TestDocumentRetrieval`: both tests (test_get_vendor_documents_returns_uploaded_docs, test_get_documents_reflects_upload_status)
   - `TestDocumentSaveToDatabase`: both tests (test_multiple_documents_all_saved, test_document_upload_updates_last_activity)
   - `TestCrossPlatformDocumentUpload`: all 3 tests (test_multipart_upload_format, test_image_upload_jpg, test_image_upload_png)

2. **test_android_restaurant_e2e_workflow.py (4 failures):**
   - `TestAndroidRestaurantE2EWorkflow.test_complete_restaurant_workflow`: This is a self-contained E2E test that registers a vendor and gets a vendor_token back. The problem is it uses `admin_auth_headers` for vendor endpoints like `PATCH /api/vendors/{id}`, `POST /api/vendors/{id}/documents`, `POST /api/vendors/{id}/menu`. These use `Depends(require_vendor)`. The admin endpoints like `PATCH /api/vendors/{id}/status` (approval) correctly use admin auth.

     **Fix:** In `test_complete_restaurant_workflow`, use `vendor_headers` (the headers built from the registration token) for Steps 3 (profile update), 4 (document upload), and 5 (menu creation). Keep `admin_auth_headers` only for Step 2 (pre-approve -- `PATCH /api/vendors/{id}/status` which uses `require_admin` or admin middleware), Step 7 (approval), and Step 8 (published check). Also, the profile PATCH at Step 3 line 141-153 should use `vendor_headers`, not `admin_auth_headers`.

   - `TestAddressValidation.test_address_format_saved_correctly`: Uses `admin_auth_headers` for `PATCH /api/vendors/{vendor_id}` which requires `require_vendor`. **Fix:** Change to `vendor_auth_headers`.

   - `TestMenuWorkflow.test_create_update_delete_menu_items`: Uses `admin_auth_headers` for `POST/PUT/DELETE /api/vendors/{vendor_id}/menu`. These require `require_vendor`. **Fix:** Change to `vendor_auth_headers`.

   - `TestDocumentUploadWorkflow.test_upload_all_required_documents`: Uses `admin_auth_headers` for `POST /api/vendors/{vendor_id}/documents`. Requires `require_vendor`. **Fix:** Change to `vendor_auth_headers`.

3. **test_cross_platform.py (8 failures):** This file defines its OWN `client` fixture at line 272 that creates `TestClient(app)` WITHOUT database setup. The conftest `client` fixture properly sets up test DB, overrides `get_db`, and clears startup handlers. The local fixture shadows it, causing `OperationalError: no such table: customers`. It also defines `auth_token`, `driver_token`, `vendor_token` fixtures that return `None`.

   **Fix:** Remove the local `client`, `auth_token`, `driver_token`, and `vendor_token` fixtures at the bottom of the file (lines 271-298). The conftest fixtures will then be used. The tests already handle 401 gracefully (`assert response.status_code in [200, 401]`), and the `auth_token`/`driver_token`/`vendor_token` fixture names don't exist in conftest (the conftest has `auth_headers`, `driver_auth_headers`, `vendor_auth_headers` instead), so ALSO update the test functions that use these fixtures:

   For `TestCartOperations`, `TestOrderPlacement`, `TestOrderTracking`, `TestPaymentProcessing` which use `auth_token` -- change to use `customer_auth_headers` fixture instead and update the header construction. Instead of `headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}`, change to `headers = customer_auth_headers`.

   For `TestDriverLocation` which uses `driver_token` -- change to `driver_auth_headers`.

   For `TestVendorStatus` which uses `vendor_token` -- change to `vendor_auth_headers`.

   For `TestCrossPlatformAuth`, `TestVendorAuth`, `TestDriverAuth` -- these only need `client` fixture (no auth needed, they test login endpoints). They already handle [200, 401].

   For `TestMenuRetrieval` -- only needs `client` fixture, no auth needed. Tests already handle [200, 404].

   **IMPORTANT:** When removing the local `client` fixture, the conftest `client` fixture requires `db_session` which is injected automatically. Add `db_session` as a parameter to tests that need it if not already present. Actually, the conftest `client` fixture already depends on `db_session` via fixture injection, so just adding `client` to the test method signature is enough (which is already there).
  </action>
  <verify>
Run each failing test file individually:
```bash
cd apps/web/p2p-platform/backend
JWT_SECRET_KEY=test-secret-key-for-testing TESTING=true python -m pytest tests/integration/test_document_save_flow.py -v --tb=short
JWT_SECRET_KEY=test-secret-key-for-testing TESTING=true python -m pytest tests/integration/test_android_restaurant_e2e_workflow.py -v --tb=short
JWT_SECRET_KEY=test-secret-key-for-testing TESTING=true python -m pytest tests/test_cross_platform.py -v --tb=short
```
All 24 previously-failing tests must pass.
  </verify>
  <done>
- 12 test_document_save_flow.py tests pass (0 failures)
- 4 test_android_restaurant_e2e_workflow.py tests pass (4 failures fixed -- note: test_address_returned_in_published_response already passed)
- 8 test_cross_platform.py tests pass (0 failures)
- No regressions in other test files
  </done>
</task>

<task type="auto">
  <name>Task 2: Run full test suite and fix any regressions</name>
  <files>apps/web/p2p-platform/backend/tests/</files>
  <action>
Run the full test suite to verify zero regressions from Task 1 changes:
```bash
cd apps/web/p2p-platform/backend
JWT_SECRET_KEY=test-secret-key-for-testing TESTING=true python -m pytest tests/ --tb=short -q
```

The baseline before Task 1 was: 36 failed, 952 passed, 8 skipped, 320 errors. After Task 1, the 24 fixed tests should now pass. The remaining ~12 pre-existing failures and ~320 errors are NOT in scope for this task (they existed before).

If any test that previously passed now fails, investigate and fix the regression immediately.

Record the final test result counts for the SUMMARY.
  </action>
  <verify>
```bash
JWT_SECRET_KEY=test-secret-key-for-testing TESTING=true python -m pytest tests/ --tb=no -q 2>&1 | tail -5
```
Verify that the passed count increased by ~24 and the failed count decreased by ~24 compared to baseline.
  </verify>
  <done>
- Full test suite runs without new regressions
- Failed count reduced from 36 to ~12 (24 tests fixed)
- Passed count increased from 952 to ~976
  </done>
</task>

<task type="auto">
  <name>Task 3: Build and distribute all 6 apps (iOS TestFlight + Android Firebase)</name>
  <files>
    apps/ios/customer/eatfaircustomer/Info.plist
    apps/ios/delivery/eatffairdelivery/Info.plist
    apps/ios/restaurant/eatffairrestaurant/Info.plist
  </files>
  <action>
Build and distribute all 6 apps with incremented build numbers.

**Current versions (from constraints):**
- iOS Customer: 1103 -> 1104
- iOS Driver: 208 -> 209
- iOS Restaurant: 178 -> 179
- Android Customer: vC=29 -> vC=30 (version 1.0.29)
- Android Driver: vC=26 -> vC=27 (version 1.0.26)
- Android Partner: vC=22 -> vC=23 (version 1.0.22)

**Step 1: Increment iOS build numbers**
Update `CFBundleVersion` in each Info.plist:
- `apps/ios/customer/eatfaircustomer/Info.plist`: 1103 -> 1104
- `apps/ios/delivery/eatffairdelivery/Info.plist`: 208 -> 209
- `apps/ios/restaurant/eatffairrestaurant/Info.plist`: 178 -> 179

**Step 2: Build + upload iOS to TestFlight (3 apps)**
For each app, run archive + export (which also uploads per ExportOptions.plist `destination: upload`):

```bash
# Customer
xcodebuild archive \
  -workspace apps/ios/customer/eatfaircustomer.xcworkspace \
  -scheme eatfaircustomer -configuration Release \
  -archivePath /tmp/dollor-archives/customer.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates

xcodebuild -exportArchive \
  -archivePath /tmp/dollor-archives/customer.xcarchive \
  -exportOptionsPlist apps/ios/customer/ExportOptions.plist \
  -exportPath /tmp/dollor-ipas/customer \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
  -authenticationKeyID 9K626GB728 \
  -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e

# Driver
xcodebuild archive \
  -workspace apps/ios/delivery/eatffairdelivery.xcworkspace \
  -scheme eatffairdelivery -configuration Release \
  -archivePath /tmp/dollor-archives/driver.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates

xcodebuild -exportArchive \
  -archivePath /tmp/dollor-archives/driver.xcarchive \
  -exportOptionsPlist apps/ios/delivery/ExportOptions.plist \
  -exportPath /tmp/dollor-ipas/driver \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
  -authenticationKeyID 9K626GB728 \
  -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e

# Restaurant
xcodebuild archive \
  -workspace apps/ios/restaurant/eatffairrestaurant.xcworkspace \
  -scheme eatffairrestaurant -configuration Release \
  -archivePath /tmp/dollor-archives/restaurant.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates

xcodebuild -exportArchive \
  -archivePath /tmp/dollor-archives/restaurant.xcarchive \
  -exportOptionsPlist apps/ios/restaurant/ExportOptions.plist \
  -exportPath /tmp/dollor-ipas/restaurant \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
  -authenticationKeyID 9K626GB728 \
  -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
```

If restaurant workspace not found, use `-project apps/ios/restaurant/eatffairrestaurant.xcodeproj` instead.

**Step 3: Build Android release APKs**
```bash
cd /Users/jeet/StudioProjects/eatfair-android

# Increment version codes in build.gradle files:
# app/build.gradle: versionCode 30, versionName "1.0.29"
# driver/build.gradle: versionCode 27, versionName "1.0.26"
# partner/build.gradle: versionCode 23, versionName "1.0.22"

./gradlew assembleRelease
```

**Step 4: Distribute Android APKs to Firebase**
```bash
cd /Users/jeet/StudioProjects/eatfair-android

firebase appdistribution:distribute app/build/outputs/apk/release/app-release.apk \
  --app "1:65740760476:android:535885ca28086e6242d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "Customer v1.0.29 - test fixes" --project dollorai-production

firebase appdistribution:distribute driver/build/outputs/apk/release/driver-release.apk \
  --app "1:65740760476:android:7d9bed1ee685434c42d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "Driver v1.0.26 - test fixes" --project dollorai-production

firebase appdistribution:distribute partner/build/outputs/apk/release/partner-release.apk \
  --app "1:65740760476:android:8591cc17fa4f8d4c42d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "Partner v1.0.22 - test fixes" --project dollorai-production
```

**Step 5: Update MEMORY.md build versions table**
  </action>
  <verify>
- All 3 iOS archives build without errors
- All 3 iOS exports/uploads complete successfully
- `./gradlew assembleRelease` produces 3 APKs
- All 3 Firebase distributions succeed
- TestFlight shows new builds (1104/209/179)
- Firebase shows new distributions
  </verify>
  <done>
- iOS Customer build 1104, Driver build 209, Restaurant build 179 on TestFlight
- Android Customer vC=30, Driver vC=27, Partner vC=23 on Firebase
- All 6 apps successfully distributed
  </done>
</task>

</tasks>

<verification>
1. Run the 3 specific test files -- 24/24 pass
2. Run full test suite -- no regressions (failed count decreased by ~24)
3. Verify all 6 apps uploaded to their distribution platforms
</verification>

<success_criteria>
- 24 previously-failing tests now pass
- Zero test regressions
- 6 apps built and distributed to TestFlight/Firebase with incremented build numbers
</success_criteria>

<output>
After completion, create `.planning/quick/59-fix-18-failing-backend-tests-and-build-a/59-SUMMARY.md`
</output>
