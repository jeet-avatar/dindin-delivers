# DOLLOR.AI - SOURCE OF TRUTH

> **VERIFIED** - This document lists ONLY verified, authoritative files.
> **Last Audit Date:** 2026-02-04
> **Do NOT assume** - Verify before using any file.

---

## CRITICAL: SINGLE SOURCE OF TRUTH FILES

### Backend API (ONE file)
```
/apps/web/p2p-platform/backend/main_new.py (724KB, 19030 lines)
```
- This is THE backend API
- All endpoints are here
- Do NOT create new API files

### Database Models (ONE file)
```
/apps/web/p2p-platform/backend/models.py (65KB)
```

### QA Runner (ONE script)
```
/scripts/qa-runner.sh (61KB, comprehensive)
```
- Use ONLY this for QA
- Runs 16 specialized agents
- Generates reports to `.planning/qa-reports/`

---

## iOS APPS (3 apps, 1 shared library)

| App | Path | Entry Point |
|-----|------|-------------|
| Customer | `/apps/ios/customer/eatfaircustomer/` | `eatfaircustomerApp.swift` |
| Driver | `/apps/ios/delivery/eatffairdelivery/` | `eatffairdeliveryApp.swift` |
| Restaurant | `/apps/ios/restaurant/eatffairrestaurant/` | `eatffairrestaurantApp.swift` |
| Shared Library | `/apps/ios/eatfair-ios-shared/` | `P2PAPIService.swift` (447KB) |

---

## AUTHORITATIVE TEST FILES

### 1. Structured Tests (pytest)
```
/apps/web/p2p-platform/backend/tests/
├── conftest.py              # Fixtures
├── unit/                    # Unit tests
├── integration/             # Integration tests
└── e2e/                     # End-to-end tests
```

### 2. QA Scripts
```
/scripts/qa-runner.sh        # MAIN QA - USE THIS
/scripts/run-integration-tests.sh
```

---

## DUPLICATE/LEGACY FILES - DO NOT USE

These exist but are NOT authoritative:

| File | Status | Reason |
|------|--------|--------|
| `use_case_test_suite.py` | LEGACY | Superseded by qa-runner.sh |
| `use_case_test_suite_v2.py` | LEGACY | Version iteration |
| `use_case_test_suite_v3.py` | LEGACY | Version iteration |
| `qa_regression_tests.py` | PARTIAL | Subset of qa-runner.sh |
| `security_test_suite.py` | LEGACY | Merged into qa-runner.sh |
| `rideshare_e2e_test.py` | LEGACY | Use tests/e2e/ instead |
| `e2e_order_flow.py` | LEGACY | Use tests/e2e/ instead |
| `driver_test_agent.py` | DEMO | For investor demos only |
| `vendor_test_agent.py` | DEMO | For investor demos only |
| `ui_test_agent.py` | DEMO | For investor demos only |
| `investor_*.py` | DEMO | For investor demos only |
| `*_capture.py` | SCREENSHOT | For documentation only |

---

## BUSINESS REQUIREMENTS

### Verified Requirements (from PROJECT.md)
- [x] Customer iOS app with multi-restaurant ordering (up to 3 restaurants)
- [x] Restaurant iOS app for order management
- [x] Driver iOS app for deliveries
- [x] P2P backend API (FastAPI/Python)
- [x] Stripe payment integration
- [x] Google/Apple Sign-In authentication
- [x] Real-time order tracking

### Pricing Model (LEGALLY CRITICAL)
```
Food Delivery:
  - Customer pays: $1 platform fee
  - Restaurant pays: $1 per order
  - Driver keeps: 100% of delivery fee + 100% of tips

Rideshare:
  - ≤$35 fare: $1 platform fee
  - $35-70 fare: $2 platform fee
  - >$70 fare: $3 platform fee
  - Driver keeps: 100% of fare + 100% of tips
```

### Legal Positioning
```
WE ARE: Matchmaking service
WE ARE NOT: Delivery company, TNC
```

---

## API ENVIRONMENTS

| Environment | URL | Usage |
|-------------|-----|-------|
| Staging | `https://d3kuu45w6kl8hr.cloudfront.net` | Testing |
| Production | `https://api.dollor.ai` | Live users |

### Demo Credentials (App Store Review)
```
Customer: demo.customer@dollor.ai / DemoCustomer2025!
Driver:   demo.driver@dollor.ai / DemoDriver2025!
Vendor:   demo.restaurant@dollor.ai / DemoRestaurant2025!
```

---

## HOW TO VALIDATE

### Run QA (ALWAYS use this)
```bash
cd /Users/jeet/StudioProjects/eatfair-ios
./scripts/qa-runner.sh staging pre-deploy
```

### Run Backend Import Test
```bash
cd /apps/web/p2p-platform/backend
python3 -c "from main_new import app; print(f'Routes: {len(app.routes)}')"
```

### Run iOS Build Test
```bash
cd /apps/ios/customer
xcodebuild -workspace eatfaircustomer.xcworkspace -scheme eatfaircustomer -sdk iphonesimulator build
```

---

## VALIDATION CHECKLIST

Before any deployment:
- [ ] QA runner passes: `./scripts/qa-runner.sh staging pre-deploy`
- [ ] Backend imports: `python3 -c "from main_new import app"`
- [ ] Demo accounts work (all 3)
- [ ] iOS apps build without errors
- [ ] No hardcoded localhost URLs
- [ ] No debug print statements in production code

---

*This is the SINGLE source of truth. Do not assume anything not listed here.*
