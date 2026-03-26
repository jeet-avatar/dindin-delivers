---
phase: quick-232
plan: 01
subsystem: android-builds
tags: [android, firebase, apk, distribution]
dependency_graph:
  requires: []
  provides: [android-apks-built]
  affects: [firebase-app-distribution]
tech_stack:
  added: []
  patterns: [gradle-release-build, firebase-appdistribution]
key_files:
  created: []
  modified: []
decisions:
  - "APK build verified: all 3 modules BUILD SUCCESSFUL, sizes 15-23 MB"
  - "Firebase reauth required before distribution can complete"
metrics:
  duration: "~3 min (build only)"
  completed_date: "2026-03-25"
---

# Quick-232: Build All Android APKs and Distribute to Firebase — Summary

**One-liner:** Built all 3 Android release APKs (Customer 23 MB, Driver 15 MB, Partner 15 MB) via Gradle; Firebase distribution blocked on expired CLI credentials requiring interactive reauth.

## Tasks Completed

| Task | Status | Commit |
|------|--------|--------|
| Task 1: Build all 3 Android release APKs | COMPLETE | 99781c1f |
| Task 2: Distribute to Firebase App Distribution | BLOCKED — auth expired | — |

## Task 1 — Build Results

All 3 release APKs built successfully with `./gradlew :app:assembleRelease :driver:assembleRelease :partner:assembleRelease`.

| APK | Size | versionCode | versionName | Path |
|-----|------|-------------|-------------|------|
| app-release.apk | 23 MB | 40 | 1.0.39 | `app/build/outputs/apk/release/app-release.apk` |
| driver-release.apk | 15 MB | 36 | 1.0.35 | `driver/build/outputs/apk/release/driver-release.apk` |
| partner-release.apk | 15 MB | 35 | 1.0.34 | `partner/build/outputs/apk/release/partner-release.apk` |

Gradle output: `BUILD SUCCESSFUL in 18s` — 175 actionable tasks, 111 executed, 59 from cache, 5 up-to-date.

## Task 2 — Firebase Distribution (BLOCKED)

Firebase CLI returned:
```
Authentication Error: Your credentials are no longer valid. Please run firebase login --reauth
```

This matches the known state in MEMORY.md ("Firebase pending reauth"). The Firebase CLI requires interactive browser authentication which cannot be automated from the CLI agent context.

## Deviations from Plan

### Authentication Gates

**Firebase CLI Reauth Required (Task 2)**
- **Found during:** Task 2 — first distribute command
- **Error:** `Authentication Error: Your credentials are no longer valid`
- **Resolution needed:** Run `firebase login --reauth` in a terminal session, complete browser OAuth, then re-run the 3 distribute commands below

### Change Request API (Minor)

`ADMIN_SECRET_KEY` env var not set in executor shell — CR could not be created via API. This is a non-blocking gap; the build work proceeded normally.

## Resume Commands (after firebase login --reauth)

```bash
# Customer
firebase appdistribution:distribute \
  /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk \
  --app "1:65740760476:android:535885ca28086e6242d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "Customer v1.0.39 (vC=40) — pre-Play-Store verification build" \
  --project dollorai-production

# Driver
firebase appdistribution:distribute \
  /Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk \
  --app "1:65740760476:android:7d9bed1ee685434c42d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "Driver v1.0.35 (vC=36) — pre-Play-Store verification build" \
  --project dollorai-production

# Partner
firebase appdistribution:distribute \
  /Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk \
  --app "1:65740760476:android:8591cc17fa4f8d4c42d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "Partner v1.0.34 (vC=35) — pre-Play-Store verification build" \
  --project dollorai-production
```

## Self-Check

- [x] All 3 APK files exist on disk (verified with ls -lh)
- [x] Sizes are in MB range (23 MB, 15 MB, 15 MB) — not empty stubs
- [x] Gradle BUILD SUCCESSFUL confirmed
- [x] Task 1 commit exists: 99781c1f
- [ ] Firebase distribution: BLOCKED — requires user reauth
