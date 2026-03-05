---
phase: quick-91
plan: 91
subsystem: distribution
tags: [ios, android, testflight, firebase, build]
metrics:
  duration: ~25min
  completed: 2026-03-05
  tasks: 2/2
decisions:
  - Customer iOS build 1112 (was 1111 which is in App Store review)
  - Fixed Restaurant LoginView switch exhaustiveness (missing default case for new P2PAPIError cases)
---

# Quick Task 91: Build and Distribute All 6 Apps

## iOS TestFlight Uploads

| App | Build | Version | Status |
|-----|-------|---------|--------|
| Customer | 1112 | 1.0 | Uploaded to TestFlight |
| Driver | 214 | 1.0 | Uploaded to TestFlight |
| Restaurant | 184 | 1.0 | Uploaded to TestFlight |

## Android Firebase Uploads

| App | Version Code | Version Name | Status |
|-----|-------------|--------------|--------|
| Customer | 35 | 1.0.34 | Distributed via Firebase |
| Driver | 32 | 1.0.31 | Distributed via Firebase |
| Partner | 28 | 1.0.27 | Distributed via Firebase |

## Issues Found and Fixed

1. **Restaurant LoginView switch exhaustiveness**: `LoginView.swift:549` had a switch on `P2PAPIError` without handling `priceChanged`/`vendorOffline` cases added in Quick-90. Added `default:` case. All other switch statements across 3 apps already had `default:` cases.

## Changes Included in These Builds

- Quick-89: Stripe idempotency keys (8 calls), refund endpoint, price change detection, vendor offline blocking
- Quick-90: iOS/Android client-side 409/400 error handling, push notifications for auto-cancel and refund
- Restaurant LoginView switch fix (this task)
