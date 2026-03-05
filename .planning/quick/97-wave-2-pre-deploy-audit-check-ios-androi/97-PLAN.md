---
phase: quick-97
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [WAVE2-AUDIT]

must_haves:
  truths:
    - "iOS apps handle new optional fields (leave_at_door, driver_arrived_at_delivery) without crash"
    - "Android apps handle new optional JSON fields without Gson deserialization crash"
    - "No hardcoded order status lists break with OUT_FOR_DELIVERY to READY_FOR_PICKUP reassignment"
    - "Backend Wave 2 changes deployed to staging and production via CI/CD"
  artifacts: []
  key_links:
    - from: "iOS order model parsing"
      to: "new backend response fields"
      via: "Swift Codable optional handling"
      pattern: "leave_at_door|driver_arrived_at_delivery"
    - from: "Android order model parsing"
      to: "new backend response fields"
      via: "Gson deserialization"
      pattern: "leave_at_door|driver_arrived_at_delivery"
---

<objective>
Audit iOS and Android apps for compatibility with Wave 2 backend changes (Quick-93 through Quick-96), then deploy to staging and production.

Purpose: Ensure new backend fields, endpoints, and status transitions do not break existing mobile clients before deploying.
Output: Compatibility audit results + successful staging and production deployment.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: iOS Compatibility Audit</name>
  <files></files>
  <action>
Search all 3 iOS apps for potential breaking changes from Wave 2 backend additions. This is READ-ONLY -- no code changes unless a breaking issue is found.

**1. New optional fields in order responses (`leave_at_door`, `driver_arrived_at_delivery`):**
- Search `apps/ios/` for Order model/struct definitions (Codable structs)
- Swift Codable skips unknown JSON keys by default -- CONFIRM no custom `CodingKeys` enum that would cause a crash if new keys appear
- Search for any explicit JSON key lists or manual parsing that might reject unknown fields

**2. Order placement and address validation (Quick-95):**
- Search customer app (`apps/ios/customer/`) for order placement code
- Verify it sends `delivery_address` with lat/lng fields (backend now validates these)
- Search for `delivery_address`, `latitude`, `longitude`, `lat`, `lng` in order placement requests
- If address fields are NOT sent, this is a BREAKING CHANGE -- document and flag

**3. Order status handling (Quick-94 reassignment: OUT_FOR_DELIVERY -> READY_FOR_PICKUP):**
- Search all 3 iOS apps for hardcoded OrderStatus enums or switch statements
- Check if OUT_FOR_DELIVERY -> READY_FOR_PICKUP transition would cause any UI issues
- Search for `OrderStatus`, `order_status`, status enum definitions
- Verify no switch/case without default that would crash on unexpected status values

**4. Driver app delivery features (Quick-93):**
- Search `apps/ios/delivery/` for "leave at door", delivery instructions UI
- Check if driver app has any delivery arrival flow that might conflict with new `/arrived` endpoint
- This is informational -- new endpoints are additive, not breaking

**5. Push notification handling (Quick-96):**
- Verify push notification handling in customer app is generic enough to display new "driver approaching" notifications
- Search for push notification parsing code

Document findings as: COMPATIBLE (no changes needed), WARNING (works but suboptimal), or BREAKING (must fix before deploy).
  </action>
  <verify>
grep -rn "CodingKeys" apps/ios/ --include="*.swift" | grep -i order | head -20
grep -rn "delivery_address\|deliveryAddress" apps/ios/customer/ --include="*.swift" | head -20
grep -rn "OrderStatus\|order_status" apps/ios/ --include="*.swift" | head -20
  </verify>
  <done>iOS audit complete with documented findings per app. All checks either COMPATIBLE or issues documented with fix plan.</done>
</task>

<task type="auto">
  <name>Task 2: Android Compatibility Audit</name>
  <files></files>
  <action>
Search all 3 Android apps for potential breaking changes. READ-ONLY audit. Android repo: `/Users/jeet/StudioProjects/eatfair-android/`

**1. New optional fields in order responses (`leave_at_door`, `driver_arrived_at_delivery`):**
- Search `app/`, `driver/`, `partner/` for Order data class definitions
- Gson silently ignores unknown JSON fields by default -- CONFIRM no `@JsonAdapter` or custom deserializer that would crash
- Search for any strict JSON parsing configuration (e.g., `GsonBuilder().setStrictMode()`)
- Check if any `@SerializedName` annotations or field mappings would cause issues

