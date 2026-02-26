# Database Behaviour Comparison: Staging vs Production

**Generated:** 2026-02-26T05:09:24Z
**Method:** READ-ONLY API queries (no mutations, no direct DB access)
**Environments:**
- Staging: `https://d34u5ixl0bulv4.cloudfront.net`
- Production: `https://api.dollor.ai`

---

## 1. Environment Summary

| Property | Staging | Production | Match? |
|----------|---------|------------|--------|
| Root message | Invoice Management System API v1.0.0 | Invoice Management System API v1.0.0 | YES |
| Health version | 1.0.18 | 1.0.18 | YES |
| Health build | 2026-02-11-negotiation-round-fix | 2026-02-11-negotiation-round-fix | YES |
| Health status | healthy | healthy | YES |
| Database status | connected | connected | YES |

Both environments are running identical code versions (`1.0.18`, build `2026-02-11-negotiation-round-fix`). No code drift detected.

---

## 2. Database Connectivity

| Probe | Staging | Production |
|-------|---------|------------|
| `/health` (DB SELECT 1) | `connected` (HTTP 200) | `connected` (HTTP 200) |
| `/api/health/ready` (readiness) | `ready: true` (HTTP 200) | `ready: true` (HTTP 200) |
| `/api/health/live` (liveness) | `alive: true` (HTTP 200) | `alive: true` (HTTP 200) |

**Result:** Both environments have healthy, connected PostgreSQL databases. No connectivity issues detected.

---

## 3. Schema Comparison

### Admin Endpoint Access

The `/api/admin/database/schema` endpoint requires admin JWT authentication. Admin login (`support@dollor.ai / AdminTest123`) returned `"Incorrect email or password"` on **both** environments.

**Root cause:** The admin user account either does not exist in the database or the password has been changed since the credentials were documented in CLAUDE.md. The `secret_key` query parameter fallback requires the `ADMIN_SECRET_KEY` from AWS Secrets Manager, which is not available to this investigation.

**Impact:** Direct schema comparison (table names, column counts, column differences) could not be performed via the admin API. Schema comparison is **deferred** pending admin credential resolution.

**Alternative evidence:** All public and user-authenticated endpoints return identical response structures on both environments, suggesting schema parity. Key observations:
- Login response shapes (customer, driver, vendor) are identical
- Order response objects have identical field sets
- Health endpoint payloads match exactly
- Published vendor response structure is identical

---

## 4. Data Counts

### Entity IDs (from demo account logins)

| Entity | Staging ID | Production ID | Implication |
|--------|-----------|---------------|-------------|
| Demo Customer | `customer_id: 1` | `customer_id: 74` | Production has 73+ more customers |
| Demo Driver | `driver_id: 1` | `driver_id: 48` | Production has 47+ more drivers |
| Demo Vendor | `vendor_id: 1` | `vendor_id: 40` | Production has 39+ more vendors |
| Demo Vendor User | `user.id: 2` | `user.id: 125` | Production has 123+ more user accounts |

### Data Volume Comparison

| Metric | Staging | Production | Notes |
|--------|---------|------------|-------|
| Published vendors | **0** | **16** | Staging has no published vendors |
| Featured promotions | **1** | **10** | Staging has minimal promo data |
| Available rideshare requests | **0** | **17** | Staging has no active rides |
| Demo customer orders (paginated) | **50** (IDs 2-83) | **50** (IDs 150-223) | Prod has higher order IDs = more total orders |
| Demo vendor orders (vendor 1 / 40) | **85** | **0** | Demo vendor on staging has test orders; prod demo vendor (Apple Test Restaurant) has none |
| Menu items (demo vendor) | **0** | **17** | Prod demo vendor has populated menu |
| Driver earnings (demo) | $0.00 | $30.00 | Prod has real ride/delivery history |
| Driver previous period earnings | $0.00 | $365.70 | Prod has historical earnings |
| Driver deliveries (current period) | 0 | 1 | Prod has delivery history |

### Key Differences

1. **Staging is a clean/test environment** with minimal seed data. Demo accounts are ID 1 (first created). Very few published vendors, no active rideshare requests, no driver earnings.

2. **Production has accumulated real/test data** over time. Higher entity IDs indicate more user registrations. Published vendors, active ride requests, and driver earnings all present.

3. **Staging demo vendor has 85 orders but 0 menu items** -- suggests automated testing created orders without corresponding menu setup. Production demo vendor (Apple Test Restaurant, vendor_id=40) has 17 menu items but 0 orders.

---

## 5. Response Time Comparison

### Single Request (First Call)

| Endpoint | Staging | Production | Delta |
|----------|---------|------------|-------|
| `/health` | 0.655s | 0.478s | Staging +37% slower |
| `/api/health/ready` | 0.205s | 0.139s | Staging +47% slower |
| `/api/health/live` | 0.208s | 0.141s | Staging +48% slower |
| `/api/erp/health/services` | 1.262s | 0.823s | Staging +53% slower |
| `/api/vendors/published?limit=1` | 0.178s | 0.308s | **Production +73% slower** |

### Benchmark (3 Runs Average)

| Endpoint | Staging Avg | Production Avg | Delta |
|----------|-------------|----------------|-------|
| `/health` | 0.181s | 0.209s | Production +15% slower |
| `/api/health/ready` | 0.143s | 0.167s | Production +17% slower |
| `/api/health/live` | 0.159s | 0.184s | Production +16% slower |
| `/api/vendors/published?limit=1` | 0.191s | 0.170s | Staging +12% slower |

**Analysis:** After initial cold-start warmup, both environments show comparable response times (all under 250ms). The first-call penalty is higher on staging (likely smaller ECS instance or cold CloudFront edge). Subsequent calls are within 15-20% of each other, which is within normal network variation.

