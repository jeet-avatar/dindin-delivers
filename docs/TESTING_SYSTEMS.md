# Dollor.ai Testing Systems Documentation

> Complete guide to QA and UAT testing systems for pre/post deployment validation

---

## Table of Contents

1. [Overview](#overview)
2. [Demo Credentials](#demo-credentials)
3. [QA Agent System](#qa-agent-system)
4. [UAT System](#uat-system)
5. [Meta-Validation System](#meta-validation-system)
6. [Quick Reference](#quick-reference)
7. [Report Locations](#report-locations)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Dollor.ai has three complementary testing systems:

| System | Purpose | When to Use | Tests |
|--------|---------|-------------|-------|
| **QA Agent System** | Code quality, security, infrastructure, data validation | Before every deployment | 10 agents, ~30 API + ~50 code + ~35 data checks |
| **UAT System** | User flows, database integrity, API contracts | Before releases | 9 phases, ~76 tests |
| **Meta-Validation** | Cross-reference QA and UAT coverage | After QA and UAT complete | 8 sections, ~72 checks |

### Environments

| Environment | API URL | Frontend URL |
|-------------|---------|--------------|
| **Production** | `https://api.dollor.ai` | `https://dollor.ai` |
| **Staging** | `https://d3kuu45w6kl8hr.cloudfront.net` | `https://d3kuu45w6kl8hr.cloudfront.net` |

---

## Demo Credentials

Used for Apple App Store review and automated testing:

| App | Email | Password | ID |
|-----|-------|----------|-----|
| **Customer** | `demo.customer@dollor.ai` | `DemoCustomer2025!` | 74 |
| **Driver** | `demo.driver@dollor.ai` | `DemoDriver2025!` | 48 |
| **Restaurant** | `demo.restaurant@dollor.ai` | `DemoRestaurant2025!` | 40 |

**Restaurant Details:**
- Name: Apple Test Restaurant LLC
- Menu Items: 17
- Total Orders: 26+

---

## QA Agent System

### Overview

**File:** `scripts/qa-runner.sh`
**Version:** 3.0 (Frontend Data Validation Edition)
**Agents:** 10 specialized testing agents

### Usage

```bash
# Run against staging (pre-deployment)
./scripts/qa-runner.sh staging pre-deploy

# Run against production (post-deployment)
./scripts/qa-runner.sh production post-deploy

# Default (staging, pre-deploy)
./scripts/qa-runner.sh
```

### Agent Descriptions

| # | Agent | Focus | What It Checks |
|---|-------|-------|----------------|
| 1 | **API** | API Endpoints | Health, auth (all 3 apps), CRUD operations, error handling |
| 2 | **UI** | Code Quality | Hardcoded values, TODO/FIXME, force unwrapping, SwiftUI patterns |
| 3 | **E2E** | Workflows | Customer order flow, driver flow, restaurant flow |
| 4 | **Dead Code** | Cleanup | Backup files, commented code, empty files, unused imports |
| 5 | **Security** | OWASP Top 10 | Hardcoded secrets, HTTP URLs, SQL injection, Keychain usage |
| 6 | **Tests** | Test Execution | Backend pytest, iOS test commands |
| 7 | **Database** | DB Health | Connection, demo accounts, migration status |
| 8 | **Performance** | Speed | API response times, code size metrics |
| 9 | **Dependencies** | Packages | CocoaPods, requirements.txt, SPM packages |
| 10 | **Frontend Data** | Data Integrity | All frontend data points match database, type/range/format validation |

### Agent Details

#### Agent 1: API Testing
Tests all API endpoints with correct authentication:

```
Customer Login:  POST /api/auth/customer/login  (form-urlencoded)
Driver Login:    POST /api/auth/driver/login    (form-urlencoded)
Vendor Login:    POST /api/auth/vendor/login    (form-urlencoded)
```

**Validated Endpoints:**
- `/health` - Infrastructure health
- `/api/vendors` - Restaurant list
- `/api/vendors/{id}/menu` - Menu items
- `/api/customer/orders` - Order history (auth required)
- `/api/v5/driver/{id}/dashboard` - Driver dashboard
- `/api/drivers/{id}/documents` - Document verification
- `/api/orders?vendor_id={id}` - Restaurant orders

#### Agent 5: Security (OWASP-Based)

| Check | Severity | Description |
|-------|----------|-------------|
| Hardcoded secrets | CRITICAL | API keys, secrets in code |
| Hardcoded passwords | CRITICAL | Passwords (excluding UI fields) |
| Bearer tokens | CRITICAL | Hardcoded auth tokens |
| HTTP URLs | HIGH | Non-HTTPS connections |
| UserDefaults sensitive data | HIGH | Tokens in UserDefaults |
| SQL injection | HIGH | Raw SQL queries |
| .env files | MEDIUM | Environment files in repo |
| Debug logging | MEDIUM | NSLog/debugPrint calls |

**Exclusions:** Third-party SDKs (`.build/`, `Pods/`, `checkouts/`) are excluded from security scans to reduce false positives.

#### Agent 10: Frontend Data Validation

Validates all frontend data points match database values for all three apps:

**Customer App:**
| Data Point | Validation |
|------------|------------|
| Profile (email, name, phone) | Type, format validation |
| Orders (id, status, total, items) | Type, range, structure |
| Addresses (street, city, zip, coordinates) | Type, coordinate range |
| Favorites (vendor_id, name) | Type, existence |
| Payment cards (last4, brand, expiry) | Type, format |
| Cart (items, totals) | Type, calculation |

**Restaurant App:**
| Data Point | Validation |
|------------|------------|
| Vendor list (id, name, rating, is_open) | Type, rating 0-5 |
| Menu items (id, name, price, category) | Type, price >= 0 |
| Promotions (discount, dates) | Type, percentage 0-100 |

**Driver App:**
| Data Point | Validation |
|------------|------------|
| Dashboard (earnings, trips, rating) | Type, range |
| Documents (id, type, status, url) | Type, enum values |
| Profile (name, vehicle, license) | Type, format |

**Cross-Reference Checks:**
- Demo customer (ID 74) has orders
- Demo vendor (ID 40) has 17 menu items
- Demo driver (ID 48) has approved status

### Output

Reports are saved to: `.planning/qa-reports/{timestamp}_{phase}/`

| File | Contents |
|------|----------|
| `QA_VALIDATION_REPORT.md` | Summary of all agents |
| `QA_REPORT_API.md` | API test results |
| `QA_REPORT_UI.md` | Code quality results |
| `QA_REPORT_E2E.md` | Workflow test results |
| `QA_REPORT_DEADCODE.md` | Dead code analysis |
| `QA_REPORT_SECURITY.md` | Security scan results |
| `QA_REPORT_TESTS.md` | Test execution results |
| `QA_REPORT_DATABASE.md` | Database health |
| `QA_REPORT_PERFORMANCE.md` | Performance metrics |
| `QA_REPORT_DEPENDENCIES.md` | Package analysis |
| `QA_REPORT_FRONTEND_DATA.md` | Frontend data validation |

### Verdicts

| Verdict | Meaning | Action |
|---------|---------|--------|
| ✅ PASS | All agents passed | Safe to deploy |
| ⚠️ WARNING | Some warnings | Review before deploy |
| ❌ FAIL | Critical failures | Block deployment |

---

## UAT System

### Overview

**File:** `scripts/uat-comprehensive.sh`
**Tests:** 63 test cases across 8 phases

### Usage

```bash
# Run against production
./scripts/uat-comprehensive.sh production

# Run against staging
./scripts/uat-comprehensive.sh staging

# Default (production)
./scripts/uat-comprehensive.sh
```

### Test Phases

| Phase | Focus | Tests |
|-------|-------|-------|
| 1 | **Authentication** | Login for all 3 apps, token validation |
| 2 | **Customer App** | Profile, vendors, orders, addresses, payments |
| 3 | **Driver App** | Dashboard, profile, documents, status, deliveries |
| 4 | **Restaurant App** | Profile, orders, menu, analytics, status |
| 5 | **Database Integrity** | Connection, relationships, foreign keys |
| 6 | **API Contracts** | Response schemas, required fields |
| 7 | **Frontend** | Page loading (landing, terms, privacy, logins) |
| 8 | **Performance** | Response time baselines |

### Phase Details

#### Phase 1: Authentication
Validates all three login endpoints:

| App | Endpoint | Required Fields |
|-----|----------|-----------------|
| Customer | `/api/auth/customer/login` | `access_token`, `token_type` |
| Driver | `/api/auth/driver/login` | `access_token`, `driver_id`, `status`, `is_approved` |
| Vendor | `/api/auth/vendor/login` | `access_token`, `vendor_id` |

#### Phase 2: Customer App Flow

| Test | Endpoint | Purpose |
|------|----------|---------|
| Profile | `GET /api/customer/profile` | User data |
| Vendors | `GET /api/vendors` | Restaurant list |
| Menu | `GET /api/vendors/{id}/menu` | Menu items |
| Orders | `GET /api/customer/orders` | Order history |
| Addresses | `GET /api/customer/addresses` | Saved addresses |
| Payments | `GET /api/customer/payment-methods` | Payment methods |

#### Phase 3: Driver App Flow

| Test | Endpoint | Purpose |
|------|----------|---------|
| Dashboard | `GET /api/v5/driver/{id}/dashboard` | Earnings, stats |
| Profile | `GET /api/erp/drivers/{id}/profile` | Driver info |
| Documents | `GET /api/drivers/{id}/documents` | Verification docs |
| Status | `GET /api/drivers/{id}/status` | Online/offline |
| Available | `GET /api/drivers/{id}/available-orders` | New deliveries |
| History | `GET /api/drivers/{id}/deliveries` | Past deliveries |

#### Phase 4: Restaurant App Flow

| Test | Endpoint | Purpose |
|------|----------|---------|
| Profile | `GET /api/vendors/{id}` | Restaurant info |
| Orders | `GET /api/orders?vendor_id={id}` | Incoming orders |
| Menu | `GET /api/vendors/{id}/menu` | Menu management |
| Analytics | `GET /api/vendors/{id}/analytics` | Revenue stats |
| Status | `GET /api/vendors/{id}/status` | Online/offline |

#### Phase 5: Database Integrity

| Check | Method | Purpose |
|-------|--------|---------|
| Connection | `/api/health` | DB connectivity |
| Customer record | Profile API | Data exists |
| Driver record | Dashboard API | Data exists |
| Vendor record | Vendor API | Data exists |
| Order FK | Orders API | Foreign key integrity |

#### Phase 6: API Contract Validation

Tests that required fields exist in responses:
- Customer login: `access_token`, `token_type`
- Driver login: `access_token`, `driver_id`, `status`, `is_approved`
- Vendor login: `access_token`, `vendor_id`
- Error handling: 401/403 for auth, 404 for invalid endpoints

#### Phase 7: Frontend Validation

| Page | URL | Expected |
|------|-----|----------|
| Landing | `/` | 200 OK |
| Terms | `/terms` | 200 OK |
| Privacy | `/privacy` | 200 OK |
| Vendor Login | `/vendor/login` | 200 OK |
| Driver Login | `/driver/login` | 200 OK |

#### Phase 8: Performance Baseline

| Endpoint | Threshold | Purpose |
|----------|-----------|---------|
| `/api/health` | < 500ms | Infrastructure |
| Customer login | < 2s | Auth performance |
| `/api/vendors` | < 1s | Data retrieval |

### Output

Reports are saved to: `.planning/uat-reports/{timestamp}/`

| File | Contents |
|------|----------|
| `UAT_REPORT.md` | Complete UAT results with all test details |

### Verdicts

| Verdict | Condition | Meaning |
|---------|-----------|---------|
| ✅ PASS | 0 failures | Ready for release |
| ⚠️ WARN | 1-2 failures | Review before release |
| ❌ FAIL | 3+ failures | Not ready for release |

---

## Quick Reference

### Run All Three Systems

```bash
# Full testing suite (QA + UAT + Meta-Validation)
./scripts/qa-runner.sh production pre-deploy && \
./scripts/uat-comprehensive.sh production && \
./scripts/validation-meta.sh
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run QA
  run: ./scripts/qa-runner.sh production pre-deploy

- name: Run UAT
  run: ./scripts/uat-comprehensive.sh production

- name: Run Meta-Validation
  run: ./scripts/validation-meta.sh
```

### Deployment Checklist

| Step | Command | Expected |
|------|---------|----------|
| 1. QA | `./scripts/qa-runner.sh production pre-deploy` | ✅ PASS |
| 2. UAT | `./scripts/uat-comprehensive.sh production` | ✅ PASS |
| 3. Meta | `./scripts/validation-meta.sh` | ✅ PASS |
| 4. Deploy | Push to main | CI/CD runs |
| 5. Verify | `./scripts/qa-runner.sh production post-deploy` | ✅ PASS |

---

## Report Locations

```
.planning/
├── qa-reports/
│   └── {YYYY-MM-DD_HH-MM-SS}_{phase}/
│       ├── QA_VALIDATION_REPORT.md
│       ├── QA_REPORT_API.md
│       ├── QA_REPORT_UI.md
│       ├── QA_REPORT_E2E.md
│       ├── QA_REPORT_DEADCODE.md
│       ├── QA_REPORT_SECURITY.md
│       ├── QA_REPORT_TESTS.md
│       ├── QA_REPORT_DATABASE.md
│       ├── QA_REPORT_PERFORMANCE.md
│       └── QA_REPORT_DEPENDENCIES.md
├── uat-reports/
│   └── {YYYY-MM-DD_HH-MM-SS}/
│       └── UAT_REPORT.md
└── meta-validation/
    └── {YYYY-MM-DD_HH-MM-SS}/
        └── META_VALIDATION_REPORT.md
```

### View Latest Reports

```bash
# Latest QA report
ls -t .planning/qa-reports/ | head -1 | xargs -I{} cat .planning/qa-reports/{}/QA_VALIDATION_REPORT.md

# Latest UAT report
ls -t .planning/uat-reports/ | head -1 | xargs -I{} cat .planning/uat-reports/{}/UAT_REPORT.md

# Latest Meta-Validation report
ls -t .planning/meta-validation/ | head -1 | xargs -I{} cat .planning/meta-validation/{}/META_VALIDATION_REPORT.md
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Driver login fails | Missing `vehicle_photo_url` column | Run DB migration (push to main triggers deploy) |
| 401 on protected endpoints | Token not captured | Check login response format |
| Hardcoded password false positives | UI code detected | Already excluded: `.build/`, `Pods/`, `checkouts/` |
| Frontend 301 errors | Redirect not followed | Script uses `-L` flag (fixed) |
| Security scan slow | Large codebase | Excludes third-party dirs |

### Debug Mode

```bash
# Run with verbose output
bash -x ./scripts/qa-runner.sh production pre-deploy

# Test single endpoint
curl -s -X POST "https://api.dollor.ai/api/auth/driver/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.driver@dollor.ai&password=DemoDriver2025!"
```

### Manual Token Test

```bash
# Get token
TOKEN=$(curl -s -X POST "https://api.dollor.ai/api/auth/customer/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Use token
curl -s "https://api.dollor.ai/api/customer/profile" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Meta-Validation System

### Overview

**File:** `scripts/validation-meta.sh`
**Purpose:** Cross-reference QA and UAT systems to ensure no validation steps are missed

### Usage

```bash
# Run meta-validation (compares latest QA and UAT reports)
./scripts/validation-meta.sh
```

### Validation Sections

| # | Section | What It Checks |
|---|---------|----------------|
| 1 | **Endpoint Coverage** | All 12 critical API endpoints tested by both systems |
| 2 | **Security Coverage** | OWASP checks present in QA Security agent |
| 3 | **Authentication Coverage** | All 3 login types (customer, driver, vendor) tested |
| 4 | **Database Validation** | Connection, integrity, FK checks present |
| 5 | **UAT Phases** | All 8 phases executed (Auth, Customer, Driver, Restaurant, DB, API, Frontend, Performance) |
| 6 | **E2E vs User Flow** | QA E2E workflows match UAT user flow tests |
| 7 | **Demo Credentials** | Same credentials used across all systems |
| 8 | **Error Handling** | Both systems test 401/403/404 responses |

### Output

Reports are saved to: `.planning/meta-validation/{timestamp}/`

| File | Contents |
|------|----------|
| `META_VALIDATION_REPORT.md` | Complete cross-validation results |

### Verdicts

| Verdict | Condition | Meaning |
|---------|-----------|---------|
| ✅ PASS | 0 gaps, 0 failures | Full coverage confirmed |
| ⚠️ WARN | 1-5 gaps | Minor coverage gaps |
| ❌ FAIL | 6+ gaps or failures | Significant gaps need attention |

### When to Run

Run meta-validation after both QA and UAT complete:

```bash
# Full validation suite
./scripts/qa-runner.sh production pre-deploy && \
./scripts/uat-comprehensive.sh production && \
./scripts/validation-meta.sh
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.1 | Feb 2026 | Added Frontend Data Validation agent (Agent 10) - validates all frontend data points match database |
| 3.0 | Feb 2026 | Added meta-validation agent for QA/UAT cross-referencing |
| 2.0 | Feb 2026 | Added 9 agents, database validation, performance checks |
| 1.0 | Jan 2026 | Initial QA system with 6 agents |

---

*Generated by Dollor.ai Testing Systems*
*Last Updated: February 2026*
