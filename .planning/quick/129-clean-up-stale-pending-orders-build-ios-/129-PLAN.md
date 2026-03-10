---
phase: quick-129
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [CLEANUP-PENDING, BUILD-IOS-RESTAURANT, BUILD-ANDROID-PARTNER, PARITY-AUDIT]
must_haves:
  truths:
    - "Stale pending orders on restaurant are cancelled (no lingering pending_payment/pending_restaurant/pending_delivery_decision)"
    - "iOS Restaurant app new build uploaded to TestFlight"
    - "Android Partner app new build uploaded to Firebase App Distribution"
    - "iOS vs Android restaurant/partner feature parity audit produced with gaps identified"
  artifacts:
    - path: ".planning/quick/129-clean-up-stale-pending-orders-build-ios-/PARITY_AUDIT.md"
      provides: "Feature parity comparison between iOS Restaurant and Android Partner apps"
  key_links: []
---

<objective>
Clean up stale pending orders cluttering the restaurant app, build fresh iOS Restaurant + Android Partner apps, and audit feature parity between the two platforms.

Purpose: Restaurant app shows stale test/abandoned orders; fresh builds needed after recent self-delivery fixes (quick-127/128); parity audit ensures both platforms have equivalent features.
Output: Clean database state, iOS Restaurant build 186+ on TestFlight, Android Partner vC=30+ on Firebase, PARITY_AUDIT.md
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.agents/skills/ticketed-task/SKILL.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CR ticket, clean up stale pending orders, build and distribute iOS Restaurant + Android Partner</name>
  <files></files>
  <action>
1. **Create CR ticket** per ticketed-task skill:
   ```
   curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY" \
     -H "Content-Type: application/json" \
     -d '{"title":"Clean up stale pending orders, build iOS Restaurant + Android Partner, parity audit","description":"Cancel stale pending orders on restaurant, build fresh iOS Restaurant to TestFlight and Android Partner to Firebase after self-delivery fixes, audit feature parity","change_type":"config","priority":"Medium","requested_by":"support@dollor.ai"}'
   ```
   Then submit: `curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/<cr_id>/submit?secret_key=$ADMIN_SECRET_KEY"`

2. **Clean up stale pending orders** on production:
   ```
   curl -s -X POST "https://api.dollor.ai/api/admin/cleanup/pending-orders" \
     -H "Authorization: Bearer <admin_jwt_or_secret>" \
     -H "X-Admin-Secret: $ADMIN_SECRET_KEY"
   ```
   This cancels orders in pending_payment, pending_restaurant, pending_delivery_decision statuses + open/bidding ride requests. Log the count of cancelled orders/rides.

   If the auth pattern requires ADMIN_SECRET_KEY as query param instead, use:
   ```
   curl -s -X POST "https://api.dollor.ai/api/admin/cleanup/pending-orders?secret_key=$ADMIN_SECRET_KEY"
   ```

3. **Build iOS Restaurant app** and upload to TestFlight:
   ```
   cd /Users/jeet/doordash-p2p
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
   NOTE: If -workspace fails with "scheme not found", use `-project apps/ios/restaurant/eatffairrestaurant.xcodeproj` instead per CLAUDE.md.
   Record the new build number (should be 186+).

4. **Build Android Partner app** and distribute to Firebase:
   ```
   cd /Users/jeet/StudioProjects/eatfair-android
   ./gradlew :partner:assembleRelease

   firebase appdistribution:distribute partner/build/outputs/apk/release/partner-release.apk \
     --app "1:65740760476:android:8591cc17fa4f8d4c42d459" \
     --testers "jeetnair.in@gmail.com" \
     --release-notes "Partner vX.Y.Z - self-delivery fixes" --project dollorai-production
   ```
   Record the new versionCode.
  </action>
  <verify>
- Cleanup endpoint returns success with orders_cancelled and rides_cancelled counts
- iOS archive + export succeeds, TestFlight upload confirmed
- Android assembleRelease succeeds, Firebase distribute succeeds
  </verify>
  <done>Stale pending orders cancelled on production, iOS Restaurant build 186+ on TestFlight, Android Partner vC=30+ on Firebase</done>
</task>

<task type="auto">
  <name>Task 2: Audit iOS Restaurant vs Android Partner feature parity</name>
  <files>.planning/quick/129-clean-up-stale-pending-orders-build-ios-/PARITY_AUDIT.md</files>
  <action>
Perform a systematic feature parity audit between the iOS Restaurant app (`apps/ios/restaurant/`) and Android Partner app (`/Users/jeet/StudioProjects/eatfair-android/partner/`).

Compare these feature areas:
1. **Order management** — incoming orders, accept/reject, order details, order history, status transitions
2. **Menu management** — add/edit/delete items, categories, pricing, availability toggle
3. **Self-delivery** — self-delivery toggle, MapView/navigation, leave_at_door handling, delivery instructions
4. **Delivery decisions** — accept/reject delivery, driver assignment visibility
5. **Restaurant profile** — edit hours, address, contact info, documents
6. **Earnings/analytics** — revenue dashboard, order stats, payout history
7. **Notifications** — push notification handling, in-app alerts
8. **Support** — help center, contact support, admin portal links
9. **Authentication** — login, registration, OAuth, token refresh
10. **Promotions** — featured deals, promo codes (if wired)

For each area, scan both codebases:
- iOS: `grep -rn` in `apps/ios/restaurant/` for relevant View/ViewModel files
- Android: `grep -rn` in `/Users/jeet/StudioProjects/eatfair-android/partner/src/` for relevant Activity/Fragment/Screen files

Produce `PARITY_AUDIT.md` with:
- Table format: Feature | iOS Status | Android Status | Gap?
- Summary of gaps (features in one platform but not the other)
- Priority ranking of gaps (Critical/High/Medium/Low)

Focus on FUNCTIONAL parity (does the feature exist and work), not pixel-perfect UI matching.
  </action>
  <verify>PARITY_AUDIT.md exists with at least 10 feature areas compared, gaps clearly identified</verify>
  <done>Feature parity audit complete with gaps identified and prioritized between iOS Restaurant and Android Partner apps</done>
</task>

</tasks>

<verification>
- Production cleanup endpoint returned success response
- iOS Restaurant new build visible in TestFlight processing/ready
- Android Partner APK distributed via Firebase to jeetnair.in@gmail.com
- PARITY_AUDIT.md written with comprehensive feature comparison
</verification>

<success_criteria>
- Zero stale pending orders remain on restaurant
- iOS Restaurant build 186+ uploaded to TestFlight
- Android Partner build vC=30+ on Firebase App Distribution
- PARITY_AUDIT.md identifies all feature gaps between iOS and Android restaurant apps
</success_criteria>

<output>
After completion, create `.planning/quick/129-clean-up-stale-pending-orders-build-ios-/129-SUMMARY.md`
</output>
