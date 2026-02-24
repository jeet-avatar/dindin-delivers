---
phase: quick-41
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/StudioProjects/eatfair-android/app/src/test/java/ai/dollor/customer/staging/OrderCreationFieldMappingTest.kt
autonomous: true
requirements: [QUICK-41]

must_haves:
  truths:
    - "All OrderCreationFieldMappingTest tests send Authorization header via addAuthIfAvailable()"
    - "All CustomerAppStagingApiTest fare estimate tests use Assume.assumeNotNull and auth headers"
    - "Both test files compile and pass with ./gradlew :app:testDebugUnitTest"
  artifacts:
    - path: "/Users/jeet/StudioProjects/eatfair-android/app/src/test/java/ai/dollor/customer/staging/OrderCreationFieldMappingTest.kt"
      provides: "Order creation field mapping tests with auth headers on all 11 tests"
      contains: "addAuthIfAvailable"
  key_links:
    - from: "OrderCreationFieldMappingTest.test_00_login"
      to: "companion object authToken"
      via: "Sets authToken from /api/auth/customer/login response"
      pattern: "authToken = json.get"
    - from: "OrderCreationFieldMappingTest tests 06-10"
      to: "addAuthIfAvailable()"
      via: "Request.Builder extension function adds Bearer token"
      pattern: "\\.addAuthIfAvailable\\(\\)"
---

<objective>
Wire auth headers into remaining OrderCreationFieldMappingTest tests (06-10) and verify both staging test files compile and pass.

Purpose: Tests 06-10 POST to /api/orders/create without auth headers, causing 401 failures after global auth middleware was deployed. The addAuthIfAvailable() helper already exists but is not called in these 5 tests.

Output: Both test files fully wired with demo credentials and auth headers, verified by ./gradlew :app:testDebugUnitTest passing with 0 failures.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/StudioProjects/eatfair-android/app/src/test/java/ai/dollor/customer/staging/OrderCreationFieldMappingTest.kt
@/Users/jeet/StudioProjects/eatfair-android/app/src/test/java/ai/dollor/customer/staging/CustomerAppStagingApiTest.kt
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add auth headers to OrderCreationFieldMappingTest tests 06-10</name>
  <files>/Users/jeet/StudioProjects/eatfair-android/app/src/test/java/ai/dollor/customer/staging/OrderCreationFieldMappingTest.kt</files>
  <action>
Read the current file and add `.addAuthIfAvailable()` to the Request.Builder chains in tests 06 through 10. The `addAuthIfAvailable()` extension function already exists at line 72. The pattern is identical to how tests 03-05 already use it.

Specific changes needed (5 tests):

1. **test_06_rejectInvalidDeliveryAddressFormat** (around line 345-349): The Request.Builder chain currently ends with `.build()`. Insert `.addAuthIfAvailable()` before `.build()`. The chain should be:
   ```kotlin
   val request = Request.Builder()
       .url("$API_BASE_URL/orders/create")
       .post(requestBody.toRequestBody(jsonMediaType))
       .addHeader("Content-Type", "application/json")
       .addAuthIfAvailable()
       .build()
   ```

2. **test_07_validateDeliveryAddressDictFields** (around line 389-393): Same pattern — add `.addAuthIfAvailable()` before `.build()`.

3. **test_08_validateItemsFormat** (around line 438-442): Same pattern — add `.addAuthIfAvailable()` before `.build()`.

4. **test_09_iosFormatParity** (around line 495-499): Same pattern — add `.addAuthIfAvailable()` before `.build()`.

5. **test_10_webappFormatParity** (around line 550-554): Same pattern — add `.addAuthIfAvailable()` before `.build()`.

Do NOT modify any other tests — tests 00-05 are already correctly wired. Do NOT modify CustomerAppStagingApiTest.kt — it is already complete.
  </action>
  <verify>
Run: `grep -n "addAuthIfAvailable" /Users/jeet/StudioProjects/eatfair-android/app/src/test/java/ai/dollor/customer/staging/OrderCreationFieldMappingTest.kt`
Expected: 8 matches — 1 for the function definition, 7 for the calls in tests 03-10 (tests 01 and 02 use direct `.addHeader("Authorization", ...)` instead).
  </verify>
  <done>All 11 tests in OrderCreationFieldMappingTest.kt (00-10) have auth headers wired — either via direct `.addHeader("Authorization", "Bearer $authToken")` (tests 01, 02) or via `.addAuthIfAvailable()` (tests 03-10).</done>
</task>

<task type="auto">
  <name>Task 2: Run Gradle tests and verify 0 failures</name>
  <files>/Users/jeet/StudioProjects/eatfair-android/app/src/test/java/ai/dollor/customer/staging/OrderCreationFieldMappingTest.kt</files>
  <action>
Run the full customer app unit test suite to verify both staging test files compile and no tests regress:

```bash
cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :app:testDebugUnitTest 2>&1 | tail -30
```

If there are compilation errors in the staging test files, fix them. Common issues:
- Missing import for `Assume` (should be `org.junit.Assume`)
- Unresolved `addAuthIfAvailable` (verify the extension function is inside the class)

If tests fail due to network timeouts (staging server unreachable from CI), that is expected — staging tests are designed to be skipped via `Assume.assumeNotNull` when no auth token is obtained. The key verification is: **0 compilation errors, 0 unexpected test failures**.

Note: The staging API tests hit a live staging server. If the staging server is unreachable, tests will fail with connection timeouts — this is acceptable and expected for local-only staging tests. The critical check is that the test code compiles and the non-staging tests pass.
  </action>
  <verify>
Run: `cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :app:testDebugUnitTest 2>&1 | grep -E "(BUILD|FAIL|ERROR|tests completed)"`
Expected: `BUILD SUCCESSFUL` or only staging-related network failures (not compilation errors).
  </verify>
  <done>Gradle build succeeds, staging test files compile without errors, and no non-staging tests regress.</done>
</task>

</tasks>

<verification>
1. `grep -c "addAuthIfAvailable" OrderCreationFieldMappingTest.kt` returns 8 (1 definition + 7 calls)
2. `grep -c "Authorization.*Bearer" OrderCreationFieldMappingTest.kt` returns 2 (tests 01 and 02 direct headers)
3. `grep -c "Assume.assumeNotNull" CustomerAppStagingApiTest.kt` returns 4 (fare estimate tests 05_01-05_04)
4. `./gradlew :app:testDebugUnitTest` compiles both files without errors
</verification>

<success_criteria>
- All 11 OrderCreationFieldMappingTest tests (00-10) send auth headers when token available
- All 4 CustomerAppStagingApiTest fare estimate tests use Assume + auth headers (already done)
- Both files compile in Gradle with 0 errors
- No regression in existing non-staging unit tests
</success_criteria>

<output>
After completion, create `.planning/quick/41-fix-android-staging-tests-wire-demo-cred/41-SUMMARY.md`
</output>
