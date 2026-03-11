---
phase: quick-149
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/149-audit-all-promotion-features-across-enti/PROMOTIONS_AUDIT.md
autonomous: true
requirements: [AUDIT-01]

must_haves:
  truths:
    - "Every promotion-related backend endpoint is catalogued with route, method, auth, and live status"
    - "Every promotion UI screen/view across iOS and Android apps is identified with file path and feature list"
    - "Every promotion model/type definition across backend, iOS shared, and Android shared is documented"
    - "Each backend endpoint has been verified against production API (200/401/404/405 status)"
    - "Gap analysis shows what Restaurant app is missing vs what backend supports"
  artifacts:
    - path: ".planning/quick/149-audit-all-promotion-features-across-enti/PROMOTIONS_AUDIT.md"
      provides: "Comprehensive promotion feature audit report"
      min_lines: 150
  key_links:
    - from: "apps/web/p2p-platform/backend/promotions.py"
      to: "apps/web/p2p-platform/backend/main_new.py"
      via: "router include or direct endpoint registration"
      pattern: "promot"
    - from: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift"
      to: "apps/web/p2p-platform/backend/promotions.py"
      via: "HTTP API calls to /api/promotions/*"
      pattern: "promot"
    - from: "apps/ios/restaurant/eatffairrestaurant"
      to: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift"
      via: "Shared API service calls"
      pattern: "promot"
---

<objective>
Audit ALL promotion features across the entire Dollor.ai codebase -- backend endpoints, iOS apps (Customer + Restaurant + shared), and Android apps (Customer + Partner + shared). Verify each endpoint against production. Produce a comprehensive PROMOTIONS_AUDIT.md showing what exists, what's live, and what's missing from the Restaurant app.

Purpose: Understand the full promotion feature landscape to identify gaps between backend capabilities, client implementations, and production availability.
Output: PROMOTIONS_AUDIT.md with endpoint catalog, UI inventory, model inventory, production verification results, and gap analysis.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/web/p2p-platform/backend/promotions.py
@apps/web/p2p-platform/backend/models.py
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
</context>

<tasks>

<task type="auto">
  <name>Task 1: Catalog all promotion backend endpoints, models, and verify against production</name>
  <files>.planning/quick/149-audit-all-promotion-features-across-enti/PROMOTIONS_AUDIT.md</files>
  <action>
    1. Read `apps/web/p2p-platform/backend/promotions.py` fully -- extract every route decorator (@router.get, @router.post, etc.) with: path, method, auth requirements, request/response schema, description.

    2. Search `apps/web/p2p-platform/backend/main_new.py` for ALL promotion-related code:
       - Router inclusion (how promotions.py routes are mounted)
       - Any inline promotion endpoints not in promotions.py
       - Promotion references in order flow, checkout, etc.

    3. Search `apps/web/p2p-platform/backend/models.py` and `models_extended.py` for promotion-related SQLAlchemy models -- document table name, columns, relationships.

    4. Search `apps/web/p2p-platform/backend/order_flow.py` for promotion discount application logic.

    5. Search `apps/web/p2p-platform/backend/endpoint_config.py` for promotion endpoints in auth allowlist or middleware config.

    6. Verify each discovered endpoint against production:
       ```bash
       curl -s -o /dev/null -w "%{http_code}" https://api.dollor.ai/api/promotions/featured
       curl -s -o /dev/null -w "%{http_code}" https://api.dollor.ai/api/promotions/{endpoint}
       ```
       Record HTTP status for each (expect 200 for public, 401 for auth-required, 404 for missing, 405 for wrong method).

    7. Check `apps/web/p2p-platform/backend/tests/unit/test_promotions.py` for test coverage -- note which endpoints have tests.
  </action>
  <verify>
    grep -c "endpoint" .planning/quick/149-audit-all-promotion-features-across-enti/PROMOTIONS_AUDIT.md should show substantial endpoint catalog. Every endpoint from promotions.py must appear in the report with a production verification status code.
  </verify>
  <done>All backend promotion endpoints catalogued with route/method/auth/description, all promotion models documented with columns, each endpoint verified against production API with HTTP status code, test coverage noted.</done>
</task>

