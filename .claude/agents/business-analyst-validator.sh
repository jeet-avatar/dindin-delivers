#!/bin/bash
#
# DOLLOR.AI BUSINESS ANALYST VALIDATOR
# Validates ALL business requirements, field mappings, and iOS flows
#
# Usage: ./business-analyst-validator.sh [staging|production]
#
# This agent validates:
# 1. Business requirements match implementation
# 2. API field mappings are correct
# 3. iOS apps use correct endpoints
# 4. QA flows work end-to-end
# 5. No hallucinations in implementation
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Config
ENV="${1:-staging}"
PROJECT_ROOT="/Users/jeet/StudioProjects/eatfair-ios"
BACKEND="$PROJECT_ROOT/apps/web/p2p-platform/backend"
IOS_SHARED="$PROJECT_ROOT/apps/ios/eatfair-ios-shared/Sources/EatFairShared"
REPORT_DIR="$PROJECT_ROOT/.planning/validation-reports"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
REPORT="$REPORT_DIR/VALIDATION_${DATE}.md"

if [ "$ENV" = "production" ]; then
    API_URL="https://api.dollor.ai"
else
    API_URL="https://d3kuu45w6kl8hr.cloudfront.net"
fi

mkdir -p "$REPORT_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " DOLLOR.AI BUSINESS ANALYST VALIDATOR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "Environment: ${BLUE}${ENV}${NC}"
echo -e "API URL:     ${BLUE}${API_URL}${NC}"
echo -e "Report:      ${BLUE}${REPORT}${NC}"
echo ""

# Initialize report
cat > "$REPORT" << EOF
# Business Analyst Validation Report

**Date:** $(date)
**Environment:** $ENV
**API URL:** $API_URL

---

EOF

TOTAL_CHECKS=0
PASSED=0
FAILED=0
WARNINGS=0

log_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    echo "- ✅ **PASS**: $1" >> "$REPORT"
    ((PASSED++))
    ((TOTAL_CHECKS++))
}

log_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    echo "- ❌ **FAIL**: $1" >> "$REPORT"
    ((FAILED++))
    ((TOTAL_CHECKS++))
}

log_warn() {
    echo -e "${YELLOW}⚠️ WARN${NC}: $1"
    echo "- ⚠️ **WARN**: $1" >> "$REPORT"
    ((WARNINGS++))
    ((TOTAL_CHECKS++))
}

# ============================================================
# SECTION 1: BUSINESS REQUIREMENTS VALIDATION
# ============================================================
echo ""
echo -e "${BLUE}━━━ SECTION 1: BUSINESS REQUIREMENTS ━━━${NC}"
echo "" >> "$REPORT"
echo "## 1. Business Requirements Validation" >> "$REPORT"
echo "" >> "$REPORT"

# Check pricing model in code
echo "Checking pricing model implementation..."
if grep -q "platform_fee.*=.*1.00\|CUSTOMER_SERVICE_FEE.*=.*1" "$BACKEND/main_new.py" 2>/dev/null; then
    log_pass "Platform fee is \$1 (correct)"
else
    log_fail "Platform fee not found or incorrect"
fi

# Check we're NOT a TNC (no commission percentage)
if grep -q "commission.*=.*0.15\|commission.*=.*15%" "$BACKEND/main_new.py" 2>/dev/null; then
    log_fail "Found 15% commission - WE ARE NOT A TNC!"
else
    log_pass "No commission percentage found (correct - we are matchmaking)"
fi

# Check driver keeps 100%
if grep -q "driver.*keeps.*100\|driver_payout.*=.*delivery_fee\|driverPlatformFee.*=.*0" "$IOS_SHARED/Services/DollorV3Service.swift" 2>/dev/null; then
    log_pass "Driver keeps 100% of earnings"
else
    log_warn "Could not verify driver keeps 100%"
fi

# ============================================================
# SECTION 2: API FIELD MAPPING VALIDATION
# ============================================================
echo ""
echo -e "${BLUE}━━━ SECTION 2: API FIELD MAPPING ━━━${NC}"
echo "" >> "$REPORT"
echo "## 2. API Field Mapping Validation" >> "$REPORT"
echo "" >> "$REPORT"

# Check customer login response fields
echo "Validating customer login response..."
RESPONSE=$(curl -s -X POST "$API_URL/api/auth/customer/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!" 2>/dev/null)

if echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'access_token' in d" 2>/dev/null; then
    log_pass "Customer login returns access_token"
else
    log_fail "Customer login missing access_token"
fi

if echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'customer_id' in d" 2>/dev/null; then
    log_pass "Customer login returns customer_id"
