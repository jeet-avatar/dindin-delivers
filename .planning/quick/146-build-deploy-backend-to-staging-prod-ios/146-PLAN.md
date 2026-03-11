---
phase: quick
plan: 146
type: deploy
autonomous: true
---

# Quick 146: Build and Deploy All 3 Platforms

## Objective
Deploy backend to staging + production via CI/CD, build iOS Restaurant 190 to TestFlight, build Android Partner vC=33 to Firebase.

## Tasks

### Task 1: Push backend + deploy staging + production
- `git push origin main`
- `gh workflow run deploy-staging.yml --ref main`
- Monitor staging deploy, smoke test staging health
- `gh workflow run deploy-dollar-ai.yml`
- Monitor production deploy, smoke test production health

### Task 2: iOS Restaurant build 190 to TestFlight
- Bump CURRENT_PROJECT_VERSION from 189 to 190
- Commit the bump
- Archive with xcodebuild
- Export+Upload to TestFlight

### Task 3: Android Partner vC=33 to Firebase
- Bump versionCode to 33, versionName to "1.0.32"
- Commit in eatfair-android repo
- Build release APK
- Distribute via Firebase App Distribution

## Success Criteria
- Backend healthy on both staging and production
- iOS Restaurant build 190 uploaded to TestFlight
- Android Partner vC=33 distributed via Firebase
