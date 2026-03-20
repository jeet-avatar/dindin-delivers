---
phase: quick-207
plan: 01
subsystem: html-layout, ios-builds, android-builds
tags: [layout-fix, build-bump, html, ios, android]
dependency_graph:
  requires: []
  provides: [fixed-audit-html, ios-builds-1121-227-218, android-builds-vC39-vC35-vC34]
  affects: []
tech_stack:
  added: []
  patterns: [sticky-offset-correction, independent-panel-scroll]
key_files:
  created: []
  modified:
    - .superpowers/brainstorm/driver-rideshare-audit.html
    - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    - apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    - apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
    - /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts
    - /Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts
    - /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts
decisions:
  - "Used replace_all=true pattern for pbxproj edits to hit all 6 build configurations per file"
  - "Used sed -i for pbxproj files (no Read needed since pure find-replace with no structural context required)"
  - "main-panel gets height + overflow-y: auto matching left-panel pattern for independent scroll"
metrics:
  duration: ~8 minutes
  completed: 2026-03-19
---

# Quick Task 207: Fix Driver Rideshare Audit HTML Layout + Bump Build Numbers — Summary

**One-liner:** Fixed audit HTML 80px→116px header offset with independent main-panel scroll; bumped all 6 app build numbers (3 iOS + 3 Android) for next distribution round.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Fix audit HTML header offset 80px→116px + main-panel independent scroll | 05c732b0 | driver-rideshare-audit.html |
| 2 | Bump iOS build numbers: Customer 1120→1121, Driver 226→227, Restaurant 217→218 | 72d1b8db | 3 pbxproj files |
| 3 | Bump Android version codes: Customer vC39/1.0.38, Driver vC35/1.0.34, Partner vC34/1.0.33 | 88bb5798 (android repo) | 3 build.gradle.kts files |

## Verification

### HTML Layout Fix
```
grep -c "80px" .superpowers/brainstorm/driver-rideshare-audit.html
# Result: 0  (no header-offset occurrences remain)

grep -c "116px" .superpowers/brainstorm/driver-rideshare-audit.html
# Result: 4  (.container, .left-panel top, .left-panel height, .main-panel height)
```

CSS changes applied:
- `.container { min-height: calc(100vh - 116px) }` (was 80px)
- `.left-panel { top: 116px; height: calc(100vh - 116px) }` (was 80px each)
- `.main-panel { height: calc(100vh - 116px); overflow-y: auto }` (height added, overflow-y was already present)

### iOS Build Numbers
```
grep "CURRENT_PROJECT_VERSION" apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj | grep -c "1121"
# Result: 6

grep "CURRENT_PROJECT_VERSION" apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj | grep -c "227"
# Result: 6

grep "CURRENT_PROJECT_VERSION" apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj | grep -c "218"
# Result: 6
```

### Android Build Numbers
```
grep "versionCode" /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts
# Result: versionCode = 39

grep "versionCode" /Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts
# Result: versionCode = 35

grep "versionCode" /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts
# Result: versionCode = 34
```

## Build Number Table

| Platform | App | Before | After |
|----------|-----|--------|-------|
| iOS | Customer | 1120 | 1121 |
| iOS | Driver | 226 | 227 |
| iOS | Restaurant | 217 | 218 |
| Android | Customer | vC=38 / 1.0.37 | vC=39 / 1.0.38 |
| Android | Driver | vC=34 / 1.0.33 | vC=35 / 1.0.34 |
| Android | Partner | vC=33 / 1.0.32 | vC=34 / 1.0.33 |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] driver-rideshare-audit.html modified — `05c732b0` exists
- [x] 3 iOS pbxproj files modified — `72d1b8db` exists
- [x] 3 Android build.gradle.kts files modified — `88bb5798` in android repo
- [x] 0 occurrences of header-offset 80px remain in HTML
- [x] All 6 iOS build configurations show new numbers (6 occurrences each)
- [x] All 3 Android modules show correct versionCode/versionName
