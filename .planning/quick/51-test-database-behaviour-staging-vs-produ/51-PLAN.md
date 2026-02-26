---
phase: quick-51
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [".planning/quick/51-test-database-behaviour-staging-vs-produ/DB_COMPARISON_REPORT.md"]
autonomous: true
requirements: [DB-COMPARE-01]

must_haves:
  truths:
    - "Health check and DB connectivity status compared between staging and production"
    - "Key table counts (customers, drivers, vendors, orders, rides) compared across both environments"
    - "Response times measured and compared for equivalent endpoints"
    - "Database schema (tables, columns) compared between staging and production"
    - "Any behavioral differences documented (errors, missing data, inconsistencies)"
  artifacts:
    - path: ".planning/quick/51-test-database-behaviour-staging-vs-produ/DB_COMPARISON_REPORT.md"
      provides: "Full staging vs production database comparison report"
      min_lines: 80
  key_links: []
---

<objective>
Compare database behaviour between staging (d34u5ixl0bulv4.cloudfront.net) and production (api.dollor.ai) environments.

Purpose: Identify any differences in DB connectivity, schema state, data counts, response times, or behavioral anomalies between the two environments. This is a READ-ONLY investigation.
Output: DB_COMPARISON_REPORT.md with side-by-side comparison data.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md (first 50 lines only -- project position)
@apps/web/p2p-platform/backend/main_new.py (lines 502-548 -- health endpoints)
@apps/web/p2p-platform/backend/main_new.py (lines 196-250 -- admin auth middleware)
@apps/web/p2p-platform/backend/main_new.py (lines 1688-1728 -- admin login)
@apps/web/p2p-platform/backend/main_new.py (lines 20528-20572 -- admin database schema endpoint)
@apps/web/p2p-platform/backend/main_new.py (lines 20186-20276 -- admin drivers endpoint)
@apps/web/p2p-platform/backend/main_new.py (lines 19996-20040 -- admin rideshare requests endpoint)
@apps/web/p2p-platform/backend/main_new.py (lines 17849-17899 -- ERP health services)

Staging URL: https://d34u5ixl0bulv4.cloudfront.net
Production URL: https://api.dollor.ai
Admin credentials: support@dollor.ai / AdminTest123
</context>

<tasks>

<task type="auto">
  <name>Task 1: Health, connectivity, and response time comparison</name>
  <files>.planning/quick/51-test-database-behaviour-staging-vs-produ/DB_COMPARISON_REPORT.md</files>
  <action>
Hit both environments with curl and capture response bodies + timing. All requests are READ-ONLY.

**Step 1 — Health and DB connectivity (public endpoints, no auth needed):**
```bash
STAGING="https://d34u5ixl0bulv4.cloudfront.net"
PROD="https://api.dollor.ai"

# /health — returns DB connectivity status, version, build
curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\n" "$STAGING/health"
curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\n" "$PROD/health"

# /api/health/ready — readiness probe (exercises DB SELECT 1)
curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\n" "$STAGING/api/health/ready"
curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\n" "$PROD/api/health/ready"

# /api/health/live — liveness probe (no DB, just process alive)
curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\n" "$STAGING/api/health/live"
curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\n" "$PROD/api/health/live"

# /api/erp/health/services — microservice health (public, no auth)
curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\n" "$STAGING/api/erp/health/services"
curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\n" "$PROD/api/erp/health/services"
```

**Step 2 — Public data endpoint (exercises DB queries, no auth):**
```bash
# /api/vendors/published — returns published vendors with count (public)
curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\n" "$STAGING/api/vendors/published?limit=1"
curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\n" "$PROD/api/vendors/published?limit=1"
```

**Step 3 — Response time benchmarking:**
Run each health endpoint 3 times on both environments and record average response times. Compare latency patterns.

Record all output (HTTP codes, response bodies, timing) into the report file.

Compare:
- Database connectivity status ("connected" vs "disconnected")
- API version and build strings (may differ if staging has unreleased code)
- Response times (staging may be slower due to smaller instance)
- Microservice health status differences
  </action>
  <verify>All curl commands return HTTP 200 from both environments. Response bodies are captured and recorded.</verify>
  <done>Health check comparison data collected from both environments with response times.</done>
</task>

<task type="auto">
  <name>Task 2: Admin-authenticated DB comparison (schema + table counts)</name>
  <files>.planning/quick/51-test-database-behaviour-staging-vs-produ/DB_COMPARISON_REPORT.md</files>
  <action>
Authenticate as admin on both environments, then hit admin endpoints for schema and data counts. All requests are READ-ONLY.

