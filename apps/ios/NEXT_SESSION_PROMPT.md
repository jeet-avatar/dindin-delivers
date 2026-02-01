# GSD Session Handoff - Build 1025/101/65
**Date:** 2026-02-01
**Previous Session:** TestFlight builds + Critical API fixes

---

## Quick Start

```
/gsd:resume-work
```

Or if starting fresh:

```
/gsd:progress
```

---

## Session Summary - What Was Fixed

### 1. CRITICAL: Database Migration (Production Down Fix)

**Problem:** ALL vendor-related API endpoints returned 500 error
**Root Cause:** Missing `average_rating` and `total_ratings` columns in `vendors` table
**Fix Applied:**
```sql
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
```

**Result:** Customer app now shows 13 restaurants correctly.

### 2. Backend API: Vendor Orders Endpoint

Added `/api/erp/orders/vendor/{vendor_id}` for Restaurant iOS app:
- Commit: `fa5207e1`
- File: `main_new.py` (lines ~14697-14708)
- Enables Restaurant app to fetch orders via RESTful path style

### 3. Demo Payment Bypass (App Store Review)

Backend detects demo accounts and skips Stripe processing:
- File: `main_new.py` (lines ~14788-14815)
- File: `rideshare_payments.py`

iOS apps detect `demo: true` flag and skip PaymentSheet:
- `PaymentService.swift` - Added `isDemoPayment` property
- `MultiRestaurantCheckoutView.swift` - Bypasses Stripe for demo
- `RideRequestViewModel.swift` - Bypasses payment sheet for demo

**Demo Credentials:**
| Role | Email | Password |
|------|-------|----------|
| Customer | `demo.customer@dollor.ai` | `DemoCustomer2025!` |
| Driver | `demo.driver@dollor.ai` | `DemoDriver2025!` |
| Restaurant | `demo.restaurant@dollor.ai` | `DemoRestaurant2025!` |

### 4. iOS App Builds Ready

| App | Build | Archive Location |
|-----|-------|------------------|
| Customer | 1025 | `apps/ios/build/DollorCustomer-Build1025.xcarchive` |
| Restaurant | 101 | `apps/ios/build/DollorRestaurant-Build101.xcarchive` |
| Driver | 65 | `apps/ios/build/DollorDriver-Build65.xcarchive` |

---

## Pending Tasks for Next Session

### HIGH PRIORITY

1. **Upload All 3 Apps to TestFlight**
   ```bash
   # Copy archives to Xcode Organizer
   cp -R apps/ios/build/*.xcarchive ~/Library/Developer/Xcode/Archives/$(date +%Y-%m-%d)/
   open ~/Library/Developer/Xcode/Archives/
   ```
   - Select each archive → Validate App → Distribute App → TestFlight

2. **Fix ECS Deployment Pipeline**
   - GitHub Actions deployments failing since Jan 13
   - Blue-green (manual) works; CI/CD broken at health check
   - Check: task definition, health check path, container startup

3. **Update App Store Review Information**
   - Add demo credentials to Beta App Review Information
   - Reply to any rejection with demo account details

### MEDIUM PRIORITY

4. **Driver Document Upload via Email** (Feature Request)
   - Driver logs into web portal
   - Click "Send upload link to email"
   - Open link on mobile → take photo → upload
   - Document syncs back to web portal

   Backend endpoints needed:
   - `POST /api/drivers/{id}/send-document-link`
   - `POST /api/drivers/upload-mobile/{token}`

5. **Clean Production Data**
   - Remove duplicate restaurants (e.g., Season Thai Cuisine IDs 46, 47)
   - Clean up test accounts

---

## Environment Status

### Production API
```bash
# Health check
curl https://api.dollor.ai/api/health
# Returns: {"status":"healthy","database":"connected"}

# Restaurant listing (13 restaurants)
curl https://api.dollor.ai/api/vendors/published | jq '.count'
# Returns: 13
```

### Git Status
```
Branch: main
Latest: fa5207e1 - fix(api): Add vendor orders endpoint
Uncommitted: iOS project files (build number changes)
```

### CI/CD Status
- iOS CI: Disabled (`.github/workflows/ios-ci.yml.disabled`)
- Backend: GitHub Actions fails; blue-green manual works

---

## Build Number History (Avoid Conflicts)

| App | History | Current |
|-----|---------|---------|
| Customer | 1008 → 1020 → **1025** | 1025 |
| Restaurant | 71 → 72 → 75 → 100 → **101** | 101 |
| Driver | 60 → 61 → **65** | 65 |

**Team ID:** PRKZ4UVCD7 (correct - never use YRHVAY595K)

---

## Commands Reference

### Build iOS App
```bash
xcodebuild -workspace apps/ios/customer/eatfaircustomer.xcworkspace \
  -scheme eatfaircustomer \
  -configuration Release \
  -archivePath apps/ios/build/DollorCustomer.xcarchive \
  -destination "generic/platform=iOS" \
  -allowProvisioningUpdates \
  archive
```

### Run Database Migration
```bash
# Get production DB URL from AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id "dollor/production/database-v2" \
  --query SecretString --output text | jq -r '.DATABASE_URL'

# Run migration
PGPASSWORD='[password]' psql -h dollor-db.c23qcukqe810.us-east-1.rds.amazonaws.com \
  -U dolloradmin -d dollor -c "YOUR SQL HERE"
```

### Bump Build Number
```bash
sed -i '' 's/CURRENT_PROJECT_VERSION = OLD;/CURRENT_PROJECT_VERSION = NEW;/g' \
  apps/ios/APP/PROJECT.xcodeproj/project.pbxproj
```

---

## Key Files Modified

| File | Changes |
|------|---------|
| `main_new.py` | Vendor orders endpoint, demo payment bypass |
| `rideshare_payments.py` | Demo payment bypass for rides |
| `PaymentService.swift` | Demo flag detection |
| `MultiRestaurantCheckoutView.swift` | Skip Stripe for demo |
| `RideRequestViewModel.swift` | Skip payment sheet for demo |
| `*.xcodeproj/project.pbxproj` | Build number updates |

---

## Troubleshooting

### "Redundant Binary Upload" Error
- App Store Connect already has that build number
- Solution: Bump to higher number, rebuild, re-upload

### 500 Error on API
- Check database columns match model
- Run: `curl https://api.dollor.ai/api/vendors/public -X POST -d '{}' -H 'Content-Type: application/json'`
- Error message shows missing column

### ECS Deployment Fails
- Container likely failing health check
- Check CloudWatch logs for startup errors
- Verify DATABASE_URL in Secrets Manager

---

## GSD Commands

```bash
# Resume previous work
/gsd:resume-work

# Check progress
/gsd:progress

# Quick task execution
/gsd:quick

# Plan a new phase
/gsd:plan-phase

# Debug systematic issue
/gsd:debug
```

---

*Generated: 2026-02-01 03:20 PST*
*Builds: Customer 1025, Restaurant 101, Driver 65*
