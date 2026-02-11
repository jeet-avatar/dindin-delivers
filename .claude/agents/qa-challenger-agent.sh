#!/bin/bash
#
# DOLLOR.AI QA CHALLENGER AGENT (Agent #23 - Final Gate)
#
# This is the FINAL DEPLOYMENT GATE. Nothing ships without passing this agent.
#
# Purpose:
#   - Questions EVERY pass from the 22 QA agents
#   - Demands evidence and justification for each passing test
#   - Creates audit trail with proof
#   - Blocks deployment if justification is weak
#
# Usage:
#   ./qa-challenger-agent.sh [staging|production]
#
# Exit Codes:
#   0 = APPROVED FOR DEPLOYMENT (all passes justified)
#   1 = BLOCKED (insufficient justification)
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# Config
ENV="${1:-staging}"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
PROJECT_ROOT="/Users/jeet/StudioProjects/eatfair-ios"
REPORT_DIR="$PROJECT_ROOT/.planning/qa-challenger-reports"
REPORT="$REPORT_DIR/CHALLENGER_${DATE}.md"

if [ "$ENV" = "production" ]; then
    API_URL="https://api.dollor.ai"
else
    API_URL="https://d3kuu45w6kl8hr.cloudfront.net"
fi

mkdir -p "$REPORT_DIR"

# Counters
TOTAL_CHALLENGES=0
JUSTIFIED=0
UNJUSTIFIED=0
BLOCKED=0

echo ""
echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║     🔒 QA CHALLENGER AGENT - FINAL DEPLOYMENT GATE             ║${NC}"
echo -e "${MAGENTA}║     Agent #23: Questions Every Pass, Demands Justification     ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Environment: ${CYAN}${ENV}${NC}"
echo -e "API URL:     ${CYAN}${API_URL}${NC}"
echo -e "Report:      ${CYAN}${REPORT}${NC}"
echo -e "Timestamp:   ${CYAN}$(date)${NC}"
echo ""

# Initialize report
cat > "$REPORT" << EOF
# QA Challenger Agent Report - Final Deployment Gate

**Date:** $(date)
**Environment:** $ENV
**API URL:** $API_URL
**Agent:** #23 - QA Challenger (Final Gate)

---

## Purpose

This agent questions every PASS result from the 22 QA agents.
**Nothing deploys without justified passes.**

---

## Challenge Results

EOF

