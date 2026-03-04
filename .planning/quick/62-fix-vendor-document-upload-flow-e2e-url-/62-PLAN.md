---
phase: quick-62
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
  - apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/documents/RestaurantDocumentsScreen.kt
  - apps/web/p2p-platform/frontend/src/app/screens/vendor/Documents.tsx
autonomous: true
requirements: [Q62-01, Q62-02, Q62-03]

must_haves:
  truths:
    - "iOS restaurant app 'Documents' button opens vendor document portal URL, not admin portal"
    - "Android partner app 'Upload Documents on Web' button opens vendor document portal URL, not admin.dollor.ai"
    - "Vendor document upload page on web supports camera capture on mobile browsers"
    - "Backend vendor document endpoints accept multipart file uploads with JWT auth"
  artifacts:
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift"
      provides: "vendorDocumentsURL constant pointing to www.dollor.ai/vendor/documents"
      contains: "vendorDocumentsURL"
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift"
      provides: "Link using vendorDocumentsURL instead of adminPanelURL"
      contains: "vendorDocumentsURL"
    - path: "apps/web/p2p-platform/frontend/src/app/screens/vendor/Documents.tsx"
      provides: "File input with capture attribute for mobile camera"
      contains: "capture"
  key_links:
    - from: "RestaurantSettingsView.swift"
      to: "AppConfig.swift"
      via: "AppConstants.vendorDocumentsURL"
      pattern: "AppConstants\\.vendorDocumentsURL"
    - from: "RestaurantDocumentsScreen.kt"
      to: "www.dollor.ai/vendor/documents"
      via: "Intent ACTION_VIEW"
      pattern: "www\\.dollor\\.ai/vendor/documents"
    - from: "Documents.tsx"
      to: "/api/vendors/{vendor_id}/documents"
      via: "axios POST with FormData"
      pattern: "api/vendors.*documents"
---

<objective>
Fix vendor document upload flow end-to-end. iOS and Android restaurant/partner apps currently point to the admin portal for document uploads -- they must point to the vendor document portal at www.dollor.ai/vendor/documents. Additionally, ensure the web document upload page supports camera capture on mobile browsers so vendors can photograph physical documents directly.

Purpose: Vendors cannot currently upload documents because the mobile apps link to the wrong URL (admin portal requires admin credentials, not vendor credentials). This blocks vendor onboarding.

