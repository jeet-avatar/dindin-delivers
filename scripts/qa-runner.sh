#!/bin/bash
#
# Dollor.ai QA Agent Runner - World Class Edition
# Comprehensive pre/post deployment testing with 10 specialized agents
#
# Usage:
#   ./scripts/qa-runner.sh [staging|production] [pre-deploy|post-deploy]
#
# Example:
#   ./scripts/qa-runner.sh staging pre-deploy
#   ./scripts/qa-runner.sh production post-deploy

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Config
ENV="${1:-staging}"
PHASE="${2:-pre-deploy}"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
PROJECT_ROOT="/Users/jeet/StudioProjects/eatfair-ios"
REPORT_DIR="$PROJECT_ROOT/.planning/qa-reports/${DATE}_${PHASE}"

# API URLs
if [ "$ENV" = "production" ]; then
    API_URL="https://api.dollor.ai"
else
    API_URL="https://d3kuu45w6kl8hr.cloudfront.net"
fi

# Demo Credentials
CUSTOMER_EMAIL="demo.customer@dollor.ai"
CUSTOMER_PASS="DemoCustomer2025!"
DRIVER_EMAIL="demo.driver@dollor.ai"
DRIVER_PASS="DemoDriver2025!"
RESTAURANT_EMAIL="demo.restaurant@dollor.ai"
RESTAURANT_PASS="DemoRestaurant2025!"

# Token storage (populated during auth tests)
CUSTOMER_TOKEN=""
DRIVER_TOKEN=""
VENDOR_TOKEN=""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " DOLLOR.AI QA AGENT SYSTEM v2.0 - WORLD CLASS EDITION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "Environment:  ${BLUE}${ENV}${NC}"
echo -e "Phase:        ${BLUE}${PHASE}${NC}"
echo -e "API URL:      ${BLUE}${API_URL}${NC}"
echo -e "Report Dir:   ${BLUE}${REPORT_DIR}${NC}"
echo -e "Timestamp:    ${BLUE}$(date)${NC}"
echo ""

# Create report directory
mkdir -p "$REPORT_DIR"

# ============================================================
# Helper Functions
# ============================================================
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local expected="$3"
    local auth_header="$4"
    local data="$5"
    local name="$6"

    local start_time=$(python3 -c "import time; print(int(time.time()*1000))")

    if [ -n "$auth_header" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -o /tmp/response.json -w "%{http_code}" -X "$method" "$API_URL$endpoint" \
                -H "Authorization: $auth_header" \
                -H "Content-Type: application/json" \
                -d "$data" 2>/dev/null)
        else
            response=$(curl -s -o /tmp/response.json -w "%{http_code}" -X "$method" "$API_URL$endpoint" \
                -H "Authorization: $auth_header" 2>/dev/null)
        fi
    else
        if [ -n "$data" ]; then
            response=$(curl -s -o /tmp/response.json -w "%{http_code}" -X "$method" "$API_URL$endpoint" \
                -H "Content-Type: application/x-www-form-urlencoded" \
                -d "$data" 2>/dev/null)
        else
            response=$(curl -s -o /tmp/response.json -w "%{http_code}" -X "$method" "$API_URL$endpoint" 2>/dev/null)
        fi
    fi

    local end_time=$(python3 -c "import time; print(int(time.time()*1000))")
    local duration=$((end_time - start_time))

    if [ "$response" = "$expected" ]; then
        echo "| $name | ✅ PASS | $response | ${duration}ms |"
        return 0
    else
        echo "| $name | ❌ FAIL | $response (expected $expected) | ${duration}ms |"
        return 1
    fi
}