**2. Order placement and address validation (Quick-95):**
- Search customer app (`app/`) for order placement / checkout code
- Verify it sends `delivery_address` with lat/lng fields
- Search for `delivery_address`, `latitude`, `longitude`, `lat`, `lng` in API request bodies

**3. Order status handling (Quick-94 reassignment):**
- Search all 3 apps for OrderStatus enum definitions or status string comparisons
- Check for `when` statements without `else` branch that might crash on unknown status
- Verify status-based UI rendering handles unexpected transitions gracefully

**4. Driver app delivery features (Quick-93):**
- Search `driver/` for delivery arrival flow, leave-at-door UI
- Informational only -- new endpoints are additive

**5. Push notification handling (Quick-96):**
- Verify FCM notification handling in customer app accepts generic notification payloads
- Search for notification parsing code

Document findings as: COMPATIBLE, WARNING, or BREAKING.
  </action>
  <verify>
grep -rn "class Order\|data class Order" /Users/jeet/StudioProjects/eatfair-android/ --include="*.kt" | head -20
grep -rn "delivery_address\|deliveryAddress" /Users/jeet/StudioProjects/eatfair-android/app/ --include="*.kt" | head -20
grep -rn "OrderStatus\|order_status" /Users/jeet/StudioProjects/eatfair-android/ --include="*.kt" | head -20
  </verify>
  <done>Android audit complete with documented findings per app. All checks either COMPATIBLE or issues documented with fix plan.</done>
</task>

<task type="auto">
  <name>Task 3: Deploy Wave 2 to Staging and Production</name>
  <files></files>
  <action>
PREREQUISITE: Tasks 1 and 2 found NO breaking changes. If breaking changes exist, fix them first before proceeding.

**Step 1: Push code to remote**
```bash
git push origin main
```

**Step 2: Deploy to staging**
```bash
gh workflow run deploy-staging.yml --ref main
```
Monitor with `gh run list --workflow=deploy-staging.yml --limit 3` then `gh run watch <run-id>`.

**Step 3: Smoke test staging**
Run key endpoint checks against `https://d34u5ixl0bulv4.cloudfront.net`:
- `GET /api/health` -- should return 200
- `POST /api/auth/customer/login` with demo credentials -- should return 200
- Verify new endpoints exist (they should return 401/422 without proper auth, not 404):
  - `POST /api/deliveries/999/arrived` -- expect 401 (not 404)
  - `POST /api/deliveries/999/reassign` -- expect 401 (not 404)
  - `POST /api/deliveries/999/address-unreachable` -- expect 401 (not 404)

**Step 4: Deploy to production**
```bash
gh workflow run deploy-dollar-ai.yml
```
Monitor with `gh run list --workflow=deploy-dollar-ai.yml --limit 3` then `gh run watch <run-id>`.

**Step 5: Verify production**
- `GET https://api.dollor.ai/api/health` -- should return 200
- Verify new endpoints return 401 (not 404) on production

NEVER use manual `aws ecs`, `docker build`, `docker push` commands.
  </action>
  <verify>
curl -s https://api.dollor.ai/api/health | head -5
gh run list --workflow=deploy-dollar-ai.yml --limit 1
  </verify>
  <done>Wave 2 backend changes deployed to both staging (smoke tested) and production (verified healthy). New endpoints return 401 (exist) not 404 (missing).</done>
</task>

</tasks>

<verification>
- iOS audit documented: no BREAKING issues found (or all fixed)
- Android audit documented: no BREAKING issues found (or all fixed)
- Staging deployment succeeded and smoke tested
- Production deployment succeeded and health check passes
- New Wave 2 endpoints return 401 on production (confirming they exist)
</verification>

<success_criteria>
Wave 2 backend changes (Quick-93 through Quick-96) are live on production with confirmed iOS and Android client compatibility. No mobile app crashes from new fields or status transitions.
</success_criteria>

<output>
After completion, create `.planning/quick/97-wave-2-pre-deploy-audit-check-ios-androi/97-SUMMARY.md`
</output>
