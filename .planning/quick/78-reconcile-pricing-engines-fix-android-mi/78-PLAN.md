---
phase: quick-78
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/web/p2p-platform/backend/tests/unit/test_order_flow.py
  - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/config/AppConfig.kt
  - /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/constants/Constants.kt
  - /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts
  - /Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts
  - /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts
autonomous: true
requirements: [PRICING-RECONCILE, ANDROID-MINFARE, ANDROID-COMMENT]

must_haves:
  truths:
    - "Backend estimate engine (pricing_config.py) and payment engine (order_flow.py) use identical fare constants"
    - "Android MINIMUM_FARE matches backend and iOS at $8.00"
    - "All backend pricing tests pass with updated constants"
    - "Android APKs built and distributed to Firebase with bumped version codes"
  artifacts:
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "Reconciled fare constants matching pricing_config.py"
      contains: "BASE_FARE = 2.50"
    - path: "apps/web/p2p-platform/backend/tests/unit/test_order_flow.py"
      provides: "Updated test assertions for new constants"
      contains: "BASE_FARE == 2.50"
    - path: "/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/config/AppConfig.kt"
      provides: "Corrected MINIMUM_FARE"
      contains: "MINIMUM_FARE = 8.00"
  key_links:
    - from: "order_flow.py:516-521"
      to: "pricing_config.py:18-21"
      via: "Identical constant values"
      pattern: "BASE_FARE = 2.50.*PER_MILE_RATE = 1.15.*PER_MINUTE_RATE = 0.18.*MINIMUM_FARE = 8.00"
---

<objective>
Reconcile dual pricing engines so fare estimates match actual charges, fix Android minimum fare mismatch, and update misleading PLATFORM_FEE comment.

Purpose: Currently the estimate engine (pricing_config.py) uses BASE_FARE=2.50, /mi=1.15, /min=0.18, min=8.00 but the payment engine (order_flow.py) uses BASE_FARE=2.00, /mi=1.00, /min=0.15, min=5.00. This means customers are quoted one price but charged differently. Android also shows MINIMUM_FARE=5.00 when it should be 8.00.