**Step 1 — Get admin JWT tokens from both environments:**
```bash
STAGING="https://d34u5ixl0bulv4.cloudfront.net"
PROD="https://api.dollor.ai"

# Admin login on staging
STAGING_TOKEN=$(curl -s -X POST "$STAGING/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"support@dollor.ai","password":"AdminTest123"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token','FAILED'))")

# Admin login on production
PROD_TOKEN=$(curl -s -X POST "$PROD/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"support@dollor.ai","password":"AdminTest123"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token','FAILED'))")
```

If admin login fails on either environment (no admin account, different password), fall back to the `?secret_key=ADMIN_SECRET_KEY` query param approach. Note: the secret_key is in AWS Secrets Manager -- if unavailable, document the auth failure and skip admin-gated endpoints.

**Step 2 — Database schema comparison (GET /api/admin/database/schema):**
```bash
# Get full schema from both environments
curl -s -H "Authorization: Bearer $STAGING_TOKEN" "$STAGING/api/admin/database/schema" > /tmp/staging_schema.json
curl -s -H "Authorization: Bearer $PROD_TOKEN" "$PROD/api/admin/database/schema" > /tmp/prod_schema.json
```

Compare:
- Table count (staging vs production)
- Table names (any tables present in one but not the other)
- Column counts per table (schema drift detection)
- Column differences for key tables (customers, drivers, vendors, orders, ride_requests)

**Step 3 — Table counts via admin endpoints:**
```bash
# Drivers — GET /api/admin/drivers?limit=1 returns stats.totalDrivers
curl -s -H "Authorization: Bearer $STAGING_TOKEN" "$STAGING/api/admin/drivers?limit=1" | python3 -c "import sys,json; d=json.load(sys.stdin); print('stats:', d.get('stats',{}), 'pagination:', d.get('pagination',{}))"
curl -s -H "Authorization: Bearer $PROD_TOKEN" "$PROD/api/admin/drivers?limit=1" | python3 -c "import sys,json; d=json.load(sys.stdin); print('stats:', d.get('stats',{}), 'pagination:', d.get('pagination',{}))"

# Rideshare requests — GET /api/admin/rideshare/requests?limit=1 returns total
curl -s -H "Authorization: Bearer $STAGING_TOKEN" "$STAGING/api/admin/rideshare/requests?limit=1"
curl -s -H "Authorization: Bearer $PROD_TOKEN" "$PROD/api/admin/rideshare/requests?limit=1"

# Active rides — GET /api/admin/rideshare/active
curl -s -H "Authorization: Bearer $STAGING_TOKEN" "$STAGING/api/admin/rideshare/active"
curl -s -H "Authorization: Bearer $PROD_TOKEN" "$PROD/api/admin/rideshare/active"
```

Also extract customer and vendor counts from publicly available or auth-accessible endpoints:
- `/api/vendors?limit=1` (requires vendor auth -- may not work, try and document)
- `/api/vendors/published?limit=1` already captured in Task 1 (includes total published count)

**Step 4 — Compile comparison report:**

Write DB_COMPARISON_REPORT.md with these sections:
1. **Environment Summary** (URLs, timestamps, API versions from /health)
2. **Database Connectivity** (staging vs prod health check results)
3. **Schema Comparison** (table count, any schema drift, column differences)
4. **Data Counts** (side-by-side table: drivers, rides, vendors, orders -- whatever is accessible)
5. **Response Time Comparison** (table with avg response times per endpoint per env)
6. **Behavioral Differences** (any error responses, timeouts, unexpected data, differences in microservice health)
7. **Findings and Recommendations** (summary of significant differences)

Format all data in markdown tables for easy comparison. Include raw response snippets where differences exist.
  </action>
  <verify>
    DB_COMPARISON_REPORT.md exists with all 7 sections populated.
    Both environments were queried (or failures documented).
    Schema comparison shows table-by-table analysis.
    Data counts are in a side-by-side table.
  </verify>
  <done>
    Complete staging vs production database comparison report written with:
    - DB connectivity status from both environments
    - Schema comparison (table counts, column differences if any)
    - Data counts for key tables (drivers, rides, vendors at minimum)
    - Response time benchmarks
    - Any behavioral differences documented
  </done>
</task>

</tasks>

<verification>
- DB_COMPARISON_REPORT.md exists at `.planning/quick/51-test-database-behaviour-staging-vs-produ/DB_COMPARISON_REPORT.md`
- Report contains side-by-side comparison data from both environments
- All requests were READ-ONLY (no POST mutations, no data changes)
- Auth failures (if any) are documented rather than silently skipped
</verification>

<success_criteria>
- Health check data captured from both staging and production
- Database schema compared (table count, column drift)
- Key table row counts compared (drivers, rides, vendors)
- Response times measured and compared
- All differences documented in a structured report
</success_criteria>

<output>
After completion, create `.planning/quick/51-test-database-behaviour-staging-vs-produ/51-SUMMARY.md`
</output>
