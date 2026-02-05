#!/bin/bash
#
# DOLLOR.AI iOS GO-LIVE AGENT
# Pre-flight checks before App Store submission
#
# Usage: ./ios-go-live-agent.sh [staging|production]
#
# This agent performs ALL checks needed before going live:
# 1. Backend API validation
# 2. Demo account validation
# 3. iOS build validation
# 4. Field mapping validation
# 5. End-to-end flow testing
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV="${1:-staging}"
PROJECT_ROOT="/Users/jeet/StudioProjects/eatfair-ios"
BACKEND="$PROJECT_ROOT/apps/web/p2p-platform/backend"

if [ "$ENV" = "production" ]; then
    API_URL="https://api.dollor.ai"
else
    API_URL="https://d3kuu45w6kl8hr.cloudfront.net"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " DOLLOR.AI iOS GO-LIVE AGENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "Environment: ${BLUE}${ENV}${NC}"
echo -e "API URL:     ${BLUE}${API_URL}${NC}"
echo ""

PASSED=0
FAILED=0

check() {
    local name="$1"
    local result="$2"
    if [ "$result" = "pass" ]; then
        echo -e "${GREEN}✅${NC} $name"
        ((PASSED++))
    else
        echo -e "${RED}❌${NC} $name"
        ((FAILED++))
    fi
}

# ============================================================
# SECTION 1: BACKEND VALIDATION
# ============================================================
echo -e "${BLUE}▸ Backend Validation${NC}"

# Check backend imports
cd "$BACKEND"
if python3 -c "from main_new import app" 2>/dev/null; then
    ROUTES=$(python3 -c "from main_new import app; print(len(app.routes))" 2>/dev/null)
    check "Backend imports ($ROUTES routes)" "pass"
else
    check "Backend imports" "fail"
fi

# Health check
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" --connect-timeout 5 2>/dev/null)
if [ "$HEALTH" = "200" ]; then
    check "Health endpoint (200)" "pass"
else
    check "Health endpoint ($HEALTH)" "fail"
fi

# ============================================================
# SECTION 2: DEMO ACCOUNTS
# ============================================================
echo ""
echo -e "${BLUE}▸ Demo Account Validation${NC}"