Output: Fixed URLs in iOS + Android, camera capture support on web document page.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift (AppConstants struct at line ~579)
@apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift (line ~291 -- Link with adminPanelURL)
@/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/documents/RestaurantDocumentsScreen.kt (line ~303-309 -- "Upload Documents on Web" button)
@apps/web/p2p-platform/frontend/src/app/screens/vendor/Documents.tsx (vendor document upload page)
@apps/web/p2p-platform/frontend/src/App.tsx (routing -- /vendor/documents at line 205)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix iOS and Android URLs to point to vendor document portal</name>
  <files>
    apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
    apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
    /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/documents/RestaurantDocumentsScreen.kt
  </files>
  <action>
    **iOS -- AppConfig.swift (line ~595, AppConstants struct):**
    Add a new constant to `AppConstants`:
    ```swift
    public static let vendorDocumentsURL = "https://www.dollor.ai/vendor/documents"
    ```
    Keep the existing `adminPanelURL` constant unchanged (other code may still use it).

    **iOS -- RestaurantSettingsView.swift (line ~291):**
    Change the `Link` destination from `AppConstants.adminPanelURL` to `AppConstants.vendorDocumentsURL`.
    Also update the button label from "Go to Admin Portal" to "Upload Documents" (line ~294).
    The section header text "Documents Managed Online" (line ~283) is fine -- keep it.

    **Android -- RestaurantDocumentsScreen.kt (line ~307):**
    Change the hardcoded URL from `"https://admin.dollor.ai"` to `"https://www.dollor.ai/vendor/documents"`.
    Use `www.dollor.ai` canonical domain per project decision (quick-55 in STATE.md).

    IMPORTANT: Use `www.dollor.ai` (NOT bare `dollor.ai`) per project convention from quick-55 decision.
  </action>
  <verify>
    grep -n "vendorDocumentsURL" apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
    grep -n "vendorDocumentsURL" apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
    grep -n "www.dollor.ai/vendor/documents" /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/documents/RestaurantDocumentsScreen.kt
    # Verify old URLs are gone:
    grep -rn "adminPanelURL" apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift | grep -v "//" && echo "FAIL: adminPanelURL still used" || echo "OK: adminPanelURL removed from settings view"
    grep -n "admin.dollor.ai" /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/documents/RestaurantDocumentsScreen.kt && echo "FAIL: admin.dollor.ai still present" || echo "OK: admin.dollor.ai removed"
  </verify>
  <done>
    iOS restaurant app Settings > Documents section links to www.dollor.ai/vendor/documents (not admin portal).
    Android partner app Documents screen "Upload Documents on Web" button opens www.dollor.ai/vendor/documents (not admin.dollor.ai).
    Button labels updated to reflect document upload purpose, not admin portal.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add camera capture support to web vendor document upload page</name>
  <files>
    apps/web/p2p-platform/frontend/src/app/screens/vendor/Documents.tsx
  </files>
  <action>
    The existing `Documents.tsx` uses Ant Design's `<Upload>` component with `accept=".pdf,.jpg,.jpeg,.png"`.
    The Ant Design Upload component does NOT support the HTML5 `capture` attribute natively.

    To enable camera capture on mobile browsers, modify the Upload component's approach:

    1. **Add a dedicated "Take Photo" button** next to each document's existing Upload button. This button uses a hidden `<input type="file" accept="image/*" capture="environment">` element that triggers the device camera on mobile.

    2. **Implementation pattern:**
       - Add a `useRef<HTMLInputElement>(null)` for the camera input.
       - Add state `cameraDocType` to track which document type the camera is targeting.
       - Add a hidden `<input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleCameraCapture} style={{ display: 'none' }} />` near the top of the JSX.
       - Add a `handleCameraCapture` function that reads the file from the input event and calls the existing `handleUpload(file, cameraDocType)`.
       - For each document card, add a second Button (with CameraOutlined icon, text "Take Photo") that sets `cameraDocType` and triggers `cameraInputRef.current?.click()`.

    3. **Import CameraOutlined** from `@ant-design/icons`.

    4. **Also update the existing Upload accept** to include `.webp`: `accept=".pdf,.jpg,.jpeg,.png,.webp"`.

    5. **Mobile-responsive note:** The `capture="environment"` attribute tells mobile browsers to open the rear camera directly. On desktop browsers, it falls back to the standard file picker -- this is the correct cross-platform behavior.

    Do NOT replace the existing Upload (file picker) button -- keep both options so vendors can either pick an existing file OR take a new photo.
  </action>
  <verify>
    grep -n "capture" apps/web/p2p-platform/frontend/src/app/screens/vendor/Documents.tsx
    grep -n "CameraOutlined" apps/web/p2p-platform/frontend/src/app/screens/vendor/Documents.tsx
    grep -n "cameraInputRef\|cameraDocType" apps/web/p2p-platform/frontend/src/app/screens/vendor/Documents.tsx
    # Verify existing upload still works (accept includes webp):
    grep -n "\.webp" apps/web/p2p-platform/frontend/src/app/screens/vendor/Documents.tsx
  </verify>
  <done>
    Vendor document upload page has both "Upload Document" (file picker) and "Take Photo" (camera capture) buttons for each document type.
    Camera capture uses `<input type="file" accept="image/*" capture="environment">` which opens the rear camera on mobile browsers.
    File picker accept includes .webp format.
    Desktop browsers show standard file picker for both buttons (graceful fallback).
  </done>
</task>