Output: Unified pricing constants across backend + Android, passing tests, deployed backend, distributed Android APKs.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/web/p2p-platform/backend/pricing_config.py (canonical pricing — lines 18-21)
@apps/web/p2p-platform/backend/order_flow.py (payment engine — lines 516-521, 605-684)
@apps/web/p2p-platform/backend/tests/unit/test_order_flow.py (test assertions — lines 226-228, 248, 1822-1825)
@/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/config/AppConfig.kt (line 187)
@/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/constants/Constants.kt (line 21)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Reconcile backend pricing constants and fix tests</name>
  <files>
    apps/web/p2p-platform/backend/order_flow.py
    apps/web/p2p-platform/backend/tests/unit/test_order_flow.py
  </files>
  <action>
    1. In `order_flow.py` lines 516-521, update the rideshare fare constants to match `pricing_config.py` (the canonical estimate engine):
       - `BASE_FARE = 2.50` (was 2.00)
       - `PER_MILE_RATE = 1.15` (was 1.00)
       - `PER_MINUTE_RATE = 0.18` (was 0.15)
       - `MINIMUM_FARE = 8.00` (was 5.00)
       Leave `PLATFORM_FEE = 1.00` and `MAXIMUM_SURGE = 3.0` unchanged.

    2. In `test_order_flow.py`, update the `test_fee_constants` assertion block (lines 1822-1825):
       - `assert BASE_FARE == 2.50` (was 2.00)
       - `assert PER_MILE_RATE == 1.15` (was 1.00)
       - `assert PER_MINUTE_RATE == 0.18` (was 0.15)
       - `assert MINIMUM_FARE == 8.00` (was 5.00)

    3. In `test_order_flow.py`, update `test_calculate_ride_fare_basic` (line 227-228):
       - `distance_fee` for 5 miles: was `5.0` (5 * 1.00), now `5.75` (5 * 1.15)
       - `time_fee` for 15 min: was `2.25` (15 * 0.15), now `2.70` (15 * 0.18)

    4. In `test_order_flow.py`, update `test_calculate_ride_fare_with_surge` (line 248):
       - `driver_base` comment: was `2.0 + 3.0 + 1.5 = 6.5`, now `2.50 + 3.45 + 1.80 = 7.75`
         (base 2.50 + 3mi * 1.15 = 3.45 + 10min * 0.18 = 1.80)
       - Update: `driver_base = 2.50 + 3.45 + 1.80  # base + distance + time = 7.75`

    5. Run `cd apps/web/p2p-platform/backend && python -m pytest tests/unit/test_order_flow.py tests/unit/test_dollor_pricing_model.py -v` to confirm all tests pass.

    6. Then run full test suite: `python -m pytest tests/ -v` to confirm zero regressions.

    7. Commit backend changes: `git add order_flow.py tests/unit/test_order_flow.py && git commit -m "fix(pricing): reconcile order_flow constants to match pricing_config canonical values"`

    8. Push and deploy:
       - `git push origin main`
       - `gh workflow run deploy-staging.yml --ref main`
       - Wait for staging deploy, then: `gh workflow run deploy-dollar-ai.yml`
  </action>
  <verify>
    - `python -m pytest tests/ -v` passes with 0 failures
    - `grep "BASE_FARE = 2.50" apps/web/p2p-platform/backend/order_flow.py` returns a match
    - `grep "MINIMUM_FARE = 8.00" apps/web/p2p-platform/backend/order_flow.py` returns a match
    - CI/CD deploy workflows triggered successfully
  </verify>
  <done>
    order_flow.py constants match pricing_config.py exactly (BASE_FARE=2.50, PER_MILE_RATE=1.15, PER_MINUTE_RATE=0.18, MINIMUM_FARE=8.00). All backend tests pass. Backend deployed to staging and production.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix Android minimum fare and Constants comment, build and distribute APKs</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/config/AppConfig.kt
    /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/constants/Constants.kt
    /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts
    /Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts
    /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts
  </files>
  <action>
    1. In `AppConfig.kt` line 187, change:
       `const val MINIMUM_FARE = 5.00` to `const val MINIMUM_FARE = 8.00`
       Update the comment to: `// Minimum fare for short trips (matches backend pricing_config.py:21 and iOS AppConfig.swift:268)`

    2. In `Constants.kt` line 21, change the comment on PLATFORM_FEE:
       From: `const val PLATFORM_FEE = 0.0 // Currently $0 for customers`
       To: `const val PLATFORM_FEE = 0.0 // Food delivery: $0 (driver keeps 100%). Rideshare: tiered $1/$2/$3 (handled server-side via rideshare_payments.py)`

    3. Bump version codes in build.gradle.kts files:
       - `app/build.gradle.kts`: versionCode 33 -> 34, versionName "1.0.32" -> "1.0.33"
       - `driver/build.gradle.kts`: versionCode 30 -> 31, versionName "1.0.29" -> "1.0.30"
       - `partner/build.gradle.kts`: versionCode 26 -> 27, versionName "1.0.25" -> "1.0.26"

    4. Commit Android changes:
       `cd /Users/jeet/StudioProjects/eatfair-android && git add shared/src/main/java/ai/dollor/shared/config/AppConfig.kt app/src/main/java/ai/dollor/customer/constants/Constants.kt app/build.gradle.kts driver/build.gradle.kts partner/build.gradle.kts && git commit -m "fix(pricing): update MINIMUM_FARE to 8.00, fix PLATFORM_FEE comment, bump versions"`

    5. Build all 3 release APKs:
       `cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew clean assembleRelease`

    6. Distribute to Firebase App Distribution:
       ```
       firebase appdistribution:distribute app/build/outputs/apk/release/app-release.apk \
         --app "1:65740760476:android:535885ca28086e6242d459" \
         --testers "jeetnair.in@gmail.com" \
         --release-notes "Customer v1.0.33 - Fix minimum fare to $8.00" --project dollorai-production

       firebase appdistribution:distribute driver/build/outputs/apk/release/driver-release.apk \
         --app "1:65740760476:android:7d9bed1ee685434c42d459" \
         --testers "jeetnair.in@gmail.com" \
         --release-notes "Driver v1.0.30 - Fix minimum fare to $8.00" --project dollorai-production

       firebase appdistribution:distribute partner/build/outputs/apk/release/partner-release.apk \
         --app "1:65740760476:android:8591cc17fa4f8d4c42d459" \
         --testers "jeetnair.in@gmail.com" \
         --release-notes "Partner v1.0.26 - Fix minimum fare to $8.00" --project dollorai-production
       ```

    Do NOT rebuild iOS -- already correct at build 1111 (iOS AppConfig.swift:268 has rideMinFare=8.00).
  </action>
  <verify>
    - `grep "MINIMUM_FARE = 8.00" /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/config/AppConfig.kt` returns a match
    - `grep "rideshare_payments.py" /Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/constants/Constants.kt` returns a match
    - `grep "versionCode = 34" /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts` returns a match
    - All 3 APKs exist at `{module}/build/outputs/apk/release/{module}-release.apk`
    - Firebase distribution commands succeed
  </verify>
  <done>
    Android MINIMUM_FARE updated to 8.00 matching backend and iOS. PLATFORM_FEE comment clarified. All 3 APKs built (Customer vC=34, Driver vC=31, Partner vC=27) and distributed to Firebase.
  </done>
</task>

</tasks>

<verification>
- `grep "BASE_FARE = 2.50" apps/web/p2p-platform/backend/order_flow.py` confirms reconciled value
- `grep "MINIMUM_FARE = 8.00" apps/web/p2p-platform/backend/order_flow.py` confirms reconciled value
- `grep "MINIMUM_FARE = 8.00" /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/config/AppConfig.kt` confirms Android fix
- Backend test suite passes with 0 failures
- Both repos committed and pushed
- Backend deployed to staging + production via CI/CD
- 3 Android APKs distributed to Firebase
</verification>

<success_criteria>
All pricing constants unified across all three sources:
- pricing_config.py (estimate engine): BASE_FARE=2.50, PER_MILE_RATE=1.15, PER_MINUTE_RATE=0.18, MINIMUM_FARE=8.00 (unchanged, canonical)
- order_flow.py (payment engine): same values (was divergent, now reconciled)
- Android AppConfig.kt: MINIMUM_FARE=8.00 (was 5.00, now matches)
- iOS AppConfig.swift: rideMinFare=8.00 (already correct, not touched)
- Backend tests updated and passing
- Backend deployed, Android APKs distributed
</success_criteria>

<output>
After completion, create `.planning/quick/78-reconcile-pricing-engines-fix-android-mi/78-SUMMARY.md`
</output>
