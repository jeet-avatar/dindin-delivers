# Dollor.ai Production QA Guide

> **Last Updated**: February 3, 2026
> **Scope**: Production Environment Only
> **QA Agents**: 20 Total

---

## Quick Start

```bash
# Run full QA suite against production
./scripts/qa-runner.sh production

# Expected output:
# VALIDATION COMPLETE: ✅ PASS - APPROVED FOR DEPLOYMENT
# or
# VALIDATION COMPLETE: ⚠️ WARNING - DEPLOY WITH CAUTION (warnings are acceptable)
```

---

## Production URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **API** | `https://api.dollor.ai` | Production backend |
| **Health** | `https://api.dollor.ai/health` | Health check endpoint |

**Note**: QA agents only test against production. Local and staging environments are NOT checked.

---

## QA Agent Summary

| # | Agent | Focus | Production Check |
|---|-------|-------|------------------|
| 1 | API | API Endpoints | ✅ Tests api.dollor.ai |
| 2 | UI | Code Quality | ✅ Checks committed code |
| 3 | E2E | Workflows | ✅ Tests production flows |
| 4 | DEADCODE | Dead Code | ✅ Scans committed files |
| 5 | SECURITY | Security | ✅ Checks for secrets in git |
| 6 | TESTS | Testing | ✅ Runs test suite |
| 7 | DATABASE | Database | ✅ Tests production DB |
| 8 | PERFORMANCE | Performance | ✅ Measures API latency |
| 9 | DEPENDENCIES | Dependencies | ✅ Checks for vulnerabilities |
| 10 | FRONTEND_DATA | Frontend Data | ✅ Validates production data |
| 11 | FRONTEND_DISPLAY | Frontend Display | ✅ Checks UI bindings |
| 12 | FIELD_MAPPING | Field Mapping | ✅ Validates API fields |
| 13 | DRIVER_APP | Driver App Tabs | ✅ Validates driver features |
| 14 | CUSTOMER_APP | Customer App Tabs | ✅ Validates customer features |
| 15 | EARLY_DRIVER | Early Driver Notification | ✅ Tests notification flow |
| 16 | ORDER_LIFECYCLE | Order Lifecycle | ✅ Tests order states |
| 17 | API_DOCS | API Documentation | ✅ Validates endpoints |
| 18 | DRIVER_DETAILS | Driver Details Flow | ✅ Tests driver data flow |
| 19 | DEPLOYMENT | Deployment Readiness | ✅ Checks deployment status |
| 20 | TESTFLIGHT | TestFlight Build | ✅ Validates build config |

---

## Pre-Release Checklist

### Before Any Production Release

- [ ] Run `./scripts/qa-runner.sh production`
- [ ] All agents pass or have acceptable warnings
- [ ] No CRITICAL or FAIL statuses
- [ ] Demo accounts verified working
- [ ] API health check returns "healthy"

### Acceptable Warnings

These warnings are informational and don't block deployment:

| Warning | Reason | Action |
|---------|--------|--------|
| Code Quality | print() statements | Future refactoring |
| Frontend Data | Demo data incomplete | Test data limitation |
| Field Mapping | Optional fields null | Expected behavior |
| API Docs | Documentation suggestions | Improvement task |

### Blocking Issues

These MUST be fixed before deployment:

| Issue | Severity | Action |
|-------|----------|--------|
| API endpoint fails | CRITICAL | Fix immediately |
| Authentication broken | CRITICAL | Fix immediately |
| Secrets in git | CRITICAL | Remove and rotate |
| Security vulnerability | HIGH | Fix before deploy |

---

## Manual Production Tests

### 1. API Health

```bash
curl -s https://api.dollor.ai/health | jq .
# Must return: {"status": "healthy", ...}
```

### 2. Customer Flow

```bash
# Login
TOKEN=$(curl -s -X POST "https://api.dollor.ai/api/auth/customer/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!" | jq -r .access_token)

# Get profile
curl -s "https://api.dollor.ai/api/customer/profile" -H "Authorization: Bearer $TOKEN" | jq .

# Get orders
curl -s "https://api.dollor.ai/api/customer/orders" -H "Authorization: Bearer $TOKEN" | jq '.orders | length'
```

### 3. Driver Flow

```bash
# Login
TOKEN=$(curl -s -X POST "https://api.dollor.ai/api/auth/driver/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.driver@dollor.ai&password=DemoDriver2025!" | jq -r .access_token)

# Get dashboard
curl -s "https://api.dollor.ai/api/v5/driver/48/dashboard" -H "Authorization: Bearer $TOKEN" | jq .
```

### 4. Restaurant Flow

```bash
# Login
TOKEN=$(curl -s -X POST "https://api.dollor.ai/api/auth/vendor/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.restaurant@dollor.ai&password=DemoRestaurant2025!" | jq -r .access_token)

# Get orders
curl -s "https://api.dollor.ai/api/erp/orders/vendor/40" -H "Authorization: Bearer $TOKEN" | jq '.orders | length'
```

---

## Viewing Reports

```bash
# Latest report directory
ls -lt .planning/qa-reports/ | head -5

# View validation summary
cat .planning/qa-reports/LATEST/QA_VALIDATION_REPORT.md

# View specific agent report
cat .planning/qa-reports/LATEST/QA_REPORT_API.md
cat .planning/qa-reports/LATEST/QA_REPORT_SECURITY.md
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| QA script not found | Run from repo root: `./scripts/qa-runner.sh` |
| API tests failing | Check if api.dollor.ai is accessible |
| Authentication errors | Verify demo account credentials |
| Timeout errors | Production might be slow, increase timeout |

---

## Related Documentation

| Document | Location |
|----------|----------|
| Deployment Guide | [DEPLOYMENT.md](DEPLOYMENT.md) |
| TestFlight Build | [TESTFLIGHT_BUILD_GUIDE.md](TESTFLIGHT_BUILD_GUIDE.md) |
| API Endpoints | [.claude/docs/API_ENDPOINTS.md](../../.claude/docs/API_ENDPOINTS.md) |

---

*Generated by Dollor.ai QA Agent System v2.0*