else
    log_fail "Customer login missing customer_id"
fi

# Check vendor login response fields
echo "Validating vendor login response..."
RESPONSE=$(curl -s -X POST "$API_URL/api/auth/vendor/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=demo.restaurant@dollor.ai&password=DemoRestaurant2025!" 2>/dev/null)

if echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'vendor_id' in d" 2>/dev/null; then
    log_pass "Vendor login returns vendor_id"
else
    log_fail "Vendor login missing vendor_id"
fi

# Check driver login response fields
echo "Validating driver login response..."
RESPONSE=$(curl -s -X POST "$API_URL/api/auth/driver/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=demo.driver@dollor.ai&password=DemoDriver2025!" 2>/dev/null)

if echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'driver_id' in d" 2>/dev/null; then
    log_pass "Driver login returns driver_id"
else
    log_fail "Driver login missing driver_id"
fi

# ============================================================
# SECTION 3: iOS ENDPOINT VALIDATION
# ============================================================
echo ""
echo -e "${BLUE}━━━ SECTION 3: iOS ENDPOINT VALIDATION ━━━${NC}"
echo "" >> "$REPORT"
echo "## 3. iOS Endpoint Validation" >> "$REPORT"
echo "" >> "$REPORT"

# Check if iOS uses correct API paths
echo "Checking iOS API paths..."
IOS_API_FILE="$IOS_SHARED/Services/P2PAPIService.swift"

if [ -f "$IOS_API_FILE" ]; then
    # Customer login endpoint
    if grep -q "/api/auth/customer/login\|/auth/customer/login" "$IOS_API_FILE"; then
        log_pass "iOS uses customer login endpoint"
    else
        log_fail "iOS customer login endpoint not found"
    fi

    # Vendor login endpoint
    if grep -q "/api/auth/vendor/login\|/auth/vendor/login" "$IOS_API_FILE"; then
        log_pass "iOS uses vendor login endpoint"
    else
        log_fail "iOS vendor login endpoint not found"
    fi

    # Driver login endpoint
    if grep -q "/api/auth/driver/login\|/auth/driver/login" "$IOS_API_FILE"; then
        log_pass "iOS uses driver login endpoint"
    else
        log_fail "iOS driver login endpoint not found"
    fi

    # Order creation endpoint
    if grep -q "/api/erp/orders/create\|/erp/orders/create" "$IOS_API_FILE"; then
        log_pass "iOS uses order creation endpoint"
    else
        log_warn "iOS order creation endpoint not found in expected location"
    fi
else
    log_fail "P2PAPIService.swift not found"
fi

# ============================================================
# SECTION 4: BACKEND CODE VALIDATION
# ============================================================
echo ""
echo -e "${BLUE}━━━ SECTION 4: BACKEND CODE VALIDATION ━━━${NC}"
echo "" >> "$REPORT"
echo "## 4. Backend Code Validation" >> "$REPORT"
echo "" >> "$REPORT"

# Check backend imports
echo "Checking backend can import..."
cd "$BACKEND"
if python3 -c "from main_new import app; print(f'Routes: {len(app.routes)}')" 2>/dev/null; then
    ROUTE_COUNT=$(python3 -c "from main_new import app; print(len(app.routes))" 2>/dev/null)
    log_pass "Backend imports successfully ($ROUTE_COUNT routes)"
else
    log_fail "Backend import failed"
fi

# Check for stacked decorators (anti-pattern)
STACKED=$(grep -c "^@app\.\(get\|post\|put\|patch\|delete\)" "$BACKEND/main_new.py" 2>/dev/null || echo "0")
echo "Found $STACKED route decorators"

# Check for debug prints in production
DEBUG_PRINTS=$(grep -c 'print(' "$BACKEND/main_new.py" 2>/dev/null || echo "0")
if [ "$DEBUG_PRINTS" -gt 100 ]; then
    log_warn "Found $DEBUG_PRINTS print statements (should remove for production)"
else
    log_pass "Reasonable number of print statements ($DEBUG_PRINTS)"
fi

# Check for hardcoded localhost
if grep -q "localhost:8080\|127.0.0.1:8080" "$BACKEND/main_new.py" 2>/dev/null; then
    log_fail "Found hardcoded localhost URLs"
else
    log_pass "No hardcoded localhost URLs"
fi

# ============================================================
# SECTION 5: END-TO-END FLOW VALIDATION
# ============================================================
echo ""
echo -e "${BLUE}━━━ SECTION 5: END-TO-END FLOW VALIDATION ━━━${NC}"
echo "" >> "$REPORT"
echo "## 5. End-to-End Flow Validation" >> "$REPORT"
echo "" >> "$REPORT"

