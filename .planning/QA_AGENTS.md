# Dollor.ai QA Agent System

> **Version**: 3.4.0
> **Created**: February 3, 2026
> **Purpose**: Read-only testing agents that run before/after deployment

---

## Overview

17 specialized agents that verify the Dollor.ai platform without modifying any code.
All agents are **READ-ONLY** and use demo credentials for testing.

### Agent Summary

| # | Agent | Purpose |
|---|-------|---------|
| 1 | API | API endpoint validation |
| 2 | UI | Code quality checks |
| 3 | E2E | End-to-end workflows |
| 4 | Dead Code | Unused code detection |
| 5 | Security | OWASP security checks |
| 6 | Tests | Test execution |
| 7 | Database | DB health validation |
| 8 | Performance | Speed metrics |
| 9 | Dependencies | Package analysis |
| 10 | Frontend Data | Data integrity |
| 11 | Frontend Display | Display validation |
| 12 | Field Mapping | API field coverage |
| 13 | Driver App | Driver app tabs |
| 14 | Customer App | Customer app tabs |
| 15 | Early Driver | Early driver notification |
| 16 | Order Lifecycle | Complete order flow |
| 17 | API Docs | Endpoint documentation |
| 18 | Validator | Aggregates all reports |

## Demo Credentials

| App | Email | Password |
|-----|-------|----------|
| Customer | demo.customer@dollor.ai | DemoCustomer2025! |
| Driver | demo.driver@dollor.ai | DemoDriver2025! |
| Restaurant | demo.restaurant@dollor.ai | DemoRestaurant2025! |
| Admin | support@dollor.ai | DollorAdmin2026! |

## API Endpoints

| Environment | URL |
|-------------|-----|
| Production | https://api.dollor.ai |
| Staging | https://d3kuu45w6kl8hr.cloudfront.net |

---

## Agent Definitions

### 1. API Testing Agent (`qa-api`)

**Purpose**: Verify all API endpoints return expected responses

**Scope**:
- Authentication endpoints (login, register, logout)
- Customer endpoints (vendors, menu, cart, orders, tracking)
- Driver endpoints (dashboard, deliveries, earnings, status)
- Restaurant endpoints (orders, menu, status)
- Admin endpoints (analytics, users, vendors)

**Checks**:
- [ ] All endpoints return 2xx for valid requests
- [ ] All endpoints return proper error codes for invalid requests
- [ ] Response schemas match API contract
- [ ] Authentication tokens work correctly
- [ ] Rate limiting is enforced

**Output**: `QA_REPORT_API.md`

---

### 2. UI Testing Agent (`qa-ui`)

**Purpose**: Verify iOS app UI components render correctly

**Scope**:
- Customer App screens (Home, Search, Cart, Orders, Profile)
- Driver App screens (Dashboard, Deliveries, Earnings, Profile)
- Restaurant App screens (Dashboard, Orders, Menu, Settings)

**Checks**:
- [ ] All views compile without warnings
- [ ] No hardcoded strings (should use localization)
- [ ] No hardcoded colors (should use theme)
- [ ] No hardcoded URLs (should use environment config)
- [ ] Accessibility labels present
- [ ] Loading/error states handled

**Output**: `QA_REPORT_UI.md`

---

### 3. End-to-End Workflow Agent (`qa-e2e`)

**Purpose**: Verify complete user workflows function correctly

**Workflows**:
1. **Customer Order Flow**:
   - Login → Browse → Add to Cart → Checkout → Track → Rate

2. **Restaurant Order Flow**:
   - Login → Receive Order → Accept → Prepare → Ready → Pickup

3. **Driver Delivery Flow**:
   - Login → Go Online → Accept Order → Navigate → Pickup → Deliver → Complete

4. **Payment Flow**:
   - Add payment method → Process payment → Handle success/failure

**Checks**:
- [ ] Each step transitions correctly
- [ ] Data persists across screens
- [ ] Push notifications received
- [ ] Status updates in real-time

**Output**: `QA_REPORT_E2E.md`

---

### 4. Dead Code Agent (`qa-deadcode`)

**Purpose**: Identify unused code, files, and dependencies

**Scope**:
- iOS Swift files (unused classes, functions, variables)
- Backend Python files (unused endpoints, functions, imports)
- Unused dependencies in Package.swift, Podfile, requirements.txt

**Checks**:
- [ ] No unreachable code paths
- [ ] No unused imports
- [ ] No commented-out code blocks (>10 lines)
- [ ] No orphaned files (not referenced anywhere)
- [ ] No deprecated API usage

**Output**: `QA_REPORT_DEADCODE.md`

---

### 5. Security Agent (`qa-security`)

**Purpose**: Identify security vulnerabilities and best practice violations