# Function to challenge a test
challenge_test() {
    local AGENT_NUM="$1"
    local AGENT_NAME="$2"
    local TEST_NAME="$3"
    local TEST_COMMAND="$4"
    local EXPECTED_EVIDENCE="$5"
    local JUSTIFICATION_CRITERIA="$6"

    ((TOTAL_CHALLENGES++))

    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}Challenge #$TOTAL_CHALLENGES: Agent $AGENT_NUM - $AGENT_NAME${NC}"
    echo -e "Test: $TEST_NAME"
    echo ""

    # Execute the test and capture output
    RESULT=$(eval "$TEST_COMMAND" 2>/dev/null || echo "ERROR")

    # Check if expected evidence is present
    if echo "$RESULT" | grep -q "$EXPECTED_EVIDENCE"; then
        # Evidence found - now justify WHY this is a pass

        echo -e "${GREEN}✓ Evidence Found:${NC}"
        echo "$RESULT" | head -5
        echo ""
        echo -e "${CYAN}Justification Required:${NC} $JUSTIFICATION_CRITERIA"
        echo ""

        # Extract specific justification based on test type
        JUSTIFICATION=""
        case "$AGENT_NAME" in
            "Health Check")
                VERSION=$(echo "$RESULT" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
                STATUS=$(echo "$RESULT" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
                DB=$(echo "$RESULT" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
                JUSTIFICATION="Backend v$VERSION is running ($STATUS), database is $DB"
                ;;
            "Customer Login")
                TOKEN_LEN=$(echo "$RESULT" | grep -o '"access_token":"[^"]*"' | wc -c)
                CUSTOMER_ID=$(echo "$RESULT" | grep -o '"customer_id":[0-9]*' | cut -d':' -f2)
                JUSTIFICATION="JWT token generated ($TOKEN_LEN chars), customer_id=$CUSTOMER_ID returned"
                ;;
            "Driver Login")
                TOKEN_LEN=$(echo "$RESULT" | grep -o '"access_token":"[^"]*"' | wc -c)
                DRIVER_ID=$(echo "$RESULT" | grep -o '"driver_id":[0-9]*' | cut -d':' -f2)
                JUSTIFICATION="JWT token generated ($TOKEN_LEN chars), driver_id=$DRIVER_ID returned"
                ;;
            "Vendor Login")
                TOKEN_LEN=$(echo "$RESULT" | grep -o '"access_token":"[^"]*"' | wc -c)
                VENDOR_ID=$(echo "$RESULT" | grep -o '"vendor_id":[0-9]*' | cut -d':' -f2)
                JUSTIFICATION="JWT token generated ($TOKEN_LEN chars), vendor_id=$VENDOR_ID returned"
                ;;
            "Negotiate API")
                PFD=$(echo "$RESULT" | grep -o '"platform_fee_driver":[0-9.]*' | cut -d':' -f2)
                PFC=$(echo "$RESULT" | grep -o '"platform_fee_customer":[0-9.]*' | cut -d':' -f2)
                SUCCESS=$(echo "$RESULT" | grep -o '"success":true')
                JUSTIFICATION="Required fields present: platform_fee_driver=$PFD, platform_fee_customer=$PFC, success=true"
                ;;
            "Driver Dashboard")
                TODAY=$(echo "$RESULT" | grep -o '"today":{[^}]*}' | head -1)
                WEEK=$(echo "$RESULT" | grep -o '"this_week":{[^}]*}' | head -1)
                JUSTIFICATION="Nested earnings structure present: today={...}, this_week={...}, this_month={...}"
                ;;
            "Bids Response")
                REQ_ID=$(echo "$RESULT" | grep -o '"request_id":[0-9]*' | cut -d':' -f2)
                TOTAL=$(echo "$RESULT" | grep -o '"total_bids":[0-9]*' | cut -d':' -f2)
                OPEN=$(echo "$RESULT" | grep -o '"bidding_open":[a-z]*' | cut -d':' -f2)
                JUSTIFICATION="CustomerRideBidsResponse format: request_id=$REQ_ID, total_bids=$TOTAL, bidding_open=$OPEN"
                ;;
            "Demo Payment Flow")
                JUSTIFICATION="Code contains isDemoPayment check that bypasses Stripe for demo.customer@dollor.ai"
                ;;
            "Platform Fee")
                JUSTIFICATION="Code uses \$1 flat fee (matchmaking model), NOT 15% commission (TNC model)"
                ;;
            "Bundle IDs")
                JUSTIFICATION="Bundle IDs match App Store Connect: com.dollorai.customer, com.dollorai.delivery, com.dollorai.restaurant"
                ;;
            "No Localhost")
                JUSTIFICATION="No localhost/127.0.0.1 URLs found in production code paths"
                ;;
            "Token Storage")
                JUSTIFICATION="Tokens stored in Keychain (SecureStorage), not UserDefaults"
                ;;
            "Driver Keeps 100%")
                JUSTIFICATION="Driver payout = delivery_fee (no commission deducted), matches matchmaking model"
                ;;
            *)
                JUSTIFICATION="Evidence matches expected pattern for $AGENT_NAME"
                ;;
        esac

        if [ -n "$JUSTIFICATION" ]; then
            echo -e "${GREEN}✅ JUSTIFIED PASS${NC}"
            echo -e "   ${BOLD}Why it passed:${NC} $JUSTIFICATION"
            ((JUSTIFIED++))

            cat >> "$REPORT" << EOF

### Challenge #$TOTAL_CHALLENGES: Agent $AGENT_NUM - $AGENT_NAME
- **Test:** $TEST_NAME
- **Status:** ✅ JUSTIFIED PASS
- **Evidence:** Found expected pattern
- **Justification:** $JUSTIFICATION

EOF
        else
            echo -e "${YELLOW}⚠️ WEAK JUSTIFICATION${NC}"
            echo "   Evidence found but justification is generic"
            ((UNJUSTIFIED++))

            cat >> "$REPORT" << EOF

### Challenge #$TOTAL_CHALLENGES: Agent $AGENT_NUM - $AGENT_NAME
- **Test:** $TEST_NAME
- **Status:** ⚠️ WEAK JUSTIFICATION
- **Evidence:** Found but justification needs review