<task type="auto">
  <name>Task 3: Verify backend document endpoints and DB schema are functional</name>
  <files>
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
    The backend already has functional vendor document endpoints (verified in investigation):

    - `GET /api/vendors/{vendor_id}/documents` (main_new.py:10986) -- returns documents from Vendor model fields
    - `POST /api/vendors/{vendor_id}/documents` (main_new.py:11033) -- multipart upload, saves to uploads/vendor_documents/
    - `DELETE /api/vendors/{vendor_id}/documents/{document_id}` (main_new.py:11094)
    - `GET /api/vendor/my-documents` (main_new.py:11409) -- JWT-only, no vendor_id needed
    - `POST /api/vendor/my-documents/upload` (main_new.py:11475) -- JWT-only upload

    The DB schema uses Vendor model columns directly (NOT a separate VendorDocument table):
    - `w9_form` (Boolean) + `w9_form_url` (String) -- models.py:200-201
    - `insurance` (Boolean) + `insurance_url` (String) -- models.py:202-203
    - `compliance_certs` (Boolean) + `compliance_certs_url` (String) -- models.py:206-207
    - `food_license` (Boolean) + `food_license_url` (String) -- models.py:210-211
    - `health_permit` (Boolean) + `health_permit_url` (String) -- models.py:212-213

    **Verification steps (no code changes needed):**

    1. Run `grep -n "def get_vendor_documents\|def upload_vendor_document\|def delete_vendor_document\|def get_my_vendor_documents\|def vendor_upload_document" apps/web/p2p-platform/backend/main_new.py` to confirm all 5 endpoints exist.

    2. Run `grep -n "w9_form\|food_license\|insurance_url\|health_permit_url\|compliance_certs" apps/web/p2p-platform/backend/models.py | head -15` to confirm DB columns exist.

    3. Run `ls -la apps/web/p2p-platform/backend/uploads/vendor_documents/ 2>/dev/null || echo "uploads dir will be auto-created on first upload"` to check upload directory.

    4. Run `cd apps/web/p2p-platform/backend && python -c "from models import Vendor; print('Vendor model OK')" 2>/dev/null || echo "Model import check skipped (needs venv)"` as a basic import check.

    **If any endpoint is missing or broken, fix it.** Based on investigation, no fixes should be needed -- this task is pure verification.

    **Admin review route verification:**
    Confirm admin document review route exists at `/admin/document-review` in App.tsx (line ~236). Already verified -- `DocumentReview` component is imported and routed.
  </action>
  <verify>
    grep -c "def get_vendor_documents\|def upload_vendor_document\|def delete_vendor_document\|def get_my_vendor_documents\|def vendor_upload_document" apps/web/p2p-platform/backend/main_new.py
    # Should return 5 (5 endpoint functions)
    grep -c "w9_form\|food_license\|insurance_url\|health_permit_url\|compliance_certs" apps/web/p2p-platform/backend/models.py
    # Should return 10+ (boolean + url columns)
    grep -n "document-review" apps/web/p2p-platform/frontend/src/App.tsx
    # Should show the admin review route
  </verify>
  <done>
    All 5 backend vendor document endpoints confirmed functional.
    DB schema has all required document columns on Vendor model (w9_form, food_license, health_permit, insurance, compliance_certs -- each with boolean + URL columns).
    Upload directory auto-created on first upload.
    Admin document review route exists at /admin/document-review.
    Full E2E flow: vendor opens URL from mobile app -> logs in to web portal -> uploads document via file picker or camera -> backend saves to uploads/vendor_documents/ -> admin reviews at /admin/document-review.
  </done>
</task>

</tasks>

<verification>
1. iOS: `AppConstants.vendorDocumentsURL` exists and points to `https://www.dollor.ai/vendor/documents`
2. iOS: `RestaurantSettingsView.swift` uses `vendorDocumentsURL` (not `adminPanelURL`)
3. Android: `RestaurantDocumentsScreen.kt` opens `https://www.dollor.ai/vendor/documents` (not `admin.dollor.ai`)
4. Web: Documents.tsx has camera capture input with `capture="environment"` attribute
5. Web: `/vendor/documents` route exists in App.tsx and renders VendorDocuments
6. Backend: All 5 vendor document endpoints exist and use `require_vendor` auth
7. DB: Vendor model has document boolean + URL columns
8. Admin: `/admin/document-review` route exists for admin review workflow
</verification>

<success_criteria>
- iOS restaurant app Settings > Documents button opens www.dollor.ai/vendor/documents
- Android partner app Documents > "Upload Documents on Web" opens www.dollor.ai/vendor/documents
- Web vendor document page has both file picker AND camera capture buttons
- Camera capture uses HTML5 capture="environment" attribute for mobile rear camera
- Backend accepts multipart uploads at /api/vendors/{vendor_id}/documents with vendor JWT
- No admin credentials needed -- vendors use their own login at /vendor/login
</success_criteria>

<output>
After completion, create `.planning/quick/62-fix-vendor-document-upload-flow-e2e-url-/62-SUMMARY.md`
</output>