# Health check
echo "Testing health endpoint..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null)
if [ "$HEALTH" = "200" ]; then
    log_pass "Health endpoint returns 200"
else
    log_fail "Health endpoint returns $HEALTH (expected 200)"
fi

# Customer app flow: Login -> Get restaurants -> Get menu
echo "Testing customer flow..."
CUSTOMER_TOKEN=$(curl -s -X POST "$API_URL/api/auth/customer/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!" 2>/dev/null | \
    python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

if [ -n "$CUSTOMER_TOKEN" ]; then
    log_pass "Customer login successful"

    # Get restaurants
    RESTAURANTS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/vendors/published" \
        -H "Authorization: Bearer $CUSTOMER_TOKEN" 2>/dev/null)
    if [ "$RESTAURANTS" = "200" ]; then
        log_pass "Customer can get restaurants"
    else
        log_fail "Customer cannot get restaurants ($RESTAURANTS)"
    fi
else
    log_fail "Customer login failed"
fi

# Vendor app flow: Login -> Get orders
echo "Testing vendor flow..."
VENDOR_TOKEN=$(curl -s -X POST "$API_URL/api/auth/vendor/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=demo.restaurant@dollor.ai&password=DemoRestaurant2025!" 2>/dev/null | \
    python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

if [ -n "$VENDOR_TOKEN" ]; then
    log_pass "Vendor login successful"
else
    log_fail "Vendor login failed"
fi

# Driver app flow: Login -> Get available orders
echo "Testing driver flow..."
DRIVER_TOKEN=$(curl -s -X POST "$API_URL/api/auth/driver/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=demo.driver@dollor.ai&password=DemoDriver2025!" 2>/dev/null | \
    python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

if [ -n "$DRIVER_TOKEN" ]; then
    log_pass "Driver login successful"
else
    log_fail "Driver login failed"
fi

# ============================================================
# SECTION 6: iOS BUILD VALIDATION
# ============================================================
echo ""
echo -e "${BLUE}━━━ SECTION 6: iOS BUILD VALIDATION ━━━${NC}"
echo "" >> "$REPORT"
echo "## 6. iOS Build Validation" >> "$REPORT"
echo "" >> "$REPORT"

# Check if Xcode workspace exists
CUSTOMER_WORKSPACE="$PROJECT_ROOT/apps/ios/customer/eatfaircustomer.xcworkspace"
DRIVER_WORKSPACE="$PROJECT_ROOT/apps/ios/delivery/eatffairdelivery.xcworkspace"
RESTAURANT_WORKSPACE="$PROJECT_ROOT/apps/ios/restaurant/eatffairrestaurant.xcworkspace"

if [ -d "$CUSTOMER_WORKSPACE" ]; then
    log_pass "Customer app workspace exists"
else
    log_fail "Customer app workspace not found"
fi

if [ -d "$DRIVER_WORKSPACE" ]; then
    log_pass "Driver app workspace exists"
else
    log_fail "Driver app workspace not found"
fi

if [ -d "$RESTAURANT_WORKSPACE" ]; then
    log_pass "Restaurant app workspace exists"
else
    log_fail "Restaurant app workspace not found"
fi

# Check shared library exists
if [ -f "$IOS_SHARED/Services/P2PAPIService.swift" ]; then
    log_pass "P2PAPIService.swift exists"
else
    log_fail "P2PAPIService.swift not found"
fi

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " VALIDATION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cat >> "$REPORT" << EOF

---

## Summary

| Metric | Count |
|--------|-------|
| Total Checks | $TOTAL_CHECKS |
| Passed | $PASSED |
| Failed | $FAILED |
| Warnings | $WARNINGS |

EOF

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ ALL VALIDATIONS PASSED${NC}"
    echo -e "   Passed: $PASSED / $TOTAL_CHECKS"
    echo -e "   Warnings: $WARNINGS"
    echo "" >> "$REPORT"
    echo "**Status: ✅ ALL VALIDATIONS PASSED**" >> "$REPORT"
    EXIT_CODE=0
else
    echo -e "${RED}❌ SOME VALIDATIONS FAILED${NC}"
    echo -e "   Passed: $PASSED / $TOTAL_CHECKS"
    echo -e "   Failed: $FAILED"
    echo -e "   Warnings: $WARNINGS"
    echo "" >> "$REPORT"
    echo "**Status: ❌ SOME VALIDATIONS FAILED**" >> "$REPORT"
    EXIT_CODE=1
fi

echo ""
echo -e "Report saved to: ${BLUE}${REPORT}${NC}"
echo ""

exit $EXIT_CODE