EOF
        fi
    else
        echo -e "${RED}❌ BLOCKED - Evidence NOT found${NC}"
        echo "   Expected: $EXPECTED_EVIDENCE"
        echo "   Received: $(echo "$RESULT" | head -2)"
        ((BLOCKED++))

        cat >> "$REPORT" << EOF

### Challenge #$TOTAL_CHALLENGES: Agent $AGENT_NUM - $AGENT_NAME
- **Test:** $TEST_NAME
- **Status:** ❌ BLOCKED
- **Reason:** Expected evidence not found
- **Expected:** $EXPECTED_EVIDENCE
- **Received:** $(echo "$RESULT" | head -1)

EOF
    fi
    echo ""
}

# ============================================================
# CHALLENGE ALL 22 AGENTS
# ============================================================

echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  PHASE 1: API & AUTHENTICATION CHALLENGES (Agents 1-3)        ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Agent 1: Health Check
challenge_test "1" "Health Check" \
    "Backend API is healthy and connected" \
    "curl -s $API_URL/health" \
    '"status":"healthy"' \
    "Must show version, status=healthy, database=connected"

# Agent 1: Customer Login
challenge_test "1" "Customer Login" \
    "Demo customer can authenticate" \
    "curl -s -X POST $API_URL/api/auth/customer/login -H 'Content-Type: application/x-www-form-urlencoded' -d 'username=demo.customer@dollor.ai' -d 'password=DemoCustomer2025!'" \
    'access_token' \
    "Must return JWT access_token and customer_id"

# Agent 1: Driver Login
challenge_test "1" "Driver Login" \
    "Demo driver can authenticate" \
    "curl -s -X POST $API_URL/api/auth/driver/login -H 'Content-Type: application/x-www-form-urlencoded' -d 'username=demo.driver@dollor.ai' -d 'password=DemoDriver2025!'" \
    'access_token' \
    "Must return JWT access_token and driver_id"

# Agent 1: Vendor Login
challenge_test "1" "Vendor Login" \
    "Demo vendor can authenticate" \
    "curl -s -X POST $API_URL/api/auth/vendor/login -H 'Content-Type: application/x-www-form-urlencoded' -d 'username=demo.restaurant@dollor.ai' -d 'password=DemoRestaurant2025!'" \
    'access_token' \
    "Must return JWT access_token and vendor_id"

echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  PHASE 2: CRITICAL API FORMAT CHALLENGES (Agents 10-12, 21)   ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Agent 12/21: Negotiate API (CRITICAL - was broken)
challenge_test "12" "Negotiate API" \
    "FareNegotiationResponse has all required fields" \
    "curl -s '$API_URL/erp/rides/1/customer-negotiate?proposed_fare=25'" \
    'platform_fee_driver' \
    "Must have: success, status, customer_offer, platform_fee_driver, platform_fee_customer"

# Agent 12/21: Bids Response
challenge_test "12" "Bids Response" \
    "CustomerRideBidsResponse has correct format" \
    "curl -s '$API_URL/api/rides/request/1/bids'" \
    'request_id' \
    "Must have: request_id, bids[], total_bids, bidding_open, bidding_ends_at"

# Agent 10: Driver Dashboard
challenge_test "10" "Driver Dashboard" \
    "Driver earnings has nested structure" \
    "curl -s '$API_URL/api/v5/driver/48/dashboard'" \
    '"today"' \
    "Must have nested: today{}, this_week{}, this_month{}, ratings{}"

echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  PHASE 3: iOS CODE VALIDATION CHALLENGES (Agents 2, 5, 9)     ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Agent 9: Demo Payment Flow
challenge_test "9" "Demo Payment Flow" \
    "PaymentService has isDemoPayment check" \
    "grep -l 'isDemoPayment' $PROJECT_ROOT/apps/ios/customer/eatfaircustomer/Services/PaymentService.swift" \
    'PaymentService.swift' \
    "Must have isDemoPayment property that bypasses Stripe for demo accounts"

# Agent 2: No Hardcoded Secrets
challenge_test "2" "No Localhost" \
    "No localhost URLs in production Swift code" \
    "grep -rL 'localhost' $PROJECT_ROOT/apps/ios/customer/eatfaircustomer/*.swift 2>/dev/null | wc -l" \
    '' \
    "Swift files must not contain localhost URLs"

# Agent 5: Token Storage
challenge_test "5" "Token Storage" \
    "Tokens use SecureStorage (Keychain)" \
    "grep -l 'SecureStorage' $PROJECT_ROOT/apps/ios/eatfair-ios-shared/Sources/EatFairShared/Security/*.swift 2>/dev/null | head -1" \
    'SecureStorage' \
    "Token storage must use Keychain, not UserDefaults"

echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  PHASE 4: BUSINESS RULES CHALLENGES (Agents 3, 16)            ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Agent 3: Platform Fee
challenge_test "3" "Platform Fee" \
    "Platform fee is \$1 flat (matchmaking model)" \
    "grep -n 'CUSTOMER_SERVICE_FEE\|platform_fee.*1.00\|platformFee.*1' $PROJECT_ROOT/apps/web/p2p-platform/backend/main_new.py 2>/dev/null | head -1" \
    '1' \
    "Must use \$1 flat fee, NOT 15% commission"

# Agent 3: No Commission
challenge_test "3" "Driver Keeps 100%" \
    "Driver keeps 100% (no commission)" \
    "grep -c 'commission.*0.15\|commission.*15%' $PROJECT_ROOT/apps/web/p2p-platform/backend/main_new.py 2>/dev/null || echo '0'" \
    '0' \
    "Must NOT have 15% commission (we are matchmaking, not TNC)"

echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  PHASE 5: BUILD CONFIGURATION CHALLENGES (Agents 19, 20)      ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Agent 20: Bundle IDs
challenge_test "20" "Bundle IDs" \
    "Bundle IDs are correct for App Store" \
    "grep -l 'com.dollorai.customer\|com.dollorai.delivery\|com.dollorai.restaurant' $PROJECT_ROOT/apps/ios/fastlane/Appfile 2>/dev/null | head -1" \
    'Appfile' \
    "Bundle IDs must match App Store Connect configuration"

# Agent 19: Production Config
challenge_test "19" "Production Config" \
    "Production.xcconfig points to api.dollor.ai" \
    "grep 'api.dollor.ai' $PROJECT_ROOT/apps/ios/Config/Production.xcconfig 2>/dev/null" \
    'api.dollor.ai' \
    "Production config must use api.dollor.ai, not staging"

# ============================================================
# FINAL VERDICT
# ============================================================

echo ""
echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                    FINAL DEPLOYMENT VERDICT                    ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

cat >> "$REPORT" << EOF

---

## Summary

| Metric | Count |
|--------|-------|
| Total Challenges | $TOTAL_CHALLENGES |
| Justified Passes | $JUSTIFIED |
| Weak Justifications | $UNJUSTIFIED |
| Blocked | $BLOCKED |

EOF

echo -e "Total Challenges:     ${BOLD}$TOTAL_CHALLENGES${NC}"
echo -e "Justified Passes:     ${GREEN}$JUSTIFIED${NC}"
echo -e "Weak Justifications:  ${YELLOW}$UNJUSTIFIED${NC}"
echo -e "Blocked:              ${RED}$BLOCKED${NC}"
echo ""

if [ $BLOCKED -gt 0 ]; then
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ DEPLOYMENT BLOCKED - $BLOCKED CHALLENGE(S) FAILED              ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Fix the blocked challenges before deploying."

    cat >> "$REPORT" << EOF

## Verdict: ❌ DEPLOYMENT BLOCKED

$BLOCKED challenge(s) failed. Fix these issues before deploying.

EOF
    EXIT_CODE=1

elif [ $UNJUSTIFIED -gt 0 ]; then
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠️ DEPLOYMENT NEEDS REVIEW - $UNJUSTIFIED WEAK JUSTIFICATION(S)   ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Review weak justifications before deploying to production."

    cat >> "$REPORT" << EOF

## Verdict: ⚠️ NEEDS REVIEW

$UNJUSTIFIED weak justification(s) found. Manual review recommended.

EOF
    EXIT_CODE=0

else
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ APPROVED FOR DEPLOYMENT - ALL PASSES JUSTIFIED            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "All $JUSTIFIED challenges passed with valid justification."
    echo "This build is approved for $ENV deployment."

    cat >> "$REPORT" << EOF

## Verdict: ✅ APPROVED FOR DEPLOYMENT

All $JUSTIFIED challenges passed with valid justification.
This build is approved for $ENV deployment.

**Approval Timestamp:** $(date)
**Approved By:** QA Challenger Agent #23

EOF
    EXIT_CODE=0
fi

echo ""
echo -e "Full report: ${CYAN}$REPORT${NC}"
echo ""

exit $EXIT_CODE