**Checks**:
- [ ] No hardcoded secrets/API keys in code
- [ ] No sensitive data in logs
- [ ] HTTPS enforced for all API calls
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention in any web views
- [ ] Secure token storage (Keychain on iOS)
- [ ] Certificate pinning configured
- [ ] No debug flags in production builds

**Output**: `QA_REPORT_SECURITY.md`

---

### 6. Testing Agent (`qa-tests`)

**Purpose**: Run and verify all automated tests

**Scope**:
- Backend unit tests (pytest)
- Backend integration tests
- iOS unit tests (XCTest)
- API contract tests

**Checks**:
- [ ] All tests pass
- [ ] Test coverage > 60%
- [ ] No flaky tests
- [ ] No skipped tests without reason

**Output**: `QA_REPORT_TESTS.md`

---

### 17. API Documentation Agent (`qa-api-docs`)

**Purpose**: Validate API endpoint documentation and identify inconsistencies

**Scope**:
- Centralized endpoint documentation check
- Endpoint pattern analysis (scattered across 10,000+ lines)
- Authentication pattern documentation
- Duplicate/alias endpoint detection

**Checks**:
- [ ] Centralized API_ENDPOINTS.md exists
- [ ] All endpoint patterns documented
- [ ] Request format per endpoint documented (content-type, field names)
- [ ] Duplicate routes identified
- [ ] AppConfig.Endpoints constants verified

**Key Findings Tracked**:
| Issue | Description |
|-------|-------------|
| Scattered endpoints | Endpoints across 10,000+ lines in P2PAPIService.swift |
| Inconsistent patterns | Auth uses /auth/*, some use /api/*, some /erp/* |
| Request format mismatch | Login uses username field, others use email |
| Duplicate aliases | ~69 duplicate routes for compatibility |

**Recommendations**:
- Create `.claude/docs/API_ENDPOINTS.md` with all production endpoints
- Document request format per endpoint (content-type, field names)
- Add endpoint validation tests in CI
- Use AppConfig.Endpoints constants in iOS

**Output**: `QA_REPORT_API_DOCS.md`

---

### 18. Validator Agent (`qa-validator`)

**Purpose**: Aggregate all agent reports and produce final verdict

**Inputs**:
- QA_REPORT_API.md
- QA_REPORT_UI.md
- QA_REPORT_E2E.md
- QA_REPORT_DEADCODE.md
- QA_REPORT_SECURITY.md
- QA_REPORT_TESTS.md
- QA_REPORT_DATABASE.md
- QA_REPORT_PERFORMANCE.md
- QA_REPORT_DEPENDENCIES.md
- QA_REPORT_FRONTEND_DATA.md
- QA_REPORT_FRONTEND_DISPLAY.md
- QA_REPORT_FIELD_MAPPING.md
- QA_REPORT_DRIVER_APP.md
- QA_REPORT_CUSTOMER_APP.md
- QA_REPORT_EARLY_DRIVER.md
- QA_REPORT_ORDER_LIFECYCLE.md
- QA_REPORT_API_DOCS.md

**Output**: `QA_VALIDATION_REPORT.md`

**Verdict**:
- **PASS**: All critical checks pass, deploy approved
- **WARN**: Non-critical issues found, deploy with caution
- **FAIL**: Critical issues found, block deployment

---

## Execution Commands

### Run All Agents (Pre-Deployment)
```bash
/gsd:qa-run --env=staging --phase=pre-deploy
```

### Run All Agents (Post-Deployment)
```bash
/gsd:qa-run --env=production --phase=post-deploy
```

### Run Individual Agent
```bash
/gsd:qa-run --agent=api --env=staging
/gsd:qa-run --agent=ui --env=staging
/gsd:qa-run --agent=e2e --env=staging
/gsd:qa-run --agent=deadcode
/gsd:qa-run --agent=security
/gsd:qa-run --agent=tests
/gsd:qa-run --agent=validator
```

---

## Report Location

All reports are written to: `.planning/qa-reports/`

```
.planning/
└── qa-reports/
    ├── 2026-02-03_pre-deploy/
    │   ├── QA_REPORT_API.md
    │   ├── QA_REPORT_UI.md
    │   ├── QA_REPORT_E2E.md
    │   ├── QA_REPORT_DEADCODE.md
    │   ├── QA_REPORT_SECURITY.md
    │   ├── QA_REPORT_TESTS.md
    │   └── QA_VALIDATION_REPORT.md
    └── 2026-02-03_post-deploy/
        └── ...
```

---

## Integration with Deployment

### Pre-Deployment Gate
1. Run all QA agents
2. Validator produces verdict
3. If PASS → Proceed with deployment
4. If WARN → Review and decide
5. If FAIL → Block deployment, fix issues

### Post-Deployment Verification
1. Run all QA agents against production
2. Compare with pre-deployment results
3. Alert if any regressions detected

---

*Created by Claude Code - Dollor.ai AI Employee*