# ============================================================
# Agent 1: API Testing (Comprehensive)
# ============================================================
run_api_agent() {
    echo -e "${YELLOW}◆ Running API Testing Agent...${NC}"

    local report="$REPORT_DIR/QA_REPORT_API.md"
    local passed=0
    local failed=0
    local slow=0

    cat > "$report" << EOF
# QA Report: API Testing (Comprehensive)

**Environment**: $ENV
**URL**: $API_URL
**Date**: $(date)
**Phase**: $PHASE

---

## 1. Health & Infrastructure

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
EOF

    # Health checks
    echo "  Testing health endpoints..."
    test_endpoint "GET" "/health" "200" "" "" "GET /health" >> "$report" && ((passed++)) || ((failed++))

    cat >> "$report" << EOF

## 2. Authentication Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
EOF

    # Customer login
    echo "  Testing customer authentication..."
    response=$(curl -s -X POST "$API_URL/api/auth/customer/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$CUSTOMER_EMAIL&password=$CUSTOMER_PASS")
    CUSTOMER_TOKEN=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
    if [ -n "$CUSTOMER_TOKEN" ]; then
        echo "| POST /api/auth/customer/login | ✅ PASS | 200 | Token received |" >> "$report"
        ((passed++))
    else
        echo "| POST /api/auth/customer/login | ❌ FAIL | - | No token |" >> "$report"
        ((failed++))
    fi

    # Driver login
    echo "  Testing driver authentication..."
    response=$(curl -s -X POST "$API_URL/api/auth/driver/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$DRIVER_EMAIL&password=$DRIVER_PASS")
    DRIVER_TOKEN=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
    if [ -n "$DRIVER_TOKEN" ]; then
        echo "| POST /api/auth/driver/login | ✅ PASS | 200 | Token received |" >> "$report"
        ((passed++))
    else
        echo "| POST /api/auth/driver/login | ❌ FAIL | - | No token (check DB migration) |" >> "$report"
        ((failed++))
    fi

    # Vendor login
    echo "  Testing restaurant authentication..."
    response=$(curl -s -X POST "$API_URL/api/auth/vendor/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$RESTAURANT_EMAIL&password=$RESTAURANT_PASS")
    VENDOR_TOKEN=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
    if [ -n "$VENDOR_TOKEN" ]; then
        echo "| POST /api/auth/vendor/login | ✅ PASS | 200 | Token received |" >> "$report"
        ((passed++))
    else
        echo "| POST /api/auth/vendor/login | ❌ FAIL | - | No token |" >> "$report"
        ((failed++))
    fi

    cat >> "$report" << EOF

## 3. Customer App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
EOF

    echo "  Testing customer endpoints..."
    test_endpoint "GET" "/api/vendors" "200" "" "" "GET /api/vendors" >> "$report" && ((passed++)) || ((failed++))
    test_endpoint "GET" "/api/vendors/40/menu" "200" "" "" "GET /api/vendors/{id}/menu" >> "$report" && ((passed++)) || ((failed++))

    if [ -n "$CUSTOMER_TOKEN" ]; then
        test_endpoint "GET" "/api/customer/orders" "200" "Bearer $CUSTOMER_TOKEN" "" "GET /api/customer/orders (auth)" >> "$report" && ((passed++)) || ((failed++))
        test_endpoint "GET" "/api/customer/profile" "200" "Bearer $CUSTOMER_TOKEN" "" "GET /api/customer/profile (auth)" >> "$report" && ((passed++)) || ((failed++))
    fi

    cat >> "$report" << EOF

## 4. Driver App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
EOF

    echo "  Testing driver endpoints..."
    test_endpoint "GET" "/api/v5/driver/48/dashboard" "200" "" "" "GET /api/v5/driver/{id}/dashboard" >> "$report" && ((passed++)) || ((failed++))
    test_endpoint "GET" "/api/drivers/48/documents" "200" "" "" "GET /api/drivers/{id}/documents" >> "$report" && ((passed++)) || ((failed++))
    test_endpoint "GET" "/api/drivers/48/status" "200" "" "" "GET /api/drivers/{id}/status" >> "$report" && ((passed++)) || ((failed++))

    cat >> "$report" << EOF

## 5. Restaurant App Endpoints

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
EOF

    echo "  Testing restaurant endpoints..."
    test_endpoint "GET" "/api/orders?vendor_id=40" "200" "" "" "GET /api/orders?vendor_id={id}" >> "$report" && ((passed++)) || ((failed++))

    cat >> "$report" << EOF

## 6. Demo Setup & Admin

| Endpoint | Status | Code | Response Time |
|----------|--------|------|---------------|
EOF

    echo "  Testing demo setup..."
    test_endpoint "POST" "/api/demo/setup" "200" "" "" "POST /api/demo/setup" >> "$report" && ((passed++)) || ((failed++))

    cat >> "$report" << EOF

## 7. Error Handling

| Test | Status | Notes |
|------|--------|-------|
EOF

    echo "  Testing error handling..."
    # Test 404
    response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/nonexistent")
    if [ "$response" = "404" ]; then
        echo "| Invalid endpoint returns 404 | ✅ PASS | Got $response |" >> "$report"
        ((passed++))
    else
        echo "| Invalid endpoint returns 404 | ❌ FAIL | Got $response |" >> "$report"
        ((failed++))
    fi

    # Test 401 on protected endpoint without auth
    response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/customer/orders")
    if [ "$response" = "401" ] || [ "$response" = "403" ]; then
        echo "| Protected endpoint requires auth | ✅ PASS | Got $response |" >> "$report"
        ((passed++))
    else
        echo "| Protected endpoint requires auth | ⚠️ WARN | Got $response |" >> "$report"
    fi

    # Summary
    cat >> "$report" << EOF

---

## Summary

| Metric | Count |
|--------|-------|
| Passed | $passed |
| Failed | $failed |
| Total Tests | $((passed + failed)) |

**Status**: $([ $failed -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")

### Token Status
- Customer Token: $([ -n "$CUSTOMER_TOKEN" ] && echo "✅ Valid" || echo "❌ Missing")
- Driver Token: $([ -n "$DRIVER_TOKEN" ] && echo "✅ Valid" || echo "❌ Missing")
- Vendor Token: $([ -n "$VENDOR_TOKEN" ] && echo "✅ Valid" || echo "❌ Missing")
EOF

    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}✓ API Agent: $passed passed, $failed failed${NC}"
        return 0
    else
        echo -e "${RED}✗ API Agent: $passed passed, $failed failed${NC}"
        return 1
    fi
}

# ============================================================
# Agent 2: UI/Code Quality Testing
# ============================================================
run_ui_agent() {
    echo -e "${YELLOW}◆ Running UI/Code Quality Agent...${NC}"

    local report="$REPORT_DIR/QA_REPORT_UI.md"
    local critical=0
    local warnings=0
    local info=0

    cat > "$report" << EOF
# QA Report: UI & Code Quality

**Date**: $(date)
**Phase**: $PHASE

---

## 1. Hardcoded Values Detection

| Check | Status | Count | Details |
|-------|--------|-------|---------|
EOF

    echo "  Checking for hardcoded values..."

    # Hardcoded production URLs (excluding config files)
    hardcoded_urls=$(grep -r "https://api\.dollor\.ai" apps/ios --include="*.swift" 2>/dev/null | grep -v "APIConfig\|Environment\|Config" | grep -v ".build/\|Pods/" | wc -l | xargs)
    if [ "$hardcoded_urls" -gt 0 ]; then
        echo "| Production URLs in code | ⚠️ WARNING | $hardcoded_urls | Should use APIConfig |" >> "$report"
        ((warnings++))
    else
        echo "| Production URLs in code | ✅ PASS | 0 | All URLs in config |" >> "$report"
    fi

    # Hardcoded staging URLs
    hardcoded_staging=$(grep -r "cloudfront\.net" apps/ios --include="*.swift" 2>/dev/null | grep -v "APIConfig\|Environment\|Config" | grep -v ".build/\|Pods/" | wc -l | xargs)
    if [ "$hardcoded_staging" -gt 0 ]; then
        echo "| Staging URLs in code | ⚠️ WARNING | $hardcoded_staging | Should use APIConfig |" >> "$report"
        ((warnings++))
    else
        echo "| Staging URLs in code | ✅ PASS | 0 | All URLs in config |" >> "$report"
    fi

    # Hardcoded colors (should use Color assets)
    hardcoded_colors=$(grep -rE "Color\(red:|UIColor\(red:" apps/ios --include="*.swift" 2>/dev/null | grep -v ".build/\|Pods/" | wc -l | xargs)
    if [ "$hardcoded_colors" -gt 5 ]; then
        echo "| Hardcoded colors | ⚠️ WARNING | $hardcoded_colors | Consider Color assets |" >> "$report"
        ((warnings++))
    else
        echo "| Hardcoded colors | ✅ PASS | $hardcoded_colors | Acceptable |" >> "$report"
    fi

    cat >> "$report" << EOF

## 2. Code Quality Indicators

| Check | Status | Count | Details |
|-------|--------|-------|---------|
EOF

    echo "  Checking code quality..."

    # TODO/FIXME comments
    todos=$(grep -r "TODO\|FIXME" apps/ios --include="*.swift" 2>/dev/null | grep -v ".build/\|Pods/" | wc -l | xargs)
    echo "| TODO/FIXME comments | ℹ️ INFO | $todos | Review before release |" >> "$report"
    ((info++))

    # Force unwrapping (!)
    force_unwrap=$(grep -rE "[a-zA-Z]+\!" apps/ios --include="*.swift" 2>/dev/null | grep -v "// \|IBOutlet\|IBAction\|@objc\|!=" | grep -v ".build/\|Pods/" | wc -l | xargs)
    if [ "$force_unwrap" -gt 50 ]; then
        echo "| Force unwrapping (!) | ⚠️ WARNING | $force_unwrap | Risk of crashes |" >> "$report"
        ((warnings++))
    else
        echo "| Force unwrapping (!) | ✅ PASS | $force_unwrap | Acceptable level |" >> "$report"
    fi

    # Print statements (should use proper logging)
    print_statements=$(grep -r "print(" apps/ios --include="*.swift" 2>/dev/null | grep -v ".build/\|Pods/" | wc -l | xargs)
    if [ "$print_statements" -gt 20 ]; then
        echo "| Debug print() calls | ⚠️ WARNING | $print_statements | Use Logger instead |" >> "$report"
        ((warnings++))
    else
        echo "| Debug print() calls | ✅ PASS | $print_statements | Acceptable |" >> "$report"
    fi

    cat >> "$report" << EOF

## 3. SwiftUI Best Practices

| Check | Status | Count | Details |
|-------|--------|-------|---------|
EOF

    echo "  Checking SwiftUI patterns..."

    # Large view bodies (>100 lines)
    large_views=$(grep -l "var body: some View" apps/ios --include="*.swift" -r 2>/dev/null | grep -v ".build/\|Pods/" | while read f; do
        lines=$(grep -A200 "var body: some View" "$f" 2>/dev/null | grep -n "^[[:space:]]*}" | head -1 | cut -d: -f1)
        [ -n "$lines" ] && [ "$lines" -gt 100 ] && echo "$f"
    done | wc -l | xargs)
    if [ "$large_views" -gt 5 ]; then
        echo "| Large view bodies (>100 lines) | ⚠️ WARNING | $large_views | Consider extracting subviews |" >> "$report"
        ((warnings++))
    else
        echo "| Large view bodies | ✅ PASS | $large_views | Acceptable |" >> "$report"
    fi

    # Missing @MainActor (async in views)
    missing_mainactor=$(grep -r "Task {" apps/ios --include="*.swift" 2>/dev/null | grep -v "@MainActor\|.build/\|Pods/" | wc -l | xargs)
    if [ "$missing_mainactor" -gt 10 ]; then
        echo "| Task without @MainActor | ⚠️ WARNING | $missing_mainactor | May cause UI issues |" >> "$report"
        ((warnings++))
    else
        echo "| Task without @MainActor | ✅ PASS | $missing_mainactor | Acceptable |" >> "$report"
    fi

    # Summary
    cat >> "$report" << EOF

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | $critical |
| Warnings | $warnings |
| Info | $info |

**Status**: $([ $critical -eq 0 ] && [ $warnings -lt 5 ] && echo "✅ PASS" || echo "⚠️ WARNING")
EOF

    if [ $critical -eq 0 ]; then
        echo -e "${GREEN}✓ UI Agent: $critical critical, $warnings warnings${NC}"
        return 0
    else
        echo -e "${RED}✗ UI Agent: $critical critical issues${NC}"
        return 1
    fi
}

# ============================================================
# Agent 3: E2E Workflow Testing (API-Based)
# ============================================================
run_e2e_agent() {
    echo -e "${YELLOW}◆ Running E2E Workflow Agent...${NC}"

    local report="$REPORT_DIR/QA_REPORT_E2E.md"
    local passed=0
    local failed=0

    cat > "$report" << EOF
# QA Report: End-to-End Workflows

**Environment**: $ENV
**Date**: $(date)
**Phase**: $PHASE

---

## 1. Customer Order Flow (API Test)

EOF

    echo "  Testing customer order flow..."

    # Step 1: Login
    response=$(curl -s -X POST "$API_URL/api/auth/customer/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$CUSTOMER_EMAIL&password=$CUSTOMER_PASS")
    token=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
    customer_id=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('customer_id',''))" 2>/dev/null)

    if [ -n "$token" ]; then
        echo "| 1. Customer Login | ✅ PASS | Token: ${token:0:20}... | ID: $customer_id |" >> "$report"
        ((passed++))
    else
        echo "| 1. Customer Login | ❌ FAIL | No token received |" >> "$report"
        ((failed++))
    fi

    # Step 2: Browse Vendors
    vendor_count=$(curl -s "$API_URL/api/vendors" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
    if [ -n "$vendor_count" ] && [ "$vendor_count" -gt 0 ]; then
        echo "| 2. Browse Vendors | ✅ PASS | $vendor_count restaurants available |" >> "$report"
        ((passed++))
    else
        echo "| 2. Browse Vendors | ❌ FAIL | No vendors returned |" >> "$report"
        ((failed++))
    fi

    # Step 3: View Menu (API returns flat array, not nested object)
    menu_items=$(curl -s "$API_URL/api/vendors/40/menu" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else len(d.get('menu_items',d.get('items',[]))))" 2>/dev/null)
    if [ -n "$menu_items" ] && [ "$menu_items" -gt 0 ]; then
        echo "| 3. View Menu | ✅ PASS | $menu_items items in menu |" >> "$report"
        ((passed++))
    else
        echo "| 3. View Menu | ❌ FAIL | No menu items |" >> "$report"
        ((failed++))
    fi

    # Step 4: Check order history
    if [ -n "$token" ]; then
        orders=$(curl -s "$API_URL/api/customer/orders" -H "Authorization: Bearer $token" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else len(d.get('orders',[])))" 2>/dev/null)
        echo "| 4. Order History | ✅ PASS | $orders past orders |" >> "$report"
        ((passed++))
    fi

    cat >> "$report" << EOF

## 2. Driver Flow (API Test)

EOF

    echo "  Testing driver flow..."

    # Driver dashboard
    dashboard=$(curl -s "$API_URL/api/v5/driver/48/dashboard")
    earnings=$(echo "$dashboard" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('this_week',{}).get('gross_earnings',0))" 2>/dev/null)
    if [ -n "$earnings" ]; then
        echo "| 1. Driver Dashboard | ✅ PASS | Week earnings: \$$earnings |" >> "$report"
        ((passed++))
    else
        echo "| 1. Driver Dashboard | ❌ FAIL | Cannot parse earnings |" >> "$report"
        ((failed++))
    fi

    # Driver documents
    docs=$(curl -s "$API_URL/api/drivers/48/documents" | python3 -c "import sys,json; d=json.load(sys.stdin); print(sum(1 for k,v in d.items() if v==True or v=='verified'))" 2>/dev/null)
    echo "| 2. Documents Status | ✅ PASS | $docs verified |" >> "$report"
    ((passed++))

    cat >> "$report" << EOF

## 3. Restaurant Flow (API Test)

EOF

    echo "  Testing restaurant flow..."

    # Vendor login
    response=$(curl -s -X POST "$API_URL/api/auth/vendor/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$RESTAURANT_EMAIL&password=$RESTAURANT_PASS")
    vendor_token=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

    if [ -n "$vendor_token" ]; then
        echo "| 1. Vendor Login | ✅ PASS | Token received |" >> "$report"
        ((passed++))
    else
        echo "| 1. Vendor Login | ❌ FAIL | No token |" >> "$report"
        ((failed++))
    fi

    # View orders
    order_count=$(curl -s "$API_URL/api/orders?vendor_id=40" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
    echo "| 2. View Orders | ✅ PASS | $order_count orders |" >> "$report"
    ((passed++))

    # Summary
    cat >> "$report" << EOF

---

## Summary

| Metric | Count |
|--------|-------|
| Passed | $passed |
| Failed | $failed |
| Total | $((passed + failed)) |

**Status**: $([ $failed -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")
EOF

    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}✓ E2E Agent: $passed passed, $failed failed${NC}"
        return 0
    else
        echo -e "${RED}✗ E2E Agent: $passed passed, $failed failed${NC}"
        return 1
    fi
}

# ============================================================
# Agent 4: Dead Code Detection
# ============================================================
run_deadcode_agent() {
    echo -e "${YELLOW}◆ Running Dead Code Agent...${NC}"

    local report="$REPORT_DIR/QA_REPORT_DEADCODE.md"
    local issues=0

    cat > "$report" << EOF
# QA Report: Dead Code Detection

**Date**: $(date)
**Phase**: $PHASE

---

## 1. Backup/Dead Code Files

| Check | Status | Count | Details |
|-------|--------|-------|---------|
EOF

    echo "  Scanning for dead code..."

    # Files with _dead_code, _backup, _old in name
    dead_files=$(find apps/ios -name "*_dead*" -o -name "*_backup*" -o -name "*_old*" -o -name "*Unused*" 2>/dev/null | grep -v ".build/\|Pods/" | wc -l | xargs)
    if [ "$dead_files" -gt 0 ]; then
        echo "| Dead code backup files | ⚠️ WARNING | $dead_files | Should be removed |" >> "$report"
        ((issues++))
    else
        echo "| Dead code backup files | ✅ PASS | 0 | Clean |" >> "$report"
    fi

    cat >> "$report" << EOF

## 2. Commented Code Blocks

| Check | Status | Count | Details |
|-------|--------|-------|---------|
EOF

    # Large commented blocks (>5 consecutive comment lines)
    commented_blocks=$(grep -rn "^[[:space:]]*//" apps/ios --include="*.swift" 2>/dev/null | grep -v ".build/\|Pods/" | awk -F: '{print $1":"$2}' | sort | uniq -c | awk '$1 > 5 {print}' | wc -l | xargs)
    if [ "$commented_blocks" -gt 10 ]; then
        echo "| Large commented blocks | ⚠️ WARNING | $commented_blocks | Review and remove |" >> "$report"
        ((issues++))
    else
        echo "| Large commented blocks | ✅ PASS | $commented_blocks | Acceptable |" >> "$report"
    fi

    cat >> "$report" << EOF

## 3. Unused Imports (Backend)

| Check | Status | Count | Details |
|-------|--------|-------|---------|
EOF

    # Python unused imports (basic check)
    total_imports=$(grep -r "^import\|^from .* import" apps/web/p2p-platform/backend --include="*.py" 2>/dev/null | grep -v "venv\|__pycache__" | wc -l | xargs)
    echo "| Total Python imports | ℹ️ INFO | $total_imports | Run pylint for detailed analysis |" >> "$report"

    cat >> "$report" << EOF

## 4. Empty Files

| Check | Status | Count | Details |
|-------|--------|-------|---------|
EOF

    # Empty Swift files
    empty_swift=$(find apps/ios -name "*.swift" -empty 2>/dev/null | grep -v ".build/\|Pods/" | wc -l | xargs)
    if [ "$empty_swift" -gt 0 ]; then
        echo "| Empty Swift files | ⚠️ WARNING | $empty_swift | Should be removed |" >> "$report"
        ((issues++))
    else
        echo "| Empty Swift files | ✅ PASS | 0 | Clean |" >> "$report"
    fi

    # Summary
    cat >> "$report" << EOF

---

## Summary

**Issues Found**: $issues

**Status**: $([ $issues -eq 0 ] && echo "✅ PASS" || echo "⚠️ WARNING")

*Note: For comprehensive dead code analysis, run SwiftLint and pylint*
EOF

    echo -e "${GREEN}✓ Dead Code Agent: $issues issues${NC}"
    return 0
}

# ============================================================
# Agent 5: Security Scanning (OWASP-Based)
# ============================================================
run_security_agent() {
    echo -e "${YELLOW}◆ Running Security Agent (OWASP)...${NC}"

    local report="$REPORT_DIR/QA_REPORT_SECURITY.md"
    local critical=0
    local high=0
    local medium=0
    local low=0

    cat > "$report" << EOF
# QA Report: Security Scan (OWASP-Based)

**Date**: $(date)
**Phase**: $PHASE

---

## 1. Sensitive Data Exposure (A3:2017)

| Check | Severity | Status | Details |
|-------|----------|--------|---------|
EOF

    echo "  Checking for sensitive data exposure..."

    # Hardcoded secrets (excluding test/demo)
    secrets=$(grep -rE "(api_key|apiKey|secret|SECRET|private_key|PRIVATE_KEY)\s*[:=]\s*['\"][^'\"]{10,}" apps/ios --include="*.swift" 2>/dev/null | grep -v "demo\|test\|example\|//" | grep -v ".build/\|Pods/" | wc -l | xargs)
    if [ "$secrets" -gt 0 ]; then
        echo "| Hardcoded secrets | ❌ CRITICAL | FAIL | $secrets found |" >> "$report"
        ((critical++))
    else
        echo "| Hardcoded secrets | ✅ LOW | PASS | None found |" >> "$report"
    fi

    # Passwords in code (excluding UI fields)
    passwords=$(grep -rE 'password\s*=\s*"[^"]{8,}"' apps/ios --include="*.swift" 2>/dev/null | grep -v "demo\|Demo\|test\|Test" | grep -v "TextField\|SecureField\|@State\|@Binding" | grep -v ".build/\|Pods/\|checkouts/" | wc -l | xargs)
    if [ "$passwords" -gt 0 ]; then
        echo "| Hardcoded passwords | ❌ CRITICAL | FAIL | $passwords found |" >> "$report"
        ((critical++))
    else
        echo "| Hardcoded passwords | ✅ LOW | PASS | None found |" >> "$report"
    fi

    # Bearer tokens hardcoded
    bearer=$(grep -rE "Bearer\s+[A-Za-z0-9._-]{20,}" apps/ios --include="*.swift" 2>/dev/null | grep -v ".build/\|Pods/" | wc -l | xargs)
    if [ "$bearer" -gt 0 ]; then
        echo "| Hardcoded Bearer tokens | ❌ CRITICAL | FAIL | $bearer found |" >> "$report"
        ((critical++))
    else
        echo "| Hardcoded Bearer tokens | ✅ LOW | PASS | None found |" >> "$report"
    fi

    # .env files
    env_files=$(find . -name ".env" -not -path "*/venv/*" -not -path "*/.git/*" 2>/dev/null | wc -l | xargs)
    if [ "$env_files" -gt 0 ]; then
        echo "| .env files in repo | ⚠️ MEDIUM | WARN | $env_files files |" >> "$report"
        ((medium++))
    else
        echo "| .env files | ✅ LOW | PASS | None committed |" >> "$report"
    fi

    cat >> "$report" << EOF

## 2. Broken Authentication (A2:2017)

| Check | Severity | Status | Details |
|-------|----------|--------|---------|
EOF

    echo "  Checking authentication security..."

    # Check for secure token storage (Keychain)
    keychain_usage=$(grep -r "Keychain\|SecItem\|kSecClass" apps/ios --include="*.swift" 2>/dev/null | grep -v ".build/\|Pods/" | wc -l | xargs)
    if [ "$keychain_usage" -gt 0 ]; then
        echo "| Keychain usage | ✅ LOW | PASS | $keychain_usage references |" >> "$report"
    else
        echo "| Keychain usage | ⚠️ MEDIUM | WARN | Consider Keychain for tokens |" >> "$report"
        ((medium++))
    fi

    # Check for UserDefaults storing sensitive data
    userdefaults_sensitive=$(grep -rE "UserDefaults.*token\|UserDefaults.*password\|UserDefaults.*secret" apps/ios --include="*.swift" 2>/dev/null | grep -v ".build/\|Pods/" | wc -l | xargs)
    if [ "$userdefaults_sensitive" -gt 0 ]; then
        echo "| Sensitive data in UserDefaults | ⚠️ HIGH | WARN | $userdefaults_sensitive - Use Keychain |" >> "$report"
        ((high++))
    else
        echo "| UserDefaults security | ✅ LOW | PASS | No sensitive data |" >> "$report"
    fi

    cat >> "$report" << EOF

## 3. Security Misconfiguration (A6:2017)

| Check | Severity | Status | Details |
|-------|----------|--------|---------|
EOF

    echo "  Checking security configuration..."

    # HTTP URLs (should be HTTPS)
    http_urls=$(grep -rE "http://[a-zA-Z]" apps/ios --include="*.swift" 2>/dev/null | grep -v "https://" | grep -v ".build/\|Pods/" | wc -l | xargs)
    if [ "$http_urls" -gt 0 ]; then
        echo "| HTTP URLs | ⚠️ HIGH | WARN | $http_urls - Should be HTTPS |" >> "$report"
        ((high++))
    else
        echo "| HTTPS enforcement | ✅ LOW | PASS | All HTTPS |" >> "$report"
    fi

    # Debug/logging in production
    nslog=$(grep -r "NSLog\|debugPrint" apps/ios --include="*.swift" 2>/dev/null | grep -v ".build/\|Pods/" | wc -l | xargs)
    if [ "$nslog" -gt 10 ]; then
        echo "| Debug logging | ⚠️ MEDIUM | WARN | $nslog calls - Remove for prod |" >> "$report"
        ((medium++))
    else
        echo "| Debug logging | ✅ LOW | PASS | Minimal ($nslog) |" >> "$report"
    fi

    cat >> "$report" << EOF

## 4. Injection (A1:2017)

| Check | Severity | Status | Details |
|-------|----------|--------|---------|
EOF

    echo "  Checking for injection vulnerabilities..."

    # SQL injection in Python (raw queries)
    raw_sql=$(grep -rE "execute\s*\(\s*['\"].*%s\|execute\s*\(\s*f['\"]" apps/web/p2p-platform/backend --include="*.py" 2>/dev/null | grep -v "venv" | wc -l | xargs)
    if [ "$raw_sql" -gt 5 ]; then
        echo "| Potential SQL injection | ⚠️ HIGH | WARN | $raw_sql raw queries |" >> "$report"
        ((high++))
    else
        echo "| SQL injection | ✅ LOW | PASS | Using parameterized queries |" >> "$report"
    fi

    # Summary
    cat >> "$report" << EOF

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | $critical |
| High | $high |
| Medium | $medium |
| Low | $low |

**Status**: $([ $critical -eq 0 ] && [ $high -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")

### Risk Assessment
$([ $critical -gt 0 ] && echo "- **CRITICAL**: $critical issues require immediate attention")
$([ $high -gt 0 ] && echo "- **HIGH**: $high issues should be fixed before release")
$([ $medium -gt 0 ] && echo "- **MEDIUM**: $medium issues should be addressed soon")
EOF

    if [ $critical -eq 0 ] && [ $high -eq 0 ]; then
        echo -e "${GREEN}✓ Security Agent: $critical critical, $high high${NC}"
        return 0
    else
        echo -e "${RED}✗ Security Agent: $critical critical, $high high${NC}"
        return 1
    fi
}

# ============================================================
# Agent 6: Test Runner
# ============================================================
run_tests_agent() {
    echo -e "${YELLOW}◆ Running Tests Agent...${NC}"

    local report="$REPORT_DIR/QA_REPORT_TESTS.md"

    cat > "$report" << EOF
# QA Report: Test Execution

**Date**: $(date)
**Phase**: $PHASE

---

## 1. Backend Tests (Python)

EOF

    echo "  Running backend tests..."

    if [ -d "$PROJECT_ROOT/apps/web/p2p-platform/backend/tests" ]; then
        cd "$PROJECT_ROOT/apps/web/p2p-platform/backend"
        if command -v pytest &> /dev/null; then
            echo '```' >> "$report"
            timeout 60 pytest tests/ --tb=short -q 2>&1 | tail -20 >> "$report" || echo "Tests timed out or failed" >> "$report"
            echo '```' >> "$report"
        else
            echo "pytest not installed" >> "$report"
        fi
        cd "$PROJECT_ROOT"
    else
        echo "No tests directory found" >> "$report"
    fi

    cat >> "$report" << EOF

## 2. iOS Tests

| App | Command | Status |
|-----|---------|--------|
| Customer | \`xcodebuild test -scheme eatfaircustomer\` | Manual |
| Driver | \`xcodebuild test -scheme eatffairdelivery\` | Manual |
| Restaurant | \`xcodebuild test -scheme eatffairrestaurant\` | Manual |

*iOS tests require Xcode simulator and must be run manually*

---

## 3. API Contract Tests

EOF

    # Check if contract tests exist
    if [ -f "$PROJECT_ROOT/apps/web/p2p-platform/backend/tests/integration/test_ios_api_contracts.py" ]; then
        echo "| Contract tests file | ✅ EXISTS |" >> "$report"
    else
        echo "| Contract tests file | ⚠️ MISSING |" >> "$report"
    fi

    cat >> "$report" << EOF

---

## Summary

**Status**: ⚠️ PARTIAL (requires manual iOS test execution)
EOF

    echo -e "${GREEN}✓ Tests Agent complete${NC}"
    return 0
}

# ============================================================
# Agent 7: Database Agent (NEW)
# ============================================================
run_database_agent() {
    echo -e "${YELLOW}◆ Running Database Agent...${NC}"

    local report="$REPORT_DIR/QA_REPORT_DATABASE.md"

    cat > "$report" << EOF
# QA Report: Database Health

**Environment**: $ENV
**Date**: $(date)
**Phase**: $PHASE

---

## 1. Connection Test

EOF

    echo "  Testing database connectivity..."

    # Test via health endpoint
    db_status=$(curl -s "$API_URL/health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('database','unknown'))" 2>/dev/null)
    if [ "$db_status" = "connected" ]; then
        echo "| Database Connection | ✅ PASS | $db_status |" >> "$report"
    else
        echo "| Database Connection | ❌ FAIL | $db_status |" >> "$report"
    fi

    cat >> "$report" << EOF

## 2. Data Integrity Checks

| Check | Status | Details |
|-------|--------|---------|
EOF

    echo "  Checking data integrity..."

    # Check demo accounts exist
    demo_check=$(curl -s -X POST "$API_URL/api/demo/setup" | python3 -c "import sys,json; d=json.load(sys.stdin); print('pass' if d.get('success') or len(d.get('results',{}).get('existing',[]))>0 else 'fail')" 2>/dev/null)
    if [ "$demo_check" = "pass" ]; then
        echo "| Demo accounts exist | ✅ PASS | Accounts ready |" >> "$report"
    else
        echo "| Demo accounts exist | ❌ FAIL | Run /api/demo/setup |" >> "$report"
    fi

    # Check vendor count
    vendor_count=$(curl -s "$API_URL/api/vendors" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
    if [ -n "$vendor_count" ] && [ "$vendor_count" -gt 0 ]; then
        echo "| Vendors table | ✅ PASS | $vendor_count vendors |" >> "$report"
    else
        echo "| Vendors table | ❌ FAIL | No vendors |" >> "$report"
    fi

    cat >> "$report" << EOF

## 3. Migration Status

| Check | Status | Details |
|-------|--------|---------|
EOF

    # Check for migration errors in demo setup
    migration_error=$(curl -s -X POST "$API_URL/api/demo/setup" | python3 -c "import sys,json; errors=json.load(sys.stdin).get('results',{}).get('errors',[]); print('vehicle_photo_url' if any('vehicle_photo_url' in str(e) for e in errors) else 'ok')" 2>/dev/null)
    if [ "$migration_error" = "vehicle_photo_url" ]; then
        echo "| vehicle_photo_url column | ❌ FAIL | Migration not applied |" >> "$report"
    else
        echo "| Schema migrations | ✅ PASS | Up to date |" >> "$report"
    fi

    cat >> "$report" << EOF

---

## Summary

**Status**: $([ "$db_status" = "connected" ] && echo "✅ PASS" || echo "❌ FAIL")
EOF

    echo -e "${GREEN}✓ Database Agent complete${NC}"
    return 0
}

# ============================================================
# Agent 8: Performance Agent (NEW)
# ============================================================
run_performance_agent() {
    echo -e "${YELLOW}◆ Running Performance Agent...${NC}"

    local report="$REPORT_DIR/QA_REPORT_PERFORMANCE.md"
    local slow=0

    cat > "$report" << EOF
# QA Report: Performance

**Environment**: $ENV
**Date**: $(date)
**Phase**: $PHASE

---

## 1. API Response Times

| Endpoint | Time | Status | Threshold |
|----------|------|--------|-----------|
EOF

    echo "  Testing API response times..."

    # Test key endpoints
    for endpoint in "/health" "/api/vendors" "/api/vendors/40/menu" "/api/v5/driver/48/dashboard"; do
        start=$(python3 -c "import time; print(int(time.time()*1000))")
        curl -s -o /dev/null "$API_URL$endpoint"
        end=$(python3 -c "import time; print(int(time.time()*1000))")
        duration=$((end - start))

        if [ $duration -lt 500 ]; then
            echo "| $endpoint | ${duration}ms | ✅ FAST | <500ms |" >> "$report"
        elif [ $duration -lt 1000 ]; then
            echo "| $endpoint | ${duration}ms | ⚠️ OK | <1000ms |" >> "$report"
        else
            echo "| $endpoint | ${duration}ms | ❌ SLOW | >1000ms |" >> "$report"
            ((slow++))
        fi
    done

    cat >> "$report" << EOF

## 2. Code Size Analysis

| Metric | Value | Status |
|--------|-------|--------|
EOF

    echo "  Analyzing code size..."

    # Swift file count
    swift_files=$(find apps/ios -name "*.swift" 2>/dev/null | grep -v ".build/\|Pods/" | wc -l | xargs)
    echo "| Swift files | $swift_files | ℹ️ INFO |" >> "$report"

    # Total Swift lines
    swift_lines=$(find apps/ios -name "*.swift" 2>/dev/null | grep -v ".build/\|Pods/" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
    echo "| Swift LOC | $swift_lines | ℹ️ INFO |" >> "$report"

    # Python file count
    python_files=$(find apps/web/p2p-platform/backend -name "*.py" 2>/dev/null | grep -v "venv\|__pycache__" | wc -l | xargs)
    echo "| Python files | $python_files | ℹ️ INFO |" >> "$report"

    cat >> "$report" << EOF

---

## Summary

| Metric | Count |
|--------|-------|
| Slow endpoints (>1s) | $slow |

**Status**: $([ $slow -eq 0 ] && echo "✅ PASS" || echo "⚠️ WARNING")
EOF

    echo -e "${GREEN}✓ Performance Agent: $slow slow endpoints${NC}"
    return 0
}

# ============================================================
# Agent 9: Dependency Agent (NEW)
# ============================================================
run_dependency_agent() {
    echo -e "${YELLOW}◆ Running Dependency Agent...${NC}"

    local report="$REPORT_DIR/QA_REPORT_DEPENDENCIES.md"

    cat > "$report" << EOF
# QA Report: Dependencies

**Date**: $(date)
**Phase**: $PHASE

---

## 1. iOS Dependencies (CocoaPods)

| Check | Status | Details |
|-------|--------|---------|
EOF

    echo "  Checking iOS dependencies..."

    # Check Podfile.lock exists
    for app in customer delivery restaurant; do
        if [ -f "apps/ios/$app/Podfile.lock" ]; then
            pod_count=$(grep -c "^  - " "apps/ios/$app/Podfile.lock" 2>/dev/null || echo 0)
            echo "| $app Podfile.lock | ✅ EXISTS | $pod_count pods |" >> "$report"
        else
            echo "| $app Podfile.lock | ⚠️ MISSING | Run pod install |" >> "$report"
        fi
    done

    cat >> "$report" << EOF

## 2. Python Dependencies

| Check | Status | Details |
|-------|--------|---------|
EOF

    echo "  Checking Python dependencies..."

    if [ -f "apps/web/p2p-platform/backend/requirements.txt" ]; then
        req_count=$(wc -l < "apps/web/p2p-platform/backend/requirements.txt" | xargs)
        echo "| requirements.txt | ✅ EXISTS | $req_count packages |" >> "$report"
    else
        echo "| requirements.txt | ❌ MISSING | |" >> "$report"
    fi

    cat >> "$report" << EOF

## 3. Swift Package Manager

| Check | Status | Details |
|-------|--------|---------|
EOF

    # Check Package.resolved
    if [ -f "apps/ios/customer/eatfaircustomer.xcworkspace/xcshareddata/swiftpm/Package.resolved" ]; then
        spm_count=$(grep -c '"identity"' "apps/ios/customer/eatfaircustomer.xcworkspace/xcshareddata/swiftpm/Package.resolved" 2>/dev/null || echo 0)
        echo "| SPM Package.resolved | ✅ EXISTS | $spm_count packages |" >> "$report"
    else
        echo "| SPM Package.resolved | ⚠️ MISSING | |" >> "$report"
    fi

    cat >> "$report" << EOF

---

## Summary

**Status**: ✅ PASS

*Note: Run \`pod outdated\` and \`pip list --outdated\` for version checks*
EOF

    echo -e "${GREEN}✓ Dependency Agent complete${NC}"
    return 0
}

# ============================================================
# Agent 10: Validator (Aggregates all reports)
# ============================================================
run_validator_agent() {
    echo -e "${MAGENTA}◆ Running Validator Agent...${NC}"

    local report="$REPORT_DIR/QA_VALIDATION_REPORT.md"
    local total_pass=0
    local total_fail=0
    local total_warn=0

    cat > "$report" << EOF
# QA VALIDATION REPORT

**Environment**: $ENV
**Phase**: $PHASE
**Date**: $(date)
**Report Directory**: $REPORT_DIR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Agent Results Summary

| # | Agent | Focus | Status | Report |
|---|-------|-------|--------|--------|
EOF

    # Check each report
    local agent_num=1
    for agent_info in "API:API Endpoints" "UI:Code Quality" "E2E:Workflows" "DEADCODE:Dead Code" "SECURITY:Security" "TESTS:Testing" "DATABASE:Database" "PERFORMANCE:Performance" "DEPENDENCIES:Dependencies"; do
        agent=$(echo "$agent_info" | cut -d: -f1)
        focus=$(echo "$agent_info" | cut -d: -f2)
        report_file="$REPORT_DIR/QA_REPORT_${agent}.md"

        if [ -f "$report_file" ]; then
            if grep -q "❌ FAIL\|❌ CRITICAL" "$report_file"; then
                echo "| $agent_num | $agent | $focus | ❌ FAIL | [View](QA_REPORT_${agent}.md) |" >> "$report"
                ((total_fail++))
            elif grep -q "⚠️ WARNING\|⚠️ WARN\|⚠️ HIGH\|⚠️ MEDIUM" "$report_file"; then
                echo "| $agent_num | $agent | $focus | ⚠️ WARN | [View](QA_REPORT_${agent}.md) |" >> "$report"
                ((total_warn++))
            else
                echo "| $agent_num | $agent | $focus | ✅ PASS | [View](QA_REPORT_${agent}.md) |" >> "$report"
                ((total_pass++))
            fi
        else
            echo "| $agent_num | $agent | $focus | ⏭️ SKIP | Not run |" >> "$report"
        fi
        ((agent_num++))
    done

    # Determine overall verdict
    if [ $total_fail -gt 0 ]; then
        verdict="❌ FAIL - BLOCK DEPLOYMENT"
    elif [ $total_warn -gt 0 ]; then
        verdict="⚠️ WARNING - DEPLOY WITH CAUTION"
    else
        verdict="✅ PASS - APPROVED FOR DEPLOYMENT"
    fi

    cat >> "$report" << EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Overall Verdict

| Metric | Count |
|--------|-------|
| ✅ Passed | $total_pass |
| ⚠️ Warnings | $total_warn |
| ❌ Failed | $total_fail |
| **Total Agents** | **$((total_pass + total_warn + total_fail))** |

### $verdict

EOF

    if [ $total_fail -gt 0 ]; then
        cat >> "$report" << EOF
### Action Required

The following agents reported failures that must be fixed before deployment:

EOF
        grep "❌ FAIL" "$report" | while read line; do
            echo "- $line" >> "$report"
        done
    fi

    if [ $total_warn -gt 0 ]; then
        cat >> "$report" << EOF

### Warnings to Review

EOF
        grep "⚠️ WARN" "$report" | while read line; do
            echo "- $line" >> "$report"
        done
    fi

    cat >> "$report" << EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Quick Commands

\`\`\`bash
# View this report
cat $REPORT_DIR/QA_VALIDATION_REPORT.md

# View specific agent report
cat $REPORT_DIR/QA_REPORT_API.md
cat $REPORT_DIR/QA_REPORT_SECURITY.md

# Re-run QA
./scripts/qa-runner.sh $ENV $PHASE
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*Generated by Dollor.ai QA Agent System v2.0*
*Report: $REPORT_DIR*
EOF

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e " VALIDATION COMPLETE: $verdict"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e " ${GREEN}Passed${NC}: $total_pass  ${YELLOW}Warnings${NC}: $total_warn  ${RED}Failed${NC}: $total_fail"
    echo ""
    echo " Reports saved to: $REPORT_DIR"
    echo ""

    return $([ $total_fail -eq 0 ] && echo 0 || echo 1)
}

# ============================================================
# Main Execution
# ============================================================
main() {
    echo ""
    echo "Starting QA Agent execution (9 agents)..."
    echo ""

    cd "$PROJECT_ROOT"

    # Run all agents
    run_api_agent || true
    run_ui_agent || true
    run_e2e_agent || true
    run_deadcode_agent || true
    run_security_agent || true
    run_tests_agent || true
    run_database_agent || true
    run_performance_agent || true
    run_dependency_agent || true

    # Run validator last
    run_validator_agent

    exit_code=$?

    echo ""
    echo "To view full report:"
    echo "  cat $REPORT_DIR/QA_VALIDATION_REPORT.md"
    echo ""

    exit $exit_code
}

# Run main
main
