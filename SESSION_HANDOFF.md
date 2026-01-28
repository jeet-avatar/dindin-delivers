# Session Handoff - Dollor iOS Apps

> **Date:** 2026-01-28
> **Previous Session:** Customer App Build 32 Documentation Complete

---

## Current State

### Customer App (Build 32)
- **Status:** Submitted for App Store Review
- **Bundle ID:** `com.dollorai.customer`
- **Team ID:** `PRKZ4UVCD7` (support2dollorai account)
- **Archive:** `~/Library/Developer/Xcode/Archives/2026-01-27/Dollor-Build32.xcarchive`

### Restaurant App (Build 17)
- **Status:** TestFlight
- **Bundle ID:** `com.dollor.restaurant`
- **Team ID:** `YRHVAY595K` (needs verification)

---

## Completed This Session

### 1. Customer App Source of Truth Documents Created
Two comprehensive documents created (both gitignored):

| Document | Path |
|----------|------|
| Config & Keys | `apps/ios/CUSTOMER_APP_SOURCE_OF_TRUTH.md` |
| API Workflow | `apps/ios/CUSTOMER_APP_API_WORKFLOW.md` |

### 2. Configuration Files Fixed (Customer App)
All files updated to match Build 32:

| File | Fixed |
|------|-------|
| `Info.plist` | URL scheme, Google Maps API key, all permissions |
| `GoogleService-Info.plist` | Client ID, API key, Bundle ID, App ID |
| `Appfile` | Bundle ID, Team ID, Apple ID |
| `project.pbxproj` | Team ID, Bundle ID |
| `ExportOptions.plist` | Team ID, Bundle ID |
| `*.entitlements` | Merchant ID |

### 3. Old/Wrong Values Removed
- Deleted test files with test Stripe tokens
- Removed old Team ID (`YRHVAY595K`) from customer app
- Removed old Bundle ID (`com.dollor.customer`)
- Removed old Google Client IDs

### 4. Stripe Keys Retrieved
Production keys retrieved from AWS Secrets Manager (`dollor/production/stripe`) and added to source of truth document.

---

## Key Configuration (Build 32 - Customer App)

```
Bundle ID:        com.dollorai.customer
Team ID:          PRKZ4UVCD7
Google Client ID: 65740760476-0cnsrucn1tvadbf193cgio2siosnjg02
Google App ID:    1:65740760476:ios:973eaffa167f09b142d459
Google Maps Key:  AIzaSyCELfWMuckt-Bbx5tyuiOSS3sYNywxVTXc
Merchant ID:      merchant.com.dollorai.customer
Stripe Account:   acct_1SoXl3ReyIzV18V4
API Base URL:     https://api.dollor.ai
```

---

## Files Location

```
/Users/jeet/StudioProjects/eatfair-ios/
├── apps/ios/
│   ├── CUSTOMER_APP_SOURCE_OF_TRUTH.md  (gitignored - has all keys)
│   ├── CUSTOMER_APP_API_WORKFLOW.md     (gitignored - all API endpoints)
│   ├── RESTAURANT_APP_SOURCE_OF_TRUTH.md (needs update for Build 17)
│   ├── customer/                         (Customer App)
│   └── restaurant/                       (Restaurant App)
└── apps/web/p2p-platform/backend/        (Backend - 405 API routes)
```

---

## Next Session Tasks

### Priority 1: Restaurant App (Build 17)
- [ ] Verify Build 17 archive configuration
- [ ] Update `RESTAURANT_APP_SOURCE_OF_TRUTH.md` with actual Build 17 values
- [ ] Fix any mismatched config files
- [ ] Create `RESTAURANT_APP_API_WORKFLOW.md`

### Priority 2: App Store Review
- [ ] Monitor Customer App Build 32 review status
- [ ] Prepare for any rejection feedback

### Priority 3: Verification
- [ ] Test Google Sign-In with new config
- [ ] Test Apple Sign-In
- [ ] Test Stripe payments
- [ ] Verify all API endpoints working

---

## Important Notes

1. **Two Different Team IDs:**
   - Customer App: `PRKZ4UVCD7` (support2dollorai)
   - Restaurant App: `YRHVAY595K` (jeetnair.in@gmail.com) - VERIFY

2. **Two Different Bundle ID Patterns:**
   - Customer: `com.dollorai.customer` (with "ai")
   - Restaurant: `com.dollor.restaurant` (without "ai")

3. **Source of Truth Files are PRIVATE:**
   - Added to `.gitignore`
   - Contain production Stripe keys
   - Never commit to git

4. **Backend has 405 API routes** - only ~50 used by Customer App

---

## Commands Reference

```bash
# Customer App location
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer

# Restaurant App location
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant

# Build 32 Archive
open ~/Library/Developer/Xcode/Archives/2026-01-27/

# Check Stripe keys from AWS
aws secretsmanager get-secret-value --secret-id "dollor/production/stripe"

# Fastlane build
bundle exec fastlane beta
```

---

# Phase 5: AI Employee CI/CD Pipeline

> **Date:** January 28, 2026
> **Status:** COMPLETED

---

## Overview

Implemented CI/CD pipeline for deploying individual AI employees independently without requiring a full backend restart.

---

## Files Created

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-employee.yml` | GitHub Actions workflow |
| `backend/scripts/validate-employee.js` | Module validation |
| `backend/scripts/test-employee.js` | Test runner |
| `backend/scripts/rollback-employee.js` | Version management |
| `backend/src/routes/adminEmployeeRoutes.js` | Admin REST API |
| `backend/src/services/metricsService.js` | Prometheus metrics |
| `backend/src/employees/sarah/index.js` | Sample employee |
| `backend/src/employees/sarah/__tests__/sarah.test.js` | Employee tests |

---

## Test Commands

```bash
# Validate employee
cd backend && node scripts/validate-employee.js sarah

# Test employee
cd backend && node scripts/test-employee.js sarah

# Backup/Rollback
node scripts/rollback-employee.js backup sarah
node scripts/rollback-employee.js list sarah
node scripts/rollback-employee.js rollback sarah previous

# GitHub Actions (manual trigger)
gh workflow run deploy-employee.yml -f employee=sarah
```

---

## Admin API Endpoints

```bash
TOKEN="1901c3a4a058b70c2e43ab4bbd65cf9001f35c7e18088489559da344462573d8"

# Deploy
curl -X POST -H "x-admin-token: $TOKEN" \
  -F "file=@backend/src/employees/sarah/index.js" \
  https://api.vibingticket.com/admin/employees/sarah/deploy

# Hot-reload
curl -X POST -H "x-admin-token: $TOKEN" \
  https://api.vibingticket.com/admin/employees/sarah/reload

# Health check
curl -H "x-admin-token: $TOKEN" \
  https://api.vibingticket.com/admin/employees/sarah/health

# Metrics
curl -H "x-admin-token: $TOKEN" \
  https://api.vibingticket.com/admin/metrics
```

---

## GitHub Secrets Required

| Secret | Value |
|--------|-------|
| `EC2_SSH_KEY` | Private SSH key |
| `EC2_HOST` | 54.173.113.128 |
| `EC2_USER` | ubuntu |
| `ADMIN_API_TOKEN` | (see above) |

---

**END OF HANDOFF**
