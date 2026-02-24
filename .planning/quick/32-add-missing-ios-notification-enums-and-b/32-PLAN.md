---
phase: quick-32
type: quick
description: "Add missing iOS notification enums + build/distribute updated Android APKs"
---

# Quick Task 32

## Tasks

### Task 1: Add missing iOS notification enum cases
- **file:** NotificationManager.swift
- **action:** Add `driverCounter = "driver_counter"` and `counterAccepted = "counter_accepted"` to NotificationType enum + soundName mapping
- **verify:** iOS customer app builds clean

### Task 2: Bump Android versions + build release APKs
- **action:** Customer 24→25, Driver 21→22, Partner 17→18. Run assembleRelease.
- **verify:** All 3 APKs built

### Task 3: Upload APKs to Firebase App Distribution
- **action:** firebase appdistribution:distribute for all 3 apps
- **verify:** All 3 uploaded successfully
