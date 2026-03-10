---
phase: quick-140
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [COMMIT-CHANGES, IOS-RESTAURANT-TESTFLIGHT, ANDROID-PARTNER-FIREBASE]
---

<objective>
Commit all uncommitted changes in both repos, build iOS Restaurant app (build 187) to TestFlight, build Android Partner release APK and distribute via Firebase to jeetnair.in@gmail.com.

Only restaurant apps — no customer or driver apps.
</objective>

## Tasks

### Task 1: Commit uncommitted changes in iOS repo
- **action**: Stage and commit modified+untracked files in doordash-p2p repo
- **done**: Clean working tree

### Task 2: Build iOS Restaurant app 187 and upload to TestFlight
- **action**:
  1. Increment build number to 187 in Xcode project
  2. Archive with Release config
  3. Export + upload via ExportOptions.plist
- **done**: Build uploaded to TestFlight

### Task 3: Build Android Partner release APK and distribute via Firebase
- **action**:
  1. Commit Android Partner changes
  2. Increment versionCode in partner/build.gradle.kts
  3. Build release APK: ./gradlew :partner:assembleRelease
  4. firebase login --reauth (if needed)
  5. Distribute via Firebase App Distribution
- **done**: APK distributed to jeetnair.in@gmail.com