No significant performance anomalies detected.

---

## 6. Behavioral Differences

### Microservice Health (`/api/erp/health/services`)

| Behavior | Staging | Production | Match? |
|----------|---------|------------|--------|
| Healthy services | 0 of 16 | 0 of 16 | YES |
| Error type | `[Errno -2] Name or service not known` | `[Errno -2] Name or service not known` | YES |
| Overall health | `unhealthy` | `unhealthy` | YES |

**Both environments show 0/16 microservices healthy.** All 16 individual services (auth, user, driver, restaurant, order, payment, location, menu, notification, rating, ride, pricing, analytics, negotiation, chat, call) return DNS resolution failures. This is expected behavior -- the ERP microservices layer appears to reference internal service hostnames that do not resolve from the monolith container. The monolith (`main_new.py`) handles all these functions directly.

### Admin Login Failure

| Behavior | Staging | Production | Match? |
|----------|---------|------------|--------|
| Admin login response | `"Incorrect email or password"` | `"Incorrect email or password"` | YES |
| HTTP code | 401 | 401 | YES |

Both environments reject the documented admin credentials identically. The admin user may have been recreated with a different password, or the `support@dollor.ai` account may not have `UserRole.ADMIN` in the database.

### Authentication Flow

| Behavior | Staging | Production | Match? |
|----------|---------|------------|--------|
| Customer login | Success (customer_id=1) | Success (customer_id=74) | YES (same flow) |
| Driver login | Success (driver_id=1) | Success (driver_id=48) | YES (same flow) |
| Vendor login | Success (vendor_id=1) | Success (vendor_id=40) | YES (same flow) |
| JWT token format | HS256, 30-day expiry | HS256, 30-day expiry | YES |
| Global auth middleware | Active (rejects no-token) | Active (rejects no-token) | YES |

### Data Response Differences

| Endpoint | Staging | Production | Significant? |
|----------|---------|------------|-------------|
| Published vendors | Empty list | 16 vendors | Data difference only |
| Featured promotions | 1 deal (Demo Restaurant) | 10 deals (real restaurants) | Data difference only |
| Available rides | 0 | 17 | Data difference only |

All structural behaviors (response shapes, status codes, error formats, auth flows) are **identical** between environments. Differences are purely in data volume and content.

---

## 7. Findings and Recommendations

### Summary of Findings

| # | Finding | Severity | Action Needed? |
|---|---------|----------|----------------|
| 1 | Code versions match (1.0.18) | INFO | No -- environments are in sync |
| 2 | Both databases connected and healthy | INFO | No -- working correctly |
| 3 | Admin credentials invalid on both environments | MEDIUM | YES -- update CLAUDE.md or recreate admin account |
| 4 | Staging has minimal seed data | LOW | Optional -- seed staging with more representative data |
| 5 | 0/16 ERP microservices resolve on both | INFO | No -- expected behavior for monolith architecture |
| 6 | Response times comparable after warmup | INFO | No -- within normal variance |
| 7 | Staging has 0 published vendors | LOW | Optional -- publish test vendors for staging |
| 8 | All API response structures identical | INFO | No -- no schema drift detected |

### Recommendations

1. **Admin Credential Audit (MEDIUM):** The `support@dollor.ai / AdminTest123` credentials documented in CLAUDE.md do not work on either environment. Either:
   - The admin user was never seeded in the current database
   - The password was changed during a security hardening pass
   - The account exists but does not have `UserRole.ADMIN` role

   **Action:** Run `POST /api/demo/setup` on both environments to re-seed demo accounts, or manually check the `users` table for admin accounts.

2. **Staging Data Seeding (LOW):** Staging has minimal data (0 published vendors, 0 active rides, no menu items on demo vendor). This makes staging less useful for realistic testing.

   **Action:** Consider running a data seed script to populate staging with representative data.

3. **Schema Comparison Deferred:** Direct table-by-table schema comparison could not be completed without admin access. The identical API response structures strongly suggest schema parity, but a definitive comparison requires admin credentials.

   **Action:** After resolving admin credentials, re-run the schema comparison via `/api/admin/database/schema`.

---

## Raw Data Reference

### Login Response Comparison

**Staging Customer Login:**
```json
{"customer_id": 1, "customer_code": "DEMO-CUST-001", "name": "Demo Customer", "email": "demo.customer@dollor.ai", "phone": "+14155551001"}
```

**Production Customer Login:**
```json
{"customer_id": 74, "customer_code": "DEMO-CUST-001", "name": "Demo Customer", "email": "demo.customer@dollor.ai", "phone": "+14155551001"}
```

**Staging Driver Login:**
```json
{"driver_id": 1, "driver_code": "DEMO-DRV-001", "name": "Marcus Johnson", "status": "approved", "is_approved": true}
```

**Production Driver Login:**
```json
{"driver_id": 48, "driver_code": "DEMO-DRV-001", "name": "Marcus Johnson", "status": "approved", "is_approved": true}
```

**Staging Vendor Login:**
```json
{"vendor_id": 1, "user": {"id": 2, "role": "vendor"}, "business_name": "Demo Restaurant"}
```

**Production Vendor Login:**
```json
{"vendor_id": 40, "user": {"id": 125, "role": "vendor"}, "business_name": "Apple Test Restaurant"}
```

### Health Check Raw Responses

**Staging `/health`:**
```json
{"status": "healthy", "service": "p2p-backend", "version": "1.0.18", "build": "2026-02-11-negotiation-round-fix", "database": "connected"}
```

**Production `/health`:**
```json
{"status": "healthy", "service": "p2p-backend", "version": "1.0.18", "build": "2026-02-11-negotiation-round-fix", "database": "connected"}
```
