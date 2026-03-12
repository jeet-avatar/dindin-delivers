---
created: 2026-03-09T15:59:23.334Z
title: Apple App Store iOS cleanup for next builds
area: ios
files:
  - apps/ios/customer/eatfaircustomer/Info.plist
  - apps/ios/Config/Production.xcconfig
  - apps/ios/customer/eatfaircustomer/Services/ACHPaymentService.swift
---

## Problem

Enterprise audit (quick-125) found 7 cleanup items for future iOS builds. Build 1111/1114 already approved by Apple but these reduce rejection risk for subsequent submissions.

Apple is currently checking business papers/agreements — will confirm if anything else needed. Current production build is 1114.

## Items

1. **Remove NSContactsUsageDescription from Info.plist** — declared but Contacts framework never used (no CNContactStore, no import Contacts anywhere in codebase)
2. **Remove NSLocationAlwaysAndWhenInUseUsageDescription from Info.plist** — only WhenInUse is requested, never Always
3. **Set ENABLE_AI_FEATURES=NO in Production.xcconfig** — dead flag after quick-114 removed AI features (zero Swift references)
4. **Delete ACHPaymentService.swift** — dead code, all 3 /api/enterprise/ endpoints return 404, never referenced from any View
5. **Verify ASC privacy labels match actual SDK data collection** — Firebase Analytics (device identifiers, usage data), Google Maps (location), Stripe (payment info)
6. **Fill What's New text in ASC** — currently empty, update before releasing
7. **Set privacy URL in version localization** — set at app info level but None in version-level en-US localization

8. **Add delivery photo display to Customer app** — Driver photo capture + backend storage (12-hour retention, proof gate) already exist, but Customer app (iOS + Android) has NO UI to show the delivery photo. Add photo display in order tracking and order history views. (Ref: CR-0018, quick-156 investigation)

## Solution

Items 1-4: Code changes in a single quick task, then rebuild iOS apps
Items 5-7: ASC metadata updates via API or web UI (no build needed)
Item 8: Add AsyncImage/photo view to OrderTrackingView + OrderDetailView on both iOS and Android customer apps