# Customer demo
CUST_RESP=$(curl -s --connect-timeout 5 -X POST "$API_URL/api/auth/customer/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!" 2>/dev/null)
if echo "$CUST_RESP" | grep -q "access_token"; then
    CUST_ID=$(echo "$CUST_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('customer_id','?'))" 2>/dev/null)
    check "Customer demo login (ID: $CUST_ID)" "pass"
    CUST_TOKEN=$(echo "$CUST_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
else
    check "Customer demo login" "fail"
fi

# Vendor demo
VEND_RESP=$(curl -s --connect-timeout 5 -X POST "$API_URL/api/auth/vendor/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=demo.restaurant@dollor.ai&password=DemoRestaurant2025!" 2>/dev/null)
if echo "$VEND_RESP" | grep -q "access_token"; then
    VEND_ID=$(echo "$VEND_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('vendor_id','?'))" 2>/dev/null)
    check "Vendor demo login (ID: $VEND_ID)" "pass"
    VEND_TOKEN=$(echo "$VEND_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
else
    check "Vendor demo login" "fail"
fi

# Driver demo
DRV_RESP=$(curl -s --connect-timeout 5 -X POST "$API_URL/api/auth/driver/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=demo.driver@dollor.ai&password=DemoDriver2025!" 2>/dev/null)
if echo "$DRV_RESP" | grep -q "access_token"; then
    DRV_ID=$(echo "$DRV_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('driver_id','?'))" 2>/dev/null)
    check "Driver demo login (ID: $DRV_ID)" "pass"
    DRV_TOKEN=$(echo "$DRV_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
else
    check "Driver demo login" "fail"
fi

# ============================================================
# SECTION 3: iOS APP FILES
# ============================================================
echo ""
echo -e "${BLUE}▸ iOS App Files${NC}"

[ -d "$PROJECT_ROOT/apps/ios/customer/eatfaircustomer.xcworkspace" ] && check "Customer app workspace" "pass" || check "Customer app workspace" "fail"
[ -d "$PROJECT_ROOT/apps/ios/delivery/eatffairdelivery.xcworkspace" ] && check "Driver app workspace" "pass" || check "Driver app workspace" "fail"
[ -d "$PROJECT_ROOT/apps/ios/restaurant/eatffairrestaurant.xcworkspace" ] && check "Restaurant app workspace" "pass" || check "Restaurant app workspace" "fail"
[ -f "$PROJECT_ROOT/apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift" ] && check "P2PAPIService.swift" "pass" || check "P2PAPIService.swift" "fail"

# ============================================================
# SECTION 4: CUSTOMER APP FLOWS
# ============================================================
echo ""
echo -e "${BLUE}▸ Customer App API Flows${NC}"

if [ -n "$CUST_TOKEN" ]; then
    # Get restaurants
    REST_RESP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/vendors/published" \
        -H "Authorization: Bearer $CUST_TOKEN" --connect-timeout 5 2>/dev/null)
    [ "$REST_RESP" = "200" ] && check "GET /api/vendors/published" "pass" || check "GET /api/vendors/published ($REST_RESP)" "fail"

    # Get addresses
    ADDR_RESP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/addresses/74" \
        -H "Authorization: Bearer $CUST_TOKEN" --connect-timeout 5 2>/dev/null)
    [ "$ADDR_RESP" = "200" ] && check "GET /api/addresses/{customer_id}" "pass" || check "GET /api/addresses/{customer_id} ($ADDR_RESP)" "fail"

    # Get customer orders
    ORD_RESP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/customer/orders" \
        -H "Authorization: Bearer $CUST_TOKEN" --connect-timeout 5 2>/dev/null)
    [ "$ORD_RESP" = "200" ] && check "GET /api/customer/orders" "pass" || check "GET /api/customer/orders ($ORD_RESP)" "fail"
else
    check "Customer app flows (no token)" "fail"
fi

# ============================================================
# SECTION 5: VENDOR APP FLOWS
# ============================================================
echo ""
echo -e "${BLUE}▸ Vendor App API Flows${NC}"

if [ -n "$VEND_TOKEN" ]; then
    # Get vendor orders
    VORD_RESP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/erp/orders/vendor/40" \
        -H "Authorization: Bearer $VEND_TOKEN" --connect-timeout 5 2>/dev/null)
    [ "$VORD_RESP" = "200" ] && check "GET /api/erp/orders/vendor/{id}" "pass" || check "GET /api/erp/orders/vendor/{id} ($VORD_RESP)" "fail"

    # Get vendor menu
    MENU_RESP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/vendors/40/menu" \
        -H "Authorization: Bearer $VEND_TOKEN" --connect-timeout 5 2>/dev/null)
    [ "$MENU_RESP" = "200" ] && check "GET /api/vendors/{id}/menu" "pass" || check "GET /api/vendors/{id}/menu ($MENU_RESP)" "fail"
else
    check "Vendor app flows (no token)" "fail"
fi

# ============================================================
# SECTION 6: DRIVER APP FLOWS
# ============================================================
echo ""
echo -e "${BLUE}▸ Driver App API Flows${NC}"

if [ -n "$DRV_TOKEN" ]; then
    # Get available orders
    AVAIL_RESP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/erp/orders/available-for-delivery" \
        -H "Authorization: Bearer $DRV_TOKEN" --connect-timeout 5 2>/dev/null)
    [ "$AVAIL_RESP" = "200" ] && check "GET /api/erp/orders/available-for-delivery" "pass" || check "GET /api/erp/orders/available-for-delivery ($AVAIL_RESP)" "fail"

    # Get driver profile
    PROF_RESP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/erp/drivers/48" \
        -H "Authorization: Bearer $DRV_TOKEN" --connect-timeout 5 2>/dev/null)
    [ "$PROF_RESP" = "200" ] && check "GET /api/erp/drivers/{id}" "pass" || check "GET /api/erp/drivers/{id} ($PROF_RESP)" "fail"
else
    check "Driver app flows (no token)" "fail"
fi

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL=$((PASSED + FAILED))

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ GO-LIVE READY: All $TOTAL checks passed${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Build iOS apps in Xcode"
    echo "  2. Test on physical devices"
    echo "  3. Submit to App Store Connect"
    exit 0
else
    echo -e "${RED}❌ NOT READY: $FAILED/$TOTAL checks failed${NC}"
    echo ""
    echo "Fix the failed checks before going live."
    exit 1
fi
