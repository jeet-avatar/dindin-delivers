---
phase: quick-156
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
  - apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
autonomous: true
requirements: [BUG-HOURS, BUG-PROMO, INVESTIGATE-PHOTO, DEPLOY]
must_haves:
  truths:
    - "Business hours save fix committed with CR ticket"
    - "Promotion edit fix already committed (dea9cf37) — CR ticket created for audit trail"
    - "Delivery photo E2E investigated and gaps documented in CR ticket"
    - "iOS Restaurant build 200 on TestFlight, backend deployed to production"
  artifacts:
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift"
      provides: "Business hours save fix (removed Firebase guard blocking P2P backend save)"
    - path: "apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj"
      provides: "Build 200 version bump"
  key_links:
    - from: "RestaurantSettingsView.swift"
      to: "PATCH /api/vendors/{id}"
      via: "hours persist via P2P backend"
      pattern: "updateVendorProfile"
---

<objective>
Fix and release 3 bugs: (1) business hours not saving, (2) promotion edit not saving, (3) delivery photo E2E investigation. Deploy all fixes through CI/CD and upload iOS Restaurant build 200 to TestFlight.

Purpose: Ship two confirmed bug fixes and investigate a potential gap in delivery photo flow.
Output: CR tickets for all 3 items, production deploy, TestFlight build 200.
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
  <name>Task 1: Commit fixes and create CR tickets for all 3 items</name>
  <files>apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift</files>
  <action>
    **Step 1 — Create 3 CR tickets** via the admin portal API (see ticketed-task SKILL.md):

    CR #1: "Fix business hours not saving in Restaurant app"
    - change_type: code, priority: High
    - Description: "Removed Firebase guard that was blocking P2P backend save. Hours now persist via PATCH /api/vendors/{id}."

    CR #2: "Fix promotion edit not saving (update_promotion response)"
    - change_type: code, priority: High
    - Description: "update_promotion endpoint now returns full promotion object instead of minimal success dict. Already committed as dea9cf37. Creating CR for audit trail."

    CR #3: "Investigate delivery photo end-to-end flow"
    - change_type: code, priority: Medium
    - Description: "Investigate whether delivery photo capture (driver app), upload (backend), storage, and display (customer app) exists end-to-end across iOS and Android."

    Submit all 3 CRs for review.

    **Step 2 — Commit the business hours fix:**
    The file `apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift` is already modified in the working tree. Commit it with message:
    `fix(quick-156): [CR-XXXX] fix business hours not saving — remove Firebase guard blocking P2P backend save`

    **Step 3 — Investigate delivery photo E2E:**
    Search across the codebase to determine if delivery photo exists:

    a) **Driver iOS app**: grep for photo capture, camera, delivery proof, POD (proof of delivery) in `apps/ios/delivery/`
    b) **Driver Android app**: grep for photo/camera/delivery proof in the Android driver module (reference: `/Users/jeet/StudioProjects/eatfair-android/driver/`)
    c) **Backend**: grep for delivery photo upload endpoint, photo storage (S3), photo URL field on order/delivery model in `apps/web/p2p-platform/backend/`
    d) **Customer iOS app**: grep for delivery photo display in `apps/ios/customer/`
    e) **Customer Android app**: grep in `/Users/jeet/StudioProjects/eatfair-android/app/`

    Document findings: what exists, what is missing, what gaps need to be filled. Update the CR #3 description with findings (or add a note to the summary).

    **Step 4 — Transition CRs to In Progress.**
  </action>
  <verify>
    - `git log --oneline -3` shows business hours fix commit with CR ID
    - All 3 CR tickets exist (curl GET to verify)
    - Delivery photo investigation findings documented
  </verify>
  <done>All 3 CR tickets created and submitted. Business hours fix committed. Delivery photo E2E investigation complete with gaps identified.</done>
</task>

<task type="auto">
  <name>Task 2: Deploy backend to staging and production via CI/CD</name>
  <files></files>
  <action>
    **NOTE:** The promotion edit fix (dea9cf37) is already committed. The business hours fix is iOS-only (no backend change). Check if the promotion fix commit has been pushed to remote.

    **Step 1 — Push to remote:**
    `git push origin main`

    **Step 2 — Deploy to staging:**
    `gh workflow run deploy-staging.yml --ref main`
    Monitor: `gh run list --workflow=deploy-staging.yml --limit 3`
    Wait for completion: `gh run watch <run-id>`

    **Step 3 — Smoke test staging:**
    - `curl -s https://d34u5ixl0bulv4.cloudfront.net/api/health` — expect 200
    - Test promotion update endpoint works on staging (create a test promotion, update it, verify full object returned)

    **Step 4 — Deploy to production:**
    `gh workflow run deploy-dollar-ai.yml`
    Monitor and wait for completion.

    **Step 5 — Smoke test production:**
    - `curl -s https://api.dollor.ai/api/health` — expect 200

    **Step 6 — Transition CR #1 and CR #2 through:** In Progress -> Staging -> Production -> Verified
  </action>
  <verify>
    - `gh run list --workflow=deploy-staging.yml --limit 1` shows success
    - `gh run list --workflow=deploy-dollar-ai.yml --limit 1` shows success
    - `curl -s https://api.dollor.ai/api/health` returns 200
  </verify>
  <done>Backend deployed to staging and production. Both deploy workflows completed successfully. CRs transitioned to Verified.</done>
</task>

<task type="auto">
  <name>Task 3: Bump iOS Restaurant to build 200 and upload to TestFlight</name>
  <files>apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj</files>
  <action>
    **Step 1 — Bump build number:**
    Update CURRENT_PROJECT_VERSION from 199 to 200 in ALL build configurations in `apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj`.

    **Step 2 — Commit the bump:**
    `build: bump iOS Restaurant to build 200`

    **Step 3 — Push to remote:**
    `git push origin main`

    **Step 4 — Archive and upload to TestFlight:**
    ```bash
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

    **Step 5 — Verify upload:**
    Check TestFlight processing status. The exportArchive step with `destination: upload` in ExportOptions.plist handles the upload automatically.

    **Step 6 — Update STATE.md** last activity line and MEMORY.md build versions table (Restaurant build 200).
  </action>
  <verify>
    - `grep "CURRENT_PROJECT_VERSION = 200" apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj` matches all configs
    - Archive and export commands complete without error
    - `git log --oneline -3` shows build bump commit
  </verify>
  <done>iOS Restaurant build 200 archived and uploaded to TestFlight. Build version updated in STATE.md and MEMORY.md.</done>
</task>

</tasks>

<verification>
- All 3 CR tickets created and in Verified status
- Business hours fix committed and deployed (iOS change — TestFlight)
- Promotion edit fix deployed to production (backend — already committed)
- Delivery photo E2E investigation documented
- iOS Restaurant build 200 on TestFlight
- Backend production healthy (health check 200)
</verification>

<success_criteria>
1. Three CR tickets exist with proper descriptions and final status
2. `git log` shows business hours fix commit and build 200 bump commit
3. Production deploy workflow succeeded
4. iOS Restaurant build 200 uploaded to TestFlight
5. Delivery photo investigation findings documented in summary
</success_criteria>

<output>
After completion, create `.planning/quick/156-fix-business-hours-promotion-edit-delive/156-SUMMARY.md`
</output>