<task type="auto">
  <name>Task 2: Inventory all promotion UI and API calls across iOS and Android apps</name>
  <files>.planning/quick/149-audit-all-promotion-features-across-enti/PROMOTIONS_AUDIT.md</files>
  <action>
    1. **iOS Shared (P2PAPIService.swift):** Search for ALL promotion-related API methods -- document function name, HTTP method, endpoint path, parameters, which app(s) call it.

    2. **iOS Restaurant app** (`apps/ios/restaurant/eatffairrestaurant/`): Search ALL .swift files for promotion references -- views, view models, navigation entries. Document what promotion features the Restaurant app has: list promos, create promo, edit promo, delete promo, view promo analytics.

    3. **iOS Customer app** (`apps/ios/customer/eatfaircustomer/`): Search ALL .swift files for promotion references -- how promos display in HomeView, checkout flow, profile/notifications.

    4. **Android Shared** (`/Users/jeet/StudioProjects/eatfair-android/shared/`): Search ApiModels.kt, DollorApiService.kt, DollorRepository.kt for promotion data classes, API interface methods, repository functions.

    5. **Android Partner app** (`/Users/jeet/StudioProjects/eatfair-android/partner/`): Read PromotionsScreen.kt, CreatePromotionScreen.kt, PromotionsViewModel.kt, PartnerNavGraph.kt -- document full feature set.

    6. **Android Customer app** (`/Users/jeet/StudioProjects/eatfair-android/app/`): Search for promotion display in home, checkout, deals sections.

    7. Append to PROMOTIONS_AUDIT.md with sections:
       - "iOS API Methods" table: function | endpoint | method | used by (Customer/Restaurant/Both)
       - "iOS Restaurant Promotion UI" table: view/file | features | backend endpoint used
       - "iOS Customer Promotion UI" table: view/file | features | backend endpoint used
       - "Android API Methods" table: function | endpoint | method | used by
       - "Android Partner Promotion UI" table: screen/file | features | backend endpoint used
       - "Android Customer Promotion UI" table: screen/file | features | backend endpoint used
  </action>
  <verify>
    The PROMOTIONS_AUDIT.md must contain sections for all 6 areas (iOS shared, iOS Restaurant, iOS Customer, Android shared, Android Partner, Android Customer). Each section must list specific file paths and feature details.
  </verify>
  <done>Complete inventory of all promotion-related code across all 6 client areas with file paths, feature descriptions, and endpoint mappings.</done>
</task>

<task type="auto">
  <name>Task 3: Gap analysis and cross-reference matrix</name>
  <files>.planning/quick/149-audit-all-promotion-features-across-enti/PROMOTIONS_AUDIT.md</files>
  <action>
    Using data from Tasks 1 and 2, append final sections to PROMOTIONS_AUDIT.md:

    1. **Cross-Reference Matrix:** Table with rows = backend endpoints, columns = iOS Restaurant | iOS Customer | Android Partner | Android Customer. Each cell: "Implemented" / "Missing" / "Partial" / "N/A".

    2. **Restaurant App Gap Analysis:** For each backend promotion endpoint, state whether the iOS Restaurant app can:
       - List promotions (vendor's own)
       - Create a new promotion
       - Edit an existing promotion
       - Delete/deactivate a promotion
       - View promotion performance/analytics
       - Apply promotions to orders (if relevant from vendor side)

    3. **iOS vs Android Parity:** Compare iOS Restaurant vs Android Partner promotion features. Note any features present in one but not the other.

    4. **Dead Code / Unused Endpoints:** Any backend endpoints that NO client calls. Any client code that calls endpoints that don't exist or return 404.

    5. **Recommendations:** Prioritized list of what to build/fix, categorized as:
       - CRITICAL: Missing features that break user workflows
       - MEDIUM: Features available on one platform but not the other
       - LOW: Nice-to-have improvements

    6. **Summary Stats** at the top of the file:
       - Total backend endpoints: N
       - Live on production: N
       - iOS Restaurant coverage: N/M endpoints
       - iOS Customer coverage: N/M endpoints
       - Android Partner coverage: N/M endpoints
       - Android Customer coverage: N/M endpoints
  </action>
  <verify>
    The PROMOTIONS_AUDIT.md must contain a cross-reference matrix, gap analysis section, parity comparison, dead code section, and recommendations. Summary stats must appear near the top of the file.
  </verify>
  <done>Complete PROMOTIONS_AUDIT.md with cross-reference matrix showing coverage per platform, Restaurant app gap analysis with specific missing features, iOS/Android parity comparison, dead code identification, and prioritized recommendations.</done>
</task>

</tasks>

<verification>
- PROMOTIONS_AUDIT.md exists and is comprehensive (150+ lines)
- Every endpoint from promotions.py appears in the report
- Production verification status codes recorded for each endpoint
- All 4 client apps (iOS Restaurant, iOS Customer, Android Partner, Android Customer) have inventory sections
- Cross-reference matrix is complete
- Gap analysis identifies specific missing Restaurant app features
</verification>

<success_criteria>
- Complete catalog of all promotion backend endpoints with production verification
- Full inventory of promotion UI/code across all iOS and Android apps
- Cross-reference matrix showing which clients implement which endpoints
- Clear gap analysis for Restaurant app specifically
- Prioritized recommendations for what to build next
</success_criteria>

<output>
After completion, create `.planning/quick/149-audit-all-promotion-features-across-enti/149-SUMMARY.md`
</output>
