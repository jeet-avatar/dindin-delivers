# Quick Task 20 Summary

## Bump build numbers, archive, and upload all 3 iOS apps to TestFlight

**Date:** 2026-02-23
**Status:** COMPLETE

### Build Numbers

| App | Previous | New | Bundle ID |
|-----|----------|-----|-----------|
| Customer | 1089 | 1090 | com.dollorai.customer |
| Driver | 197 | 198 | com.dollorai.delivery |
| Restaurant | 165 | 166 | com.dollorai.restaurant |

### Results

| App | Archive | Upload | TestFlight |
|-----|---------|--------|------------|
| Customer | SUCCEEDED | SUCCEEDED | Build 1090 uploaded |
| Driver | SUCCEEDED | SUCCEEDED | Build 198 uploaded |
| Restaurant | SUCCEEDED | SUCCEEDED | Build 166 uploaded |

### What Changed Since Last Build (1089/197/165)

- **19 auth header fixes**: `requestRide()` + 18 other methods in P2PAPIService.swift now send `Authorization: Bearer` headers (commits `f867a81a` + `b27315f7`)
- FCM token save for all 3 apps now works against auth-protected backend
- Driver location updates, online status, order tracking, delivery decisions, KOT print all fixed

### Commits

- `3a857fa5`: build(quick-20): bump iOS build numbers
- Previous fix commits included in this build: `f867a81a`, `b27315f7`

### Notes

- dSYM warnings for Firebase/gRPC frameworks are cosmetic (third-party symbols, not our code)
- All builds used `-configuration Release` with automatic signing
- Upload via `xcodebuild -exportArchive` with App Store Connect API key authentication
