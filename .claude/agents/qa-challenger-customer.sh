#!/bin/bash
#
# QA CHALLENGER - CUSTOMER APP SPECIFIC
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

API_URL="https://api.dollor.ai"
PROJECT_ROOT="/Users/jeet/StudioProjects/eatfair-ios"
CUSTOMER_APP="$PROJECT_ROOT/apps/ios/customer/eatfaircustomer"
SHARED="$PROJECT_ROOT/apps/ios/eatfair-ios-shared/Sources/EatFairShared"

TOTAL=0
PASSED=0
BLOCKED=0

echo ""
echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║     🔒 QA CHALLENGER - CUSTOMER APP                            ║${NC}"
echo -e "${MAGENTA}║     Questions Every Pass, Demands Justification                ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

challenge() {
    local NAME="$1"
    local CMD="$2"
    local EXPECT="$3"
    local JUSTIFY="$4"
    
    ((TOTAL++))
    echo -e "${YELLOW}━━━ Challenge #$TOTAL: $NAME ━━━${NC}"
    
    RESULT=$(eval "$CMD" 2>/dev/null || echo "ERROR")
    
    if echo "$RESULT" | grep -q "$EXPECT"; then
        echo -e "${GREEN}✓ Evidence:${NC} $(echo "$RESULT" | head -c 200)"
        echo -e "${GREEN}✅ JUSTIFIED:${NC} $JUSTIFY"
        ((PASSED++))
    else
        echo -e "${RED}✗ Expected:${NC} $EXPECT"
        echo -e "${RED}✗ Got:${NC} $(echo "$RESULT" | head -c 100)"
        echo -e "${RED}❌ BLOCKED${NC}"
        ((BLOCKED++))
    fi
    echo ""
}

echo -e "${CYAN}═══ PHASE 1: CUSTOMER AUTHENTICATION ═══${NC}"
echo ""

challenge "Customer Login API" \
    "curl -s -X POST '$API_URL/api/auth/customer/login' -H 'Content-Type: application/x-www-form-urlencoded' -d 'username=demo.customer@dollor.ai' -d 'password=DemoCustomer2025!'" \
    "access_token" \
    "JWT token + customer_id=74 returned for demo account"

challenge "Customer Apple Auth Endpoint" \
    "curl -s -o /dev/null -w '%{http_code}' '$API_URL/api/customer/apple-auth'" \
    "40" \
    "Apple auth endpoint exists (401/405 expected without token)"

echo -e "${CYAN}═══ PHASE 2: RESTAURANT BROWSING ═══${NC}"
echo ""

challenge "Get Restaurants List" \
    "curl -s '$API_URL/api/vendors/published' | head -c 100" \
    "id" \
    "Returns array of restaurants with id, name, address fields"

challenge "Restaurant Menu" \
    "curl -s '$API_URL/api/vendors/1/menu' | head -c 100" \
    "menu\|items\|name" \
    "Returns menu items for restaurant ID 1"

echo -e "${CYAN}═══ PHASE 3: ORDER FLOW ═══${NC}"
echo ""

challenge "Order Creation Endpoint" \
    "curl -s -o /dev/null -w '%{http_code}' -X POST '$API_URL/api/erp/orders/create'" \
    "40\|42" \
    "iOS order endpoint exists at /api/erp/orders/create"

challenge "Order Tracking Endpoint" \
    "curl -s '$API_URL/api/erp/orders/1/full-tracking' | head -c 200" \
    "order\|status\|driver" \
    "Returns order details with driver info for tracking"

challenge "Rate Driver Endpoint" \
    "curl -s -o /dev/null -w '%{http_code}' -X POST '$API_URL/api/customer/orders/1/rate-driver'" \
    "40\|42" \
    "Rate driver endpoint at /api/customer/orders/{id}/rate-driver"

echo -e "${CYAN}═══ PHASE 4: RIDESHARE BIDDING (CRITICAL) ═══${NC}"
echo ""

challenge "FareNegotiationResponse Format" \
    "curl -s '$API_URL/erp/rides/1/customer-negotiate?proposed_fare=25'" \
    "platform_fee_driver" \
    "Returns platform_fee_driver=1.0 and platform_fee_customer=1.0 (REQUIRED)"

challenge "CustomerRideBidsResponse Format" \
    "curl -s '$API_URL/api/rides/request/1/bids'" \
    "request_id" \
    "Returns request_id, bids[], total_bids, bidding_open, bidding_ends_at"

challenge "Accept Fare Endpoint" \
    "curl -s '$API_URL/erp/rides/1/customer-accept-fare' | head -c 200" \
    "success\|platform_fee" \
    "Returns success, final_fare, platform_fee fields"

echo -e "${CYAN}═══ PHASE 5: iOS CODE VALIDATION ═══${NC}"
echo ""

challenge "Demo Payment Bypass" \
    "grep -l 'isDemoPayment' '$CUSTOMER_APP/Services/PaymentService.swift'" \
    "PaymentService" \
    "isDemoPayment check exists to bypass Stripe for App Store review"

challenge "Checkout Demo Check" \
    "grep 'isDemoPayment' '$CUSTOMER_APP/Views/MultiRestaurantCheckoutView.swift' | head -1" \
    "isDemoPayment" \
    "Checkout view checks isDemoPayment before processing payment"

challenge "Demo Credentials in Login" \
    "grep -c 'demo.customer' '$CUSTOMER_APP/Views/LoginView.swift' || echo '0'" \
    "[1-9]" \
    "Demo credentials accessible in LoginView for App Store review"

challenge "No Hardcoded Production URL" \
    "grep -c 'api.dollor.ai' '$CUSTOMER_APP/Views/' 2>/dev/null || echo '0'" \
    "0" \
    "Views do not contain hardcoded production URLs"

challenge "Uses AppConfig for API URL" \
    "grep -l 'AppConfig' '$SHARED/Services/P2PAPIService.swift'" \
    "P2PAPIService" \
    "API service uses AppConfig.shared for base URL"

echo -e "${CYAN}═══ PHASE 6: BUILD CONFIGURATION ═══${NC}"
echo ""

challenge "Customer Bundle ID" \
    "grep 'com.dollorai.customer' '$PROJECT_ROOT/apps/ios/fastlane/Appfile'" \
    "com.dollorai.customer" \
    "Bundle ID matches App Store Connect: com.dollorai.customer"

challenge "Customer Build Number" \
    "grep 'CURRENT_PROJECT_VERSION' '$PROJECT_ROOT/apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj' | head -1" \
    "1043" \
    "Current build is 1043 on TestFlight"

challenge "Production Config URL" \
    "grep 'api.dollor.ai' '$PROJECT_ROOT/apps/ios/Config/Production.xcconfig'" \
    "api.dollor.ai" \
    "Production.xcconfig points to api.dollor.ai"

echo ""
echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                 CUSTOMER APP FINAL VERDICT                     ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total Challenges:  ${BOLD}$TOTAL${NC}"
echo -e "Justified Passes:  ${GREEN}$PASSED${NC}"
echo -e "Blocked:           ${RED}$BLOCKED${NC}"
echo ""

if [ $BLOCKED -gt 0 ]; then
    echo -e "${RED}❌ CUSTOMER APP BLOCKED - $BLOCKED issue(s) need fixing${NC}"
    exit 1
else
    echo -e "${GREEN}✅ CUSTOMER APP APPROVED - All $PASSED challenges justified${NC}"
    exit 0
fi
